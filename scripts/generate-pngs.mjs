import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPng(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(2, 9); // color type 2: Truecolor (RGB)
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw image data with filter byte (0) per scanline
  const scanlineLength = 1 + width * 3;
  const rawData = Buffer.alloc(height * scanlineLength);

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.42;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      // Calculate distance from center to draw a nice circular badge
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        // Emerald / Lime green gradient
        const factor = (y / height) * 0.4;
        rawData[pxOffset] = Math.min(255, Math.floor(16 + factor * 50));     // R
        rawData[pxOffset + 1] = Math.min(255, Math.floor(185 + factor * 60)); // G
        rawData[pxOffset + 2] = Math.min(255, Math.floor(129 - factor * 40)); // B
      } else {
        // Dark background #09090b
        rawData[pxOffset] = 9;
        rawData[pxOffset + 1] = 9;
        rawData[pxOffset + 2] = 11;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buffer = Buffer.alloc(4 + 4 + len + 4);
  buffer.writeUInt32BE(len, 0);
  buffer.write(type, 4, 4, 'ascii');
  data.copy(buffer, 8);

  const crc = crc32(buffer.subarray(4, 8 + len));
  buffer.writeUInt32BE(crc, 8 + len);
  return buffer;
}

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), createPng(192, 192, 16, 185, 129));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), createPng(512, 512, 16, 185, 129));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), createPng(512, 512, 16, 185, 129));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), createPng(180, 180, 16, 185, 129));
fs.writeFileSync(path.join(outDir, 'favicon.ico'), createPng(32, 32, 16, 185, 129));

console.log('Successfully generated all PWA PNG icons in /public');
