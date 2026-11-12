---
type: Task Brief
title: "TASK-0079: brief del intento 1"
description: Réplica inmediata del defensor tras un fallo cuerpo a cuerpo.
task: TASK-0079
attempt: 1
status: stable
brief_bytes: 2004
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T20:05:00Z }
---

# Objetivo

Resolver la réplica inmediata del defensor cuando falla un ataque cuerpo a cuerpo
con arma: tirada nueva, misma fórmula y RNG, sin coste ni cadena;
`ReplicaPerformed` tras el fallo y muerte del atacante si es letal.

# No objetivos

Presentación/HUD/E2E (`TASK-0080`); hechizos, maná y ataques reales a distancia
(`TASK-0082`); −1, cadenas, réplica de oportunidad, IA que planifique riesgo,
rebalanceo, guardado, dependencias y arte/audio/texto.

# Invariantes

- Fórmulas, balance, catálogos y contador intactos.
- Réplica gratis (acción/maná/MP), sin recursión ni estado pendiente; síncrona.
- Contrato original intacto: impacto sin réplica, fallo 2 tiradas, impacto 4.
- No borres ni debilites tests: acota el de tiradas de `REQ-010` a ataques sin
  réplica y conserva `REQ-009`/`REQ-010`.
- Sin cambios en `package.json`/lock ni imports de `experiments/`.

# Criterios de aceptación

En la ficha, sin copiar:
[criterios](../../../docs/tasks/TASK-0079-motor-replica-cuerpo-a-cuerpo.md#criterios-de-aceptación).
Mapea criterio → test en el informe.

# Contexto mínimo

- `src/game/combat.ts`, `types.ts`, `actions.ts`, `engine.ts`, `turn.ts`, `ai.ts`.
- [REQ-027](../../../docs/requirements/REQ-027-replica-combate-cuerpo-a-cuerpo.md#requisitos-creativos-decididos),
  R-001…R-011, T-001…T-005.
- **Lee [brief-detalle.md](brief-detalle.md)**: decisiones técnicas y tests.

# Artefactos

`artifacts/TASK-0079/attempt-1/report.md`, `verify-output.txt`, `logs/`; commit
en `task/TASK-0079` con SHA. Sin capturas.

# Riesgos

Sin decisiones creativas abiertas. Riesgo alto: no alteres el orden de acciones
de la IA ni las secuencias existentes más allá de añadir `ReplicaPerformed`.
