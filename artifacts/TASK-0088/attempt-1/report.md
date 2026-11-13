---
type: Task Report
title: "TASK-0088: informe de ejecución"
description: Desglose por paquete en eventos de ataque, réplica y hechizo (REQ-029 T-007).
task: TASK-0088
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T11:00:00Z }
artifacts: artifacts/TASK-0088/attempt-1/
verified:
---

# Estado

`success`. Los eventos de daño exponen `damageBreakdown` sin alterar fórmulas,
total, `rolls` ni secuencia del RNG. `pnpm run verify` pasa.

# Cambios

- `src/game/types.ts`: `DamagePacketBreakdown` y campo obligatorio en
  `AttackPerformed`, `ReplicaPerformed` y `SpellCast` de daño; curación y
  resurrección no lo declaran.
- `src/game/damage.ts`: `resolvePacketParts` calcula bruto, banda, multiplicador
  y daño una sola vez; `resolvePacket` y `resolvePackets` lo comparten. El
  resultado añade `breakdown` en el orden declarado sin tocar el RNG.
- `src/game/combat.ts` y `magic.ts`: propagan el desglose; un fallo emite `[]`.
- `src/host/debug.ts`: clona el array y cada paquete en snapshot y dispatch.
- Tests: `damage.test.ts` (mixto, bandas, orden, recorte, suma), `combat.test.ts`,
  `magic.test.ts` (fuego y eléctrico), `debug.test.ts` y ampliación de `toEqual`
  exactos en replica, turn, bestiary, move-to y session.

SHA: código `0a085d9` · tests `7ff4810`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | pasa: 80 ficheros, 1119 tests; docs, config, tsc, build y bundle OK | `verify-output.txt` |
| `vitest run` focalizado (9 ficheros) | 190 tests pasan | `test-output.txt` |

# Evidencia visual

No aplica: no se toca presentación; el E2E llega en TASK-0092.

# Desviaciones

- Campo obligatorio: se adaptaron fixtures sintéticos de `tests/unit/host/`
  (motion, motion-visibility, presentation-feedback, replica-presentation,
  world-effects) con `damageBreakdown: []`; no los produce el motor ni se
  consumen en presentación.
- Se ampliaron `toEqual` exactos fuera de los cuatro ficheros del plan (replica,
  turn, bestiary, move-to, session); sin ellos la suite fallaba. No se borró,
  saltó ni debilitó ninguna aserción.
- El «ataque mixto» se cubre en el resolvedor: el catálogo v1 solo tiene armas
  de un paquete, así que un evento mixto exigiría cambiar contenido.
- No se añadió el desglose al retorno de `AttackResult`; el brief pide eventos.

# Problemas conocidos y preguntas abiertas

- En una ejecución completa, `experiments/EXP-004.../spawn.test.ts` agotó su
  timeout de 5 s bajo carga paralela; aislado pasó (7,09 s) y en el `verify`
  final volvió a pasar. No se tocó ese experimento.
- `docs:check` avisa de handoffs por encima del objetivo de 2560 B (incluido el
  brief, 3377 B); termina OK.

# Fricción reutilizable

Ninguna.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3377 |
| `report_bytes` | 2927 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
