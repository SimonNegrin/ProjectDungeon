---
type: Task Brief
title: "TASK-0053: brief del intento 1"
description: Ocho atributos y resistencia en la absorción sin cambiar el balance v1.
task: TASK-0053
attempt: 1
status: stable
brief_bytes: 2552
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T23:30:00Z }
---

# Objetivo

Migrar el motor a los ocho atributos de REQ-014: `UnitStats` con `habilidad`,
`fuerza`, `defensa`, `resistencia`, `punteria` y `magia` (lista de
`{ familia, nivel }`, nivel 1–4), y resolver el daño contra
`resistencia + armadura`. Con resistencia 0 el combate del balance v1 no cambia.

# No objetivos

- Host, etiquetas HUD/F1 y documentación: TASK-0054. Solo adaptación mecánica
  para que TypeScript compile; sin cambiar textos visibles.
- Roster, Cuchillo, nombre, arquetipos y pantalla de inicio (REQ-015/REQ-016).
- Nueva cobertura E2E, capturas o cambios de balance.

# Invariantes

- Balance v1 intacto: PV 6/8/5, armas 3/5/2, centinela sin armadura, jugador
  habilidad/fuerza/defensa +1. Enemigos con resistencia 0, puntería 0 y magia [].
- Un resolvedor para jugador y enemigo; `src/game/` puro, sin dependencias ni DOM.
- No se borra, salta ni debilita ningún test; los de `acierto`/`daño` se migran a
  `habilidad`/`fuerza` conservando aserciones y recuento (734 unitarios).

# Criterios de aceptación

En `docs/tasks/TASK-0053-motor-esquema-atributos-resistencia.md#criterios-de-aceptación`.
Enlazar; no copiar ni reinterpretar.

# Contexto mínimo

- `src/game/types.ts`: `UnitStats` (`stats`) con `MagicLevel = 1 | 2 | 3 | 4` y
  `MagicSchool { familia; nivel }`; retirar `UnitModifiers`/`modifiers`.
- `src/game/combat.ts`: impacto `stats.habilidad + weapon.accuracy` contra
  `stats.defensa` + escudo; daño `stats.fuerza + weapon.damage` menos
  `stats.resistencia + armadura`.
- `src/game/bestiary.ts` y `engine.ts`: valores desde catálogo.
- `src/host/{hud,debug}.ts` y `tests/{unit,host,e2e}`: claves mecánicas; etiquetas
  visibles sin tocar.
- Fórmulas: [REQ-014 R-008/R-009](../../../docs/requirements/REQ-014-atributos-inherentes-personajes.md#requisitos-creativos)
  y [turn-economy#combate](../../../docs/design/turn-economy.md#combate).

# Artefactos

`artifacts/TASK-0053/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt` y commit SHA.

# Riesgos y decisiones abiertas

- Claves españolas sin acento; el equipo conserva `accuracy`/`damage`/`armor`.
- `magia`: validar nivel 1–4 y serialización en test.
- E2E: si el typecheck exige tocar etiquetas, solo claves de fixtures/estado.
