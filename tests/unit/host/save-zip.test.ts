import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  readSaveZip,
  SaveZipError,
  writeSaveZip,
  type SaveZipErrorCode,
} from '../../../src/host/save-zip';

const MANIFEST = JSON.stringify({
  format_version: 1,
  summary: { players: [{ name: 'Ana' }, { name: 'Bru' }] },
});
const SAVE = JSON.stringify({
  format_version: 1,
  notes: 'ñandú\nlínea dos\n"comillas"',
});

const LOCAL_SIGNATURE = 0x0403_4b50;
const CENTRAL_SIGNATURE = 0x0201_4b50;
const EOCD_SIGNATURE = 0x0605_4b50;
const UTF8_FLAG = 0x0800;
const DATA_DESCRIPTOR_FLAG = 0x0008;
const ENCRYPTED_FLAG = 0x0001;

const encoder = new TextEncoder();

function encode(text: string): Uint8Array {
  return encoder.encode(text);
}

function writeU16(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeU32(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb8_8320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffff_ffff;
  for (let index = 0; index < bytes.byteLength; index += 1) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffff_ffff) >>> 0;
}

async function compressRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  const writing = (async () => {
    await writer.write(new Uint8Array(data));
    await writer.close();
  })();
  writing.catch(() => undefined);

  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  await writing;
  return concat(chunks);
}

interface EntrySpec {
  name?: string;
  nameBytes?: Uint8Array;
  /** Contenido sin comprimir; se usa para CRC y tamaños por defecto. */
  data?: Uint8Array;
  /** Bytes que se escriben en el archivo (comprimidos si method es 8). */
  payload?: Uint8Array;
  method?: number;
  flags?: number;
  crc?: number;
  uncompressedSize?: number;
  compressedSize?: number;
  localNameBytes?: Uint8Array;
  localFlags?: number;
  localMethod?: number;
  localCrc?: number;
  localUncompressedSize?: number;
  localCompressedSize?: number;
}

interface ZipOptions {
  entryCount?: number;
  entriesOnDisk?: number;
  disk?: number;
  centralDisk?: number;
  centralSize?: number;
  centralOffset?: number;
  centralSignature?: number;
  localSignature?: number;
  comment?: Uint8Array;
  truncateTo?: number;
}

/** Construye un ZIP mínimo con campos manipulables para probar el lector. */
function buildZip(specs: readonly EntrySpec[], options: ZipOptions = {}): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  const records: { spec: EntrySpec; nameBytes: Uint8Array; localOffset: number }[] = [];
  let localOffset = 0;

  for (const spec of specs) {
    const nameBytes = spec.nameBytes ?? encode(spec.name ?? '');
    const data = spec.data ?? new Uint8Array(0);
    const payload = spec.payload ?? data;
    const flags = spec.flags ?? UTF8_FLAG;
    const method = spec.method ?? 0;
    const crc = spec.crc ?? crc32(data);
    const uncompressedSize = spec.uncompressedSize ?? data.byteLength;
    const compressedSize = spec.compressedSize ?? payload.byteLength;
    const localNameBytes = spec.localNameBytes ?? nameBytes;
    const localFlags = spec.localFlags ?? flags;
    const localMethod = spec.localMethod ?? method;
    const localCrc = spec.localCrc ?? crc;
    const localUncompressedSize = spec.localUncompressedSize ?? uncompressedSize;
    const localCompressedSize = spec.localCompressedSize ?? compressedSize;

    const localHeader = new Uint8Array(30 + localNameBytes.byteLength);
    writeU32(localHeader, 0, options.localSignature ?? LOCAL_SIGNATURE);
    writeU16(localHeader, 4, 20);
    writeU16(localHeader, 6, localFlags);
    writeU16(localHeader, 8, localMethod);
    writeU16(localHeader, 10, 0);
    writeU16(localHeader, 12, (1 << 5) | 1);
    writeU32(localHeader, 14, localCrc);
    writeU32(localHeader, 18, localCompressedSize);
    writeU32(localHeader, 22, localUncompressedSize);
    writeU16(localHeader, 26, localNameBytes.byteLength);
    writeU16(localHeader, 28, 0);
    localHeader.set(localNameBytes, 30);

    localParts.push(localHeader, payload);
    records.push({ spec, nameBytes, localOffset });
    localOffset += localHeader.byteLength + payload.byteLength;
  }

  for (const record of records) {
    const { spec, nameBytes, localOffset: entryOffset } = record;
    const data = spec.data ?? new Uint8Array(0);
    const payload = spec.payload ?? data;
    const flags = spec.flags ?? UTF8_FLAG;
    const method = spec.method ?? 0;
    const crc = spec.crc ?? crc32(data);
    const uncompressedSize = spec.uncompressedSize ?? data.byteLength;
    const compressedSize = spec.compressedSize ?? payload.byteLength;

    const centralHeader = new Uint8Array(46 + nameBytes.byteLength);
    writeU32(centralHeader, 0, options.centralSignature ?? CENTRAL_SIGNATURE);
    writeU16(centralHeader, 4, 20);
    writeU16(centralHeader, 6, 20);
    writeU16(centralHeader, 8, flags);
    writeU16(centralHeader, 10, method);
    writeU16(centralHeader, 12, 0);
    writeU16(centralHeader, 14, (1 << 5) | 1);
    writeU32(centralHeader, 16, crc);
    writeU32(centralHeader, 20, compressedSize);
    writeU32(centralHeader, 24, uncompressedSize);
    writeU16(centralHeader, 28, nameBytes.byteLength);
    writeU16(centralHeader, 30, 0);
    writeU16(centralHeader, 32, 0);
    writeU16(centralHeader, 34, 0);
    writeU16(centralHeader, 36, 0);
    writeU32(centralHeader, 38, 0);
    writeU32(centralHeader, 42, entryOffset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);
  }

  const localBytes = concat(localParts);
  const centralBytes = concat(centralParts);
  const comment = options.comment ?? new Uint8Array(0);
  const centralOffset = options.centralOffset ?? localBytes.byteLength;
  const centralSize = options.centralSize ?? centralBytes.byteLength;
  const eocd = new Uint8Array(22 + comment.byteLength);
  writeU32(eocd, 0, EOCD_SIGNATURE);
  writeU16(eocd, 4, options.disk ?? 0);
  writeU16(eocd, 6, options.centralDisk ?? 0);
  writeU16(eocd, 8, options.entriesOnDisk ?? options.entryCount ?? specs.length);
  writeU16(eocd, 10, options.entryCount ?? specs.length);
  writeU32(eocd, 12, centralSize);
  writeU32(eocd, 16, centralOffset);
  writeU16(eocd, 20, comment.byteLength);
  eocd.set(comment, 22);

  const zip = concat([localBytes, centralBytes, eocd]);
  return options.truncateTo === undefined ? zip : zip.slice(0, options.truncateTo);
}

async function expectZipError(promise: Promise<unknown>, code: SaveZipErrorCode): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(SaveZipError);
    expect((error as SaveZipError).name).toBe('SaveZipError');
    expect((error as SaveZipError).code).toBe(code);
    expect((error as Error).message.length).toBeGreaterThan(0);
    return;
  }
  throw new Error(`Se esperaba SaveZipError(${code}) y la lectura resolvió.`);
}

function withTempZip(zip: Uint8Array, run: (path: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), 'task-0137-'));
  const path = join(directory, 'muestra.zip');
  try {
    writeFileSync(path, zip);
    run(path);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('writeSaveZip', () => {
  it('hace round-trip con acentos y saltos de línea', async () => {
    const zip = await writeSaveZip({ manifest: MANIFEST, save: SAVE });

    expect(zip).toBeInstanceOf(Uint8Array);
    await expect(readSaveZip(zip)).resolves.toEqual({ manifest: MANIFEST, save: SAVE });
  });

  it('produce los mismos bytes para el mismo contenido', async () => {
    const first = await writeSaveZip({ manifest: MANIFEST, save: SAVE });
    const second = await writeSaveZip({ manifest: MANIFEST, save: SAVE });

    expect(second).toEqual(first);
  });

  it('genera un zip legible por unzip del sistema', async () => {
    const zip = await writeSaveZip({ manifest: MANIFEST, save: SAVE });
    const hash = createHash('sha256').update(zip).digest('hex');
    console.log(`muestra.zip sha256=${hash} bytes=${zip.byteLength}`);

    withTempZip(zip, (path) => {
      const listing = execFileSync('unzip', ['-t', path], { encoding: 'utf8' });
      expect(listing).toContain('No errors detected');
      expect(execFileSync('unzip', ['-p', path, 'manifiesto.json'], { encoding: 'utf8' })).toBe(
        MANIFEST,
      );
      expect(execFileSync('unzip', ['-p', path, 'partida.json'], { encoding: 'utf8' })).toBe(SAVE);
    });
  });

  it('rechaza un archivo que supera 5 MB sin comprimir', async () => {
    const tooLarge = 'a'.repeat(5 * 1024 * 1024 + 1);
    await expectZipError(writeSaveZip({ manifest: tooLarge, save: SAVE }), 'too-large-uncompressed');
  });
});

describe('readSaveZip', () => {
  it('lee un zip store construido a mano', async () => {
    const zip = buildZip([
      { name: 'manifiesto.json', data: encode(MANIFEST) },
      { name: 'partida.json', data: encode(SAVE) },
    ]);

    await expect(readSaveZip(zip)).resolves.toEqual({ manifest: MANIFEST, save: SAVE });
  });

  it('lee un zip deflate construido fuera del escritor', async () => {
    const manifestBytes = encode(MANIFEST);
    const saveBytes = encode(SAVE);
    const zip = buildZip([
      {
        name: 'manifiesto.json',
        data: manifestBytes,
        payload: await compressRaw(manifestBytes),
        method: 8,
      },
      {
        name: 'partida.json',
        data: saveBytes,
        payload: await compressRaw(saveBytes),
        method: 8,
      },
    ]);

    await expect(readSaveZip(zip)).resolves.toEqual({ manifest: MANIFEST, save: SAVE });
  });

  it('acepta bit 3 usando los tamaños del directorio central', async () => {
    const manifestBytes = encode(MANIFEST);
    const saveBytes = encode(SAVE);
    const flags = UTF8_FLAG | DATA_DESCRIPTOR_FLAG;
    const zip = buildZip([
      {
        name: 'manifiesto.json',
        data: manifestBytes,
        flags,
        localCrc: 0,
        localCompressedSize: 0,
        localUncompressedSize: 0,
      },
      {
        name: 'partida.json',
        data: saveBytes,
        flags,
        localCrc: 0,
        localCompressedSize: 0,
        localUncompressedSize: 0,
      },
    ]);

    await expect(readSaveZip(zip)).resolves.toEqual({ manifest: MANIFEST, save: SAVE });
  });
});

describe('readSaveZip: corrupción', () => {
  it('rechaza un zip truncado', async () => {
    const zip = await writeSaveZip({ manifest: MANIFEST, save: SAVE });
    await expectZipError(readSaveZip(zip.slice(0, zip.byteLength - 10)), 'corrupt');
  });

  it('rechaza una firma local mala', async () => {
    const zip = buildZip(
      [
        { name: 'manifiesto.json', data: encode(MANIFEST) },
        { name: 'partida.json', data: encode(SAVE) },
      ],
      { localSignature: 0xdead_beef },
    );
    await expectZipError(readSaveZip(zip), 'corrupt');
  });

  it('rechaza una firma del directorio central mala', async () => {
    const zip = buildZip(
      [
        { name: 'manifiesto.json', data: encode(MANIFEST) },
        { name: 'partida.json', data: encode(SAVE) },
      ],
      { centralSignature: 0xdead_beef },
    );
    await expectZipError(readSaveZip(zip), 'corrupt');
  });

  it('rechaza un directorio central fuera de rango', async () => {
    const zip = buildZip(
      [
        { name: 'manifiesto.json', data: encode(MANIFEST) },
        { name: 'partida.json', data: encode(SAVE) },
      ],
      { centralOffset: 0x7fff_ffff },
    );
    await expectZipError(readSaveZip(zip), 'corrupt');
  });

  it('rechaza un CRC-32 erróneo', async () => {
    const zip = buildZip([
      { name: 'manifiesto.json', data: encode(MANIFEST), crc: 0 },
      { name: 'partida.json', data: encode(SAVE) },
    ]);
    await expectZipError(readSaveZip(zip), 'corrupt');
  });

  it('rechaza contenido que no es UTF-8 válido', async () => {
    const invalid = new Uint8Array([0xff, 0xfe, 0x80]);
    const zip = buildZip([
      { name: 'manifiesto.json', data: invalid },
      { name: 'partida.json', data: encode(SAVE) },
    ]);
    await expectZipError(readSaveZip(zip), 'corrupt');
  });

  it('rechaza un nombre local que no coincide con el central', async () => {
    const zip = buildZip([
      { name: 'manifiesto.json', data: encode(MANIFEST), localNameBytes: encode('otro.json') },
      { name: 'partida.json', data: encode(SAVE) },
    ]);
    await expectZipError(readSaveZip(zip), 'corrupt');
  });

  it('rechaza bytes extra después del EOCD', async () => {
    const zip = await writeSaveZip({ manifest: MANIFEST, save: SAVE });
    const withGarbage = concat([zip, new Uint8Array([0])]);
    await expectZipError(readSaveZip(withGarbage), 'corrupt');
  });
});

describe('readSaveZip: estructura', () => {
  it('rechaza más de 4 entradas', async () => {
    const zip = buildZip([
      { name: 'manifiesto.json', data: encode(MANIFEST) },
      { name: 'partida.json', data: encode(SAVE) },
      { name: 'extra-1.json', data: encode('{}') },
      { name: 'extra-2.json', data: encode('{}') },
      { name: 'extra-3.json', data: encode('{}') },
    ]);
    await expectZipError(readSaveZip(zip), 'too-many-entries');
  });

  it('rechaza una entrada extra', async () => {
    const zip = buildZip([
      { name: 'manifiesto.json', data: encode(MANIFEST) },
      { name: 'partida.json', data: encode(SAVE) },
      { name: 'extra.json', data: encode('{}') },
    ]);
    await expectZipError(readSaveZip(zip), 'unexpected-entry');
  });

  it('rechaza un nombre desconocido', async () => {
    const zip = buildZip([
      { name: 'manifiesto.json', data: encode(MANIFEST) },
      { name: 'otro.json', data: encode(SAVE) },
    ]);
    await expectZipError(readSaveZip(zip), 'unexpected-entry');
  });

  it.each([
    ['carpeta/', 'directory-entry'],
    ['a/b.json', 'path-entry'],
    ['../x.json', 'path-entry'],
    ['C:x.json', 'path-entry'],
    ['a\\b.json', 'path-entry'],
    ['a\0b.json', 'path-entry'],
  ] as const)('rechaza el nombre %j como %s', async (name, code) => {
    const zip = buildZip([
      { name: 'manifiesto.json', data: encode(MANIFEST) },
      { name, data: encode(SAVE) },
    ]);
    await expectZipError(readSaveZip(zip), code);
  });

  it('rechaza una entrada duplicada', async () => {
    const zip = buildZip([
      { name: 'manifiesto.json', data: encode(MANIFEST) },
      { name: 'manifiesto.json', data: encode(MANIFEST) },
    ]);
    await expectZipError(readSaveZip(zip), 'duplicate-entry');
  });

  it('rechaza un zip al que le falta una entrada', async () => {
    const zip = buildZip([{ name: 'manifiesto.json', data: encode(MANIFEST) }]);
    await expectZipError(readSaveZip(zip), 'missing-entry');
  });

  it('rechaza un zip cifrado', async () => {
    const flags = UTF8_FLAG | ENCRYPTED_FLAG;
    const zip = buildZip([
      { name: 'manifiesto.json', data: encode(MANIFEST), flags },
      { name: 'partida.json', data: encode(SAVE), flags },
    ]);
    await expectZipError(readSaveZip(zip), 'unsupported-feature');
  });

  it('rechaza un método de compresión no soportado', async () => {
    const zip = buildZip([
      { name: 'manifiesto.json', data: encode(MANIFEST), method: 12 },
      { name: 'partida.json', data: encode(SAVE) },
    ]);
    await expectZipError(readSaveZip(zip), 'unsupported-method');
  });

  it('rechaza un zip con marca ZIP64 en el EOCD', async () => {
    const zip = buildZip(
      [
        { name: 'manifiesto.json', data: encode(MANIFEST) },
        { name: 'partida.json', data: encode(SAVE) },
      ],
      { entryCount: 0xffff, entriesOnDisk: 0xffff },
    );
    await expectZipError(readSaveZip(zip), 'unsupported-feature');
  });
});

describe('readSaveZip: límites', () => {
  it('rechaza un archivo comprimido de más de 5 MB antes de parsear', async () => {
    const tooLarge = new Uint8Array(5 * 1024 * 1024 + 1);
    await expectZipError(readSaveZip(tooLarge), 'too-large-compressed');
  });

  it('rechaza un archivo que declara más de 5 MB sin comprimir', async () => {
    const zip = buildZip([
      {
        name: 'manifiesto.json',
        data: encode(MANIFEST),
        uncompressedSize: 5 * 1024 * 1024 + 1,
        compressedSize: 5 * 1024 * 1024 + 1,
      },
      { name: 'partida.json', data: encode(SAVE) },
    ]);
    await expectZipError(readSaveZip(zip), 'too-large-uncompressed');
  });

  it('rechaza una suma declarada de más de 20 MB sin comprimir', async () => {
    const zip = buildZip([
      {
        name: 'manifiesto.json',
        data: encode(MANIFEST),
        uncompressedSize: 4 * 1024 * 1024,
        compressedSize: 4 * 1024 * 1024,
      },
      {
        name: 'partida.json',
        data: encode(SAVE),
        uncompressedSize: 17 * 1024 * 1024,
        compressedSize: 17 * 1024 * 1024,
      },
    ]);
    await expectZipError(readSaveZip(zip), 'too-large-uncompressed');
  });

  it('aborta una bomba deflate que expande por encima de 5 MB', async () => {
    const bomb = new Uint8Array(5 * 1024 * 1024 + 1);
    const payload = await compressRaw(bomb);
    const zip = buildZip([
      { name: 'manifiesto.json', data: encode(MANIFEST) },
      {
        name: 'partida.json',
        data: encode(SAVE),
        payload,
        method: 8,
        uncompressedSize: 16,
        compressedSize: payload.byteLength,
      },
    ]);

    await expectZipError(readSaveZip(zip), 'too-large-uncompressed');
  });
});
