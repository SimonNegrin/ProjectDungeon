---
type: Task Brief
title: "TASK-0117: brief del intento 1"
description: QA visual integrado de la corrección UI v7 con mediciones, capas y capturas.
task: TASK-0117
attempt: 1
status: stable
brief_bytes: 3862
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T17:25:00Z }
---

# Objetivo

Verificar en navegador real que la UI de REQ-033 v7 se ve y se comporta como
fijan TASK-0112 a TASK-0116, a 900×700 y 1280×720, y dejar capturas, logs y
medidas en `artifacts/TASK-0117/attempt-1/`. Sin tocar `src/**`, `index.html`,
`public/**` ni reglas: el resultado es evidencia y veredicto, no corrección.

# No objetivos

- Implementar o parchear UI; si hay defecto, `blocked` con evidencia.
- Docs/ADR/glosario (TASK-0118), requisitos, arnés y plantillas.
- Cambiar criterios, tests existentes, cursor del mapa ni reglas.

# Invariantes

- `pnpm run verify` y `pnpm run test:e2e` con timeout global (120 s / 180 s).
- No borrar, saltar ni debilitar tests; el spec es nuevo y aditivo.
- No reescribir `artifacts/TASK-0112` a `TASK-0116`.

# Criterios de aceptación

En `docs/tasks/TASK-0117-qa-visual-correccion-ui-v7.md#criterios-de-aceptación`;
el informe debe mapear cada uno a su evidencia.

# Contexto mínimo

- Reutiliza `openState`, `selectPanelRow`, `pressPanelAction`, `settle` y
  `artifactPath` de `tests/e2e/support.ts` y `tests/e2e/artifacts.ts`. Mira los
  specs de 0109 y de 0112-0116; no copies sus tests.
- Crea `tests/e2e/qa-visual-correccion-ui-v7.spec.ts` (nuevo), con ambos
  viewports y los estados de las cinco áreas.
- Requisito: REQ-033 v7, `#requisitos-creativos-decididos` (R-025 a R-031),
  `#composición-del-panel` (P-007/P-008), `#cursor-de-selección` y
  `#requisitos-técnicos` (T-002, T-013, T-014, T-017, T-018).
- Mide, no supongas:
  - Bisel: token (`--ui-line`, `--ui-bevel = 2×`) y **peso pintado real** en
    cajas y slots. En 0112 se midió ≈2 px a 900×700 y ≈3 px a 1280×720 frente a
    token 2,347/3,202 px. Comprueba área interior, crecimiento hacia fuera, sin
    solapes/CLS y cursor del mapa intacto. No maquilles la cuantización: si el
    peso visual no cumple R-025, repórtalo.
  - Listas: cada stat o trait en su línea en ambos HUD, sin `·`, con y sin
    maná/traits.
  - Panel: títulos arriba, casco primer slot, sin bloque de cabeza, torso,
    brazos y piernas visibles; las piernas pueden sobresalir bajo la caja de
    cinco filas (desviación aceptada en 0114). Figura sin foco ni clic.
  - Siluetas: ocho slots de Equipo vacíos con máscara sólida `#6eb8a8`; el lleno
    solo muestra el sprite; al desequipar reaparece; Bolsa y Suelo sin capa;
    tamaño, bisel y encaje sin cambios.
  - Cursor: `rgb(252,255,192)`, borde 4×, capas panel < cursor < submenú,
    transición de 150 ms en horizontal, vertical y entre columnas; instantáneo
    al abrir, scroll, resize, modelo y `prefers-reduced-motion`; foco DOM en el
    slot; sin CLS.
- Flake conocido: `generated-map-qa` (posición tras F2) falló una vez en 0115 y
  no se reprodujo. Si reaparece, guarda la salida completa, aísla el spec y
  registra comando, test, mensaje y resultado al repetir; no edites ese spec.
  Decide si bloquea con esa evidencia.

# Artefactos

- `report.md`, `verify-output.txt` y `e2e-output.txt` en
  `artifacts/TASK-0117/attempt-1/`.
- Capturas y logs con
  `E2E_ARTIFACTS_DIR=artifacts/TASK-0117/attempt-1 pnpm run test:e2e qa-visual-correccion-ui-v7`;
  la ruta real es `artifacts/TASK-0117/attempt-1/<spec>/screenshots|logs/`.
- Commit SHA.

# Riesgos y decisiones abiertas

- Ninguna decisión creativa abierta. Si un hallazgo exige cambiar reglas,
  párate y repórtalo; no lo apliques.
- Distingue token, computed style y píxel pintado: Chromium cuantiza bordes
  fraccionarios.
- No conviertas la QA en una segunda implementación: si algo falla, `blocked`.
