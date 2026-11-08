---
type: Task Report
title: "TASK-0018: informe de ejecución"
description: Presentación animada del movimiento en el host, con timeline determinista, cámara, input bloqueado, HUD, cursor y tests.
task: TASK-0018
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:00:00Z }
artifacts: artifacts/TASK-0018/attempt-1/
verified:
---

# Estado

`success`. Presentación animada implementada en `src/host/` sin cambios en
`src/game/`; `verify` y `test:e2e` pasan.

# Cambios

- `src/host/motion.ts` (nuevo): timeline pura desde eventos, `MOTION_CONFIG`
  125/70/`constant-duration`, `n + 1` pausas, interpolación recta/diagonal
  entera, cámara con clamp, estado derivado para HUD/render y avance en
  subtramos de 50 ms.
- `src/host/main.ts`: bucle rAF con delta acotado, overrides de posición y
  cámara, gate de input, cursor oculto con puntos que se apagan, feedback
  secuenciado, `dispatch` que completa lo pendiente y `advance(ms)` determinista.
- `src/host/renderer.ts`, `debug.ts`, `input.ts`, `cursor-view.ts`: overrides,
  snapshot `animation`, `advance`, gate `animating` y puntos con cuadrado oculto.
- Tests: `tests/unit/host/motion.test.ts` y ampliaciones de `renderer`, `input`
  y `debug`; `settle()` y esperas explícitas en E2E existentes, sin cambiar sus
  aserciones de intención.
- Commit SHA: `e7cc7a9`.

# Tests

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm run test` | 120 s | 360 tests, 29 archivos, OK | `test-output.txt` |
| `pnpm run verify` | 180 s | docs, config, tests y build OK | `verify-output.txt` |
| `pnpm run test:e2e` | 240 s | 32 tests, 2 pasadas seguidas OK | `e2e-output.txt` |
| captura Playwright | 240 s | 28 comprobaciones OK | `logs/visual-evidence.log` |

macOS no trae `timeout` ni `gtimeout`; se usó el timeout explícito del tool de
shell.

# Evidencia visual

- `step-intermediate.png`: x=224 entre 208 y 240, MP 6/6, cursor oculto y 2
  puntos.
- `arrival.png`: (8,8), MP 4/6, cursor visible y cámara (64,64).
- `enemy-phase.png`: goblin animado, HUD en fase Enemigo y cursor oculto.
- `reduced-motion.png`: mismo destino y coste con `prefers-reduced-motion`,
  sin animación.
- Detalle en `logs/visual-evidence.log`.

# Desviaciones

- No se añadió una pausa extra de ~150 ms antes del ataque: `AttackPerformed`
  ocurre tras la pausa de destino de 70 ms, conforme a `brief-detalle.md` y
  R-009. El ~150 ms del brief queda como ajuste de playtest.
- Las aserciones DOM de flash/daño tras `F` se movieron inmediatamente después
  de la pulsación (misma intención) porque una pasada bajo carga agotó la
  ventana de 400 ms del flash; luego pasaron dos E2E completos.

# Problemas conocidos y preguntas abiertas

- `advance(ms)` pausa el reloj automático de la animación en curso para ser
  determinista; es API de test, no afecta al juego normal.
- La cobertura E2E nueva del movimiento (TASK-0019) no se implementa aquí.
- En fase enemiga el HUD conserva MP/acción previos y adopta el estado final al
  llegar `PlayerTurnStarted`.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround aplicado | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Ejecutar E2E modifica artefactos de tareas anteriores (`TASK-0007`, `0010`, `0016`, `0017`). | `git status --short` tras `pnpm run test:e2e` mostraba PNG/JSON de esas tareas modificados. | `git checkout -- artifacts/TASK-0007 ...` antes de commitear. | Todo runner que ejecute E2E ensucia el árbol y debe limpiar rutas ajenas. | Usar `testInfo.outputPath` o ruta por intento y documentarlo en el harness. | Bajo; solo cambia rutas de evidencia. | `deferred` (task-lead; dueño `requirements-writer`) |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3810 |
| `report_bytes` | 4077 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
| `cause` | none |

# Verificación del lead

- Diff revisado: `src/game/` intacto, sin dependencias, `experiments/` sin
  imports de producción y cambios limitados a host, tests y artefactos.
- `pnpm run verify` OK (101 documentos, 19 tareas, 3 experimentos; 360 tests en
  29 archivos; build 53 módulos) y `pnpm run test:e2e` OK (32/32), reproducidos de
  forma independiente.
- Capturas revisadas: paso intermedio (sprite entre centros, MP 6/6 y cursor
  oculto), llegada (cursor y MP 4/6), fase enemiga (HUD Enemigo y cursor oculto)
  y reduced motion (mismo destino y coste, sin animación).
- Sin tests borrados, saltados o debilitados; `settle`/`advance` solo añaden
  esperas explícitas.
- Pendiente documental: `docs/design/architecture.md` no se pudo editar por el
  permiso de `task-lead`; queda elevado a `requirements-writer` con el contenido
  de `ADR-008` y la sección de presentación del movimiento.

# Checklist

- [x] Criterios cubiertos y sin tests debilitados
- [x] Evidencia guardada y enlazada
- [x] Sin salidas completas pegadas en el informe
- [x] Listo para verificación del lead
