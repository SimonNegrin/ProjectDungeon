/**
 * Contenedor `.zip` propio para el guardado local (REQ-024 T-003/T-006).
 *
 * Escribe un ZIP clásico (sin ZIP64) con `manifiesto.json` y `partida.json` en
 * la raíz usando `CompressionStream('deflate-raw')`, y lo lee aceptando entradas
 * `store` y `deflate`. No conoce el esquema JSON: solo transporta texto UTF-8.
 *
 * Los límites se comprueban antes de descomprimir y también durante la
 * descompresión, porque los tamaños declarados en un archivo no son confiables.
 */

export interface SaveZipFiles {
  readonly manifest: string;
  readonly save: string;
}

export type SaveZipErrorCode =
  | 'too-large-compressed'
  | 'too-many-entries'
  | 'missing-entry'
  | 'unexpected-entry'
  | 'directory-entry'
  | 'path-entry'
  | 'duplicate-entry'
  | 'unsupported-method'
  | 'unsupported-feature'
  | 'too-large-uncompressed'
  | 'corrupt';

/** Error tipado del contenedor; nunca devuelve entradas parciales. */
export class SaveZipError extends Error {
  readonly code: SaveZipErrorCode;

  constructor(code: SaveZipErrorCode, message: string) {
    super(message);
    this.name = 'SaveZipError';
    this.code = code;
  }
}

export const SAVE_ZIP_MANIFEST_NAME = 'manifiesto.json';
export const SAVE_ZIP_SAVE_NAME = 'partida.json';

const MAX_ZIP_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 20 * 1024 * 1024;
const MAX_FILE_UNCOMPRESSED_BYTES = 5 * 1024 * 1024;
const MAX_ENTRIES = 4;

const LOCAL_HEADER_SIGNATURE = 0x0403_4b50;
const CENTRAL_HEADER_SIGNATURE = 0x0201_4b50;
const EOCD_SIGNATURE = 0x0605_4b50;

const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const EOCD_SIZE = 22;

const VERSION_NEEDED = 20;
const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;
const FLAG_ENCRYPTED = 0x0001;
const FLAG_DATA_DESCRIPTOR = 0x0008;
const FLAG_STRONG_ENCRYPTION = 0x0040;
const FLAG_UTF8 = 0x0800;
/** 1980-01-01 00:00:00 en formato DOS; fija la salida determinista. */
const DOS_TIME = 0;
const DOS_DATE = (1 << 5) | 1;

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

function readU16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

function concatChunks(chunks: readonly Uint8Array[], total: number): Uint8Array {
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new SaveZipError('corrupt', 'El contenido del .zip no es UTF-8 válido.');
  }
}

/**
 * Los flujos de compresión tipan la escritura como `BufferSource` respaldado por
 * `ArrayBuffer`, mientras que `Uint8Array` admite `SharedArrayBuffer`. Los bytes
 * son siempre memoria local del ZIP, así que se acota el tipo sin copiar.
 */
function asBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}

/** Descomprime `deflate-raw` sin materializar más de `limit` bytes. */
async function inflateRawBounded(compressed: Uint8Array, limit: number): Promise<Uint8Array> {
  const stream = new DecompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  const writePromise = (async () => {
    await writer.write(asBufferSource(compressed));
    await writer.close();
  })();
  // Evita un rechazo no gestionado si el lector cancela antes de consumir todo.
  writePromise.catch(() => undefined);

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (total + value.byteLength > limit) {
        await reader.cancel().catch(() => undefined);
        throw new SaveZipError(
          'too-large-uncompressed',
          `Una entrada descomprime más de ${MAX_FILE_UNCOMPRESSED_BYTES} bytes.`,
        );
      }
      chunks.push(value);
      total += value.byteLength;
    }
    await writePromise;
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    await writePromise.catch(() => undefined);
    if (error instanceof SaveZipError) throw error;
    throw new SaveZipError('corrupt', 'Los datos comprimidos del .zip están dañados.');
  }

  return concatChunks(chunks, total);
}

/** Comprime con `deflate-raw` (método 8) sin usar dependencias. */
async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  const writePromise = (async () => {
    await writer.write(asBufferSource(data));
    await writer.close();
  })();
  writePromise.catch(() => undefined);

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
    await writePromise;
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    await writePromise.catch(() => undefined);
    throw error;
  }

  return concatChunks(chunks, total);
}

interface PreparedEntry {
  readonly name: string;
  readonly nameBytes: Uint8Array;
  readonly data: Uint8Array;
  readonly compressed: Uint8Array;
  readonly crc: number;
}

/**
 * Escribe un `.zip` determinista con las dos entradas en la raíz.
 *
 * Mismo contenido de entrada produce los mismos bytes: no se usa fecha real ni
 * azar. Se valida el tamaño antes de comprimir y el resultado final antes de
 * concatenar.
 */
export async function writeSaveZip(files: SaveZipFiles): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const manifestData = encoder.encode(files.manifest);
  const saveData = encoder.encode(files.save);

  for (const [name, data] of [
    [SAVE_ZIP_MANIFEST_NAME, manifestData],
    [SAVE_ZIP_SAVE_NAME, saveData],
  ] as const) {
    if (data.byteLength > MAX_FILE_UNCOMPRESSED_BYTES) {
      throw new SaveZipError(
        'too-large-uncompressed',
        `${name} supera el límite de ${MAX_FILE_UNCOMPRESSED_BYTES} bytes sin comprimir.`,
      );
    }
  }

  if (manifestData.byteLength + saveData.byteLength > MAX_TOTAL_UNCOMPRESSED_BYTES) {
    throw new SaveZipError(
      'too-large-uncompressed',
      `El guardado supera el límite de ${MAX_TOTAL_UNCOMPRESSED_BYTES} bytes sin comprimir.`,
    );
  }

  const [manifestCompressed, saveCompressed] = await Promise.all([
    deflateRaw(manifestData),
    deflateRaw(saveData),
  ]);

  const entries: PreparedEntry[] = [
    {
      name: SAVE_ZIP_MANIFEST_NAME,
      nameBytes: encoder.encode(SAVE_ZIP_MANIFEST_NAME),
      data: manifestData,
      compressed: manifestCompressed,
      crc: crc32(manifestData),
    },
    {
      name: SAVE_ZIP_SAVE_NAME,
      nameBytes: encoder.encode(SAVE_ZIP_SAVE_NAME),
      data: saveData,
      compressed: saveCompressed,
      crc: crc32(saveData),
    },
  ];

  const localSize = entries.reduce(
    (sum, entry) => sum + LOCAL_HEADER_SIZE + entry.nameBytes.byteLength + entry.compressed.byteLength,
    0,
  );
  const centralSize = entries.reduce(
    (sum, entry) => sum + CENTRAL_HEADER_SIZE + entry.nameBytes.byteLength,
    0,
  );
  const totalSize = localSize + centralSize + EOCD_SIZE;

  if (totalSize > MAX_ZIP_BYTES) {
    throw new SaveZipError(
      'too-large-compressed',
      `El .zip resultante supera el límite de ${MAX_ZIP_BYTES} bytes comprimidos.`,
    );
  }

  const parts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const localHeader = new Uint8Array(LOCAL_HEADER_SIZE + entry.nameBytes.byteLength);
    writeU32(localHeader, 0, LOCAL_HEADER_SIGNATURE);
    writeU16(localHeader, 4, VERSION_NEEDED);
    writeU16(localHeader, 6, FLAG_UTF8);
    writeU16(localHeader, 8, METHOD_DEFLATE);
    writeU16(localHeader, 10, DOS_TIME);
    writeU16(localHeader, 12, DOS_DATE);
    writeU32(localHeader, 14, entry.crc);
    writeU32(localHeader, 18, entry.compressed.byteLength);
    writeU32(localHeader, 22, entry.data.byteLength);
    writeU16(localHeader, 26, entry.nameBytes.byteLength);
    writeU16(localHeader, 28, 0);
    localHeader.set(entry.nameBytes, LOCAL_HEADER_SIZE);
    parts.push(localHeader, entry.compressed);

    const centralHeader = new Uint8Array(CENTRAL_HEADER_SIZE + entry.nameBytes.byteLength);
    writeU32(centralHeader, 0, CENTRAL_HEADER_SIGNATURE);
    writeU16(centralHeader, 4, VERSION_NEEDED);
    writeU16(centralHeader, 6, VERSION_NEEDED);
    writeU16(centralHeader, 8, FLAG_UTF8);
    writeU16(centralHeader, 10, METHOD_DEFLATE);
    writeU16(centralHeader, 12, DOS_TIME);
    writeU16(centralHeader, 14, DOS_DATE);
    writeU32(centralHeader, 16, entry.crc);
    writeU32(centralHeader, 20, entry.compressed.byteLength);
    writeU32(centralHeader, 24, entry.data.byteLength);
    writeU16(centralHeader, 28, entry.nameBytes.byteLength);
    writeU16(centralHeader, 30, 0);
    writeU16(centralHeader, 32, 0);
    writeU16(centralHeader, 34, 0);
    writeU16(centralHeader, 36, 0);
    writeU32(centralHeader, 38, 0);
    writeU32(centralHeader, 42, localOffset);
    centralHeader.set(entry.nameBytes, CENTRAL_HEADER_SIZE);
    centralParts.push(centralHeader);

    localOffset += localHeader.byteLength + entry.compressed.byteLength;
  }

  const centralOffset = localOffset;
  const eocd = new Uint8Array(EOCD_SIZE);
  writeU32(eocd, 0, EOCD_SIGNATURE);
  writeU16(eocd, 4, 0);
  writeU16(eocd, 6, 0);
  writeU16(eocd, 8, entries.length);
  writeU16(eocd, 10, entries.length);
  writeU32(eocd, 12, centralSize);
  writeU32(eocd, 16, centralOffset);
  writeU16(eocd, 20, 0);

  return concatChunks([...parts, ...centralParts, eocd], totalSize);
}

interface CentralEntry {
  readonly name: string;
  readonly nameBytes: Uint8Array;
  readonly flags: number;
  readonly method: number;
  readonly crc: number;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly localOffset: number;
}

/** Busca el EOCD solo en la ventana permitida por el comentario del ZIP. */
function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const first = Math.max(0, bytes.byteLength - (EOCD_SIZE + 0xffff));
  for (let offset = bytes.byteLength - EOCD_SIZE; offset >= first; offset -= 1) {
    if (readU32(bytes, offset) !== EOCD_SIGNATURE) continue;
    const commentLength = readU16(bytes, offset + 20);
    if (offset + EOCD_SIZE + commentLength === bytes.byteLength) return offset;
  }
  return -1;
}

function hasZip64Extra(bytes: Uint8Array, extraOffset: number, extraLength: number): boolean {
  let cursor = extraOffset;
  const end = extraOffset + extraLength;
  while (cursor + 4 <= end) {
    const id = readU16(bytes, cursor);
    const size = readU16(bytes, cursor + 2);
    if (id === 0x0001) return true;
    cursor += 4 + size;
  }
  return false;
}

function validateEntryName(name: string, seen: ReadonlySet<string>): void {
  if (name.endsWith('/')) {
    throw new SaveZipError('directory-entry', `El .zip contiene una carpeta: "${name}".`);
  }
  if (
    name.includes('/') ||
    name.includes('\\') ||
    name.includes('\0') ||
    name.includes('..') ||
    /^[A-Za-z]:/.test(name)
  ) {
    throw new SaveZipError('path-entry', `El .zip contiene una ruta no permitida: "${name}".`);
  }
  if (seen.has(name)) {
    throw new SaveZipError('duplicate-entry', `El .zip contiene una entrada duplicada: "${name}".`);
  }
  if (name !== SAVE_ZIP_MANIFEST_NAME && name !== SAVE_ZIP_SAVE_NAME) {
    throw new SaveZipError('unexpected-entry', `El .zip contiene una entrada inesperada: "${name}".`);
  }
}

function parseCentralDirectory(
  bytes: Uint8Array,
  offset: number,
  size: number,
  entryCount: number,
): CentralEntry[] {
  const entries: CentralEntry[] = [];
  const seen = new Set<string>();
  let cursor = offset;
  const end = offset + size;

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + CENTRAL_HEADER_SIZE > end) {
      throw new SaveZipError('corrupt', 'El directorio central del .zip está truncado.');
    }
    if (readU32(bytes, cursor) !== CENTRAL_HEADER_SIGNATURE) {
      throw new SaveZipError('corrupt', 'Firma del directorio central inválida.');
    }

    const flags = readU16(bytes, cursor + 8);
    const method = readU16(bytes, cursor + 10);
    const crc = readU32(bytes, cursor + 16);
    const compressedSize = readU32(bytes, cursor + 20);
    const uncompressedSize = readU32(bytes, cursor + 24);
    const nameLength = readU16(bytes, cursor + 28);
    const extraLength = readU16(bytes, cursor + 30);
    const commentLength = readU16(bytes, cursor + 32);
    const diskStart = readU16(bytes, cursor + 34);
    const localOffset = readU32(bytes, cursor + 42);
    const recordEnd = cursor + CENTRAL_HEADER_SIZE + nameLength + extraLength + commentLength;

    if (recordEnd > end || recordEnd > bytes.byteLength) {
      throw new SaveZipError('corrupt', 'Una entrada del directorio central excede el archivo.');
    }
    if (
      compressedSize === 0xffff_ffff ||
      uncompressedSize === 0xffff_ffff ||
      localOffset === 0xffff_ffff ||
      diskStart === 0xffff
    ) {
      throw new SaveZipError('unsupported-feature', 'El .zip usa ZIP64, que no está soportado.');
    }
    if (hasZip64Extra(bytes, cursor + CENTRAL_HEADER_SIZE + nameLength, extraLength)) {
      throw new SaveZipError('unsupported-feature', 'El .zip usa el campo extra ZIP64.');
    }

    const nameBytes = bytes.subarray(
      cursor + CENTRAL_HEADER_SIZE,
      cursor + CENTRAL_HEADER_SIZE + nameLength,
    );
    const name = decodeUtf8(nameBytes);
    validateEntryName(name, seen);

    if (diskStart !== 0) {
      throw new SaveZipError('unsupported-feature', 'El .zip ocupa varios discos.');
    }
    if ((flags & (FLAG_ENCRYPTED | FLAG_STRONG_ENCRYPTION)) !== 0) {
      throw new SaveZipError('unsupported-feature', 'El .zip está cifrado.');
    }
    if (method !== METHOD_STORE && method !== METHOD_DEFLATE) {
      throw new SaveZipError(
        'unsupported-method',
        `El método de compresión ${method} no está soportado.`,
      );
    }

    seen.add(name);
    entries.push({
      name,
      nameBytes,
      flags,
      method,
      crc,
      compressedSize,
      uncompressedSize,
      localOffset,
    });
    cursor = recordEnd;
  }

  if (cursor !== end) {
    throw new SaveZipError('corrupt', 'El tamaño del directorio central no coincide.');
  }
  return entries;
}

function readEntryData(
  bytes: Uint8Array,
  entry: CentralEntry,
  centralOffset: number,
): Uint8Array {
  const localOffset = entry.localOffset;
  if (localOffset + LOCAL_HEADER_SIZE > centralOffset) {
    throw new SaveZipError('corrupt', 'La cabecera local apunta fuera del archivo.');
  }
  if (readU32(bytes, localOffset) !== LOCAL_HEADER_SIGNATURE) {
    throw new SaveZipError('corrupt', 'Firma de la cabecera local inválida.');
  }

  const localFlags = readU16(bytes, localOffset + 6);
  const localMethod = readU16(bytes, localOffset + 8);
  const localCrc = readU32(bytes, localOffset + 14);
  const localCompressedSize = readU32(bytes, localOffset + 18);
  const localUncompressedSize = readU32(bytes, localOffset + 22);
  const localNameLength = readU16(bytes, localOffset + 26);
  const localExtraLength = readU16(bytes, localOffset + 28);
  const localNameStart = localOffset + LOCAL_HEADER_SIZE;
  const localNameEnd = localNameStart + localNameLength;
  const dataStart = localNameEnd + localExtraLength;

  if (dataStart > centralOffset) {
    throw new SaveZipError('corrupt', 'La cabecera local excede el directorio central.');
  }
  if (!equalBytes(bytes.subarray(localNameStart, localNameEnd), entry.nameBytes)) {
    throw new SaveZipError('corrupt', 'El nombre local no coincide con el directorio central.');
  }
  if (localFlags !== entry.flags || localMethod !== entry.method) {
    throw new SaveZipError('corrupt', 'La cabecera local no coincide con el directorio central.');
  }
  if ((entry.flags & FLAG_DATA_DESCRIPTOR) === 0) {
    if (
      localCrc !== entry.crc ||
      localCompressedSize !== entry.compressedSize ||
      localUncompressedSize !== entry.uncompressedSize
    ) {
      throw new SaveZipError('corrupt', 'Los tamaños locales no coinciden con el directorio central.');
    }
  }
  if (hasZip64Extra(bytes, localNameEnd, localExtraLength)) {
    throw new SaveZipError('unsupported-feature', 'El .zip usa el campo extra ZIP64.');
  }

  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > centralOffset) {
    throw new SaveZipError('corrupt', 'Los datos de una entrada exceden el directorio central.');
  }
  return bytes.subarray(dataStart, dataEnd);
}

/** Lee un `.zip` de guardado con límites y errores tipados. */
export async function readSaveZip(data: Uint8Array | ArrayBuffer): Promise<SaveZipFiles> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

  if (bytes.byteLength > MAX_ZIP_BYTES) {
    throw new SaveZipError(
      'too-large-compressed',
      `El .zip supera el límite de ${MAX_ZIP_BYTES} bytes comprimidos.`,
    );
  }
  if (bytes.byteLength < EOCD_SIZE) {
    throw new SaveZipError('corrupt', 'El archivo es demasiado pequeño para ser un .zip.');
  }

  const eocdOffset = findEndOfCentralDirectory(bytes);
  if (eocdOffset < 0) {
    throw new SaveZipError('corrupt', 'No se encuentra el final del directorio central.');
  }

  const disk = readU16(bytes, eocdOffset + 4);
  const centralDisk = readU16(bytes, eocdOffset + 6);
  const entriesOnDisk = readU16(bytes, eocdOffset + 8);
  const totalEntries = readU16(bytes, eocdOffset + 10);
  const centralSize = readU32(bytes, eocdOffset + 12);
  const centralOffset = readU32(bytes, eocdOffset + 16);
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== totalEntries) {
    throw new SaveZipError('unsupported-feature', 'El .zip ocupa varios discos.');
  }
  if (totalEntries === 0xffff || centralSize === 0xffff_ffff || centralOffset === 0xffff_ffff) {
    throw new SaveZipError('unsupported-feature', 'El .zip usa ZIP64, que no está soportado.');
  }
  if (totalEntries > MAX_ENTRIES) {
    throw new SaveZipError(
      'too-many-entries',
      `El .zip contiene ${totalEntries} entradas; el máximo es ${MAX_ENTRIES}.`,
    );
  }
  if (
    centralOffset + centralSize > eocdOffset ||
    centralOffset + centralSize > bytes.byteLength
  ) {
    throw new SaveZipError('corrupt', 'El directorio central apunta fuera del archivo.');
  }

  const entries = parseCentralDirectory(bytes, centralOffset, centralSize, totalEntries);

  if (
    !entries.some((entry) => entry.name === SAVE_ZIP_MANIFEST_NAME) ||
    !entries.some((entry) => entry.name === SAVE_ZIP_SAVE_NAME)
  ) {
    throw new SaveZipError('missing-entry', 'Falta manifiesto.json o partida.json en el .zip.');
  }

  let declaredTotal = 0;
  for (const entry of entries) declaredTotal += entry.uncompressedSize;
  if (declaredTotal > MAX_TOTAL_UNCOMPRESSED_BYTES) {
    throw new SaveZipError(
      'too-large-uncompressed',
      `El .zip declara más de ${MAX_TOTAL_UNCOMPRESSED_BYTES} bytes sin comprimir.`,
    );
  }
  for (const entry of entries) {
    if (entry.uncompressedSize > MAX_FILE_UNCOMPRESSED_BYTES) {
      throw new SaveZipError(
        'too-large-uncompressed',
        `${entry.name} declara más de ${MAX_FILE_UNCOMPRESSED_BYTES} bytes sin comprimir.`,
      );
    }
  }

  const texts = new Map<string, string>();
  let totalUncompressed = 0;

  for (const entry of entries) {
    const payload = readEntryData(bytes, entry, centralOffset);
    let content: Uint8Array;

    if (entry.method === METHOD_STORE) {
      if (entry.compressedSize !== entry.uncompressedSize) {
        throw new SaveZipError('corrupt', 'Una entrada store declara tamaños distintos.');
      }
      content = payload;
    } else {
      const limit = Math.min(
        MAX_FILE_UNCOMPRESSED_BYTES,
        MAX_TOTAL_UNCOMPRESSED_BYTES - totalUncompressed,
      );
      content = await inflateRawBounded(payload, limit);
    }

    if (content.byteLength !== entry.uncompressedSize) {
      throw new SaveZipError('corrupt', 'El tamaño real no coincide con el declarado.');
    }
    if (crc32(content) !== entry.crc) {
      throw new SaveZipError('corrupt', 'El CRC-32 de una entrada no coincide.');
    }
    totalUncompressed += content.byteLength;
    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new SaveZipError(
        'too-large-uncompressed',
        `El .zip descomprime más de ${MAX_TOTAL_UNCOMPRESSED_BYTES} bytes.`,
      );
    }
    texts.set(entry.name, decodeUtf8(content));
  }

  const manifest = texts.get(SAVE_ZIP_MANIFEST_NAME);
  const save = texts.get(SAVE_ZIP_SAVE_NAME);
  if (manifest === undefined || save === undefined) {
    throw new SaveZipError('missing-entry', 'Falta manifiesto.json o partida.json en el .zip.');
  }
  return { manifest, save };
}
