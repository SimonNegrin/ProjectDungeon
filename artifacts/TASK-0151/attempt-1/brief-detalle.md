---
type: Task Brief Detail
title: "TASK-0151: detalle del brief del intento 1"
description: Contrato de datos, puntos del host, tests y specs E2E del HUD de jugador y del aviso de ronda.
task: TASK-0151
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T23:20:00Z }
---

# Enfoque pedido

## 1. HUD: «Jugador N de M»

- En `src/host/hud.ts`, `HudModel` gana `playerPosition` y `turnAnnouncement`.
  - `playerPosition`: `Jugador ${activePlayerIndex(state) + 1} de ${state.players.length}`
    con activo válido; `—` sin activo. N es la posición 1-based en `players`, M el
    total, incluidos muertos y fantasmas.
  - `turnAnnouncement`: `Turno de ${nombre}. ${playerPosition}. Ronda ${state.round}.`;
    sin activo, `Sin jugador activo. Ronda ${state.round}.` Es solo texto accesible.
- `index.html`, zona `hud-zone-character`: añade
  `<p class="hud-player-position" data-testid="hud-player-position">—</p>` junto
  al nombre, y una región viva oculta
  `<p class="hud-live" data-testid="hud-live" role="status" aria-live="polite"></p>`.
- `ui.css`: `hud-player-position` con `--ui-help`/`--ui-muted`; `hud-live`
  oculta como `.inventory-panel-title` (posición absoluta, 1 línea, `clip-path:
  inset(50%)`). Sin colores literales, radios ni sombras (regla de
  `ui-foundations.test.ts`).
- `createHudView.update`: escribe `playerPosition` y actualiza `hud-live` solo
  cuando cambia `(activePlayerId, round)`, para no repetir el anuncio en cada
  frame. El anuncio debe incluir el activo y la ronda; no depende del color.
- No añadir fase, turno, PV del enemigo ni estado al HUD visible (REQ-033 R-008);
  la ronda persistente se lee por la región viva y `F1`.

## 2. Aviso «Ronda N»

- `src/host/feedback-config.ts`: `texts.roundBannerMs: 2000`.
- `src/host/feedback-events.ts`: `BannerFeedback.kind` admite `'round'`; exporta
  `roundBanner(round: number): BannerFeedback` con texto `Ronda ${round}` y la
  duración de configuración. `bannerForCue('player-turn')` sigue devolviendo
  `TU TURNO` para los turnos que no abren ronda.
- `src/host/main.ts`:
  - Estado del host `lastRoundNotice` (ronda ya anunciada), inicializado a la
    ronda de la sesión.
  - En `fireFeedbacks`, `PlayerTurnStarted`: si `event.turn !== lastRoundNotice`,
    muestra `roundBanner(event.turn)` y actualiza `lastRoundNotice`; si no, el
    banner actual `TU TURNO`. No mostrar ambos: al volver de la fase enemiga el
    aviso de ronda es el único (R-010).
  - Partida nueva desde «Empezar» (`startPartySession`): tras
    `clearTransientFeedback`, muestra `roundBanner(1)`, fija `lastRoundNotice` y
    llama a `render()` y `scheduleTextFrame()` para que el banner se apague solo.
  - Carga (`applyLoadedState`), hook `setupState` y `Restart` legacy: sin banner;
    fija `lastRoundNotice = state.round` y deja el banner limpio. La ronda se lee
    en la región viva; no queda animación, paneo ni beat pendiente.
  - El banner no se añade a la timeline, `MotionTimeline`, `buildMotionTimeline`
    ni al gate de input: su persistencia va por `banner` + `advanceTransientFeedback`.
    Con `prefers-reduced-motion` aparece igual y no bloquea.

## 3. Riesgo de layout

- La nueva línea puede crecer la zona Personaje. Debe seguir sin recortes ni
  scroll a 900×700 y 1280×720; si no cabe, compacta la línea (misma fila que el
  nombre mediante la vista) sin tocar el diseño de tres zonas ni las teclas.
- `hud-left-zones-qa` y `hud-three-zones-qa` son la red de seguridad.

# Tests unitarios

- `tests/unit/host/hud.test.ts`: N/M con 1, 2 y 6 jugadores; cambio de activo;
  `Jugador 1 de 1`; sin activo; anuncio con nombre, posición y ronda. Mantén el
  test que comprueba que el modelo no expone `phase`/`turn`/`status`/`enemyHp`.
- `tests/unit/host/feedback-events.test.ts`: `roundBanner` texto, `kind: 'round'`
  y 2000 ms desde `FEEDBACK_CONFIG`; `player-turn` sigue siendo `TU TURNO`.
- `tests/unit/host/ui-foundations.test.ts`: HTML declara los dos nodos nuevos y
  la región viva con `role="status"` y `aria-live="polite"`; no reaparecen los
  nodos retirados (`hud-phase`, `hud-turn`, `hud-status`, `hud-enemy-hp`).

# E2E nuevo: `tests/e2e/host-hud-hotseat-qa.spec.ts`

1. Partida nueva desde el menú normal (2 jugadores): tras «Empezar», «Ronda 1»
   visible con `data-banner-kind="round"`, «Jugador 1 de 2» junto al nombre;
   con el banner aún visible, una flecha mueve el cursor y `I` abre el panel.
   Captura.
2. Dos jugadores con un único enemigo dormido: dos `EndTurn`; en el cue
   `player-turn` de la ronda 2 se lee «Ronda 2»; tras `settle` el banner sigue
   visible (2 s > beat) y el input acepta una flecha. Captura.
3. Un jugador: tras la fase enemiga, «Jugador 1 de 1» y «Ronda 2».
4. Carga real desde el menú de un `.zip` con ronda 2 y el segundo jugador activo:
   `feedback-banner` oculto, HUD «Bru» + «Jugador 2 de 2», región viva con
   «Ronda 2», `animation.animating === false` y `panning === false`. Captura.
5. Duración: el test unitario fija 2000 ms; si el E2E avanza el reloj, usa
   `FEEDBACK_CONFIG.texts.roundBannerMs`, nunca el literal.

Usa los helpers existentes (`openState`, `openBspState`, `dispatchFrozen`,
`settle`, `advanceToCue`, `snapshot`, `writeSaveZip`, `buildSaveFiles`) y los
hooks `?test=1`; no dupliques lógica del host.

# Tests existentes a actualizar

- `tests/e2e/feedback-turns-marks-qa.spec.ts`: el caso de un jugador que vuelve
  de la fase enemiga pasa de `TU TURNO`/`kind="turn"`/700 ms a
  `Ronda 2`/`kind="round"`/`roundBannerMs`; conserva cursor oculto en el cue,
  cursor visible al final y la comprobación de que una flecha se acepta con el
  banner visible.
- `tests/e2e/feedback-reduced-motion-qa.spec.ts`: mismo cambio en el banner de
  vuelta de ronda; conserva la intención de movimiento reducido.
- `hud-left-zones-qa` / `hud-three-zones-qa` / `load-game` /
  `pause-save-load-qa`: añade o ajusta solo lo necesario para N/M, región viva y
  ausencia de banner al cargar. No borres aserciones existentes.

# Specs E2E a ejecutar por separado (180 s cada una)

La suite completa supera el timeout. Ejecuta y registra, una a una:

`host-hud-hotseat-qa`, `feedback-turns-marks-qa`, `feedback-reduced-motion-qa`,
`hud-left-zones-qa`, `hud-three-zones-qa`, `load-game`, `pause-save-load-qa`,
`game-input-hud`, `host-relevo-camera-qa`, `ui-foundations-qa`,
`feedback-clock-loop-qa` y `startup-flow-qa`.

Si una spec agota el timeout, para el proceso, guarda la salida y repórtalo; no
la repitas sin hipótesis nueva. El informe lleva una línea por spec con comando,
timeout y resultado. No ejecutes la suite completa.

# Restricciones

- No tocar `src/game/**`, `docs/**`, `AGENTS.md`, `.opencode/**`, `package.json`
  ni `pnpm-lock.yaml`.
- No cambiar reglas, criterios, teclas, cámara, guardado, input ni motor.
- No debilitar ni saltar tests; los cambios de banner son actualizaciones de
  intención documentadas en el informe.
- `pnpm run verify` (240 s) antes de entregar; no dejar procesos en background.
