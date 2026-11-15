---
type: Task Verification
title: "TASK-0133: verificación del lead"
description: Revisión independiente del diff, criterios y evidencia del intento 1.
task: TASK-0133
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:08:00Z }
---

# Resultado

Intento 1 aceptado. Motor `d2993d7`; evidencia `c123023`/`3c08269`.
`pnpm run verify` reejecutado sobre el árbol final: 102 archivos, 1530 tests,
`docs:check`, `config:check`, `tsc`, build y bundle OK. Focalizados: 123/123 en
cinco archivos.

# Criterios

| Criterio | Evidencia |
|---|---|
| Cadáver solo con instancias `lootable` de equipo y mochila | `settleEnemyDeath` filtra `transferableItems`; test con arma/escudo saqueables y armadura/daga no saqueables |
| No saqueables descartadas y no recuperables | `allInstances` no las contiene, `locateInstance` devuelve `null`; unidad vaciada |
| Sin saqueables no hay contenedor | Test específico: `containers` vacío y unidad sin objetos |
| Enemigo permanece en `enemies` con 0 PV y sin objetos | Identidad, posición y stats conservados; `ghost` ausente; victoria sin cambios |
| Cadáver no bloquea y comparte casilla | `isOccupied` falso con dos cadáveres; `Move` de un vivo al tile con ambos |
| Retirada al vaciar; cadáver de jugador persiste | `equipItem` desde contenedor elimina el de enemigo y conserva el de jugador con `[null]` |
| Tests y verify | 1530/1530; sin tests borrados ni debilitados; dos tests actualizados por cambio de intención |

# Diff y alcance

12 archivos: `src/game/death.ts` y `src/game/inventory.ts`; tests de `death`,
`engine` e `inventory`; artefactos y ficha. Sin cambios en requisitos, arnés,
RNG, botín, IA, mapa, combate ni dependencias. La ficha se cierra con el estado
`done`.

# Triaje de fricción

| Propuesta | Clase | Disposición | Dueño |
|---|---|---|---|
| Avisos de `docs:check` por handoffs históricos >2560 B | Arnés | `deferred` | `harness-keeper` vía `requirements-writer` |
| Glosario «Contenedor» y coste de saqueo aún con la regla antigua | Documental, TASK-0143 | `deferred` | `task-lead` en TASK-0143 |
| «Zona de cadáveres» del panel aún deriva de `hp <= 0` | Presentación, TASK-0135 | `deferred` | TASK-0135 |
| ADR-030 y glosario completo de botín | Documental, TASK-0143 | `deferred` | `task-lead` en TASK-0143 |

# Observaciones

- El camino de jugador se extrajo a `settlePlayerDeath` sin cambios de
  comportamiento; el test de muerte mágica de enemigo se actualizó de «sin
  cadáver» a «con cadáver», que es la intención nueva de REQ-034.
- La retirada vive en `locateSource`, la ruta única de retirada de contenedores,
  y distingue cadáver de enemigo por `kind`/`corpseOf` frente a `state.enemies`.
- Sin E2E: no hay presentación nueva; el render es TASK-0135.
