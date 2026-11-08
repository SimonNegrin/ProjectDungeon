---
type: Task Report
title: "TASK-0019: informe de ejecución"
description: Cobertura E2E determinista y QA visual del movimiento animado de REQ-006.
task: TASK-0019
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:20:00Z }
artifacts: artifacts/TASK-0019/attempt-1/
verified:
---

# Estado

`success`. Spec nuevo con semilla fija y reloj determinista; 8 escenarios E2E,
suite completa y `verify` en verde. No se tocó producción: no hizo falta ningún
hook nuevo.

# Cambios

- `tests/e2e/motion-qa.spec.ts` (nuevo, 8 tests): paso intermedio y avance,
  camino largo con MP 0, cámara centrada/clampada y estable al mover el cursor,
  input ignorado con `F1`/`R` (R cancela), cursor oculto y puntos que se apagan,
  ataque tras caminar sin daño anticipado, fase enemiga, reduced motion y dos
  trazas idénticas (`logs/motion-trace.log`).
- Congelación con un listener de test registrado tras el del juego
  (`advance(0)` en el mismo `keydown`) y `MOTION_CONFIG` importada, sin copiar la
  interpolación.
- Sin cambios en `src/`, `package.json`, lockfile, `docs/` ni `experiments/`.
- Commit SHA: `576562c5b4ec514c0d201a0510f89a4943a402da` (implementación y
  artefactos; este informe va en un commit posterior).

# Tests

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm run test:e2e` | 240 s | 40/40 (32 existentes + 8 nuevos) | `test-output.txt` |
| `pnpm run test:e2e motion-qa --repeat-each=3` | 300 s | 24/24 | `test-output.txt` |
| `pnpm run verify` | 180 s | 103 docs, 3 agentes/9 skills, 360 tests, build 53 módulos | `verify-output.txt` |

La repetición se acotó al spec nuevo (permitido por el brief); no se borró,
saltó ni debilitó ningún test existente.

# Evidencia visual

- `step-intermediate.png`: sprite en x=224 entre 208 (6,8) y 240 (7,8), HUD
  6/6, cursor oculto y 2 puntos.
- `arrival.png`: (8,8), MP 4/6, cursor visible sobre el jugador, 0 puntos.
- `enemy-phase.png`: HUD «Enemigo»/«Turno 1», goblin a mitad de (23,28)→(24,28),
  cursor oculto.
- `attack-after-walk.png`: jugador a mitad del paso al tile de ataque, enemigo
  5/10 (sin daño anticipado), overlay oculto.
- `reduced-motion.png`: mismo destino y MP 4/6 que `arrival`, sin animación.

# Desviaciones

- La repetición se acotó a `motion-qa`; la suite completa se ejecutó una vez.
- Sin helpers nuevos en `tests/e2e/support.ts`: `advance` y el muestreo viven en
  el spec.
- En el ataque se espera (≤3 s) a que se apague el feedback real del turno
  anterior antes de capturar, para no mostrar el `-3` ajeno al recorrido.
- En repeticiones las capturas van a `testInfo.outputPath` para no competir por
  los PNG versionados entre workers.

# Problemas conocidos y preguntas abiertas

- El flash dura 400 ms reales; el test lee flash y daño en el mismo `evaluate`
  que avanza el reloj, sin depender de ese temporizador.
- `snapshot()` es el estado final del motor también durante la animación; los
  «todavía no» se comprueban en HUD y presentación, como pide el brief.
- La semilla solo tiene un enemigo: la secuencia se verifica con `totalSteps ===
  nº de UnitMoved`, sin caso real multi-enemigo.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround aplicado | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Ejecutar `pnpm run test:e2e` reescribe capturas y JSON de tareas cerradas (`TASK-0007`, `0010`, `0016`, `0017`). | `git status --short` tras la suite mostró PNG/JSON modificados en esas rutas. | `git checkout -- artifacts/TASK-0007 artifacts/TASK-0010 artifacts/TASK-0016 artifacts/TASK-0017` antes de commitear. | Ya ocurrió en TASK-0018; todo runner que ejecute E2E ensucia el árbol y debe limpiar rutas ajenas. | Parametrizar la carpeta de capturas en la suite (`E2E_ARTIFACTS_DIR` o `testInfo.outputPath`) y documentarlo en `docs/harness/visual-qa.md`. | Bajo; solo cambia rutas de evidencia. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 4085 |
| `report_bytes` | 4347 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
| `cause` | none |

# Checklist

- [x] Criterios cubiertos y sin tests debilitados
- [x] Evidencia guardada y enlazada
- [x] Sin salidas completas pegadas en el informe
- [x] Listo para verificación del lead
