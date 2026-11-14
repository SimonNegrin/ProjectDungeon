---
type: Lead Verification
title: "TASK-0117: verificación independiente del intento 1"
description: Comprobación de criterios, diff, tests y evidencia del QA visual de la corrección UI v7.
task: TASK-0117
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T17:36:00Z }
---

# Resultado

Aceptado. Intento 1 (`success`) verificado sobre la rama `task/TASK-0117`.

# Diff revisado

- Spec `739901d`; informe `2ac08fe`; brief `33cb88a`.
- Solo `tests/e2e/qa-visual-correccion-ui-v7.spec.ts` (1.866 líneas) y
  `artifacts/TASK-0117/`; sin cambios en `src/**`, `index.html`, `public/**`,
  requisitos, arnés, plantillas, dependencias ni tests existentes.
- 12 tests (6 por viewport), sin `skip`, `only`, `fixme` ni `todo`.
- Artefactos de TASK-0112 a TASK-0116 sin reescribir.

# Comandos reejecutados

| Comando | Timeout | Resultado |
|---|---:|---|
| `pnpm run verify` | 120 s | OK: docs, config, 1.330/1.330 tests, tsc, build y bundle |
| `pnpm run test:e2e` | 180 s | OK: 208/208 en 1,4 min; sin fallo de `generated-map-qa` |

Salidas en `lead-verify-output.txt` y `lead-e2e-output.txt`. Sin procesos
escuchando en 4173 tras el E2E.

# Criterios

- Spec nuevo con ambos viewports y capturas/logs en
  `qa-visual-correccion-ui-v7/`.
- Bisel: token continuo `2,347/3,202 px` y pintado real `2/3 px` en columna y
  slot; cobertura ponderada 2/3, interior A/B ≤0,81 px, sin solapes y 0 CLS
  prohibido; cursor del mapa 2/3 px intacto. La cuantización de Chromium se
  registra sin maquillar y se acepta como en TASK-0112/T-002 («≈3 px» como orden
  visual).
- Listas verticales en HUD izquierdo y ficha, sin `·`; variantes con y sin
  maná/traits y con arma.
- Panel: tres títulos arriba, casco primer slot, sin nodo de cabeza, cinco
  bloques de figura sin foco ni puntero; piernas >2 px bajo la caja de cinco
  filas (42,25/57,61 px), `overflow` visible y sin recorte del cuerpo.
- Siluetas: 8 slots de Equipo vacíos con máscara de `items.png` y
  `rgb(110,184,168)`; el lleno solo muestra sprite; reaparece al desequipar;
  Bolsa y Suelo sin capa; rect y bisel estables.
- Cursor: `rgb(252,255,192)`, borde 4×, cursor 10 < submenú 30, contenido sin
  `z-index`, transición `transform` de 150 ms en horizontal, vertical y columna;
  apertura, resize, scroll, modelo y reducido instantáneos; foco DOM y
  `aria-current` en el slot; sin CLS.
- Capturas revisadas: `cursor-panel-*`, `cursor-submenu-*`, `cursor-mapa-*`,
  `cursor-reducido-*`, `panel-arriba-*`, `siluetas-vacias-*`, `silueta-llena-*`,
  `silueta-reaparece-*`, `bisel-*`, `listas-*` a 900×700 y 1280×720.
- El fallo intermitente de `generated-map-qa` no reapareció en las dos pasadas
  completas del lead (208/208 cada una); no hay bloqueo.

# Fricción

- Ninguna propuesta nueva. La cuantización de borde/outline ya está registrada
  en TASK-0112 y no se reabre.
- `docs:check` avisa del tamaño de handoffs históricos y de los handoffs de este
  intento (3.862/3.842 B), por encima del objetivo de 2.560 B y por debajo del
  tope de 4.096 B; no es un fallo del cambio.
