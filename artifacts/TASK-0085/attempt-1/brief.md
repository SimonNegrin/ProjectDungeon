---
type: Task Brief
title: "TASK-0085: brief del intento 1"
description: Motor de tipos de daño, paquetes y resolvedor con bandas (REQ-029).
task: TASK-0085
attempt: 1
status: stable
brief_bytes: 3025
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T12:30:00Z }
---

# Objetivo

Sustituir el daño único por paquetes tipados y un único resolvedor puro de
`src/game/`; compilar el host con adaptación mínima y migrar los tests sin
borrarlos ni debilitarlos.

# No objetivos

- Perfiles estimados (TASK-0086), armas nuevas (TASK-0087), eventos con desglose
  (TASK-0088), bandas en cursor/HUD (TASK-0089), regresión/coste (TASK-0090).
- No cambiar impacto, escudo, economía de acciones ni maná.
- No tocar `src/host/` más allá de lo necesario para compilar.
- Sin dependencias nuevas; `src/game/` no importa `src/host/`.

# Invariantes

- Cinco tipos, cuatro bandas, un resolvedor compartido por ataque, réplica y
  hechizo. RNG determinista conservando el orden de tiradas.
- `pnpm run verify` pasa. No se borra, salta ni debilita ningún test.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0085-motor-tipos-dano-paquetes-resolvedor.md`,
sección «Criterios de aceptación». Enlazar, no copiar.

# Contexto mínimo

- `src/game/types.ts`: `UnitStats.resistencia` numérico, `AttackRolls`; añadir
  `DamageType`, `ResistanceBand`, `ResistanceProfile`, `DamagePacket`.
- `src/game/equipment.ts`: `WeaponDefinition.damage` → `damagePackets` + validación.
- `src/game/combat.ts`: `resolveStrike`/`resolveDamage` con absorción única;
  migrar a resolvedor de paquetes; réplica reutiliza el mismo camino.
- `src/game/magic.ts`: `resolveMagicAttack` con absorción histórica; usar el
  resolvedor compartido (T-006). Nivel de magia solo en acceso/maná/impacto.
- `src/game/spells.ts`: los hechizos de daño declaran tipo (eléctrico/mágico);
  curación y resurrección no declaran paquete.
- `src/game/roster.ts` y `src/game/bestiary.ts`: `resistencia` → perfil (normal).
- `src/host/hud.ts` (L105-127): imprime `weapon.damage` y `resistencia`; adaptar
  lo mínimo para compilar.
- Fórmula y requisitos técnicos: [REQ-029](../../../docs/requirements/REQ-029-tipos-dano-resistencias.md#fórmulas)
  y [T-001..T-009](../../../docs/requirements/REQ-029-tipos-dano-resistencias.md#requisitos-técnicos).
- Decisión técnica: [ADR-023](../../../docs/decisions/ADR-023-tipos-dano-paquetes-bandas.md).

# Artefactos

- `report.md`, `verify-output.txt`, `test-output.txt`, `screenshots/` (si aplica),
  `logs/`.

# Riesgos y decisiones abiertas

- Migración amplia de tests (`combat.test.ts`, `magic.test.ts`, `replica.test.ts`,
  `integration.test.ts`, `helpers.ts`): mantener la intención, no fijar valores
  de balance. Los balances leen del catálogo.
- El campo `damage` total se conserva en los eventos (`AttackPerformed`,
  `ReplicaPerformed`, `SpellCast`); el desglose por paquete es TASK-0088.
- Duda técnica rutinaria: resolver y registrar; no decidir creatividad.
