---
type: Lead Verification
title: "TASK-0126: verificación independiente"
description: Revisión del diff, reejecución de tests y comprobación de criterios.
task: TASK-0126
attempt: 1
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T09:55:40Z }
---

# Resultado

`accepted`. Intento 1 verificado. Rama `task/TASK-0126` con código `887deec` y
tests `74dbdee`; evidencia `18d3336` y corrección del informe `e0ddada`.

# Alcance del diff

- Solo host y presentación: `src/host/party-summary.ts`,
  `src/host/party-summary-view.ts`, `src/host/main.ts`,
  `src/host/player-screen-view.ts`, `index.html`, `src/host/ui.css`.
- Tests: `tests/unit/host/party-summary.test.ts`,
  `tests/e2e/party-summary.spec.ts` y el bloque del último «Siguiente» de
  `tests/e2e/player-screen.spec.ts`.
- Artefactos del intento y estado de la tarea. Sin cambios en `src/game/**`,
  roster, balance, dependencias, `docs/requirements/**` ni `docs/harness/**`.

# Comandos reejecutados

| Comando | Resultado |
|---|---|
| `pnpm exec vitest run tests/unit/host/party-summary.test.ts tests/unit/host/session.test.ts tests/unit/game/engine.test.ts` | 3 archivos, 53/53 |
| `pnpm run verify` | docs y config OK; 99 archivos, 1441/1441; tsc, build y bundle OK |
| `pnpm run test:e2e` | 228/228, incluidos `party-summary`, `player-screen` y `start-screen` |
| `curl --max-time 2 http://127.0.0.1:4173` | 000: el `webServer` de Playwright quedó cerrado |

# Criterios de aceptación

- Resumen: filas 1..N con número, arquetipo de `ROSTER`, variante y nombre
  efectivo; semilla como texto sin `input/select/textarea`. Unitario, E2E y
  captura `resumen-2-jugadores-1280x720.png`.
- «Atrás» oculta el resumen y muestra la pantalla de jugador con el modelo
  intacto en el último índice; valores conservados. E2E de 1 jugador y modelo de
  `player-screen` para N.
- «Cancelar» y `Esc` abren confirmación; desistir conserva; confirmar destruye
  las pantallas y vuelve al menú con «Nueva» enfocada. E2E y captura
  `confirmacion-900x700.png`.
- «Empezar» usa `startParty` → `new GameSession({ seed, players })`; E2E de 2
  jugadores comprueba `config` exacta, `state.players` con arquetipo/variante/
  nombre, semilla y mapa. Rechazo del constructor cubierto por unitarios con
  `ok: false` y mensaje, sin lanzar.
- Flujo actual: canvas visible, `phase: player`, `status: playing`, `turn: 1`;
  sin hotseat, guardado ni resultado. `?test=1` pasa en la suite completa.
- Tests de 1 y 2 jugadores, «Atrás», cancelación y arranque con semilla elegida;
  `pnpm run verify` pasa.

# Tests no debilitados

El único test existente modificado es el bloque del último «Siguiente» de
`player-screen.spec.ts`, que comprobaba el anuncio provisional que esta tarea
sustituye. El resto de aserciones se conserva y la suite completa pasa 228/228.

# Evidencia visual revisada

- `party-summary/screenshots/resumen-1-jugador-1280x720.png`
- `party-summary/screenshots/resumen-2-jugadores-1280x720.png`
- `party-summary/screenshots/partida-2-jugadores-1280x720.png`
- `party-summary/screenshots/confirmacion-900x700.png`

Se lee el orden, la semilla no editable y el HUD de Ana (Mago); la partida
arranca con la party configurada.

# Fricción

- «Validador avisa a 2560 B y la plantilla fija 2 KB»: `rejected`. No es una
  contradicción: 2 KB es objetivo editorial, el aviso automático llega a 2,5 KB
  y el tope duro es 4 KB. El informe de 2539 B está dentro del aviso y del tope.
  Sin dueño pendiente.
- Error del constructor duplicado en `summary-status` y `summary-error`:
  `accepted` como desviación local; la ruta no es alcanzable desde la UI y el
  criterio se cumple con el mensaje visible.

# Cierre

`task_status: done`, `attempts: 1`, `completed_at` y `verified` actualizados;
tablero regenerado y entrada en `docs/log.md`.
