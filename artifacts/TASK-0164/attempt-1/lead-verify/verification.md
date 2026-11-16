---
type: Verification
title: "TASK-0164: verificación del intento 1"
description: "El camino del cursor se planifica desde el jugador activo; criterios firmados y verify:task en verde."
task: TASK-0164
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T14:33:01Z }
---

# Resultado

`ok`. `pnpm run verify:task TASK-0164` pasa: ficha, estado, informe, seis
criterios firmados, alcance dentro de `feature`, alcance congelado y
`pnpm run verify` completo. La salida mecánica está en `verify-task.txt`.

# Criterios

Los seis quedan firmados:

- El test unitario nuevo reproduce el fallo antes del arreglo: con el activo en
  el segundo jugador, el coste salía 10 y `strongSteps` 6 (el MP del primero)
  en vez de 2 y 2. Evidencia en `unit-failing-output.txt`.
- Tras el arreglo, `cursor.test.ts` pasa 18/18 y el E2E de hotseat demuestra que
  `N` entrega el turno, el cursor aparece sobre el segundo y el camino de un
  paso nace de él; `MoveTo` ejecuta ese mismo camino. Evidencia en
  `unit-output.txt` y `e2e-spec-output.txt`.
- Sin activo se mantiene oculto e inválido, aunque haya un jugador vivo.
- El diff no toca `src/game/**` ni la planificación; el aspecto del cursor no
  cambia.

Queda como problema conocido, fuera de este alcance, que un fantasma activo no
tiene cursor propio: el arreglo exige activo vivo y no abre REQ-021.

# Diff revisado

`git diff main...HEAD`: `src/host/cursor.ts` (resolución por `activePlayer`),
`tests/unit/host/cursor.test.ts` (cuatro casos), el spec nuevo
`tests/e2e/hotseat-cursor-origin-qa.spec.ts` y la evidencia del intento. Nada
fuera de alcance. La primera pasada E2E completa tuvo un timeout de carga en
`loot-qa` ajeno al cambio; el spec aislado pasó 3/3 y la segunda pasada completa
283/283 (`e2e-first-run-failure.txt` y `e2e-output.txt`). Se registra como flake
de carga, sin hipótesis nueva que justifique tocarlo.

# Qué debe probar el usuario

Con dos o más jugadores, mover el cursor con el segundo activo: los puntos del
camino deben salir de su tile y no del primer personaje. Pulsar `N` y repetir:
el origen cambia con el turno. Al ejecutar `Moverse`, el trayecto recorrido debe
coincidir con los puntos mostrados.
