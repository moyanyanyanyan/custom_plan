// Summarize DSH sessions: header + titles + first/last user & assistant snippets
// Usage: node scan-sessions.js <sessionId> [sessionId...]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const MAGIC = 0xFD2FB528;
const ROOT = 'C:\\Users\\ASUS\\.dsh\\sessions\\--D-deepseek~0020harners--';

function zstdFrames(buf) {
  const out = []; let pos = 0;
  while (pos < buf.length) {
    if (buf.length - pos < 4) break;
    if (buf.readUInt32LE(pos) === MAGIC) {
      const start = pos; pos += 4;
      const fhd = buf[pos++];
      const fcsFlag = (fhd >> 6) & 3;
      const singleSeg = ((fhd >> 5) & 1) === 1;
      const cc = fhd & 1;
      if (!singleSeg) pos += 1;
      pos += fcsFlag === 0 ? (singleSeg ? 1 : 0) : fcsFlag === 1 ? 2 : fcsFlag === 2 ? 4 : 8;
      for (;;) {
        if (pos + 3 > buf.length) return out;
        const bh = buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16);
        pos += 3;
        const last = bh & 1, btype = (bh >> 1) & 3, bsize = bh >> 3;
        pos += btype === 1 ? 1 : bsize;
        if (last) break;
      }
      if (cc) pos += 4;
      try { out.push(zlib.zstdDecompressSync(buf.subarray(start, pos))); }
      catch (e) { try { out.push(zlib.zstdDecompressSync(buf.subarray(start))); } catch (e2) { return out; } }
    } else {
      let i = pos + 1, found = -1;
      for (; i + 4 <= buf.length; i++) if (buf.readUInt32LE(i) === MAGIC) { found = i; break; }
      if (found < 0) break; pos = found;
    }
  }
  return out;
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(b => (b && (b.text ?? b.content ?? '')) || '').filter(Boolean).join('\n');
  return '';
}

const snip = (s, n) => { s = s.replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };

for (const id of process.argv.slice(2)) {
  const file = path.join(ROOT, id, 'session.jsonl.zstd');
  if (!fs.existsSync(file)) { console.log('== ' + id + ' : NOT FOUND'); continue; }
  const frames = zstdFrames(fs.readFileSync(file));
  const lines = [];
  for (const f of frames) lines.push(...f.toString('utf8').split(/\r?\n/));
  let header = {}, titles = [], users = [], assts = [], nUser = 0, nAsst = 0;
  for (const l of lines) {
    if (!l.trim()) continue;
    let o; try { o = JSON.parse(l); } catch (e) { continue; }
    if (o.type === 'session') header = o;
    else if (o.type === 'session/title') titles.push(o.title ?? o.data?.title ?? JSON.stringify(o));
    else if (o.type === 'user/message') { nUser++; const c = o.data?.content; if (typeof c === 'string' && c.trim()) users.push(c.trim()); }
    else if (o.type === 'assistant/message') { nAsst++; const t = textOf(o.data?.message?.content).trim(); if (t) assts.push(t); }
  }
  console.log('===== ' + id);
  console.log('header: createdAt=' + (header.createdAt || '?') + ' cwd=' + (header.cwd || '?') + ' preset=' + (header.agentPreset || '?'));
  console.log('titles: ' + (titles.length ? titles.map(snip).join(' | ') : '(none)'));
  console.log('msgs: user=' + nUser + ' assistant=' + nAsst);
  console.log('firstUser: ' + snip(users[0] || '', 220));
  console.log('lastUser: ' + snip(users[users.length - 1] || '', 220));
  console.log('lastAsst: ' + snip(assts[assts.length - 1] || '', 320));
  console.log('');
}
