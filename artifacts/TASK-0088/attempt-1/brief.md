---
type: Task Brief
title: "TASK-0088: brief del intento 1"
description: Desglose por paquete en eventos de ataque, réplica y hechizo (REQ-029 T-007).
task: TASK-0088
attempt: 1
status: stable
brief_bytes: 3374
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T13:00:00Z }
---

# Objetivo

Ampliar `AttackPerformed`, `ReplicaPerformed` y `SpellCast` de daño con un
desglose de solo lectura por paquete, conservando `damage` como total. El host y
`F1` deben poder explicar cada paquete sin recalcular fórmulas ni bandas.

# No objetivos

- No cambiar fórmulas, reparto de tiradas ni RNG de `damage.ts`/TASK-0085.
- No tocar HUD, cursor ni `F1` (TASK-0089); no tocar `docs/design/**` (TASK-0091).
- No añadir eventos nuevos; no añadir dependencias; no tocar `src/host/` salvo
  el clonado del snapshot en `debug.ts`.

# Invariantes

- `rolls`, `damage` total y secuencia del RNG quedan idénticos; el desglose es
  aditivo. Un fallo no consume tiradas y produce `damageBreakdown: []`.
- Orden del desglose = orden declarado en `damagePackets`.
- Curación y resurrección no declaran paquetes (sin el campo).
- `src/game/` sigue puro; no se borran, saltan ni debilitan tests: los `toEqual`
  existentes se amplían con el desglose esperado.
- `pnpm run verify` pasa.

# Criterios de aceptación

Viven en [TASK-0088 § Criterios](../../../docs/tasks/TASK-0088-motor-eventos-desglose-dano.md#criterios-de-aceptación).
No copiar. Plan en [§ Plan de test](../../../docs/tasks/TASK-0088-motor-eventos-desglose-dano.md#plan-de-test).

# Contexto mínimo

- `src/game/types.ts`: `AttackRolls`, variantes `AttackPerformed`,
  `ReplicaPerformed` y `SpellCast` (daño/curación/resurrección).
- `src/game/damage.ts`: `resolvePackets` devuelve `total` y `rolls`; añade ahí el
  desglose (banda, multiplicador, bruto y daño final) sin alterar lo existente.
- `src/game/combat.ts`: `resolveStrike` emite ataque y réplica.
- `src/game/magic.ts`: `resolveMagicAttack` emite el hechizo de daño.
- `src/host/debug.ts`: `cloneEvent` debe clonar el array y cada paquete.
- Tests: `tests/unit/game/combat.test.ts`, `magic.test.ts`, `damage.test.ts`,
  `tests/unit/host/debug.test.ts`.

# Forma recomendada (decisión técnica del lead)

```ts
interface DamagePacketBreakdown {
  readonly type: DamageType;
  readonly amount: number;        // cantidad base
  readonly damageRoll: number;
  readonly resistanceRoll: number;
  readonly raw: number;           // bruto antes de recortar a 0
  readonly band: ResistanceBand;
  readonly multiplier: number;
  readonly damage: number;        // tras banda, floor y recorte
}
// damageBreakdown: readonly DamagePacketBreakdown[]
```

Nombres alternativos solo si están justificados en el informe. Mantén
`AttackRolls.damage/armor` por compatibilidad; el desglose es la fuente
autoritativa. Extiende `ResolvePacketsResult` en vez de duplicar la fórmula.

# Artefactos

`report.md` (≤4 KB), `test-output.txt`, `verify-output.txt`; commit(s) en
`task/TASK-0088` con SHA en el informe.

# Riesgos y decisiones abiertas

- No romper los `toEqual` de eventos existentes: actualízalos con el desglose
  real, sin relajar aserciones.
- Clonado profundo en snapshot y dispatch: mutar el resultado no debe alterar el
  estado ni el siguiente snapshot.
- Duda técnica rutinaria: decide y registra; no decidas creatividad.
