---
type: Task Brief
title: "TASK-0035: brief del intento 1"
description: Alarma de una onda, enfriamiento y daño como despertador sobre TASK-0034.
task: TASK-0035
attempt: 1
status: stable
brief_bytes: 2729
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T21:40:00Z }
---

# Objetivo

R-006 y R-008 sobre TASK-0034: onda de alarma radio 8 sin LOS ni cadena al
detectar por primera vez en un episodio; daño que guarda `lastKnown` del
atacante y, si sobrevive, da la alarma. Conserva y prueba el enfriamiento de 3
fases.

# No objetivos

- Huida, IA de alerta con MP, 4 enemigos y feedback del host
  (TASK-0036/0037/0038); `docs/design/` y glosario (T-009).
- Tocar `src/host/`, `index.html`, `public/`, `experiments/`, dependencias ni
  valores de combate/economía/radios.

# Invariantes

- Alarma 8 Chebyshev, sin LOS ni cadena. Añade `alarm: 8` al bestiario si falta.
- En un paso, calcula todos los `EnemySpotted` y luego resuelve ondas por índice.
  Receptores vivos dentro del radio pasan o siguen en `alert`, comparten
  `lastKnown` del emisor y quedan `hasShouted: true`; el emisor también. Un
  receptor no emite otra onda en el episodio.
- `AlarmRaised` en `GameEvent` con `unitId` del emisor y posición, orden
  determinista. `hud.ts` ya tiene `default`: no toques el host.
- `refreshEnemyAwareness` ya hace 2 fases investigando + 1 en `returning`; el
  regreso no ataca y duerme en `home`. Verifícalo, no lo reimplementes.
- Daño: `noteDamage` al golpear a un enemigo vivo, con posición del atacante. Si
  empieza episodio, emite `AlarmRaised` tras `AttackPerformed` y aplica la onda;
  si muere, no hay alarma. Un alertado reinicia memoria sin segunda onda.
- Sin `Math.random`; `src/game/` puro y serializable.

# Criterios de aceptación

`docs/tasks/TASK-0035-motor-alarma-onda-enfriamiento.md` §«Criterios de
aceptación»; no copiar. Requisito:
`docs/requirements/REQ-009-percepcion-alarma-huida.md` R-006, R-008, T-004,
T-008 a T-011.

# Contexto mínimo

- `src/game/perception.ts` (`detectEnemiesAfterStep`, `refreshEnemyAwareness`,
  `noteDamage`), `types.ts`, `bestiary.ts`, `combat.ts` (`resolveAttack`),
  `engine.ts` (`commitPlayerStep`), `turn.ts`; tests `perception`, `combat`,
  `turn`, `integration`. `helpers.ts` usa `alert` por defecto (legacy).
- Cierre TASK-0034: `artifacts/TASK-0034/attempt-2/report.md` (`8fc6879`).

# Artefactos

`artifacts/TASK-0035/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `diff-stat.txt`; commit SHA en `task/TASK-0035`.

# Riesgos y decisiones abiertas

- `AlarmRaised` puede tocar listas exactas de eventos: actualiza lo justo sin
  borrar, saltar ni debilitar aserciones. Calcula detecciones antes de propagar.
