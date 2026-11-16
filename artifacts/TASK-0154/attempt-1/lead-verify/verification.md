---
type: Verification
title: "TASK-0154: verificación del intento 1"
description: Resultado de verify:task, criterios firmados y cobertura del flujo hotseat.
task: TASK-0154
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T10:09:00Z }
---

# Resultado

`ok`. `verify:task TASK-0154 --base harness/2agentes` en verde: estado, 8
criterios firmados, informe `success`, 20 archivos dentro de `qa`, 13 capturas y
`pnpm run verify` completo. Salida en `verify-task.txt`.

# Criterios

Los ocho firmados con `tests/e2e/hotseat-flow-qa.spec.ts` (6 tests) y la suite:

- 2 y 6 jugadores: orden en el snapshot, `N` real, paneo con cámara centrada,
  «Jugador N de M» y «Ronda 2».
- Una fase enemiga por ronda, «El master mueve» solo con acciones,
  actor/objetivo en el HUD y «Sin objetivo» con un enemigo que huye.
- Recursos por turno: el activo empieza lleno, los que no han actuado siguen a
  cero y el anterior conserva lo gastado. Muerte, wipe y resurrección antes y
  después del índice se sostienen con
  `tests/unit/game/turn.test.ts` (líneas 891-955 y 659-720), que corre en
  `pnpm run verify`; esta tarea no duplica esos casos en E2E.
- Fantasma: conserva turno, cierra con `N`, no abre el panel y sigue siendo
  fantasma en la ronda 2.
- Guardar desactivado en fase enemiga con su motivo; pausa con `Esc` en
  cualquier momento; `E` y `R` no alteran la partida.
- Resultado con «Nueva partida» y «Cargar partida»; la carga devuelve el control
  a «Jugador 2 de 2».
- Solo tests y artefactos: ningún test existente se modifica.

La comprobación manual de mesa del plan queda para el playtest del usuario; no
es un criterio de la ficha.

# Diff revisado

`tests/e2e/hotseat-flow-qa.spec.ts` nuevo (602 líneas) más artefactos. Sin
cambios en `src/`, `index.html` ni en specs previos. Riesgos: el spec usa una
sala controlada de 20×20 y enemigos fijos, así que valida flujo, no balance; y
la captura de paneo se toma a 150 ms con aserción de estado.

# Fricción

`E2E_ARTIFACTS_DIR` con la suite completa escribe capturas de todos los specs
(48 MB, 603 archivos); el runner podó a `hotseat-flow-qa`. Disposición:
`pending`, propuesta de un filtro por spec para tareas con capturas propias.

# Qué debe probar el usuario

- Partida de 2 y de 6: cerrar turnos con `N` y comprobar que la mesa sigue el
  orden sin explicación externa.
- Entrar en fase enemiga con y sin acciones: aviso, HUD de actor/objetivo y
  «Sin objetivo».
- Guardar en fase enemiga (desactivado), pausar con `Esc`, y cargar desde el
  resultado.
