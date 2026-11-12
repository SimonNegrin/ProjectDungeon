---
type: Task Report
title: "TASK-0082: informe de ejecución"
description: Catálogo de seis hechizos y resolución mágica atómica y determinista.
task: TASK-0082
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T23:20:00Z }
artifacts: artifacts/TASK-0082/attempt-1/
verified:
---

# Estado

`success`. Catálogo, resolvedor y cableado implementados; `verify` verde.

# Cambios

- `src/game/spells.ts`: seis hechizos como dato serializable con id, familia,
  nivel, coste, alcance, acierto, poder, objetivo, efecto y presentación.
- `src/game/magic.ts`: validación atómica y resolución de ataque, curación y
  resurrección; reutiliza `resolveHit`/`resolveDamage`, equipo, LOS y RNG; tope
  2 por unidad y turno.
- `types.ts`: comando `CastSpell`, evento `SpellCast`, motivos nuevos y
  `Unit.spellsCast`; `engine.ts` valida fase; `turn.ts` reinicia el cupo;
  `roster.ts` y enemigos nacen con 0.
- `combat.ts` exporta la reacción de daño para reutilizarla sin réplica;
  `hud.ts`/`motion.ts` solo reciben casos mínimos de compilación.
- Tests en `tests/unit/game/magic.test.ts` (36). Commits `9fcb3ea` (motor) y
  `eb562ea` (tests). Sin cambios en `docs/`, dependencias ni estado.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | verde: 1090/1090, build y bundle | `verify-output.txt` |
| `pnpm run test` | verde: 1090/1090 (78 archivos) | `test-output.txt` |
| `vitest run magic.test.ts` | verde: 36/36 | `logs/magic-tests.txt` |
| `pnpm run test:e2e` | no aplica: sin UI ni render | — |

Cubre las capas de combate con valores del catálogo, fuego/eléctrico, curación,
resurrección, muros frente a unidades, tope, recarga, determinismo, no
`Math.random`, no réplica y rechazos atómicos.

# Evidencia visual

No aplica: sin HUD, input, arte ni audio; lo cubre `TASK-0083`.

# Desviaciones

- `hud.ts`/`motion.ts` se tocaron solo porque sus `switch` exhaustivos sobre
  `GameEvent` no compilan con el evento nuevo (etiqueta de debug, beat 0, cue
  `null`). No se implementó feedback; `TASK-0083` lo sustituye.
- `applyEnemyHitReaction` pasa de privada a exportada en `combat.ts` para
  reutilizar despertar/alarma/huida sin duplicar la reacción; la magia no abre
  réplica.
- `spellsCast` es requerido en `Unit`; `debug.ts` no cambió porque el clon por
  spread lo conserva.
- La fase se valida en `engine.ts`; `magic.ts` valida lanzador, acción, maná,
  nivel, objetivo, alcance, LOS y tope antes de tirar o mutar. Con 2 acciones el
  tercer hechizo cae por `no-action`, no por tope; `R-006` permite ambos límites.
- La resurrección solo restaura PV; MP, acciones, maná y `spellsCast` quedan
  como al morir, porque el brief no fija otra cosa.
- `test:e2e` no se ejecutó: no hay cambio de UI; la prueba manual de Mago queda
  cubierta por integración y por `TASK-0083`.

# Problemas conocidos y preguntas abiertas

- ¿El resucitado debe volver con MP, acciones, maná y cupo completos?
  `REQ-021`/`REQ-025` no lo dicen; hoy solo cambia el PV.
- Una unidad resucitada en el mismo turno conserva su `spellsCast` anterior hasta
  su siguiente turno.
- `docs:check` avisa de que brief (4032 B) e informe superan el objetivo de
  2560 B; ambos quedan bajo el tope de 4096 B y el comando pasa.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Añadir un `GameEvent` obliga a tocar `hud.ts` y `motion.ts` por switches exhaustivos, aunque la tarea prohíba HUD/feedback | `src/host/hud.ts:182`; `src/host/motion.ts:254,321` | Etiqueta de debug, beat 0 y cue `null` | Cualquier evento nuevo del motor repite el acoplamiento y mete alcance ajeno | Tabla de presentación o `default` explícito para eventos sin cue | Medio | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 4032 |
| `report_bytes` | 4014 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
