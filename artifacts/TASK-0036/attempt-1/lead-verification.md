---
type: Task Verification
title: "TASK-0036: verificación independiente del lead"
description: Revisión del diff, re-ejecución de tests/verify/E2E y criterios de R-010/T-007.
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T21:30:00Z }
---

# Resultado

Aprobado. Intento 1 verificado y fusionado en `main` con fast-forward
`1f6340b` (implementación `751f65b`, E2E `5aa514b`, artefactos `c1f01e9`).

# Comandos

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/game/enemy-placement.test.ts tests/unit/game/engine.test.ts tests/unit/game/map.test.ts tests/unit/game/map-integration.test.ts` | 78 tests OK | `lead-tests.txt` |
| `pnpm run verify` | docs/config OK; 536 tests OK; build OK | `lead-verify.txt` |
| `pnpm run test:e2e` | 63/63 OK | `lead-e2e.txt` |
| Escaneo independiente de 2000 semillas | 0 fallos; 4 enemigos y ancla `spawns.enemy` siempre | `lead-seed-scan.txt` |

# Criterios

- 4 enemigos exactos, 2 centinelas + 1 bruto + 1 cobarde, con bestiario.
- Salas distintas; `canSee(enemy, player)` falso; distancia al jugador ≥7 y
  entre enemigos ≥2 Chebyshev.
- Pareja a ≤8 y un enemigo a >8 de los demás en todas las semillas probadas.
- `home` = posición inicial y presente en el snapshot; serializable.
- Determinismo con dos semillas; sin `Math.random`; RNG propio con sal.
- Victoria, derrota, economía y combate sin cambios; `verify` y E2E verdes.
- Sin dependencias nuevas, sin host ni arte, `src/game/` puro.

# E2E y desviaciones

- La base `e5f2d64` ya fallaba 6 E2E por la IA dormida de TASK-0034
  (`e2e-baseline.txt`); no era una regresión de este intento.
- Se ajustaron supuestos de número/posición y se conservaron las intenciones de
  victoria, derrota y combate; `defeatAllEnemies` usa comandos reales.
- `frame-qa` cambia una aserción de movimiento por `dormant`, que es el
  comportamiento vigente de TASK-0034; se mantiene la invariante principal de
  viewport. `motion-qa` despierta a los enemigos para seguir probando la
  animación de fase enemiga.
- Los mapas inyectados sin salas y los mapas inválidos conservan el enemigo
  único histórico; el BSP válido coloca 4. Los mapas 24×24/20×20 que fallan la
  validación no son mapas de producción válidos.
- Fricción del informe: `accepted` como mejora local; el baseline E2E se
  registrará en futuros briefs con E2E en alcance.

# Riesgos

- El host sigue mostrando el HUD de `enemy-1`; el feedback del resto llega en
  TASK-0038. No afecta a los criterios de esta tarea.
- T-009 (diseño/glosario) sigue para `requirements-writer`, como en las tareas
  anteriores.
