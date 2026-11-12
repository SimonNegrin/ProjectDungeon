---
type: Task Brief
title: "TASK-0081: brief del intento 1"
description: Nivel de magia único 0–4, maná nivel × 4 y recarga al inicio del turno.
task: TASK-0081
attempt: 1
status: stable
brief_bytes: 2487
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T23:10:00Z }
---

# Objetivo

Sustituir `stats.magia`/`MagicSchool` por un `magicLevel` entero 0–4 y añadir
`Unit.mana { current, max }` con `max = magicLevel × 4`, recargado completo al
empezar el turno de cada unidad viva. Sin hechizos ni HUD.

# No objetivos

Catálogo, comando o resolución de hechizos (`TASK-0082`); HUD, input, feedback,
IA mágica o arte (`TASK-0083`); progresión o cambio de nivel en partida; tocar
acciones, réplica, MP, balance o fórmulas de combate; dependencias nuevas.

# Invariantes

- Fórmula única de máximo: 0/4/8/12/16. Nivel 0 ⇒ maná 0; nunca se confunde con
  MP. `mana.current ≤ mana.max`.
- Roster: Mago 4, Clérigo 3, Guerrero mágico 2, Cocinero 1; resto 0. Bestiario:
  los tres tipos 0 y maná 0.
- `turn.ts`: maná junto a MP y acciones, solo unidades vivas, sin arrastre.
- Snapshot/debug clonan `mana` en profundidad; el JSON conserva `magicLevel` y
  ambos valores de maná.
- No borres, saltes ni relajes tests. Migra `stats.magia` conservando la
  intención de REQ-014/015/021.
- No edites `docs/`: glosario y arquitectura ya recogen el cambio; si ves una
  contradicción, regístrala como fricción.
- `package.json` y `pnpm-lock.yaml` intactos.

# Criterios de aceptación

En la ficha:
[criterios](../../../docs/tasks/TASK-0081-motor-nivel-magia-mana.md#criterios-de-aceptación).

# Contexto mínimo

- `src/game/{types,roster,bestiary,engine,turn}.ts`; `src/host/debug.ts`
  (`cloneUnit`); `tests/unit/host/debug.test.ts`.
- Tests con literal `magia`: `tests/unit/game/{stats,bestiary,roster,helpers,actions,combat,engine}.test.ts`.
- [REQ-025](../../../docs/requirements/REQ-025-magia-hechizos-mana.md#requisitos-técnicos)
  T-001/T-005; [ADR-019](../../../docs/decisions/ADR-019-magia-mana-hechizos.md#decisión).

# Artefactos

`artifacts/TASK-0081/attempt-1/{report.md,test-output.txt,verify-output.txt,logs/}`;
commit con SHA en `task/TASK-0081`.

# Riesgos y decisiones abiertas

- El compilador guía la migración de los literales `UnitStats`.
- Para «cambiar el nivel recalcula el máximo» basta una función pura; no añadas
  comandos ni progresión.
- `magicLevel` va en `UnitStats`; `mana` en `Unit`, separado de MP.
