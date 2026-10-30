import fs from 'node:fs';
import zlib from 'node:zlib';

const indexPath = 'index.html';
const tag = '<script type="__bundler/template">';
const source = fs.readFileSync(indexPath, 'utf8');
const start = source.indexOf(tag) + tag.length;
const end = source.indexOf('</script>', start);
if (start < tag.length || end < 0) throw new Error('Bundler template not found');
const games = {
  1: 'minigames/amendment_1_freedom_defender_v4.html',
  2: 'minigames/rights_range_physics_v2.html',
  4: 'minigames/WARRANT_RUN_Illustrated_Maps_v4_standalone.html',
};
const payload = {};
for (const [am, path] of Object.entries(games)) {
  const html = fs.readFileSync(path);
  payload[am] = zlib.gzipSync(html, { level: 9 }).toString('base64');
}
let inner = fs.readFileSync('game-inner.html', 'utf8');
inner = inner.replace("html=html.replace('<script>',bridge+'<script>')", "html=html.replace('<script>',bridge.replace(/<[^>]*script>$/, '<'+'/script>')+'<script>')");
inner = inner.replace('mini.pending={am:mini.am,storageKey:d.storageKey,state:d.state};', 'mini.pending={...(mini.pending||{}),[d.storageKey]:d.state};');
inner = inner.replace('(s.stats[key]||{}).lockUntil-Date.now()', 'Math.max(...p.steps.map((_,i)=>Number((s.stats[this.pKey(m.id,p.id,i)]||{}).lockUntil||0)))-Date.now()');
inner = inner.replace('<html><head>', '<html><head><script>window.RP_MINIGAMES=' + JSON.stringify(payload) + ';</script>');
if (!inner.includes('window.RP_MINIGAMES=')) throw new Error('Arcade payload insertion failed');
const next = source.slice(0, start) + JSON.stringify(inner).replace(/</g, '\\u003C') + source.slice(end);
fs.writeFileSync(indexPath, next);
const partCount = 40;
const size = Math.ceil(next.length / partCount);
for (let i = 0; i < partCount; i++) {
  fs.writeFileSync(`chunks/game.part.${String(i).padStart(3, '0')}`, next.slice(i * size, (i + 1) * size));
}
console.log(JSON.stringify({ bytes: next.length, chunkSize: size, minigames: Object.fromEntries(Object.entries(payload).map(([am, data]) => [am, data.length])) }));
