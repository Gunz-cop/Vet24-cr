import { readFile } from 'node:fs/promises';

const load = async (name) => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));
const base = await load('base-agent-scan.json');
const current = await load('production-predeploy-agent-scan.json');
const flatten = (scan) => Object.values(scan.checks).flatMap((group) => Object.entries(group));
const baseChecks = new Map(flatten(base));
const currentChecks = new Map(flatten(current));
const comparison = [...baseChecks].map(([id, before]) => ({
  id,
  base: before.status,
  current: currentChecks.get(id)?.status ?? 'missing',
  regression: before.status === 'pass' && currentChecks.get(id)?.status !== 'pass',
}));
const report = {
  scope: 'Producción vigente antes de despliegue; no demuestra el candidato local.',
  baseScannedAt: base.scannedAt,
  currentScannedAt: current.scannedAt,
  baseLevel: base.level,
  currentLevel: current.level,
  checkCount: comparison.length,
  comparison,
  pass: comparison.length === 22 && !comparison.some((item) => item.regression),
};
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
