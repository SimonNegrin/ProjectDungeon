---
type: Task Report
title: "TASK-0170: informe de ejecución"
description: Apertura de cofre, columna «Cofre», depósito, feedback y HUD por cursor.
task: TASK-0170
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T17:40:00Z }
artifacts: artifacts/TASK-0170/attempt-1/
verified:
---

# Estado

`success`. El cofre se abre con `Espacio`/`Enter` gastando 1 acción; el panel
muestra «Cofre» o «Suelo» con una sola fuente; el HUD derecho distingue cerrado y
abierto; coger, depositar y coger todo usan la navegación existente.

# Cambios

- `input.ts`: sobre un cofre, `Espacio`/`Enter` envían `OpenContainer`; la
  adyacencia y el coste los decide el motor.
- `main.ts`: el panel se abre en «Cofre» solo si la apertura fue aceptada; `I`
  abre «Suelo».
- `inventory-panel*.ts`: fuente `ground`/cofre, filas de cofre, acción
  `deposit`, cabecera «Cofre» con capacidad y exclusión de suelo/cadáveres.
- `hud-detail.ts`: cofre cerrado sin contenido y abierto con sus objetos.
- `presentation.ts`, `motion.ts`, `feedback-events.ts` y `feedback-config.ts`:
  cues con beat para abrir (300 ms) y transferir (250 ms).
- `renderer.ts` y `keymap.ts`: marcador provisional de cofre y ayuda «moverse /
  abrir».
- Tests: unitarios de input, panel, HUD, feedback, renderer y HTML; E2E
  `chest-loot-panel-qa.spec.ts`.
- Commit SHA: `bb01f3f2f73b36a01762ccd639cac34fb8a9a080` y
  `e0c153050a556b13b78cf8993b9da1b30a641c2b`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 116 archivos, 1890 tests, docs, tsc, build y bundle | `verify-output.txt` |
| `pnpm run test:e2e` | OK: 287 tests | `e2e-output.txt` |
| E2E del cofre | 2/2 | `chest-loot-panel-qa/screenshots/` |

# Evidencia visual

- `chest-loot-panel-qa/screenshots/`: panel «Cofre» y «Suelo» a 1280×720 y
  900×700, y mapa con el cofre cerrado y abierto.
- Mirar: «Cofre 2/4» sin suelo/cadáveres; «Suelo» con cadáver y objeto del tile;
  HUD con estado y contenido; banner `Daga → Cofre`.

# Desviaciones

- La matriz de REQ-017 no se editó: `docs/**` es de `game-lead`. El host ya
  produce cue, banner y beat de abrir y transferir; la fila documental queda
  pendiente. Es el único criterio no sostenido por este intento.
- El cofre del mapa es un marcador provisional de Canvas, no un sprite, por la
  restricción de no añadir arte definitivo.
- El panel no se abre para un fantasma, así que su coste de 1 acción por
  transferencia no se representa; la regla del motor queda intacta.

# Problemas conocidos y preguntas abiertas

- Para pasar de «Cofre» a «Suelo» hay que cerrar y pulsar `I` (R-011).

# Fricción reutilizable

Sin entradas: no hay un disparador nuevo.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 (primer intento, sin brief) |
| `report_bytes` | 2960 |
| `overflow` | `none` |
| `criteria_failed` | 1 (fila de REQ-017, pendiente de `docs/`) |
