---
type: Verification
title: "TASK-0144: verificación independiente del intento 3"
description: Corrección mínima del HUD verificada; suite E2E completa en verde.
task: TASK-0144
attempt: 3
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T23:54:00Z }
---

# Resultado

Intento 3 correcto: **criterio 8 cerrado** y tarea verificada. La corrección se
limita a la aserción del HUD autorizada; sin cambios de producto ni otras specs.

# Diff revisado

`git diff 3e0d499..HEAD`: `tests/e2e/qa-visual-revision-ui.spec.ts` (+21/−3) y
evidencia del intento. En `hudGeometry`, `hudText` sale de un clon de `hud-left`
sin `[data-testid="hud-live"]`; se expone `liveRegion` (existencia, texto, caja,
`clip-path`). En `expectHudBase` se conservan las cuatro negaciones y se añade
que `hud-live` existe, tiene texto y sigue oculto (caja ≤ 2 px o
`clip-path: inset(50%)`). No se tocó ninguna otra aserción, caso ni archivo de
producción.

# Reejecución del lead

| Comando | Resultado |
|---|---|
| `pnpm run test:e2e tests/e2e/qa-visual-revision-ui.spec.ts --workers=1` (300 s) | 13/13, 18,0 s |
| `pnpm run verify` (240 s) | OK: docs 735, config, 109/1734 tests, tsc, build y bundle |
| `pnpm run test:e2e --workers=1` (900 s) | 273/273, 3,9 min |

Puerto 4173 libre y sin procesos Vite al terminar; árbol limpio.

# Criterios

1-7: ya verificados en el intento 2; el criterio 7 sigue pasando dentro de la
suite completa.
8: capturas y `verify` OK; `test:e2e` completo en verde en serie. La aserción
visible mantiene «Fase», «Turno», «En juego» y «PV enemigo» fuera del HUD, y la
región viva sigue existiendo y oculta.

# Regresiones y tests

No hay regresiones: 273/273 y 1734/1734. No se borró, saltó ni debilitó ningún
test; la única excepción autorizada fue excluir `hud-live` del texto visible y
comprobar su ocultación.
