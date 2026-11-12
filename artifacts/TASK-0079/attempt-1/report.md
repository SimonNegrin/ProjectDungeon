---
type: Task Report
title: "TASK-0079: informe de ejecución"
description: Réplica inmediata tras fallo cuerpo a cuerpo.
task: TASK-0079
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T20:20:00Z }
artifacts: artifacts/TASK-0079/attempt-1/
verified:
---

# Estado

`success`: réplica síncrona, gratis y sin cadena; `ReplicaPerformed` tras el fallo.

# Cambios

- `src/game/combat.ts`: `resolveAttack(..., kind='melee')`, tirada única
  ataque/réplica, `canReplicate`/`isCornered`, reacción de daño extraída.
- `src/game/types.ts`: `ReplicaPerformed`; `src/host/{motion,hud}.ts`: stubs.
- `tests/unit/game/replica.test.ts` (19) y ajustes acotados en `combat`,
  `turn` y `map-integration`.
- SHA: `33fbd8d` (código/tests/brief/verify; informe en commit posterior).
- `package.json`/`pnpm-lock.yaml` intactos.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` (120 s) | 75 archivos, 1033 tests; docs, config, tsc, build, bundle | `verify-output.txt` |
| `vitest run replica.test.ts` | 19/19 | verify |

# Evidencia visual

No aplica.

# Criterios → tests

| # | Test |
|---|---|
| 1 | «un impacto…»; «un fallo resuelve…»; `turn.test.ts` |
| 2 | «misma fórmula y RNG…»; «tiradas nuevas…»; «puede matar…» |
| 3 | «es gratis…»; «sin abrir cadena»; «serializar y rehidratar…» |
| 4 | «sin arma…»; «dormido…»; «acercarse despierta…»; «huye/acorralado…»; «regresa…» |
| 5 | «ataques a distancia y mágicos…» |
| 6 | «la réplica puede matar…»; «el enemigo que muere…» |
| 7 | «un fallo resuelve…» (payload); «el orden…» |
| 8 | «el que regresa replica y sigue regresando…» |
| 9 | Suite 1033/1033 + verify |
| 10 | Diff: solo stubs; catálogos intactos |

# Desviaciones

- Stubs: `motion.ts` sin cue/beat 0; `hud.ts` etiqueta de depuración.
  Presentación: TASK-0080.
- Tres tests legacy se acotan a ataques sin réplica (REQ-010, orden enemigo,
  flujo de mapa); lo nuevo se cubre en `replica.test.ts`.
- La réplica reutiliza la reacción de daño a enemigos; no añade eventos en los
  casos probados.

# Problemas conocidos y preguntas abiertas

- `ranged`/`magic` son solo discriminante y no tienen cue/animación hasta
  TASK-0080/0082; el HUD no la muestra.
- Manual pendiente: atacar a un Centinela armado.

# Fricción reutilizable

Ninguna.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2007 |
| `report_bytes` | 2559 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
