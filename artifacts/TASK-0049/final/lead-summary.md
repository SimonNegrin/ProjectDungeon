---
type: Verification Summary
title: "TASK-0049: verificación independiente del lead"
description: Resultados de la re-ejecución y comprobación criterio a criterio.
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T19:55:00Z }
---

# Resultados

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 732 unitarias, build 52 módulos, guarda de bundle | `lead-verify.txt` |
| `pnpm run test:e2e` | 76/76 | `lead-e2e.txt` |
| `pnpm run test:e2e --repeat-each=3` | 228/228 | `lead-repeat-each.txt` |
| `playwright ... -g "misma semilla idéntica" --repeat-each=30` | 30/30 | `lead-floor-repeat.txt` |
| EXP-004 defaults/export vs decisión | coincide | `exp004-check.txt` |

# Criterios

- Semilla fija 2738263054: 22×18, 5 salas, party 6, entrada/salida, 11 enemigos
  y puertas válidas; dos cargas y dos canvas idénticos. Verificado en
  `host-growth-render-qa.spec.ts`.
- Render y F1: máscaras, puertas, bocas, salida, enemigos y capas on/off;
  `MoveTo` real a la salida `door` rechazado, sin transición. Verificado.
- Regresión BSP: 4 enemigos, cámara, cursor, movimiento y combate en
  `host-bsp-regression.spec.ts`.
- Guarda de bundle: `check:bundle: OK — scanned 10 dist files and 49 production
  modules; no forbidden markers`.
- Capturas: 14 PNG 1280×720 revisados (normal, debug, caverna, pasillo ancho,
  spawn, entrada/salida, 13×13 y regresión BSP).
- Playtest: `attempt-1/playtest/{README.md,config.json,checklist.md}`; JSON de
  parámetros idéntico a `decision-2026-11-09T14-59-21Z.json`; no se declara
  aprobado.
- Sin dependencias nuevas, sin cambios en `src/`, sin tests borrados, saltados
  o debilitados; suite 74 → 76.

# Desviaciones y fricción

- La nota obsoleta de `experiments/EXP-004-salas-irregulares/experiment.md` sigue
  sin actualizar: `task-runner` no tiene permiso sobre `experiments/**/*.md`.
  Los defaults de `main.ts` sí reproducen la decisión. Se eleva como corrección
  documental a `requirements-writer` (no bloquea).
- `pnpm run test:e2e -- --repeat-each=3` no repite: pnpm/Playwright interpreta
  el `--` como filtro. Forma correcta: `pnpm run test:e2e --repeat-each=3`.
  Fricción de arnés documentada para `requirements-writer`.
