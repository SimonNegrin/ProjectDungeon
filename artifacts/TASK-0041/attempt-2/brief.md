---
type: Task Brief
title: "TASK-0041: brief del intento 2"
description: Corregir el fallback de spawn para conservar la separación ≥2 y endurecer los tests; el resto de la v2 se mantiene.
task: TASK-0041
attempt: 2
status: stable
brief_bytes: 3381
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T11:25:00Z }
---

# Objetivo

Corregir el único fallo de aceptación del intento 1: el spawn relaja la
separación entre huecos del grupo. Mantén el resto de la v2 (puertas, enemigos,
métricas, controles y capturas) y entrega evidencia honesta del fallback. No se
toca producción.

# No objetivos

- No rehacer puertas, fórmula de enemigos, UI ni capturas ya válidas.
- No tocar `src/`, `tests/`, el `index.html` raíz ni `public/`.
- No decidir la variante ni cerrar `REQ-011`/`REQ-012`.

# Invariantes

- `party[0]` sigue siendo el acceso (suelo interior junto a la puerta/boca más
  cercana al centro, desempate por id).
- **Ningún par de huecos de `spawns.party` puede estar a Chebyshev <2**, ni en
  fallback. La separación no se relaja nunca.
- Si no caben 6 huecos separados ni en radio 2, ni en radio 3, ni en la sala
  completa, devuelve los que quepan (≥1) y emite un `warning`; no inventes
  huecos adyacentes.
- Determinismo, contrato serializable y tests existentes intactos.
- No borres, saltes ni debilites tests; añade los que cubren el fallo.

# Criterios de aceptación

En [la tarea](../../../docs/tasks/TASK-0041-exp-004-puertas-spawn-enemigos.md#criterios-de-aceptación).
Se mantienen todos; este intento corrige el de spawn.

# Contexto mínimo

- Diagnóstico completo y evidencia: [brief-detalle.md](brief-detalle.md)
  (léelo antes de tocar `spawn.ts`).
- `experiments/EXP-004-salas-irregulares/src/spawn.ts`: `chooseParty` y
  `fillParty` (la rama `relaxSeparation` es el fallo).
- `spawn.test.ts`: el test de radio/selección salta los mapas con aviso y el de
  “mapas por defecto” solo mira separación de enemigos.
- Evidencia del lead: `artifacts/TASK-0041/attempt-1/lead-verification-*.json`.

# Hipótesis de corrección

El fallo no es de una semilla: el relleno es greedy y, al no llegar a 6, el
código relaja la separación. Sustituye el relleno por una búsqueda determinista
que maximice huecos separados ≥2, primero en radio 2, luego radio 3 y luego en
la sala completa, priorizando tiles con ≥2 vecinos libres. Si aun así no hay 6,
acepta menos con aviso. Añade tests sintéticos que demuestren:
(1) 6 huecos separados en radio 2 sin fallback; (2) 6 en radio 3 con aviso;
(3) sala imposible ⇒ <6, aviso y separación ≥2; (4) todas las semillas A/B/C
cumplen separación ≥2 y `party[0]` es el acceso.

# Artefactos del intento 2

En `artifacts/TASK-0041/attempt-2/`: `report.md`, `test-output.txt`,
`verify-output.txt` y, si cambian capturas o JSON, una nota de qué se regeneró.
Conserva `attempt-1/` y actualiza `experiment.md` con la frecuencia real de
fallback y la regla “menos huecos antes que huecos adyacentes”. Commit en
`task/TASK-0041`; no fusiones.

# Riesgos

- Revisa que `accessesFor` siga contando aperturas físicas y no altere la sala
  más protegida; no es criterio de este intento, pero no debe ser una regresión.
- El fallback aparece en la mayoría de semillas: repórtalo con números, no como
  “algunas”. Es dato del experimento, no un fallo si hay aviso.
