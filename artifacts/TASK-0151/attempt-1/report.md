---
type: Task Report
title: "TASK-0151: informe de ejecución"
description: Resultado del intento con HUD de jugador y aviso de ronda.
task: TASK-0151
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T22:35:00Z }
artifacts: artifacts/TASK-0151/attempt-1/
verified:
---

# Estado

`success`. Criterios cubiertos por tests unitarios y E2E.

# Cambios

- `hud.ts`: `playerPosition`/`turnAnnouncement`; `hud-live` se reescribe solo al
  cambiar. `index.html`/`ui.css`: N/M junto al nombre y región viva
  (`role="status"`, `aria-live="polite"`) oculta con `clip-path`.
- `feedback-config.ts` (`roundBannerMs: 2000`); `feedback-events.ts`
  (`kind: 'round'`, `roundBanner(round)`).
- `main.ts`: `lastRoundNotice`, aviso al salto de ronda y en «Empezar»; sin banner
  al cargar, en `setupState`, `Restart` legacy ni F2.
- Tests: `hud`, `feedback-events`, `ui-foundations`; nueva `host-hud-hotseat-qa`;
  actualizadas `feedback-turns-marks-qa`, `feedback-reduced-motion-qa`,
  `hud-left-zones-qa`, `hud-three-zones-qa`, `load-game`, `pause-save-load-qa`.
- Commits: `d526125df33ecbecba249f87be6683a1a3419b6d` (código),
  `b43edcd306256ebe90230b72a89896d71e37c5e3` (tests); evidencia en el commit de
  artefactos.

# Tests

`pnpm run test` (240 s): 1718/1718 → `test-output.txt`.
`pnpm run verify` (240 s): OK → `verify-output.txt`.

Cada línea: `pnpm exec playwright test tests/e2e/<spec>`, 180 s; capturas en
`e2e/<spec>/` y salida en `e2e-output.txt`.

- `host-hud-hotseat-qa` · 180 s · 5/5
- `feedback-turns-marks-qa` · 180 s · 4/4
- `feedback-reduced-motion-qa` · 180 s · 3/3
- `hud-left-zones-qa` · 180 s · 10/10
- `hud-three-zones-qa` · 180 s · 7/7
- `load-game` · 180 s · 5/5
- `pause-save-load-qa` · 180 s · 7/7
- `game-input-hud` · 180 s · 1/1
- `host-relevo-camera-qa` · 180 s · 4/4
- `ui-foundations-qa` · 180 s · 5/5
- `feedback-clock-loop-qa` · 180 s · 3/3
- `startup-flow-qa` · 180 s · 6/6

# Evidencia visual

`e2e/host-hud-hotseat-qa/screenshots/`: `partida-2-jugadores-ronda-1.png`,
`ronda-2-cue.png`, `carga-ronda-2-bru.png` y el resto.
Mirar: banner «Ronda 1/2», «Jugador N de M» bajo el nombre y «Bru · Jugador 2
de 2» sin banner al cargar.

# Desviaciones

- `hud-live` se reescribe al cambiar el texto del anuncio, no solo por
  `(activePlayerId, round)`: cargar con los mismos ids dejaba el anuncio anterior.
- `Restart` legacy y F2 fijan `lastRoundNotice` (el brief solo citaba `Restart`).
- La spec nueva añade un test de `setupState` sin aviso.

# Problemas conocidos y preguntas abiertas

- «Jugador N de M» ocupa dos líneas: la columna mide ~92 px a 1280×720 y el texto
  ~125 px, sin recorte ni scroll (`hud-left-zones-qa`, `hud-three-zones-qa`
  verdes). ¿Se acepta el salto o una línea completa bajo la miniatura?

# Fricción reutilizable

1 entrada en `report-detalle.md` (ancho).
# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2088 |
| `report_bytes` | 3048 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
