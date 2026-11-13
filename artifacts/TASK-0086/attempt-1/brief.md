---
type: Task Brief
title: "TASK-0086: brief del intento 1"
description: Perfiles de resistencia v1 de roster, bestiario y familias (REQ-029).
task: TASK-0086
attempt: 1
status: stable
brief_bytes: 3580
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T12:45:00Z }
---

# Objetivo

Declarar en `src/game/roster.ts` y `src/game/bestiary.ts` los perfiles de
resistencia estimados v1 de REQ-029: nueve arquetipos, tres enemigos y seis
plantillas de familia, con herencia por familia y sobrescritura parcial por
enemigo. Resolvedor y resto del motor intactos.

# No objetivos

- No tocar el resolvedor ni fórmulas (`damage.ts`, `combat.ts`, `magic.ts`).
- No cambiar armas, PV, MP, hechizos, acciones ni equipo.
- No tocar `src/host/`: HUD y `F1` son TASK-0089. «Debug» aquí es el snapshot de
  `window.__game.snapshot()`, que ya expone `stats.resistencia`.
- No actualizar `docs/design/**` ni glosario (TASK-0091); no asignar las 64
  entradas; sin dependencias nuevas.

# Invariantes

- Fuente única: los valores viven solo en roster y bestiario; host y tests no
  copian la tabla.
- Banda ausente = normal. Perfil efectivo de un enemigo = plantilla de familia +
  sobrescritura parcial.
- Perfiles serializables y presentes en el snapshot.
- No se borra, salta ni debilita ningún test; los que fijan `resistencia: {}` se
  actualizan porque el comportamiento cambia, conservando su intención.
- `pnpm run verify` pasa; `src/game/` no importa `src/host/`.

# Criterios de aceptación

Viven en [TASK-0086 § Criterios](../../../docs/tasks/TASK-0086-motor-perfiles-resistencia-roster-bestiario.md#criterios-de-aceptación).
No copiar. Plan en [§ Plan de test](../../../docs/tasks/TASK-0086-motor-perfiles-resistencia-roster-bestiario.md#plan-de-test).

# Contexto mínimo

- `src/game/roster.ts`: nueve entradas; `stats.resistencia` por arquetipo.
- `src/game/bestiary.ts`: `EnemyDefinition` y tres enemigos; añade familias.
- Solo lectura: `src/game/types.ts` (`ResistanceProfile`, default normal) y
  `src/game/damage.ts` (`bandFor`, multiplicadores).
- Tablas: [héroe](../../../docs/requirements/REQ-029-tipos-dano-resistencias.md#perfiles-de-héroe),
  [enemigos](../../../docs/requirements/REQ-029-tipos-dano-resistencias.md#perfiles-de-enemigo-actuales)
  y [familias](../../../docs/requirements/REQ-029-tipos-dano-resistencias.md#plantillas-de-familia-para-el-bestiario-futuro).
- Tests que asumen `{}`: `tests/unit/game/roster.test.ts`,
  `tests/unit/game/bestiary.test.ts`, `tests/e2e/default-character-qa.spec.ts` y
  `tests/e2e/combat-equipment-qa.spec.ts`.

# Contraste obligatorio

Los tests leen el catálogo y no detectan un valor mal transcrito. En `report.md`,
tabla fila por fila con las 18 filas (9 arquetipos, 3 enemigos y 6 familias):
fila, banda efectiva por tipo (V/N/R) y resultado del contraste con REQ-029. Si
desborda, tabla compacta en `report.md` y detalle en `report-detalle.md`
enlazado; el contraste no puede faltar.

# Artefactos

`report.md` (≤4 KB), `test-output.txt`, `verify-output.txt`; `report-detalle.md`
si desborda. Commit(s) en `task/TASK-0086`; el informe incluye SHA.

# Riesgos y decisiones abiertas

- Recomendado: cinco bandas explícitas en cada héroe (contraste 1:1) y familias
  con cinco bandas; el enemigo declara solo sobrescrituras. Si omites normales,
  el contraste muestra la banda efectiva vía `bandFor`.
- Los tres enemigos encajan en humanoide; registra familia y sobrescrituras.
- Duda técnica rutinaria: decide y registra; no decidas creatividad ni cambies
  valores de las tablas.
