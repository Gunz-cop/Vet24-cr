import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../../..', import.meta.url).pathname.replace(/^\/(.:)/, '$1');
const directory = join(root, 'briefings');
const files = (await readdir(directory)).filter((name) => name.startsWith('briefing-') && name.endsWith('.md'));
const reports = [];

for (const file of files) {
  const source = await readFile(join(directory, file), 'utf8');
  const urls = [...new Set(source.match(/https:\/\/[^\s)>|]+/g) ?? [])];
  const checks = [];
  for (const url of urls) {
    try {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
      checks.push({ url, status: response.status, finalUrl: response.url, reachable: response.ok });
    } catch (error) {
      checks.push({ url, status: null, reachable: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  reports.push({ file, distinctDeepUrls: urls.length, contractPass: urls.length >= 6, checks });
}

const report = {
  checkedAt: new Date().toISOString(),
  note: 'Los estados HTTP son una fotografía reproducible; bloqueos anti-bot o caídas posteriores no invalidan por sí solos la elegibilidad documental.',
  reports,
  pass: reports.length === 5 && reports.every((entry) => entry.contractPass),
};
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
