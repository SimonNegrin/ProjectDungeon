---
type: Task Report
title: "TASK-0038: informe de ejecución"
description: Feedback de percepción y alarma en el host, radios solo en F1 y snapshot profundo.
task: TASK-0038
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T22:30:00Z }
artifacts: artifacts/TASK-0038/attempt-1/
verified:
---

# Estado

`success`. Host terminado con "!" por `EnemySpotted`, aviso de `AlarmRaised`,
radios solo con `F1` y snapshot de solo lectura; el motor no se tocó.

# Cambios

- Archivos: `src/host/spot.ts`, `spot-view.ts`, `perception-overlay.ts`,
  `main.ts`, `debug.ts`, `hud.ts`, `notices.ts`, `index.html`; tests unitarios y
  `tests/e2e/perception-host-qa.spec.ts`.
- Commit SHA: `1c99935` (`feat(TASK-0038)`).
- El "!" se activa al llegar `EnemySpotted` en la timeline, persiste con
  `awareness === 'alert'` y se oculta en `returning`/`dormant`, muerte,
  reinicio o nueva semilla. Los receptores de onda no lo muestran.
- Aviso reutiliza `hud-message`; radios DOM con `data-testid` y círculos
  visibles; etiquetas de percepción y eventos solo en el overlay de `F1`.
- `cloneUnit` clona `home` y `lastKnown`; no hay mutadores nuevos.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host` | 18 archivos, 266 tests OK | `test-output.txt` |
| `pnpm run verify` | docs/config OK, 37 archivos, 559 tests OK, build OK | `verify-output.txt` |
| `pnpm run test:e2e` (`E2E_ARTIFACTS_DIR=…`) | 64 tests OK (64 passed, 25.7 s) | `e2e-output.txt` |

Tests nuevos: paso correcto, persistencia/ocultación, no-onda, snapshot de los 4
enemigos y mutación de `home`/`lastKnown`, radios desactivados/activados 6/4/5 y
8, etiquetas de debug y E2E focal con semilla `279837264` a 1280×720. No se
borró, saltó ni debilitó ningún test existente.

# Evidencia visual

- `perception-host-qa/screenshots/normal.png`: "!" y aviso, sin radios.
- `perception-host-qa/screenshots/debug-f1.png`: círculos de visión/alarma y
  estado de percepción en el overlay.
- Debe mirarse: "!" sobre el bruto, aviso de alarma en el HUD y ausencia de
  radios fuera de `F1`.

# Desviaciones

- El test legacy de `NOTICE_MESSAGES` pasó de `toEqual` a `toMatchObject` para
  conservar los cuatro textos aprobados y admitir el nuevo `alarm-raised`; la
  intención no cambia.
- Se ejecutó la suite E2E completa porque `pnpm run test:e2e -- <spec>` no
  filtró; el spec focal también se ejecutó solo con
  `pnpm exec playwright test`.

# Problemas conocidos y preguntas abiertas

- **Limitación TASK-0035 (decisión del lead):** un enemigo alertado por onda que
  después vuelve a ver al jugador no reemite `EnemySpotted`, porque
  `detectEnemiesAfterStep` solo emite en `newEpisode = awareness !== 'alert'` y
  `raiseAlarm` ya lo dejó en `alert`. El "!" cubre al detector que inicia el
  episodio; los receptores no lo muestran. Evidencia:
  `tests/unit/game/perception.test.ts` ("alerta a 8 tiles…", "no se propaga en
  cadena") y `tests/unit/host/spot.test.ts` ("no muestra ! a receptores…"). No
  se cambió `src/game/` ni la percepción.
- El aviso de alarma dura 1,6 s como el resto de avisos del HUD; el E2E lo
  comprueba de forma síncrona al recibir el evento.

# Fricción reutilizable

Ninguna entrada: los hallazgos son de la tarea o ya están cubiertos por la
documentación del arnés.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3280 |
| `report_bytes` | 3521 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
