---
type: Task Verification
title: "TASK-0140: verificación independiente del lead"
description: Reejecución independiente de tests, E2E y revisión del diff de guardado.
status: stable
task: TASK-0140
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T17:48:00Z }
---

# Alcance revisado

Diff `main...task/TASK-0140` (fusión `9294f32`): `src/host/save-game.ts`,
cableado del efecto `save` en `src/host/main.ts`, región viva
`pause-save-message` en `pause-menu-view.ts` e `index.html`, tests nuevos y
artefactos. Sin cambios en `src/game/**`, `package.json`, `pnpm-lock.yaml`,
requisitos ni arnés. Los tests existentes no se modifican ni se debilitan.

# Comandos

| Comando | Timeout | Resultado |
|---|---:|---|
| `pnpm run verify` | 240 s | 106 archivos/1654 tests; docs 680/160/6; config 4/3; tsc y build (91 módulos) OK; bundle 16 archivos/88 módulos OK |
| `pnpm run test:e2e` | 180 s | 243/243 en 1.8 m, incluidos los 2 de `save-game.spec.ts` |
| `unzip -l artifacts/TASK-0140/attempt-1/save-sample.zip` | 15 s | `manifiesto.json` (198 B) y `partida.json` (32539 B), sin entradas extra |
| `shasum -a 256` | 15 s | `3ada7437…ffe93d`, coincide con `save-sample.sha256` |

# Criterios

1. Disponibilidad y motivo: cubiertos por `pause-menu.test.ts` y el E2E de
   TASK-0139; el cableado solo actúa con `effect: 'save'`.
2. Un único zip con manifiesto y partida: E2E y unitario; sin claves de
   presentación.
3. Nombre UTC y dos segundos distintos: unitario `saveFileName` y dos guardados
   con reloj inyectado.
4. Construcción desde el motor: `saveGame` delega en `buildSaveFiles` y
   `writeSaveZip`; el host no conoce el esquema.
5. Error visible sin descarga: E2E con estado sin mapa y unitario con zip
   inyectado que falla; la descarga no se llama.
6. Tests y verify: pasan en la verificación independiente.

# Observaciones

- Guardar no muestra confirmación de éxito; el archivo descargado es la señal.
- La lectura de `.zip`/`.json` sigue en TASK-0141; ADR-028 y la documentación
  completa del formato en TASK-0145.
