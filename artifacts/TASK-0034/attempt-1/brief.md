---
type: Task Brief
title: "TASK-0034: brief del intento 1"
description: Percepción pura, línea de visión, detección por paso y memoria de enemigos.
task: TASK-0034
attempt: 1
status: stable
brief_bytes: 3067
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T21:10:00Z }
---

# Objetivo

Añadir a `src/game/` un módulo puro de percepción 360° con Bresenham, radios del
bestiario (6/4/5), estados `dormant`/`alert`/`returning`, detección tras cada paso
de `Move`/`MoveTo` y memoria (`lastKnown`, `home`, `alertTurns`, `hasShouted`,
`fleeing`) serializable y visible en `snapshot()`.

# No objetivos

- Alarma, `hasShouted` operativo, daño integrado en combate, huida, 4 enemigos,
  feedback o E2E: tareas posteriores.
- Cambiar combate, economía de turno, MP o acción al detectar.
- Tocar `src/host/`, `index.html`, `public/`, `experiments/`, `docs/design/`,
  glosario ni dependencias.

# Invariantes

- Motor puro: sin DOM, Canvas, red, relojes ni `Math.random`.
- Detección en cada paso aceptado, incluidos los intermedios de `MoveTo`; evento
  tras el `UnitMoved` de ese paso, con posición y `unitId` del enemigo. No cambia
  MP, acción ni fase.
- Visión: Chebyshev dentro del radio y línea de Bresenham; muros bloquean,
  unidades no; solo jugadores vivos.
- Dormido espera y no ataca. Al ver: `alert`, `lastKnown`, `alertTurns = 0`. Sin
  visión: 2 fases investigando y la 3.ª `returning`; vuelve a `home` sin atacar y
  al llegar queda `dormant`. Nueva visión reinicia memoria y contador.
- Conserva el movimiento/ataque actual de alerta (1 paso) y el desempate por
  índice; `TASK-0037` refinará alerta/huida.
- `home` es la posición inicial y `createEnemy` nace `dormant`. El fixture
  `makeUnit` puede nacer `alert` para conservar tests legacy sin tocar sus
  aserciones ni debilitarlos.
- Snapshot: los campos se propagan por el clon de unidad; no edites `src/host/`.

# Criterios de aceptación

En `docs/tasks/TASK-0034-motor-percepcion-linea-vision-memoria.md`, sección
«Criterios de aceptación». Enlazar; no copiar.

# Contexto mínimo

- `docs/requirements/REQ-009-percepcion-alarma-huida.md#requisitos-creativos`
  R-001 a R-005 y R-007; `#requisitos-técnicos` T-001 a T-003 y T-008 a T-011.
- `src/game/{types,bestiary,ai,turn,engine,grid,path}.ts`;
  `src/host/debug.ts` solo como referencia, sin editar.
- Tests: `tests/unit/game/{ai,engine,turn,move-to,integration,bestiary}.test.ts`
  y `tests/unit/game/helpers.ts`.

# Artefactos

- `report.md`, `test-output.txt`, `verify-output.txt`, `diff-stat.txt`.
- Commit SHA en `task/TASK-0034`.

# Riesgos y decisiones abiertas

- Ninguna decisión creativa. Si el snapshot exigiera tocar `src/host/`, no lo
  hagas: documenta la fricción y prueba forma serializable sin mutadores.
- T-009 (IA en `docs/design/turn-economy.md` y glosario) queda para
  `requirements-writer`; indícalo en el informe.
- Si un test legacy choca con `dormant`, ajusta solo el fixture a `alert`
  conservando su intención; no cambies aserciones para ocultar regresiones.
