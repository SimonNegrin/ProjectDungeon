---
type: Verification
title: "TASK-0179: verificación del intento 1"
description: "Aviso de PV completo, coste/alcance en la lista y E2E de curación adyacente, autocuración, rechazos y maná +4."
task: TASK-0179
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T23:32:30Z }
---

# Resultado

`ok`. `pnpm run verify:task TASK-0179` pasa con 5 criterios firmados, informe
`success`, 33 capturas y `pnpm run verify` verde. `pnpm run test:e2e` pasa
completo: **294 tests** en 2,2 min, incluidos los dos viewports del Clérigo.

# Criterios

- **Aviso PV completo:** `target-full-hp` se traduce a «Ya está a PV completo»; el
  E2E comprueba el texto y que maná, acciones, hueco y RNG no cambian.
- **Lista y detalle:** `buildSpellMenuModel` expone `range` y `meta` desde
  `SPELLS`; la vista ya no compone cifras. El E2E verifica Curación III «8 maná ·
  alcance 1» y Resurrección IV «12 maná · alcance 1».
- **E2E funcional:** adyacente +6 PV, autocuración, PV completo sin gastar,
  alcance 2 rechazado y maná 12 → 4 → 8; sin errores de consola.
- **Specs actualizados:** se conservan las aserciones de tope, maná insuficiente,
  rechazo y feedback; `hotseat-flow-qa` se alinea con +4.
- **Evidencia visual:** capturas 1280×720 y 900×700 en
  `spell-hud-qa/screenshots/`; `e2e-output.txt` con 294/294.

# Diff revisado

`src/host/notices.ts`, `spell-menu.ts`, `spell-menu-view.ts`, sus tests unitarios
y los specs `spell-hud-qa`, `damage-types-qa` y `hotseat-flow-qa`. Todo dentro de
`qa`; sin cambios de reglas, catálogo ni maná. El E2E de `damage-types-qa` recarga
el escenario entre curación y resurrección porque 8 + 12 no caben en 16 de maná;
es correcto y no oculta el feedback.

# Qué debe probar el usuario

- Abrir `Q`: Curación III debe mostrar **8 maná · alcance 1** y Resurrección IV
  **12 maná · alcance 1**.
- Curar a un aliado a PV completo: aviso «Ya está a PV completo» y HUD intacto.
- Curar adyacente, en diagonal y a uno mismo: **+6 PV** y **−8 de maná**.
- Terminar la ronda: el maná del Clérigo sube **+4** (4 → 8 tras una curación).
- Revisar las capturas de `artifacts/TASK-0179/attempt-1/spell-hud-qa/screenshots/`.

# Fricción

El informe detecta que un cambio de recurso puede dejar rojo un E2E fuera de los
specs citados por la tarea siguiente. Clasificación: **local de proceso de
cierre**. La propuesta de ejecutar el E2E completo al cerrar reglas es razonable,
pero cambia el flujo del arnés; queda `pending` y no se aplica sin aprobación.
