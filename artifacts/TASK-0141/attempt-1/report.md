---
type: Task Report
title: "TASK-0141: informe de ejecución"
description: Cargador único .zip/.json desde menú y pausa; reintento 2 corrige stats negativos.
task: TASK-0141
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T18:12:00Z }
artifacts: artifacts/TASK-0141/attempt-1/
verified:
---

# Estado

`success` (reintento 2). El bloqueo de la verificación queda corregido: una
partida con mago, clérigo, bárbaro, pícaro o granjero se guarda y se carga sin
cambios de estado.

# Cambios

- `src/host/load-game.ts`: `loadGameFile` (`.zip` con `readSaveZip` +
  `readSaveFiles`; `.json` con `parseSave`), `crossCheckManifest` y
  `requestGameLoad`; único selector para menú y pausa.
- `src/host/main.ts`: `applyLoadedState` sustituye la sesión, cierra la pausa,
  limpia presentación, centra la cámara en el activo una vez y redibuja HUD.
- **Reintento 2** — `src/game/save.ts`: `readStats` acepta los cuatro atributos
  inherentes en `[-9, 9]` (`STAT_MIN`/`STAT_MAX`) en vez de exigir ≥ 0; el roster
  usa `-1..3`. `magicLevel` y `acciones` conservan sus límites.
- `src/host/start-screen-view.ts`, `src/host/pause-menu-view.ts` e `index.html`:
  regiones vivas de rechazo y selector único.
- Commits: `a1b84d4`, `3c21170` (intento 1); `619985f` (fix), `394ee77`
  (tests) en el reintento.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `vitest run save-schema + load-game + session` | 102 pasan | `logs/unit-focused.txt` |
| `pnpm run verify` | OK (1678 tests, build y bundle) | `verify-output.txt` |
| `pnpm run test:e2e` (carga + pausa + arranque) | 13 pasan | `e2e-output.txt` |

El round-trip cubre los nueve arquetipos, una party mago/clérigo y rechaza
`1.5`, `10` y `-10` en un stat; los extremos `-9`/`9` se aceptan. El E2E
`menu-zip-mago-clerigo` carga un `.zip` real con mago y clérigo y compara
posición, PV, MP y stats del estado guardado.

# Evidencia visual

- `screenshots/menu-zip-mago-clerigo.png` (mago activo, Fuerza -1 en HUD),
  `menu-zip-cargado.png`, `menu-json-cargado.png`, `pausa-zip-cargado.png`,
  `pausa-json-invalido.png`.
- `saves/`: `.zip`/`.json` reales del E2E, incluida la party mago/clérigo.
- Revisar: tras cargar no queda banner ni aviso; la pausa solo se cierra con
  archivo válido.

# Desviaciones

- Rango de stats `[-9, 9]`: margen sobre el `-1..3` real para contenido futuro,
  sin admitir magnitudes que rompan la comparación de combate. No cambia el
  formato v1.
- `tests/e2e/start-screen.spec.ts` exigía 0 `input[type=file]` al pulsar
  «Cargar»; se actualizó (sin debilitar) al selector único porque R-005/T-009 lo
  exigen.
- La cámara se centra en el activo solo en el render posterior a la carga;
  después se conserva el centro en `players[0]` para no alterar el resto
  (anotado para TASK-0150).

# Problemas conocidos y preguntas abiertas

- Ninguno que bloquee la carga. El antiguo fallo de stats negativos queda
  cerrado con tests de ida y vuelta y E2E.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `docs:check` avisa de handoffs >2560 B mientras la plantilla fija objetivo 2 KB y tope 4 KB | `verify-output.txt`: brief 2591 B y este informe >2560 B | Ninguno; `verify` sale 0 | El umbral intermedio no está en la plantilla y afecta a cada brief/informe | Unificar validador y plantilla | Bajo | `pending` |
