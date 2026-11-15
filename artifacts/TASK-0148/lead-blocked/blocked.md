---
type: Task Blocker
title: "TASK-0148: bloqueo en Definition of Ready"
description: La resurrección por índice y recursos es ejecutable, pero el criterio del objeto de resurrección contradice el modelo y el alcance vigentes.
task: TASK-0148
attempt: 0
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T20:20:45Z }
---

# Resultado

`blocked` antes de `in_progress`: la tarea no cumple Definition of Ready por una
contradicción de alcance en la fuente de resurrección. No se ha modificado
código ni tests.

# Qué sí está listo

- La tarea deriva de REQ-031 R-014 y REQ-021 R-008 a R-013; las dependencias
  TASK-0131, TASK-0134 y TASK-0146 están `done`.
- El motor ya resuelve el hechizo `resurrection-4` con nivel 4, 8 de maná,
  adyacencia, casilla libre y 60 % del PV máximo (`src/game/magic.ts`).
- El turno por índice de `resolveEndTurn` ya distingue índice pasado o pendiente
  (`src/game/turn.ts`); faltan tests de resurrección y la limpieza de `ghost` y
  `actions.max` que dejó TASK-0132.

# Bloqueo: objeto de resurrección

El criterio 1 exige validar «lanzador … u objeto de resurrección en inventario»
y el criterio 7 pide un test «de objeto». Hoy no existe ese objeto y el modelo
vigente no permite añadirlo sin cambiar producto:

- `src/game/equipment.ts:24` solo admite `weapon`, `shield` y `armor`; no hay
  categoría de consumible ni accesorio utilizable desde la mochila.
- `src/game/equipment.ts:444` y `tests/unit/game/item-catalog.test.ts:286`
  exigen traits vacíos; un objeto activable por trait rompería esa regla.
- `tests/unit/game/item-catalog.test.ts:130` fija que los únicos huecos ocupados
  son arma, escudo y armadura; añadir un collar o anillo rompe REQ-019, que
  reserva esos huecos para su propio corte.
- `docs/requirements/REQ-018-inventario-equipo.md:157` (R-005) deja fuera del
  primer corte los consumibles y dice que no aparecen en el catálogo.
- `docs/requirements/REQ-021-muerte-fantasma-resurreccion.md:180` mantiene
  provisional el objeto de resurrección; no hay decisión de nivel, coste de
  acción, política de botín ni identidad de catálogo.
- La propia ficha, en «No objetivos», excluye «Objeto de resurrección nuevo».

Además, REQ-020 («Decisiones», 2026-11-13) acordó que la resurrección apunte a
una **unidad**, no a una casilla, porque varios cadáveres pueden compartir tile;
la enmienda a REQ-021 sigue pendiente. Afecta al diseño del comando, no al
objeto, y conviene cerrarlo en la misma decisión.

# Propuesta de división

1. **Motor sin objeto**: corregir el objetivo al cadáver de la unidad, limpiar
   `ghost`, restaurar `actions.max` al resucitar, y cubrir índice de ronda y
   recursos con tests. Es ejecutable ya y no depende de la decisión.
2. **Requirements-writer**: decidir el objeto de resurrección (ID, categoría y
   hueco, consumo, coste de acción, política de botín, si exige nivel 4 y qué
   regla de REQ-018/REQ-019 se enmienda) y si el objetivo es unidad o casilla.
3. Reabrir TASK-0148 con la fuente de objeto ya definida.

# Comandos ejecutados

| Comando | Resultado |
|---|---|
| `git status`, `git log`, inspección de `src/game`, `tests` y requisitos | Contexto revisado; dependencias `done` |
| `pnpm run verify` | OK: 709 documentos, 107 archivos/1695 tests, tsc, build y bundle; salida en `verify-output.txt` |

# Riesgos

- Forzar un objeto provisional tocaría catálogo, panel y tests de REQ-018/019
  fuera del alcance y sin decisión del usuario.
- Implementar solo el hechizo dejaría el criterio 1 y el test de objeto sin
  cumplir; se registraría como `blocked` parcial, no como `done`.
