---
type: Task Brief
title: "TASK-0137: brief del intento 1"
description: Contenedor `.zip` propio para guardado local con límites.
task: TASK-0137
attempt: 1
status: stable
brief_bytes: 2184
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:58:44Z }
---

# Objetivo

Crear `src/host/save-zip.ts`: escritor determinista de un `.zip` con
`manifiesto.json` y `partida.json` en la raíz y lector con límites y errores
tipados, usando solo APIs del navegador (`CompressionStream`/`DecompressionStream`
en `deflate-raw`) y sin dependencias. Lo consumirán TASK-0140 y TASK-0141.

# No objetivos

- Manifiesto/esquema v1 (TASK-0138); descarga, selector, pausa o UI
  (TASK-0139/0140/0141).
- Cifrado, firmas, ZIP64, `eval`, red o dependencias nuevas.
- Escribir entradas `store`; solo leerlas.

# Invariantes

- Solo los nombres `manifiesto.json` y `partida.json`, en la raíz.
- Límites antes de descomprimir: 5 MB comprimido, 20 MB total, 4 entradas y
  5 MB por archivo; ningún rechazo deja estado parcial.
- Leer `brief-detalle.md` antes de editar: fija API, formato y códigos.
- Motor y reglas intactos; no borrar, saltar ni debilitar tests;
  `package.json` y `pnpm-lock.yaml` no cambian.

# Criterios de aceptación

`docs/tasks/TASK-0137-host-contenedor-zip.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/game/config.ts`: estilo de error tipado con `code`.
- `docs/requirements/REQ-024-menu-pausa-guardado.md#requisitos-técnicos`
  (T-003 y T-006) y `#formato-de-guardado-v1`.
- El test nuevo es `tests/unit/host/save-zip.test.ts`; Vitest corre en Node 22,
  que ya expone `CompressionStream`/`DecompressionStream` globales.
- El lector estándar de la evidencia es `unzip` del sistema, solo en test.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `commit.txt`, y un `.zip` de
muestra o su hash si aplica; sin capturas (no hay UI).

# Riesgos y decisiones abiertas

- `deflate-raw` es obligatorio para el método 8; `deflate` (zlib) no es ZIP.
- Los tamaños declarados son datos no confiables: acotar también al descomprimir.
- Si `lib.dom` no tipa `deflate-raw`, usar un cast local documentado, sin `any`
  innecesario.
