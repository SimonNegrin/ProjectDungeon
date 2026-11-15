---
type: Task Verification
title: "TASK-0153: verificación independiente"
description: Reejecución de verify y E2E, revisión del diff y comprobación de la pantalla de resultado Victoria/Derrota.
task: TASK-0153
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T23:19:37Z }
---

# Resultado

Aprobada. El intento 1 (código y tests `b3ffee0`, informe `28f66b3`) cumple los
siete criterios. La tarea se cierra como `done`.

# Alcance revisado

- `src/host/result.ts`: modelo puro con Victoria/Derrota, ronda, semilla y party
  (nombre y arquetipo) en orden 1..N; `null` mientras `playing`.
- `src/host/result-view.ts`: diálogo `result-screen` con foco inicial en «Nueva
  partida», foco atrapado, `Esc` consumido y anuncio `aria-live`; mensaje de
  rechazo de carga.
- `src/host/main.ts`: resultado alimentado por el estado de presentación (solo
  tras el cue de `GameEnded`), gate de pausa/input, `Nueva` por
  `confirmNewGame` y carga con origen `result`; se oculta al cargar, reiniciar,
  `F2`, arrancar partida y abrir el paso 1.
- `index.html`/`src/host/ui.css`: pantalla final opaca; retirados `.overlay`,
  `overlay-victory|defeat`, «Reiniciar» y `[data-action="restart"]`.
- `src/host/hud.ts`: se retira el modelo de overlays de resultado.
- Tests: nueva `result.test.ts` (8) y `host-result-qa.spec.ts` (5); specs
  afectadas actualizadas de `overlay-*` a `result-screen`, sin relajar
  aserciones. Los dos tests de overlay del HUD se sustituyen por la cobertura
  equivalente del modelo de resultado y por los E2E de victoria/derrota.
- Sin cambios en `src/game/**`, requisitos, `docs/design/**`, glosario, arnés,
  dependencias ni `.opencode/**`.

# Verificación reejecutada

| Comando | Resultado |
|---|---|
| `pnpm run verify` (600 s) | docs 729, config, 109 archivos/1734 tests, tsc, build y bundle OK |
| `pnpm exec playwright test tests/e2e/host-result-qa.spec.ts --workers=1` (180 s) | 5/5 |
| 8 specs afectadas con `--workers=1` (180 s) | 48/48 |

Las 8 specs fueron `game-input-hud`, `pause-save-load-qa`,
`feedback-inventory-perception-qa`, `combat-equipment-qa`, `cursor-qa`,
`host-growth-render-qa`, `motion-qa` y `ui-foundations-qa`, en una sola
invocación con un worker: sin servidores ni specs en paralelo. La suite completa
no se ejecutó; excede 180 s y queda en TASK-0154, como marca el brief.

# Criterios

1. Pantalla al terminar con Victoria/Derrota, ronda, party y semilla: modelo
   unitario y E2E de ambos estados; la victoria real del flujo normal y la
   derrota real de `game-input-hud` muestran el resultado. OK.
2. «Nueva partida» abre el paso 1 de REQ-016 y no reinicia: E2E en flujo normal
   con victoria real; tras el clic, `start-step1` visible y el snapshot sigue en
   `victory`. OK.
3. «Cargar partida» usa el cargador compartido sin confirmación: origen
   `result`, sin diálogo de confirmación; E2E con `.json` inválido (mensaje
   visible y resultado intacto) y válido (resultado oculto, semilla y HUD
   cargados). OK.
4. Sin pausa, guardado, «Reiniciar» ni atajo: `Esc` no abre pausa, `R`/`N`/`I`
   no alteran el estado, no hay `[data-action="restart"]` ni botón de guardado.
   OK.
5. Sin avance automático, acciones explícitas y teclado accesible: E2E espera
   500 ms sin cambios, `Tab`/`Shift+Tab` recorren y atrapan el foco, el foco
   visible tiene `outline`, y la región `aria-live` anuncia título, ronda,
   semilla y party. OK.
6. Semilla legible para repetir: `Semilla N` en texto; seis jugadores sin scroll
   ni recorte a 1280×720; captura revisada. OK.
7. Tests y `pnpm run verify`: unidad, E2E de Victoria/Derrota, datos, «Nueva»,
   «Cargar» y ausencia de pausa/guardado; verify reejecutado. OK.

# Evidencia visual

- `attempt-1/e2e/host-result-qa/screenshots/resultado-victoria.png`: Victoria,
  ronda, tres filas de party, semilla y dos acciones.
- `resultado-derrota.png`: Derrota en rojo, misma estructura.
- `resultado-seis-jugadores.png`: seis filas y semilla legibles sin scroll.
- `nueva-desde-resultado.png`: paso 1 abierto sin reiniciar.
- `carga-invalida.png`: mensaje de rechazo con el resultado visible.
- `carga-valida.png`: partida cargada con HUD de la nueva party.

# Incidencias y disposición

- **`F1` con el resultado visible.** Se mantiene como diagnóstico, no como
  acción de juego; queda tras la pantalla opaca y no abre pausa, guardado ni
  reinicio. Disposición `accepted`; no cambia criterios ni requiere al usuario.
- **«Nueva» en `?test=1`.** Sin pantalla de inicio no hay paso 1 que abrir; el
  criterio se cubre en flujo normal con victoria real. Disposición `accepted`,
  limitación del modo test, no del producto.
- **Fricción: ruta a `GameEnded` en flujo normal.** No hay helper documentado de
  victoria y `defeatAllEnemies` puede perder; el runner buscó semilla. Es soporte
  de tests/QA, no regla de producto. Disposición `deferred` con dueño TASK-0154
  (QA/E2E del hotseat), donde puede añadirse un helper `winGame` o semillas de
  victoria. No se toca el arnés en esta tarea.
- **Tests de overlay del HUD retirados.** Cobertura equivalente en
  `result.test.ts` y en los E2E de resultado; no se debilita ninguna intención.
- **Documentación.** No se toca `docs/design/**` ni el glosario: TASK-0155 es la
  propietaria de ADR-029, arquitectura y economía de turno.
- **Procesos.** Sin servidores ni comandos en background; todos los comandos con
  timeout explícito.
