---
type: Verification
title: "TASK-0144: verificación independiente del intento 2"
description: Criterio 7 cerrado; criterio 8 bloqueado por dos fallos E2E preexistentes en main.
task: TASK-0144
attempt: 2
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T23:40:00Z }
---

# Resultado

**Criterios 1-7 correctos; criterio 8 no cumplido.** El criterio 7 (resultado sin
pausa, guardado, «Reiniciar» ni reinicio rápido) queda cerrado con el test
endurecido y el helper de victoria. La suite E2E completa sigue roja por 2 fallos
preexistentes de `qa-visual-revision-ui.spec.ts`, ajenos al diff de esta tarea y
reproducidos en `main`.

# Diff revisado

`git diff 9d7c78b..HEAD`: solo `tests/e2e/support.ts` (helper `winGame` y
`WIN_GAME_SEED`), `tests/e2e/pause-save-load-qa.spec.ts` (criterio 7) y artefactos
del intento. Sin cambios en `src/`, `index.html`, `public/`, requisitos, arnés ni
`docs/design/turn-economy.md`. No se borró, saltó ni debilitó ningún test; el
único cambio de aserción es el endurecimiento del criterio 7.

# Reejecución

| Comando | Resultado |
|---|---|
| `pnpm run verify` (240 s) | OK: docs 732, config, 109 archivos/1734 tests, tsc, build y bundle |
| `pnpm run test:e2e tests/e2e/pause-save-load-qa.spec.ts --workers=1` (300 s) | 7/7, 9.8 s |
| `pnpm run test:e2e --workers=1` (900 s) | 271/273, 4.6 min; 2 fallos preexistentes |
| `pnpm run test:e2e tests/e2e/qa-visual-revision-ui.spec.ts --workers=1` en `main` (300 s) | 11/13; mismos 2 fallos |

Puerto 4173 libre y sin procesos Vite al terminar.

# Criterios

1-6: cubiertos por los 6 tests previos del spec, reejecutados en verde.
7: `pause-save-load-qa.spec.ts:751`; Victoria por flujo normal (`winGame`, semilla
79) y Derrota inyectada. Comprueba `pause-menu`/`pause-save`/`pause-load` ocultos,
ausencia de «Guardar», «Reiniciar», `[data-action="restart"]` y
`result-restart`, `Esc`/`R`/`N`/`I`/`S`/`F2` sin efecto, estado (`status`, ronda,
jugadores, RNG, eventos) intacto y cero descargas. Capturas revisadas: solo
«Nueva partida» y «Cargar partida».
8: capturas y `verify` OK; `test:e2e` no pasa. Ver bloqueo.

# Bloqueo del criterio 8

Los 2 fallos son las dos variantes de viewport de
`qa-visual-revision-ui.spec.ts:970` («HUD: tres zonas, variantes condicionales y
pie»). En `expectHudBase` (`:396`) se exige que `hud-left.textContent` no contenga
«Turno», pero TASK-0151 añadió `hud-live` (`d526125`) con el anuncio accesible
«Turno de …», que no es texto visible. El HUD visible sigue sin fase/turno.

No se corrige aquí: la aserción pertenece a la QA de REQ-033 y no hay tarea
propietaria abierta. Propuesta: que TASK-0154 (QA E2E completa, `backlog`) o una
ficha de corrección de TASK-0151 excluya la región `aria-live` del texto visible
y mantenga la comprobación de que `hud-live` está oculta; después se reejecuta
TASK-0144.

# Fricción

- Helper de victoria: resuelto (`winGame`, semilla 79 documentada).
- Suite roja preexistente: clasificada como corrección de test/QA; disposición
  `deferred`, dueño propuesto TASK-0154 o corrección de TASK-0151.
