---
type: Task Brief
title: "TASK-0015: brief del intento 1"
description: E2E y QA visual de REQ-004: cursor, estados, camino, Moverse, enemigo y ciclo de vida.
task: TASK-0015
attempt: 1
status: stable
brief_bytes: 4497
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T02:03:00Z }
---

# Objetivo

Añadir un spec E2E nuevo que demuestre `REQ-004` de extremo a extremo con la
semilla `279837264`: cursor, estados/patrones, camino verde/ámbar, **Moverse**
verde/ámbar/rojo, los cinco casos sobre enemigo, **Atacar** con `F`, ciclo de
vida, HUD/debug y capturas estables. Evidencia en `artifacts/TASK-0015/`.

# No objetivos

- Cambiar cursor, camino, input, comandos, reglas, mapa, IA, cámara, HUD o debug
  de producción; arte final, animaciones, audio, ratón/táctil, botones nuevos,
  ataque a distancia, objetos, guardado o red.
- Debilitar o duplicar sin aportar `game-cursor.spec.ts`/`game-input-hud.spec.ts`.
  El spec nuevo es aditivo.
- Teletransportar o inyectar estados. Solo teclado real para el cursor y
  comandos `Move`/`EndTurn` existentes para preparar posiciones.

# Invariantes

- Semilla `?seed=279837264`; jugador `(6,8)`, enemigo `(23,28)`.
- `window.__game.snapshot()` es la fuente de verdad; el DOM
  (`cursor`, `cursor-path`, `cursor-path-point`, HUD, debug) solo para
  presentación.
- Estado por `data-cursor-state`; patrón por CSS (`solid`/`dashed`/`double`) y
  `.cursor-mark`; camino por `is-strong`/`is-faded`. Sin diff de píxeles.
- Cada test abre página nueva, espera `assetsLoaded` y no depende de orden.
- No tocar `src/game/**` ni `src/host/**` para pasar el E2E. Ante un fallo real
  de producción, documentarlo y devolver `blocked` con evidencia.
- La fase enemiga es síncrona: tras `E` el motor ya está en fase de jugador. El
  E2E comprueba el reinicio del cursor; la ocultación en fase `enemy` se cubre
  con unitario (existente o nuevo en `tests/unit/host/`). No inventar pausa.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0015-e2e-qa-cursor.md`, sección «Criterios de
aceptación»; cubrir todos y su «Plan de test». Enlazar con ancla; no copiar.

# Contexto mínimo

- [TASK-0015](../../../docs/tasks/TASK-0015-e2e-qa-cursor.md): estados, notas de
  preparación y evidencia esperada.
- [REQ-004](../../../docs/requirements/REQ-004-cursor-seleccion.md),
  R-001..R-018 y T-006..T-009/T-011.
- `tests/e2e/game-cursor.spec.ts` y `game-input-hud.spec.ts`: humo existente;
  reutilizar ideas sin debilitarlo.
- `tests/e2e/support.ts`: `snapshot`, `moveCursorTo`, `walkTo`, `approachEnemy`,
  `move`, `endTurn`, `restart`. Si faltan, añadir helpers de aproximación/retirada
  con comandos reales manteniendo firmas existentes.
- Host: `src/host/{cursor,cursor-view,main,input,hud,debug,notices}.ts` e
  `index.html` (testids y CSS). Motor solo lectura: `src/game/{path,engine,turn}.ts`.
- `playwright.config.ts`: Vite vía `webServer`.

# Comandos y timeouts

| Comando | Timeout |
|---|---:|
| `pnpm run test:e2e` | 300 s |
| `pnpm run test:e2e -- --repeat-each=3` | 300 s |
| `pnpm run verify` | 180 s |
| `pnpm run build` | 120 s |

Sin servidores manuales. Nada de `npm`/`npx`.

# Artefactos

- `report.md` según `docs/templates/task-report.md` (SHA, desviaciones, fricción
  con disposición `pending`).
- `e2e-output.txt`, `repeat-output.txt`, `verify-output.txt`, `build-output.txt`.
- `screenshots/`: cursor jugador, camino verde, camino ámbar en dos tonos, cursor
  enemigo, movimiento parcial, ataque y debug.
- Commit(s) en `task/TASK-0015`; SHA en el informe.

# Riesgos y decisiones abiertas

- **Capturas históricas:** la suite reescribe PNG de tareas previas. Revisar
  `git status` y revertir artefactos ajenos antes del commit; solo TASK-0015.
- **Casos de enemigo:** tras `approachEnemy` queda adyacente. Para «alcanzable sin
  acción», atacar con `F`, retroceder con `Move` y pulsar `Espacio`; para
  «demasiado lejano», gastar MP/retroceder hasta que el coste supere el MP con el
  enemigo aún visible. Verificar con snapshot, sin distancias hardcodeadas.
- **Avisos HUD:** 1600 ms y no bloquean; comprobar texto y esperar ocultación con
  `toBeHidden({ timeout })`, sin `sleep` fijos.
- **Estabilidad:** evitar carreras con flash/daño; esperar snapshot/evento antes
  de capturar. Debe pasar 3 veces.
- Si un helper duplica demasiada lógica de producción, reducirlo a preparación;
  no reimplementar `planCursorTarget`.

# Desbordamiento

Sin anexo. `read_detail: false`.
