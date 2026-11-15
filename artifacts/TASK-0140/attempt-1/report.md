---
type: Task Report
title: "TASK-0140: informe de ejecución"
description: Guardar desde la pausa descarga un único .zip con manifiesto y partida.
task: TASK-0140
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T17:40:42Z }
artifacts: artifacts/TASK-0140/attempt-1/
verified:
---

# Estado

`success`. Guardar descarga un `.zip` real; acciones, orden y navegación intactos.

# Cambios

- `src/host/save-game.ts`: orquestación con reloj y descarga inyectables; nombre
  UTC y `buildSaveFiles`/`writeSaveZip` como únicos responsables.
- `src/host/main.ts`: `Blob` + `a.download`; construye y comprime antes de
  descargar; solo cablea `save`.
- `pause-menu-view.ts`, `index.html`: región viva `pause-save-message`; el error
  no mueve el foco.
- Commits: `21bd30a` (implementación), `ed20160` (tests).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `vitest run tests/unit/host/save-game.test.ts` | 5/5 | `test-output.txt` |
| `pnpm run test:e2e tests/e2e/save-game.spec.ts` | 2/2 | `e2e-output.txt` |
| `pnpm run verify` | 1654/1654 + build + bundle OK | `verify-output.txt` |

El E2E valida el `.zip` real con `readSaveZip`/`readSaveFiles`. El unitario cubre
dos segundos distintos y errores de serialización y zip sin descarga.

# Evidencia visual

- `save-sample.zip` (SHA en `save-sample.sha256`): descarga real con
  `manifiesto.json` y `partida.json`; sin capturas nuevas: el menú ya está en
  `pause-menu.spec.ts`.

# Desviaciones

- Ninguna de alcance. El error usa una región viva propia para no reutilizar el
  motivo de disponibilidad.

# Problemas conocidos y preguntas abiertas

- Cargar sigue en TASK-0141.
- Guardar no muestra confirmación de éxito, solo el archivo y el error visible.

# Fricción reutilizable

Ninguna: no hubo comportamiento no documentado ni contradicción del arnés.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2378 |
| `report_bytes` | 2027 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
