// DSH session archive reader (multi-frame zstd jsonl)
// Usage: node decode-session.js <sessionDirOrFile> [maxMessages]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MAGIC = 0xFD2FB528; // zstd frame magic, LE

// Walk zstd frames, returning array of decompressed Buffer per frame.
function zstdFrames(buf) {
  const out = [];
  let pos = 0;
  while (pos < buf.length) {
    if (buf.length - pos < 4) break;
    const m = buf.readUInt32LE(pos);
    if (m === MAGIC) {
      // parse frame header
      const start = pos;
      pos += 4; // magic
      const fhd = buf[pos++];
      const fcsFlag = (fhd >> 6) & 3;
      const singleSeg = ((fhd >> 5) & 1) === 1;
      const checksumFlag = fhd & 1;
      if (!singleSeg) pos += 1; // window descriptor
      const fcsBytes = fcsFlag === 0 ? (singleSeg ? 1 : 0) : fcsFlag === 1 ? 2 : fcsFlag === 2 ? 4 : 8;
      pos += fcsBytes;
      // blocks
      for (;;) {
        if (pos + 3 > buf.length) return out; // truncated
        const bh = buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16);
        pos += 3;
        const last = bh & 1;
        const btype = (bh >> 1) & 3;
        const bsize = bh >> 3; // 21-bit block size
        let contentBytes = bsize;
        if (btype === 1) contentBytes = 1; // RLE: single byte content
        else if (btype === 3) return out;  // reserved -> bail
        pos += contentBytes;
        if (last) break;
      }
      if (checksumFlag) pos += 4;
      let frame;
      try {
        frame = zlib.zstdDecompressSync(buf.subarray(start, pos));
      } catch (e) {
        // last resort: try decompress from start to EOF
        try { frame = zlib.zstdDecompressSync(buf.subarray(start)); }
        catch (e2) { return out; }
      }
      out.push(frame);
    } else if ((m & 0xFFFFFFF0) === 0x184D2A50) {
      // skippable frame: 4-byte size
      const size = buf.readUInt32LE(pos + 4);
      pos += 8 + size;
    } else {
      // garbage / non-zstd prefix: scan for next magic
      const idx = findMagic(buf, pos + 1);
      if (idx < 0) break;
      pos = idx;
    }
  }
  return out;
}

function findMagic(buf, from) {
  for (let i = from; i + 4 <= buf.length; i++) {
    if (buf.readUInt32LE(i) === MAGIC) return i;
  }
  return -1;
}

function decodeFile(file) {
  const buf = fs.readFileSync(file);
  // fast path: single frame
  try {
    const t = zlib.zstdDecompressSync(buf).toString('utf8');
    if (t.split(/\r?\n/).filter(l => l.trim()).length > 1 || buf.length < 4096) return t;
  } catch (e) { /* multi-frame */ }
  return zstdFrames(buf).map(f => f.toString('utf8')).join('\n');
}

const target = process.argv[2];
const maxMsg = parseInt(process.argv[3] || '10', 10);
let file = target;
if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
  file = path.join(target, 'session.jsonl.zstd');
}
if (!fs.existsSync(file)) { console.error('NOT FOUND: ' + file); process.exit(1); }
const text = decodeFile(file);
const lines = text.split(/\r?\n/).filter(l => l.trim());
console.log('=== decoded chars:', text.length, '| json lines:', lines.length, '===');

const stats = {};
const chat = [];
let firstKey = null;
const extractText = (obj) => {
  const role = obj.role || obj.author?.role || obj.message?.role || obj.payload?.role || obj.data?.role || obj.participant?.role;
  const content = obj.content ?? obj.text ?? obj.message?.content ?? obj.payload?.content ?? obj.data?.content;
  return { role, content };
};
for (const line of lines) {
  let obj = null;
  try { obj = JSON.parse(line); } catch (e) { continue; }
  const type = obj.type || obj.kind || obj.event || '?';
  stats[type] = (stats[type] || 0) + 1;
  if (!firstKey) firstKey = Object.keys(obj).join(',');
  const d = obj.data;
  let role = d && (d.role || d.message?.role);
  let t = '';
  if (type === 'user/message' && d && typeof d.content === 'string') {
    t = d.content;
  } else if (type === 'assistant/message' && d && d.message) {
    const c = d.message.content;
    if (typeof c === 'string') t = c;
    else if (Array.isArray(c)) t = c.map(b => (b && (b.text ?? b.content ?? '')) || '').filter(Boolean).join('\n');
  } else {
    continue; // reasoning/text chunks, tool events, etc. are not clean chat turns
  }
  if (!role || !t.trim()) continue;
  chat.push({ role, seq: obj.seq ?? obj.seq0 ?? 0, text: t.trim() });
}
console.log('event types:', JSON.stringify(stats));
console.log('first line keys:', firstKey);
console.log('chat-like records:', chat.length);
const which = process.argv[4] === 'first' ? chat.slice(0, maxMsg) : chat.slice(-maxMsg);
console.log('--- ' + (process.argv[4] === 'first' ? 'first' : 'last') + ' ' + which.length + ' chat messages ---');
for (const m of which) {
  const s = m.text.length > 700 ? m.text.slice(0, 700) + '…[' + m.text.length + ' chars]' : m.text;
  console.log('[' + m.role + ' #' + m.seq + '] ' + s.replace(/\r?\n/g, '⏎'));
  console.log('---');
}
