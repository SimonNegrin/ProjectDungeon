---
type: Task Brief
title: "TASK-0153: brief del intento 1"
description: Pantalla de resultado Victoria/Derrota con Nueva y Cargar.
task: TASK-0153
attempt: 1
status: stable
brief_bytes: 2953
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T23:04:13Z }
---

# Objetivo

Sustituir los overlays de resultado por una pantalla final única con Victoria o
Derrota, ronda, party (nombre y arquetipo), semilla y «Nueva partida»/«Cargar
partida». Sin reinicio automático, pausa, guardado ni «Reiniciar».

# Invariantes

- `src/game/**` no cambia; el host presenta el estado final existente.
- Aparece solo tras el cue de `GameEnded`; sin temporizadores ni avance.
- «Nueva» abre el paso 1 de REQ-016 (`startScreenView.showStepOne()`), nunca
  reinicia. «Cargar» reutiliza `loadGameFrom`/`requestGameLoad` sin confirmación;
  un archivo inválido deja el resultado con el mensaje.
- `Esc` y teclas de juego no abren pausa ni comandos; `Tab`/`Enter`/`Espacio`
  navegan y activan las dos acciones.

# Criterios de aceptación

En `docs/tasks/TASK-0153-host-resultado-victoria-derrota.md`, sección
«Criterios de aceptación»; enlazar, no copiar.

# Contexto mínimo

- `src/host/main.ts`: `render`, `applyLoadedState`, `loadGameFrom`,
  `confirmNewGame`, `setupState` y listener de teclado.
- `index.html` 343-371, `ui.css .overlay` y `hud.ts` (`HudModel.overlays`):
  overlay viejo con «Reiniciar», a retirar.
- `src/host/load-game.ts`: `LoadGameOrigin`; añadir `result`.
- Estado: `status`, `round`, `config.seed`, `players[].nombre`/`archetypeId`;
  `ROSTER`. Vista de referencia: `party-summary-view.ts`.

# Diseño esperado

- `src/host/result.ts` puro: `buildResultScreen(state)` → `null` si `playing`;
  si no `{ status, title, round, seed, players:[{number,name,archetype}],
  announcement }`.
- `src/host/result-view.ts`: `result-screen` (`role="dialog"`, `aria-modal`),
  party, semilla, `result-new`/`result-load`; foco inicial en Nueva,
  atrapado/visible, anuncio accesible y `setLoadMessage`.
- `main.ts`: `resultView.update(display/state)` en ambos caminos del render;
  `isActive()` antes de pausa/input; Nueva comparte `confirmNewGame`; Cargar usa
  origen `result`; `applyLoadedState` oculta el resultado.

# Tests

- Nuevo `tests/unit/host/result.test.ts`: victoria, derrota, `playing` → null,
  ronda, semilla, party orden 1..6, pureza.
- Nueva E2E `host-result-qa`: datos, acciones, sin pausa/guardado/«Reiniciar»,
  foco/teclado/anuncio y capturas. «Nueva» en flujo normal llegando a victoria;
  «Cargar» con el selector compartido (válido e inválido).
- Actualizar specs con `overlay-*`, «Reiniciar» o pausa en el resultado;
  reinicio de test vía `window.__game.dispatch({type:'Restart'})`.

# Riesgos

- Retirar el handler `[data-action="restart"]`.
- Evitar que `Esc` abra la pausa con el resultado visible.
- E2E completa >180 s y puerto 4173: specs en serie; completa en TASK-0154.
