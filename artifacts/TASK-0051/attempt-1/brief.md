---
type: Task Brief
title: "TASK-0051: brief del intento 1"
description: Alinear host, E2E y QA visual con el balance provisional v1.
task: TASK-0051
attempt: 1
status: stable
brief_bytes: 3761
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T23:10:00Z }
---

# Objetivo

Dejar host, E2E y QA visual alineados con el balance provisional v1 (PV 6/8/5,
alarma 5, MP 5/4/6, armas 3/5/2 y centinela sin armadura): `test:e2e` y `verify`
verdes, capturas 1280×720, informe y paquete de playtest en
`artifacts/TASK-0051/attempt-1/`.

# No objetivos

- Cambiar fórmulas, reglas ni datos de `src/game/`: ya están en TASK-0050.
- Preset de EXP-003 (TASK-0052), dependencias, arte final o `experiments/`.
- Aprobar el playtest: solo se prepara el paquete.

# Invariantes

- Solo cambian tests E2E, etiquetas/avisos hardcodeados del host si los hubiera,
  artefactos y documentación de la tarea.
- No se borra, salta ni debilita ningún test; se preserva la intención y el
  recuento (76 tests). Baseline del lead en `e2e-baseline.txt`: 60 pasan/16 fallan.
- Los valores se leen de `BESTIARY`, `WEAPONS`, `ARMORS` y `SHIELDS`; no duplicar
  cifras nuevas.
- `src/game/` sigue puro; `package.json` y `pnpm-lock.yaml` no cambian.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0051-host-e2e-qa-balance-v1.md#criterios-de-aceptación`.
No copiar ni reinterpretar: cada uno se verifica con evidencia.

# Contexto mínimo

- Fallos del baseline, por causa:
  - Etiquetas de arma: `equipment-hud-qa` (`Espada +3/+3`, `Hacha +2/+5`) y
    `combat-equipment-qa` (`WEAPON_LABELS`, texto de debug y centinela
    «Sin armadura»).
  - HP de enemigo 9→6: `frame-qa`, `game-input-hud`, `generated-map-qa`,
    `combat-equipment-qa` y `equipment-hud-qa`.
  - Alarma 8→5: `perception-alarm-qa` y `perception-host-qa`;
    `perception-fixtures.ts` coloca receptores a 8/9 y debe pasar a 5/6; el par
    de alarma de la semilla de referencia ya no es `enemy-2/enemy-4`.
  - Cobarde 8→5 PV y umbral 4→2: `flee-behavior-qa`, incluida la renovación de
    huida; con la semilla actual el golpe lo mata.
  - MP de centinela 4→5: `cursor-qa` (2 fallos), `game-cursor` y comentarios
    «IA de 4 MP» de `support.ts`.
  - `equipment-hud-qa` no captura el fallo porque el centinela muere en 1-2
    golpes.
- Archivos: `tests/e2e/{equipment-hud-qa,combat-equipment-qa,frame-qa,game-input-hud,generated-map-qa,perception-host-qa,perception-alarm-qa,perception-fixtures,flee-behavior-qa,cursor-qa,game-cursor}`
  y `support.ts`.
- Host: `src/host/hud.ts` y `perception-overlay.ts` ya leen del catálogo; tocar
  solo si queda una etiqueta hardcodeada.
- Requisitos: [REQ-010 v5](../../../docs/requirements/REQ-010-combate-equipo-acierto-defensa.md#balance-provisional-v1)
  y [REQ-009 v4](../../../docs/requirements/REQ-009-percepcion-alarma-huida.md#bestiario-mínimo).

# Artefactos

`artifacts/TASK-0051/attempt-1/`: `report.md`, `test-output.txt`/`e2e-output.txt`,
`e2e-repeat-output.txt` (alarma y huida con `--repeat-each=3`),
`verify-output.txt`, `screenshots/` (1280×720: HUD, debug, alarma y huida) y
`playtest.md` con arranque, semilla y checklist. Commit en `task/TASK-0051`.

# Riesgos y decisiones abiertas

- Alarma: posiciones a distancia 5 tras muro y 6 fuera. Si el mapa de referencia
  no lo permite, no relajar restricciones: devolver `blocked` con evidencia.
- Huida: si la semilla actual mata al cobarde, buscar una semilla determinista
  cuyo golpe cruce el umbral (≥2) y sobreviva; no bajar aserciones.
- Hit/fallo: conservar ambos feedbacks; si el objetivo muere, cambiar de objetivo
  o preparar el estado con `?test=1` sin relajar la comprobación.
- El playtest de sensación es del usuario; el informe no lo aprueba.
