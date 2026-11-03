// Hand-rolled PNG icons (no image deps): a volt barbell on iron, drawn on a
// 16x16 grid and nearest-neighbor upscaled. `npm run icons` rewrites public/icons.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const PALETTE = {
  '.': [0x12, 0x12, 0x12, 255],
  V: [0xd6, 0xff, 0x3d, 255],
  v: [0x9d, 0xbd, 0x2a, 255],
  b: [0xf2, 0xef, 0xe8, 255],
};

// Maskable icons crop to a centered circle, so the glyph stays inside ~80%.
const GRID = [
  '................',
  '................',
  '................',
  '................',
  '...VV......VV...',
  '..vVV......VVv..',
  '..vVV......VVv..',
  '.vvVVbbbbbbVVvv.',
  '.vvVVbbbbbbVVvv.',
  '..vVV......VVv..',
  '..vVV......VVv..',
  '...VV......VV...',
  '................',
  '................',
  '................',
  '................',
].map((r) => r.split(''));
const SRC = 16;
function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(pixels, size) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixels(x, y);
      const off = rowStart + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function iconAt(size) {
  return (x, y) => {
    const sx = Math.min(SRC - 1, Math.floor((x * SRC) / size));
    const sy = Math.min(SRC - 1, Math.floor((y * SRC) / size));
    return PALETTE[GRID[sy][sx]];
  };
}

mkdirSync('public/icons', { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
]) {
  writeFileSync(`public/icons/${name}`, encodePng(iconAt(size), size));
  console.log('wrote', name);
}
