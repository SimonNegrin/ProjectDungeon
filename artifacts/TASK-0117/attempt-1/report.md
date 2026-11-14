---
type: Task Report
title: "TASK-0117: informe de ejecución"
description: QA visual en navegador de la corrección UI v7 a 900×700 y 1280×720.
task: TASK-0117
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T17:30:00Z }
artifacts: artifacts/TASK-0117/attempt-1/
verified:
---

# Estado

`success`: las cinco áreas de REQ-033 v7 se ven y se comportan como fijan
TASK-0112 a TASK-0116, sin tocar UI, reglas, docs ni tests existentes.

# Cambios

- Nuevo `tests/e2e/qa-visual-correccion-ui-v7.spec.ts` (12 tests, 6 por
  viewport); reutiliza los helpers de `support.ts` y `artifactPath`.
- Commit SHA: `a9b383adcfce73cc3bd3db48c802eac384f7a711`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` (120 s) | 94 archivos, 1330 tests, tsc, build y bundle | `verify-output.txt` |
| `pnpm run test:e2e` (180 s) | 208/208 en 1,3 min; sin flake de `generated-map-qa` | `e2e-output.txt` |
| E2E del spec con `E2E_ARTIFACTS_DIR` | 12/12 en 6,4 s | `e2e-spec-output.txt` |

# Criterios y evidencia

- **Spec:** cubre las cinco áreas a 900×700 y 1280×720 (`e2e-spec-output.txt`).
- **Bisel:** token 2,347/3,202 px y pintado real 2/3 px en caja y slot; interior
  A/B ≤0,34/0,81 px, exterior ≤0,34/0,81 px, cursor del mapa 2/3 px intacto,
  0 CLS prohibido y columnas sin solape (`logs/<v>/bisel.json`, `bisel-*`).
- **Listas:** stats, arma y traits verticales en HUD izquierdo y ficha, sin `·`;
  condicionales ocultos con altura 0; mago con Magia 4 y Maná 16/16
  (`logs/<v>/listas.json`, `listas-*`).
- **Panel:** títulos arriba, casco = inicio de rejilla y figura (±0), 5 bloques,
  sin nodo cabeza, sin foco ni puntero; piernas bajo la caja 42,25/57,61 px
  (aceptado en TASK-0114) (`logs/<v>/panel.json`, `panel-arriba-*`).
- **Siluetas:** 8 vacíos con máscara `items.png` y `rgb(110,184,168)`; lleno solo
  sprite; reaparece al desequipar; Bolsa/Suelo sin capa; rect y bisel iguales
  (`logs/<v>/siluetas.json`, `siluetas-vacias-*`, `silueta-llena-*`).
- **Cursor:** `rgb(252,255,192)`, 4× línea, z=10 < submenú z=30; 150 ms en
  horizontal, vertical y columna; foco DOM en el slot; instantáneo en apertura,
  resize, scroll y modelo; reducido 0 transiciones y duración 0
  (`logs/<v>/cursor-*.json`, `cursor-submenu-*`, `cursor-reducido-*`).

# Evidencia visual

- `qa-visual-correccion-ui-v7/screenshots/` y `logs/<v>/`; capturas revisadas de
  relieve, listas, panel, siluetas y cursor en ambos tamaños.

# Desviaciones

- Ninguna funcional ni de alcance.
- Chromium pinta 2/3 px de bisel frente a token 2,347/3,202 px; se registran
  ambos sin maquillar la cuantización, como limitación aceptada en TASK-0112
  («≈3 px» como orden visual). No bloquea.
- 2 layout-shift de 0,0007 con fuente no resuelta; el observador no los marca
  como del marco, panel, columnas, títulos o slots (presupuesto prohibido = 0).

# Problemas conocidos y preguntas abiertas

- Ninguno abierto. `docs:check` avisa de tamaños de handoffs previos, del brief
  (3862 B) y de este informe (3369 B); no es un fallo del cambio.

# Fricción reutilizable

Ninguna nueva; la cuantización de borde/outline ya está registrada en TASK-0112.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3862 |
| `report_bytes` | 3369 |
| `overflow` | `none` |
| `criteria_failed` | `none` |
