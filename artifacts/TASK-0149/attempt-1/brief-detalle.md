---
type: Task Brief Detail
title: "TASK-0149: contrato técnico del intento 1"
description: Puntos de cambio, gate de input y actualización de tests para N, Esc y activo.
task: TASK-0149
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T21:10:00Z }
---

# Mapa de cambios

## 1. `src/host/keymap.ts`

- `end-turn`: `codes: ['n']`; conserva `label: 'terminar turno'` y grupo
  `acciones`.
- No añadas `e` ni `r` a ninguna vinculación. `MANAGED_KEY_CODES`,
  `formatKeyHelp()`, `KEYS_HELP` y la pantalla de controles derivan solos.

## 2. `src/host/input.ts`

- Importa `activePlayer` de `../game/party`.
- Elimina `findActivePlayer` (busca el primer vivo y puede devolver un jugador
  distinto del activo). Usa `activePlayer(state)` en:
  - apertura de panel: activo **vivo** (`hp > 0`), como ahora;
  - cursor y `Q`: basta con que exista activo (el fantasma activo mueve y
    cierra turno, R-013);
  - `MoveTo`, `Attack`, `EndTurn`, `spell-cast` y `Enter` de la lista: `unitId`
    del activo. El motor ya rechaza comandos de no activos.
- Añade `panning?: boolean` a `TranslateKeyOptions` y el motivo
  `'panning'` a `InputIgnoreReason`.
- Orden del gate: `repeat`/modificador → panel abierto → `F1` → `Esc` →
  (`animating || panning`) → resto. `Esc` y `F1` siguen respondiendo durante
  animación y paneo; la pausa es global.
- `n` → `{ type: 'command', command: { type: 'EndTurn' } }` con fase de jugador y
  activo existente. `e` y `r` caen en `unmapped`.

## 3. `src/host/main.ts`

- Pasa `panning: false` a `translateKey` con comentario de que el paneo real es
  TASK-0150. No añadas estado, cámara ni temporizador de paneo.
- No toques el branch del panel: `Esc` sigue devolviendo `panel-close` y el
  segundo `Esc` abre la pausa.

## 4. `src/host/hud.ts`

- La sugerencia «Sin acciones ni MP: pulsa E para terminar el turno» pasa a `N`.
- `KEYS_HELP` no se edita a mano: sale de `formatKeyHelp()`.

# Tests

- `tests/unit/host/input.test.ts`: `N` produce `EndTurn`; `E`/`R` quedan
  `unmapped`; con dos jugadores los comandos llevan el `unitId` del activo;
  fantasma activo mueve/cierra turno pero no abre panel; `panning: true` ignora
  comandos, cursor y acciones, y `false` los libera; `Esc`/`F1` sobreviven al
  paneo; `Esc` con panel abierto devuelve `panel-close`.
- `tests/unit/host/keymap.test.ts`: la ayuda contiene `N terminar turno`, no
  contiene `E ` ni `R `; `isManagedKey('e')` y `('r')` son `false`.
- `tests/unit/host/hud.test.ts`: `model.keys` contiene `N terminar turno` y el
  prompt usa `N`.
- `tests/unit/host/session.test.ts`: `commandFromKey('n', ...)` produce
  `EndTurn`; actualiza el caso existente.
- E2E: sustituye `keyboard.press('e')` por `'n'` en `flee-behavior-qa`,
  `perception-alarm-qa`, `pause-menu`, `action-counter-turn-qa`,
  `game-input-hud`, `cursor-qa`, `motion-qa`; en `pause-save-load-qa` cambia la
  lista `['e', 'd', 'f', 'r']` por `['n', 'd', 'f', 'r']`. Actualiza textos que
  esperan `E terminar turno` o «pulsa E». No debilites aserciones ni borres
  casos; si un caso deja de tener sentido por el cambio de tecla, sustitúyelo
  por el equivalente con `N`.

# Límites y evidencia

- No edites `docs/**`, incluida `docs/design/turn-economy.md`: su actualización
  es TASK-0155.
- No ejecutes la suite E2E completa. Ejecuta por separado las specs tocadas y
  guarda la salida; el riesgo de timeout de 180 s está heredado.
- Evidencia: `report.md` (≤4 KB), `test-output.txt`, `verify-output.txt`,
  `e2e-output.txt`, `logs/` y commit SHA.
