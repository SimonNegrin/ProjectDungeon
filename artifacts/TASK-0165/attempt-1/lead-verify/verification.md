---
type: Verification
title: "TASK-0165: verificación del intento 1"
description: "La ficha del panel resuelve el equipo del jugador activo; criterios firmados y verify:task en verde."
task: TASK-0165
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T14:41:17Z }
---

# Resultado

`ok`. `pnpm run verify:task TASK-0165` pasa: ficha, estado, informe, seis
criterios firmados, alcance dentro de `feature`, alcance congelado y
`pnpm run verify` completo. La salida mecánica está en `verify-task.txt`.

# Criterios

Los seis quedan firmados:

- El test unitario reproduce el fallo antes del arreglo: con el activo en el
  segundo, el bloque equipado mostraba «Espada» del primero en vez de «Hacha»;
  sin activo seguía mostrando la espada. Evidencia en
  `unit-failing-output.txt`.
- Tras el arreglo, `hud-detail.test.ts` pasa 28/28. El `unitId` explícito
  conserva prioridad y sin activo el bloque queda en «Vacío» con desglose vacío.
- El E2E de dos jugadores confirma `hud-panel-equipped` con el hacha del activo,
  no con la espada del primero, y que el detalle del cursor no cambia al cerrar.
  Evidencia en `e2e-output.txt`.
- El diff no toca el motor, el catálogo, la navegación ni la geometría del panel.

El caso de activo fantasma queda sin portador, igual que un panel que no se abre;
es coherente con REQ-021 y no se amplía aquí.

# Diff revisado

`git diff main...HEAD`: `src/host/hud-detail.ts` (resolución compartida con el
panel), `tests/unit/host/hud-detail.test.ts` (tres casos) y
`tests/e2e/hud-right-detail-qa.spec.ts` (hotseat de dos jugadores). Sin cambios
fuera de alcance. La corrida E2E completa pasó 284/284.

# Qué debe probar el usuario

Con dos jugadores y armas distintas, pasar al segundo con `N`, abrir el panel con
`I` y seleccionar un objeto del hueco de arma: la ficha derecha debe mostrar el
equipo del segundo en «Equipado». Cerrar el panel debe devolver el detalle del
cursor sin cambios.
