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
suite completa y `verify` en verde. Sin cambios de producción ni hooks nuevos.

# Cambios

- `tests/e2e/motion-qa.spec.ts` (nuevo, 8 tests): paso intermedio y avance,
  camino largo con MP 0, cámara centrada/clampada y estable al mover el cursor,
  input ignorado con `F1`/`R` (R cancela), cursor oculto y puntos que se apagan,
  ataque tras caminar sin daño anticipado, fase enemiga, reduced motion y dos
  trazas idénticas (`logs/motion-trace.log`).
- Congelación con un listener de test tras el del juego (`advance(0)`) y
  `MOTION_CONFIG` importada, sin copiar la interpolación.
- Sin cambios en `src/`, `package.json`, lockfile, `docs/` ni `experiments/`.
- Commit SHA: `e2fa61d881d4ed1e69f6663b236aeab47c5bb394` (implementación y
  artefactos; este informe va en un commit posterior).

# Tests

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm run test:e2e` | 240 s | 40/40 (32 existentes + 8 nuevos) | `test-output.txt` |
| `pnpm run test:e2e motion-qa --repeat-each=3` | 300 s | 24/24 | `test-output.txt` |
| `pnpm run verify` | 180 s | 104 docs, 360 tests, build 53 módulos | `verify-output.txt` |

La repetición se acotó al spec nuevo; no se borró, saltó ni debilitó ningún test.

# Evidencia visual

- `step-intermediate.png`: x=224 entre 208 y 240, HUD 6/6, cursor oculto, 2 puntos.
- `arrival.png`: (8,8), MP 4/6, cursor visible, 0 puntos.
- `enemy-phase.png`: HUD Enemigo/Turno 1, goblin en tránsito, cursor oculto.
- `attack-after-walk.png`: ataque real tras `advance(PAUSE)`: flash, `-5`
  (atenuado por el overlay, z-index 10 sobre el 4), enemigo 0/10 y «¡Victoria!».
- `attack-approach.png` (extra): recorrido previo, enemigo 5/10, sin overlay.
- `attack-damage-detail.png`: recorte 180×150 del `-5` sin la atenuación.
- `reduced-motion.png`: mismo destino y MP 4/6 que `arrival`, sin animación.

# Desviaciones

- En el ataque se espera a que se apague el feedback del turno anterior para la
  captura de aproximación; para la final se espera el pico del `-5` y se pausan
  las animaciones CSS. El overlay atenúa el daño: se adjunta un recorte.
- En repeticiones las capturas van a `testInfo.outputPath` para no competir por
  los PNG versionados entre workers.

# Problemas conocidos y preguntas abiertas

- Flash 400 ms y `damage-pop` desvanece el `-5` en 900 ms aunque la clase siga
  1200 ms; la captura espera el pico y pausa las animaciones.
- `snapshot()` es el estado final del motor también durante la animación; los
  «todavía no» se comprueban en HUD y presentación, como pide el brief.
- La semilla solo tiene un enemigo: la secuencia se verifica con `totalSteps ===
  nº de UnitMoved`, sin caso real multi-enemigo.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround aplicado | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Ejecutar `pnpm run test:e2e` reescribe capturas y JSON de tareas cerradas (`TASK-0007`, `0010`, `0016`, `0017`). | `git status --short` tras la suite mostró PNG/JSON modificados en esas rutas. | `git checkout -- artifacts/TASK-0007 artifacts/TASK-0010 artifacts/TASK-0016 artifacts/TASK-0017` antes de commitear. | Recurre desde TASK-0018; todo runner que ejecute E2E ensucia el árbol. | Parametrizar la carpeta de capturas (`E2E_ARTIFACTS_DIR` o `testInfo.outputPath`) y documentarlo en `docs/harness/visual-qa.md`. | Bajo; solo cambia rutas de evidencia. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 4085 |
| `report_bytes` | 4235 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
| `cause` | none |

# Checklist

- [x] Criterios cubiertos y sin tests debilitados
- [x] Evidencia guardada y enlazada
- [x] Sin salidas completas pegadas en el informe
- [x] Listo para verificación del lead
