/**
 * npm run validate:clinics — valida las fichas de `src/content/clinicas/` y los sidecars de
 * `research/clinics/` con el contrato compartido (clinic-validate.ts, clinic-evidence.ts).
 * Sin red ni secretos. Sale con código 1 si hay errores nuevos; la deuda heredada
 * registrada en `docs/admin/data-debt.json` se informa pero no falla.
 *
 * Opciones:
 *   --verbose            lista también avisos, deuda cubierta y entradas obsoletas
 *   --json               informe completo en JSON por stdout
 *   --now YYYY-MM-DD     fecha de referencia (pruebas)
 *   --prune-baseline     retira de la base las entradas que ya no aplican (solo reduce)
 *   --write-baseline     regenera la base con la deuda actual. Solo para la base inicial:
 *                        el diff de la base se revisa a mano en la PR.
 *   --baseline-commit SHA  commit de referencia al regenerar (por defecto HEAD)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { parseFrontmatter } from 'astro/markdown';
import { clinicSchema } from '../../src/lib/clinic-schema.ts';
import { parseEvidence, type Evidence } from '../../src/lib/clinic-evidence.ts';
import { applyDebtBaseline, buildDebtBaseline, debtBaselineSchema, serializeDebtBaseline, validateCatalog, type CatalogRecord, type DebtBaseline, type ValidationIssue } from '../../src/lib/clinic-validate.ts';

const BASELINE_PATH = 'docs/admin/data-debt.json';
const CLINICS_DIR = 'src/content/clinicas';
const EVIDENCE_DIR = 'research/clinics';
const REVIEW_REF = 'https://github.com/Gunz-cop/Vet24-cr/issues/29';
const DESCRIPTION = 'Deuda heredada de fichas (diseño motor de fichas §4.1–§4.2). Cada entrada perdona un error solo mientras la ficha conserve exactamente ese valor; al corregirlo se retira con --prune-baseline. No añadir entradas para fichas nuevas o modificadas.';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };

function structural(slug: string, code: string, field: string, message: string): ValidationIssue {
  return { slug, code, field, severity: 'error', message };
}

function loadCatalog(root: string) {
  const issues: ValidationIssue[] = [];
  const records: CatalogRecord[] = [];
  const dir = join(root, CLINICS_DIR);
  // Mismo patrón que el loader de Astro: '**/[^_]*.{md,mdx}'.
  const files = existsSync(dir) ? readdirSync(dir).filter((name) => /^[^_].*\.mdx?$/.test(name)).sort() : [];
  for (const name of files) {
    const fileSlug = name.replace(/\.mdx?$/, '');
    let data: unknown;
    try {
      data = parseFrontmatter(readFileSync(join(dir, name), 'utf8')).frontmatter;
    } catch (error) {
      issues.push(structural(fileSlug, 'schema_invalid', '(frontmatter)', `YAML inválido: ${(error as Error).message.split('\n')[0]}`));
      continue;
    }
    const parsed = clinicSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) issues.push(structural(fileSlug, 'schema_invalid', issue.path.join('.') || '(raíz)', issue.message));
      continue;
    }
    if (parsed.data.slug !== fileSlug) issues.push(structural(fileSlug, 'slug_filename', 'slug', `El slug «${parsed.data.slug}» no coincide con el archivo ${name}.`));
    records.push({ slug: parsed.data.slug, clinic: parsed.data, evidence: null });
  }
  const evidenceDir = join(root, EVIDENCE_DIR);
  const evidence = new Map<string, Evidence>();
  const evidenceFiles = existsSync(evidenceDir) ? readdirSync(evidenceDir).filter((name) => name.endsWith('.json')).sort() : [];
  for (const name of evidenceFiles) {
    const slug = basename(name, '.json');
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(join(evidenceDir, name), 'utf8'));
    } catch {
      issues.push(structural(slug, 'evidence_invalid', '(json)', `${EVIDENCE_DIR}/${name} no es JSON válido.`));
      continue;
    }
    const parsed = parseEvidence(raw, slug);
    if (!parsed.success) for (const message of parsed.errors) issues.push(structural(slug, 'evidence_invalid', 'evidence', message));
    else evidence.set(slug, parsed.data);
    if (!records.some((record) => record.slug === slug)) issues.push(structural(slug, 'evidence_orphan', 'evidence', `${EVIDENCE_DIR}/${name} no corresponde a ninguna ficha.`));
  }
  for (const record of records) record.evidence = evidence.get(record.slug) ?? null;
  return { records, issues, evidenceCount: evidenceFiles.length };
}

function loadBaseline(root: string): DebtBaseline | null {
  const path = join(root, BASELINE_PATH);
  if (!existsSync(path)) return null;
  const parsed = debtBaselineSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (!parsed.success) {
    console.error(`${BASELINE_PATH} no cumple el contrato:\n${parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`).join('\n')}`);
    process.exit(1);
  }
  return parsed.data;
}

function writeBaseline(root: string, baseline: DebtBaseline) {
  mkdirSync(dirname(join(root, BASELINE_PATH)), { recursive: true });
  writeFileSync(join(root, BASELINE_PATH), serializeDebtBaseline(baseline));
}

const countBy = (items: readonly { code?: string; ruleId?: string }[]) => {
  const counts = new Map<string, number>();
  for (const item of items) { const code = item.code ?? item.ruleId ?? '?'; counts.set(code, (counts.get(code) ?? 0) + 1); }
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([code, count]) => `${code} ${count}`).join(', ') || '—';
};
const line = (issue: ValidationIssue) => `  ${issue.slug} · ${issue.code} · ${issue.field}: ${issue.message}`;

function main() {
  const root = process.cwd();
  const nowText = option('--now');
  const now = nowText ? new Date(`${nowText}T12:00:00-06:00`) : new Date();
  if (!Number.isFinite(now.getTime())) { console.error(`--now inválido: ${nowText}`); process.exit(2); }

  const { records, issues: structuralIssues, evidenceCount } = loadCatalog(root);
  const baseline = loadBaseline(root);
  const issues = [...structuralIssues, ...validateCatalog(records, { now, googleDerivedCoordinates: baseline?.googleDerivedCoordinates ?? [] })];

  if (flag('--write-baseline')) {
    const blocking = issues.filter((issue) => issue.severity === 'error' && issue.debtValue === undefined);
    if (blocking.length) {
      console.error(`No se escribe la base: hay ${blocking.length} errores que no son deuda.\n${blocking.map(line).join('\n')}`);
      process.exit(1);
    }
    const commit = option('--baseline-commit') ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const next = buildDebtBaseline(issues, baseline, { baselineCommit: commit, generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), reviewRef: baseline?.reviewRef ?? REVIEW_REF, description: DESCRIPTION });
    writeBaseline(root, next);
    console.log(`${BASELINE_PATH}: ${next.entries.length} entradas (${countBy(next.entries)}).`);
    return;
  }

  const report = applyDebtBaseline(issues, baseline);
  if (flag('--prune-baseline') && baseline) {
    const stale = new Set(report.stale);
    writeBaseline(root, { ...baseline, entries: baseline.entries.filter((entry) => !stale.has(entry)) });
    console.log(`${BASELINE_PATH}: retiradas ${stale.size} entradas obsoletas.`);
  }

  if (flag('--json')) {
    console.log(JSON.stringify({ clinics: records.length, evidence: evidenceCount, ...report }, null, 2));
  } else {
    console.log(`validate:clinics · ${records.length} fichas · ${evidenceCount} sidecars de evidencia`);
    console.log(`  errores: ${report.errors.length} · deuda cubierta: ${report.debt.length} · avisos: ${report.warnings.length} · deuda obsoleta: ${report.stale.length}`);
    console.log(`  deuda por regla: ${countBy(report.debt)}`);
    console.log(`  avisos por regla: ${countBy(report.warnings)}`);
    if (flag('--verbose')) {
      if (report.warnings.length) console.log(`AVISOS\n${report.warnings.map(line).join('\n')}`);
      if (report.debt.length) console.log(`DEUDA CUBIERTA\n${report.debt.map(line).join('\n')}`);
    }
    if (report.stale.length) console.log(`DEUDA OBSOLETA (retirar con --prune-baseline)\n${report.stale.map((entry) => `  ${entry.slug} · ${entry.ruleId} · ${entry.field} = ${entry.value}`).join('\n')}`);
    if (report.errors.length) console.log(`ERRORES\n${report.errors.map(line).join('\n')}`);
  }
  if (report.errors.length) process.exitCode = 1;
}

main();
