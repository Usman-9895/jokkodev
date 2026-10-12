import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
if (!process.env.npm_execpath) throw new Error('Exécuter via pnpm licenses:inventory.');
const raw = execFileSync(process.execPath, [process.env.npm_execpath, 'licenses', 'list', '--json'], { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
const inventory = JSON.parse(raw);
const direct = new Set();
for (const file of ['package.json', 'frontend/package.json', 'backend/package.json', 'packages/api-client/package.json']) {
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) if (!version.startsWith('workspace:')) direct.add(`${name}@${version}`);
}
const rows = [];
const notices = [];
const records = [];
const seen = new Set();
function noticeFiles(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git'].includes(entry.name)) return noticeFiles(path.join(dir, entry.name), relative);
    return entry.isFile() && /^(licen[cs]e|copying|notice|copyright|ofl)([._-]|$)/i.test(entry.name) ? [relative] : [];
  });
}
for (const [license, packages] of Object.entries(inventory)) {
  for (const pkg of packages) {
    for (const dir of pkg.paths) {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    const version = manifest.version;
    const key = `${pkg.name}@${version}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const declared = manifest.license ?? license;
    const text = typeof declared === 'string' ? declared : JSON.stringify(declared);
    const flags = [];
    if (/AGPL|LGPL|\bGPL/i.test(text)) flags.push('Licence exclue ou alternative à arbitrer');
    if (/MPL|EPL/.test(text)) flags.push('Copyleft hors GPL : obligations de redistribution à examiner');
    if (/\bOR\b|\bAND\b|\//.test(text)) flags.push('Expression multiple à relire');
    if (/unknown|unlicensed|see license/i.test(text) || !text) flags.push('Licence inconnue/renvoi à examiner');
    if (/sharp|libvips|pglite|prisma|next|swc|lightningcss/i.test(pkg.name)) flags.push('Examiner aussi composants embarqués/natifs');
    const files = noticeFiles(dir);
    if (!files.length) flags.push('Notice absente du paquet : retrouver la notice à la source');
    const source = `https://registry.npmjs.org/${pkg.name}/${version}`;
    rows.push(`| ${pkg.name} | ${version} | ${direct.has(key) ? 'Directe' : 'Transitive'} | ${text.replaceAll('|', '\\|')} | [npm](${source}) | ${flags.join('; ') || 'Notice à conserver ; déclaration non auditée juridiquement'} |`);
    records.push({ name: pkg.name, version, license: text, source, flags });
    for (const file of files) notices.push(`\n===== ${key} / ${file} =====\n${fs.readFileSync(path.join(dir, file), 'utf8')}`);
    }
  }
}
rows.sort();
records.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
fs.mkdirSync('docs/licenses', { recursive: true });
fs.writeFileSync('docs/licenses/dependency-inventory.json', JSON.stringify(records, null, 2) + '\n');
fs.writeFileSync('docs/licenses/dependency-inventory.md', `# Inventaire des dépendances installées\n\nGénéré par pnpm licenses list --json, puis enrichi avec les manifests et notices des paquets installés. Plateforme : ${process.platform}/${process.arch}. ${rows.length} entrées directes/transitives, production et développement. Relancer pnpm licenses:inventory après installation ou changement du lockfile.\n\nCe contrôle ne certifie pas la conformité complète. Les dépendances natives d’une autre plateforme et bibliothèques embarquées nécessitent une revue complémentaire. Voir open-questions.md et third-party-notices.txt.\n\n| Nom | Version | Portée | Licence déclarée | Source | Point à vérifier |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n`);
fs.writeFileSync('docs/licenses/third-party-notices.txt', 'Notices originales des paquets installés ; ne constitue pas une licence du code JokkoDev.\n' + notices.sort().join('\n'));
console.log(`${rows.length} dépendances inventoriées ; ${notices.length} notices conservées.`);
console.log(JSON.stringify(records.filter(item => item.flags.some(flag => /exclue|multiple|inconnue/.test(flag))), null, 2));
