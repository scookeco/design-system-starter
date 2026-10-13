/**
 * A QR code encoder, no dependency: byte mode, error correction level M, versions 1 to 10 (up to
 * 213 bytes: a document id, a URL). Follows ISO/IEC 18004; the mask is chosen by the standard's
 * penalty rules. Returns the modules as rows of booleans (true = dark), without the quiet zone.
 */

/** Error correction codewords per block, and blocks, for level M, by version (index 0 unused). */
const ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const MAX_VERSION = 10;

/** Modules available for data and error correction in a version. */
const rawModules = (version: number) => {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) result -= 36;
  }
  return result;
};

const dataCodewords = (version: number) => Math.floor(rawModules(version) / 8) - (ECC_PER_BLOCK[version] ?? 0) * (BLOCKS[version] ?? 0);

/** Multiplication in GF(2^8) modulo x^8 + x^4 + x^3 + x^2 + 1. */
const gfMul = (x: number, y: number) => {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
};

const rsDivisor = (degree: number) => {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = gfMul(result[j] ?? 0, root);
      if (j + 1 < degree) result[j] = (result[j] ?? 0) ^ (result[j + 1] ?? 0);
    }
    root = gfMul(root, 0x02);
  }
  return result;
};

const rsRemainder = (data: readonly number[], divisor: readonly number[]) => {
  const result = new Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() ?? 0);
    result.push(0);
    divisor.forEach((d, i) => {
      result[i] = (result[i] ?? 0) ^ gfMul(d, factor);
    });
  }
  return result;
};

const alignmentPositions = (version: number) => {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < count; pos -= step) result.splice(1, 0, pos);
  return result;
};

const bit = (value: number, i: number) => ((value >>> i) & 1) !== 0;

const MASKS: readonly ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** The standard's penalty for a symbol: runs, 2×2 blocks, finder-like patterns, dark/light balance. Lower is better. */
function penalty(modules: readonly (readonly boolean[])[]) {
  const size = modules.length;
  let score = 0;
  const line = (get: (i: number) => boolean) => {
    let run = 1;
    for (let i = 1; i <= size; i += 1) {
      if (i < size && get(i) === get(i - 1)) run += 1;
      else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
    const bits = Array.from({ length: size }, (_, i) => get(i));
    const finder = [true, false, true, true, true, false, true];
    for (let i = 0; i + 7 <= size; i += 1) {
      if (!finder.every((v, k) => bits[i + k] === v)) continue;
      const before = i >= 4 && bits.slice(i - 4, i).every((v) => !v);
      const after = i + 11 <= size && bits.slice(i + 7, i + 11).every((v) => !v);
      if (before || after) score += 40;
    }
  };
  for (let y = 0; y < size; y += 1) line((x) => modules[y]?.[x] ?? false);
  for (let x = 0; x < size; x += 1) line((y) => modules[y]?.[x] ?? false);
  for (let y = 0; y + 1 < size; y += 1) {
    for (let x = 0; x + 1 < size; x += 1) {
      const c = modules[y]?.[x];
      if (c === modules[y]?.[x + 1] && c === modules[y + 1]?.[x] && c === modules[y + 1]?.[x + 1]) score += 3;
    }
  }
  const dark = modules.reduce((n, row) => n + row.filter(Boolean).length, 0);
  const total = size * size;
  score += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
  return score;
}

export class QrError extends Error {}

/** Encodes text (as UTF-8) as a QR code, level M, the smallest version 1–10 that fits. */
export function encodeQr(text: string): boolean[][] {
  const bytes = [...new TextEncoder().encode(text)];
  let version = 1;
  const bitsFor = (v: number) => 4 + (v < 10 ? 8 : 16) + bytes.length * 8;
  while (version <= MAX_VERSION && bitsFor(version) > dataCodewords(version) * 8) version += 1;
  if (version > MAX_VERSION) throw new QrError(`Too long for a version ${String(MAX_VERSION)} QR code: ${String(bytes.length)} bytes`);
  const size = version * 4 + 17;
  const capacity = dataCodewords(version);

  // Data: byte mode, the count, the bytes, a terminator, then pad bytes.
  const bits: number[] = [];
  const append = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
  };
  append(0b0100, 4);
  append(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) append(b, 8);
  append(0, Math.min(4, capacity * 8 - bits.length));
  append(0, (8 - (bits.length % 8)) % 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((acc, b) => (acc << 1) | b, 0));
  for (let pad = 0xec; data.length < capacity; pad ^= 0xec ^ 0x11) data.push(pad);

  // Error correction per block, then interleaved.
  const blocks = BLOCKS[version] ?? 1;
  const eccLength = ECC_PER_BLOCK[version] ?? 0;
  const rawCodewords = Math.floor(rawModules(version) / 8);
  const shortBlocks = blocks - (rawCodewords % blocks);
  const shortLength = Math.floor(rawCodewords / blocks);
  const divisor = rsDivisor(eccLength);
  const all: number[][] = [];
  for (let i = 0, k = 0; i < blocks; i += 1) {
    const length = shortLength - eccLength + (i < shortBlocks ? 0 : 1);
    const block = data.slice(k, k + length);
    k += length;
    const ecc = rsRemainder(block, divisor);
    if (i < shortBlocks) block.push(0);
    all.push([...block, ...ecc]);
  }
  const codewords: number[] = [];
  for (let i = 0; i < (all[0]?.length ?? 0); i += 1) {
    all.forEach((block, j) => {
      if (i !== shortLength - eccLength || j >= shortBlocks) codewords.push(block[i] ?? 0);
    });
  }

  // Function patterns.
  const modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fixed = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, dark: boolean) => {
    const row = modules[y];
    const fixedRow = fixed[y];
    if (!row || !fixedRow || x < 0 || x >= size) return;
    row[x] = dark;
    fixedRow[x] = true;
  };
  for (let i = 0; i < size; i += 1) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ] as const) {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const y = cy + dy;
        if (y < 0 || y >= size) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(cx + dx, y, d !== 2 && d !== 4);
      }
    }
  }
  const align = alignmentPositions(version);
  align.forEach((ay, i) => {
    align.forEach((ax, j) => {
      const last = align.length - 1;
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    });
  });
  const drawFormat = (mask: number) => {
    const data5 = (0b00 << 3) | mask; // level M is 00
    let rem = data5;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const format = ((data5 << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i += 1) set(8, i, bit(format, i));
    set(8, 7, bit(format, 6));
    set(8, 8, bit(format, 7));
    set(7, 8, bit(format, 8));
    for (let i = 9; i < 15; i += 1) set(14 - i, 8, bit(format, i));
    for (let i = 0; i < 8; i += 1) set(size - 1 - i, 8, bit(format, i));
    for (let i = 8; i < 15; i += 1) set(8, size - 15 + i, bit(format, i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const info = (version << 12) | rem;
    for (let i = 0; i < 18; i += 1) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, bit(info, i));
      set(b, a, bit(info, i));
    }
  }

  // Codewords in the zigzag, upward and downward in two-module columns, skipping the timing column.
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        const row = modules[y];
        if (!row || fixed[y]?.[x]) continue;
        if (i < codewords.length * 8) {
          row[x] = bit(codewords[i >>> 3] ?? 0, 7 - (i & 7));
          i += 1;
        }
      }
    }
  }

  // The mask with the lowest penalty.
  const masked = (mask: number) => {
    const copy = modules.map((row) => [...row]);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const row = copy[y];
        if (row && !fixed[y]?.[x] && MASKS[mask]?.(x, y)) row[x] = !row[x];
      }
    }
    return copy;
  };
  let best = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    drawFormat(mask);
    const score = penalty(masked(mask));
    if (score < bestScore) {
      best = mask;
      bestScore = score;
    }
  }
  drawFormat(best);
  return masked(best);
}
