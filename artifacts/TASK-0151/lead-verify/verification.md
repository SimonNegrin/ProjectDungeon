---
type: Task Verification
title: "TASK-0151: verificación independiente"
description: Reejecución de verify y E2E, revisión del diff y comprobación de criterios del HUD de jugador y el aviso de ronda.
task: TASK-0151
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T22:39:00Z }
---

# Resultado

Aprobada. El intento 1 (código `d526125`, tests `b43edcd`, evidencia `aa2431a`)
cumple los siete criterios. La tarea se cierra como `done`.

# Alcance revisado

- `src/host/hud.ts`: `playerPosition` (`Jugador N de M`) y `turnAnnouncement`
  derivados de `players`/`activePlayerId`/`round`; `hud-live` se actualiza solo
  cuando cambia el texto.
- `index.html`/`src/host/ui.css`: N/M junto al nombre y región viva
  `role="status" aria-live="polite"` oculta, con tokens de UI y sin recorte.
- `src/host/feedback-config.ts`/`feedback-events.ts`: `roundBannerMs: 2000` y
  `roundBanner(round)` con `kind: 'round'`; `player-turn` conserva `TU TURNO`.
- `src/host/main.ts`: aviso en el salto de ronda y al empezar partida; sin
  banner en carga, `setupState`, `Restart` legacy ni F2. El aviso usa el reloj de
  feedback y no entra en la timeline ni en el gate de input.
- Tests: `hud.test.ts`, `feedback-events.test.ts`, `ui-foundations.test.ts`, la
  nueva `host-hud-hotseat-qa.spec.ts` y actualizaciones de las specs del banner,
  HUD y carga. Sin borrados ni aserciones debilitadas.
- Sin cambios en `src/game/**`, requisitos, `docs/design/**`, glosario, arnés,
  dependencias ni `.opencode/**`.

# Verificación reejecutada

| Comando | Resultado |
|---|---|
| `pnpm run verify` (240 s) | docs 723, config, 107 archivos/1718 tests, tsc, build y bundle OK |
| `pnpm exec playwright test tests/e2e/host-hud-hotseat-qa.spec.ts` (180 s) | 5/5 |
| `pnpm exec playwright test tests/e2e/feedback-turns-marks-qa.spec.ts` (180 s) | 4/4 |
| `pnpm exec playwright test tests/e2e/feedback-reduced-motion-qa.spec.ts` (180 s) | 3/3 |
| `pnpm exec playwright test tests/e2e/hud-left-zones-qa.spec.ts` (180 s) | 10/10 |
| `pnpm exec playwright test tests/e2e/hud-three-zones-qa.spec.ts` (180 s) | 7/7 |
| `pnpm exec playwright test tests/e2e/load-game.spec.ts` (180 s) | 5/5 |
| `pnpm exec playwright test tests/e2e/pause-save-load-qa.spec.ts` (180 s) | 7/7 |
| `pnpm exec playwright test tests/e2e/game-input-hud.spec.ts` (180 s) | 1/1 |
| `pnpm exec playwright test tests/e2e/host-relevo-camera-qa.spec.ts` (180 s) | 4/4 |
| `pnpm exec playwright test tests/e2e/ui-foundations-qa.spec.ts` (180 s) | 5/5 |
| `pnpm exec playwright test tests/e2e/feedback-clock-loop-qa.spec.ts` (180 s) | 3/3 |
| `pnpm exec playwright test tests/e2e/startup-flow-qa.spec.ts` (180 s) | 6/6 |

Total E2E: 60/60 en 12 specs, cada una en un proceso separado con 180 s de
timeout. La suite completa no se ejecutó: excede el timeout heredado. Salida en
`lead-verify/verify-output.txt` y `lead-verify/e2e-output.txt`.

# Criterios

1. HUD izquierdo con ficha completa del activo y N/M junto al nombre: el nodo
   `hud-player-position` vive en la zona Personaje; `hud-left-zones-qa` y las
   capturas lo muestran. OK.
2. N posición 1-based y M total, «Jugador 1 de 1» con uno: unitarios con 1, 2 y
   6 jugadores, muertos/fantasmas y E2E de un jugador. OK.
3. «Ronda N» superior de 2 s configurable al abrir ronda: `roundBannerMs: 2000`,
   unitario de duración y E2E de ronda 1 y ronda 2. OK.
4. Aviso no bloqueante: con el banner visible, el E2E mueve el cursor en ronda 1
   y ronda 2 y abre el panel con `I`; el input no está en el gate. OK.
5. Sin aviso al cargar y ronda legible sin beat: carga real de `.zip` con ronda 2
   y segundo jugador; `feedback-banner` oculto, `animation.animating` y
   `panning` falsos, `hud-live` con la ronda. OK.
6. `aria-live` de activo y ronda: región `role="status" aria-live="polite"` con
   «Turno de …, Jugador N de M, Ronda N»; tests de estructura y E2E. OK.
7. Tests de N/M, cambio de activo, no bloqueo, duración y ausencia al cargar:
   unitarios y E2E; `pnpm run verify` reejecutado. OK.

# Evidencia visual

- `lead-verify/e2e/host-hud-hotseat-qa/screenshots/partida-2-jugadores-ronda-1.png`:
  «Ronda 1», «Jugador 1 de 2» y ficha completa.
- `ronda-2-cue.png`: vuelta de ronda con «Ronda 2».
- `ronda-2-no-bloquea.png`: cursor movido con el aviso aún visible.
- `carga-ronda-2-bru.png`: carga real sin banner, «Bru» y «Jugador 2 de 2».
- `lead-verify/e2e/hud-left-zones-qa/screenshots/con-arma-900x700.png`: la línea
  N/M cabe sin recorte ni scroll a 900×700.

# Incidencias y disposición

- **Ajuste de línea N/M.** A 1280×720 la etiqueta «Jugador N de M» ocupa dos
  líneas dentro de la columna de datos (~92 px). No hay recorte ni scroll y las
  specs de layout pasan; se acepta como detalle de implementación porque el
  criterio solo pide el texto junto al nombre. Si el usuario prefiere una línea
  completa bajo la miniatura, es un ajuste visual posterior, no un cambio de
  requisito ni un bloqueo. No se toca ahora para no rediseñar REQ-033.
- **Fricción del informe:** «ancho útil del HUD asumido en el brief». Disposición
  `rejected`: es una suposición local del brief, no una regla ni un cambio de
  arnés; las specs de layout ya protegen el caso y TASK-0155 es la propietaria de
  documentar el HUD. Sin dueño pendiente.
- **Desviación aceptada:** `hud-live` se compara por texto y no solo por
  `(activePlayerId, round)`; evita reutilizar el anuncio anterior al cargar una
  partida con los mismos ids. No altera criterios.
- **Artefactos:** se podaron `saves/` y `downloads/` efímeros de las specs de
  carga (incluidos los fixtures de 5 MB); se conservan informes, salidas, logs y
  capturas. `report.md` mide 3048 B, por debajo del aviso de 3 KB.
- **Documentación:** no se toca `docs/design/**` ni `docs/glossary.md`;
  TASK-0155 es la propietaria de ADR-029 y de la documentación de hotseat.
  `docs/design/turn-economy.md` sigue en TASK-0155.
- **Procesos:** no quedan servidores ni comandos en background; todos los
  comandos usaron timeout explícito.
