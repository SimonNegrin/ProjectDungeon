---
type: Task Brief Detail
title: "TASK-0137: contrato del contenedor .zip"
description: API, formato binario, códigos de error y matriz de tests del zip.
task: TASK-0137
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T00:00:00Z }
---

# API

```ts
export interface SaveZipFiles {
  readonly manifest: string;
  readonly save: string;
}

export async function writeSaveZip(files: SaveZipFiles): Promise<Uint8Array>;
export async function readSaveZip(data: Uint8Array | ArrayBuffer): Promise<SaveZipFiles>;
```

- `manifest` se escribe como `manifiesto.json` y `save` como `partida.json`.
- Mismo contenido de entrada ⇒ mismos bytes de salida (sin fecha real, sin azar).
- El módulo no conoce el esquema JSON: solo transporta texto UTF-8.

# Errores

`SaveZipError extends Error` con `code`:

`too-large-compressed`, `too-many-entries`, `missing-entry`,
`unexpected-entry`, `directory-entry`, `path-entry`, `duplicate-entry`,
`unsupported-method`, `unsupported-feature`, `too-large-uncompressed`, `corrupt`.

Mensaje en español y `name = 'SaveZipError'`. Un error nunca devuelve entradas
parciales ni deja recursos abiertos (`reader.cancel()` si aplica).

# Escritor

- ZIP clásico sin ZIP64: cabeceras locales, datos, directorio central y EOCD.
- Método 8 (`deflate`) con `CompressionStream('deflate-raw')`; sin cifrado ni
  data descriptor. Bit 11 (UTF-8) activo, bit 3 apagado.
- Versión 20; CRC-32 IEEE de los datos sin comprimir; fecha DOS fija
  `1980-01-01 00:00:00` para que la salida sea determinista.
- Validar antes de comprimir: cada archivo ≤ 5 MB, total ≤ 20 MB y resultado
  comprimido ≤ 5 MB; si no, error tipado.

# Lector

1. Rechazar `data.byteLength > 5 MB` antes de parsear (`too-large-compressed`).
2. Localizar el EOCD en los últimos 65 557 bytes; rechazar disco múltiple,
   ZIP64 o comentario incoherente (`unsupported-feature`/`corrupt`).
3. Leer el directorio central; rechazar más de 4 entradas
   (`too-many-entries`), nombres distintos de los dos permitidos
   (`unexpected-entry`), duplicados (`duplicate-entry`), nombres con `/`, `\`,
   `..`, ruta absoluta, unidad o NUL (`path-entry`) y nombres terminados en `/`
   (`directory-entry`). Exigir exactamente las dos entradas (`missing-entry`).
4. Rechazar cifrado, ZIP64 y métodos distintos de 0 y 8
   (`unsupported-feature`/`unsupported-method`) antes de descomprimir.
5. Comprobar tamaño declarado por archivo ≤ 5 MB y suma ≤ 20 MB
   (`too-large-uncompressed`) antes de descomprimir.
6. Verificar que la cabecera local coincide con el directorio central; aceptar
   bit 3 usando los tamaños del directorio central.
7. `store`: recortar los bytes declarados. `deflate`: `DecompressionStream(
   'deflate-raw')` leyendo por chunks, abortando en cuanto el total real supere
   el límite por archivo o el acumulado.
8. Comprobar CRC-32 del resultado; decodificar UTF-8 con `TextDecoder` fatal.
   Cualquier desajuste es `corrupt`.

# Matriz de tests (`tests/unit/host/save-zip.test.ts`)

- Round-trip escritor→lector con acentos y saltos de línea; bytes deterministas.
- Zip del escritor abierto con `unzip -t` y `unzip -p` (fixture temporal).
- Lector de un zip `store` construido en el test (helper binario propio).
- Corruptos: truncado, firma mala, directorio fuera de rango, CRC erróneo,
  UTF-8 inválido.
- Estructura: entrada extra, nombre desconocido, `carpeta/`, `a/b.json`,
  `../x.json`, duplicado, entrada faltante.
- Límites: archivo comprimido > 5 MB, declarado > 5 MB por archivo, suma > 20 MB,
  más de 4 entradas y bomba deflate que expande por encima de 5 MB con tamaño
  declarado pequeño; comprobar que no se materializa más de lo permitido.
- Todos los rechazos: `SaveZipError` con `code` esperado; sin estado parcial.
