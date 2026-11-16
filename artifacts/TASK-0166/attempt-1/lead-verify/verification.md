---
type: Verification
title: "TASK-0166: verificación del intento 1"
description: "La lista de hechizos usa el nivel y el maná del jugador activo; criterios firmados y verify:task en verde."
task: TASK-0166
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T14:52:28Z }
---

# Resultado

`ok`. `pnpm run verify:task TASK-0166` pasa: ficha, estado, informe, cinco
criterios firmados, alcance dentro de `feature`, alcance congelado y
`pnpm run verify` completo. La salida mecánica está en `verify-task.txt`.

# Criterios

Los cinco quedan firmados:

- El test unitario reproduce el fallo antes del arreglo: con el activo en el
  mago segundo, la lista mostraba los seis hechizos como `level` por usar al
  guerrero primero. Evidencia en `test-fail-before.txt`.
- Tras el arreglo, `spell-menu.test.ts` pasa 10/10, incluidos el caso inverso
  (activo primero), la ausencia de activo, sin caer al primer jugador, y el
  relevo con `N` de ida y vuelta. Evidencia en `test-pass-after.txt`.
- El E2E de hotseat guerrero→mago comprueba `data-availability` en el DOM:
  ningún hechizo con el guerrero, disponibles con el mago y de nuevo ninguno al
  volver al primero; no se conserva la disponibilidad anterior.
- El diff no toca `src/game/**`, el catálogo, los costes ni el maná; selección,
  orden, ayuda y lanzamiento quedan intactos.

# Diff revisado

`git diff main...HEAD`: `src/host/spell-menu.ts` (importa `activePlayer` y
elimina el resolutor local), `tests/unit/host/spell-menu.test.ts` (cuatro casos)
y `tests/e2e/spell-hud-qa.spec.ts` (hotseat con `Q` y `N`). Sin cambios fuera de
alcance. `verify` completo y 285/285 E2E en verde.

# Qué debe probar el usuario

Con un guerrero y un mago, abrir `Q` en el turno del guerrero: los hechizos
deben aparecer como no disponibles por nivel. Pulsar `N`, abrir `Q` en el turno
del mago: sus hechizos deben aparecer disponibles. Volver con `N` al guerrero y
comprobar que no se conserva la lista del mago.
