---
type: Task Report
title: "TASK-0086: informe de ejecución"
description: Perfiles de resistencia v1 de roster, bestiario y familias (REQ-029).
task: TASK-0086
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T10:35:00Z }
artifacts: artifacts/TASK-0086/attempt-1/
verified:
---

# Estado

`success`. `pnpm run verify` pasa (80 ficheros, 1113 tests, tsc + vite build y
check:bundle) y los 112 E2E pasan. Resolvedor y resto del motor intactos.

# Cambios

- `src/game/roster.ts`: los nueve arquetipos declaran las cinco bandas v1
  (V/N/R) con un helper `profile()` que evita claves sueltas.
- `src/game/bestiary.ts`: `EnemyFamily`, `FAMILY_PROFILES` (seis plantillas),
  `familyResistanceProfile()` (familia + sobrescritura parcial) y
  `EnemyDefinition.family/resistanceOverrides`. El perfil efectivo se deriva en
  construcción; los tres enemigos son humanoides con sobrescrituras mínimas.
- Tests: nuevo `tests/unit/game/resistances.test.ts` (tablas, herencia,
  sobrescritura, normal por defecto, serialización, mismo perfil y cambio de
  banda en fixture); snapshot en `tests/unit/host/debug.test.ts`; adaptadas solo
  las tres expectativas que fijaban `resistencia: {}`.

SHA: código `686b15f` · tests `ee58a26`.

# Contraste fila por fila con REQ-029

Tipos en orden: Filo, Contundente, Punzante, Mágico, Eléctrico (V/N/R).

| Fila | Filo | Cont | Punz | Mág | Eléc | REQ-029 |
|---|---|---|---|---|---|---|
| Guerrero | N | N | N | N | N | OK |
| Bárbaro | R | R | N | V | V | OK |
| Pícaro | N | V | R | N | N | OK |
| Arquero | N | V | N | N | N | OK |
| Mago | V | V | V | R | R | OK |
| Clérigo | N | N | N | R | R | OK |
| Guerrero mágico | N | N | N | R | N | OK |
| Cocinero | N | N | N | N | N | OK |
| Agricultor | N | R | N | V | V | OK |
| Centinela | N | N | N | N | N | OK |
| Bruto | N | R | N | V | V | OK |
| Cobarde | N | V | N | N | N | OK |
| Humanoide | N | N | N | N | N | OK |
| Constructo | R | V | R | N | N | OK |
| No muerto | V | R | R | V | N | OK |
| Bestia | N | N | N | V | N | OK |
| Elemental | N | N | N | R | R | OK |
| Dragón | R | N | V | R | R | OK |

Las 18 filas coinciden con las tablas de héroe, enemigos y familias de REQ-029;
los tests leen el catálogo y no detectan una mala transcripción, por eso queda
aquí el contraste.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run` (4 ficheros afectados) | 56/56 OK | `test-output.txt` |
| `pnpm run test:e2e` | 112/112 OK (46,2 s) | `e2e-output.txt` |
| `pnpm run verify` | OK | `verify-output.txt` |

# Evidencia visual

No aplica: el plan de test la aplaza a TASK-0092.

# Desviaciones

- Elegí cinco bandas explícitas en héroes y familias (recomendación del brief)
  en lugar de omitir `normal`; el contraste es 1:1. El enemigo solo declara
  sobrescrituras, como pedía el brief.
- Los E2E de personaje por defecto y equipo ahora comparan el perfil con
  `ROSTER.warrior.stats.resistencia` en vez de `{}`; conservan su intención.

# Problemas conocidos y preguntas abiertas

Ninguno que bloquee. Los valores siguen siendo estimados v1 y el ajuste fino se
aplaza a roster y bestiario completos.

# Fricción reutilizable

Sin entradas nuevas que cumplan un disparador.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `report_bytes` | 3396 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
