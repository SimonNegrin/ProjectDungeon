---
type: Task Brief
title: "TASK-0049: brief del intento 2"
description: Estabilizar la captura de floor-qa y cerrar tres desviaciones de QA sin relajar aserciones.
task: TASK-0049
attempt: 2
status: stable
brief_bytes: 3173
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T19:13:00Z }
---

# Motivo del relanzamiento

La verificación independiente de `pnpm run test:e2e --repeat-each=3` dio 227
pasan / 1 falla. Falla `tests/e2e/floor-qa.spec.ts:1126` en
`Buffer.compare(firstShot, secondShot)`; reproducción dirigida 47/50. Los PNG
difieren en 4 píxeles con delta 1 (`x=122-123`, `y=82-84`); el canvas
`toDataURL()` sí coincide. Evidencia en `lead-evidence/`.

# Objetivo

Dejar la suite estable en repetición sin debilitar la comprobación de
determinismo y corregir las desviaciones de QA detectadas en el intento 1.

# No objetivos

- Rehacer la adaptación E2E ya verde ni cambiar producción.
- Tocar `experiments/_shell`, otras variantes o dependencias.
- Relajar comparaciones a tolerancias amplias, borrar tests o usar `skip`.

# Invariantes

- La comparación de determinismo sigue siendo exacta byte a byte; si hace falta,
  se estabiliza el momento de captura, no el criterio.
- `pnpm run test:e2e` y `--repeat-each=3` deben pasar de forma reproducible.
- `verify` y la guarda de bundle siguen pasando; sin dependencias nuevas.
- Los criterios no cambian.

# Correcciones requeridas

1. **Flake de `floor-qa`:** esperar una condición de estabilidad antes de cada
   captura (p. ej. dos `toDataURL()` consecutivos iguales separados por
   `requestAnimationFrame`, y `document.fonts.ready`) y conservar el
   `Buffer.compare` exacto. Demostrar con `--repeat-each=20` dirigido + el
   `--repeat-each=3` completo.
2. **Salida sin transición:** reforzar el caso playtest de
   `host-growth-render-qa.spec.ts` para intentar de verdad el paso a la salida
   (para `door`, `MoveTo` al tile de salida rechazado; sin overlay ni cambio de
   seed/estado) en vez de solo terminar turno.
3. **Valores de enemigo:** en `motion-qa.spec.ts` › «moverse sobre un enemigo»
   se cambió `hp/maxHp` de 9 a 20. Quitar ese cambio de valor y adaptar el
   escenario sin alterar el bestiario; si de verdad es imprescindible, justificar
   con evidencia y marcarlo como desviación explícita.
4. **EXP-004:** actualizar la nota obsoleta de `experiment.md` que dice que los
   sliders conservan defaults históricos y que el preset queda pendiente; los
   defaults ya coinciden con la decisión. No cambiar valores.

# Criterios de aceptación

`../../docs/tasks/TASK-0049-e2e-qa-playtest-growth.md#criterios-de-aceptación`.

# Contexto mínimo

- `lead-evidence/` (fallo, PNG y diferencia de píxeles).
- `tests/e2e/floor-qa.spec.ts:1126-1156`.
- `tests/e2e/host-growth-render-qa.spec.ts` (caso playtest).
- `tests/e2e/motion-qa.spec.ts:693`.
- `experiments/EXP-004-salas-irregulares/experiment.md` (paso 10).

# Artefactos

`artifacts/TASK-0049/attempt-2/`: `report.md`, `report-detalle.md` si aplica,
`e2e-output.txt`, `e2e-repeat-output.txt`, `verify-output.txt`,
`bundle-output.txt` y evidencias del flake dirigido. Commit en `task/TASK-0049`.
