---
type: Task Brief Detail
title: "TASK-0133: contrato técnico del intento 1"
description: Muerte de enemigo, filtrado, descarte y retirada del contenedor.
task: TASK-0133
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:00:29Z }
---

# Muerte de enemigo

- `settleUnitDeath` busca primero en `players` y después en `enemies`; solo
  actúa con `hp === 0` y es idempotente. No lee ni avanza `state.rng`.
- Instancias en orden estable: huecos de `EQUIPMENT_SLOTS` no nulos y después los
  índices de la mochila. Se queda solo con `lootable === true`.
- Cadáver: reutilizar `corpseId(enemy.id)`, posición del enemigo, `capacity`
  igual al número de instancias transferidas, `kind: 'corpse'` y `corpseOf`.
- Si el conjunto filtrado está vacío, no se crea contenedor. En ambos casos el
  enemigo permanece en `enemies` con `hp: 0`, identidad, posición y stats
  intactos, equipo vacío y mochila vacía con la misma capacidad. No marcar
  `ghost` ni moverlo a `players`.
- No cambiar el camino de muerte de jugador ni su cadáver.

# Retirada al vaciar

- En la ruta existente que retira una instancia de un contenedor
  (`locateSource` de `inventory.ts`), si tras la retirada no queda ninguna
  instancia y el contenedor es un cadáver de enemigo, eliminarlo de
  `state.containers`.
- «Cadáver de enemigo»: `kind === 'corpse'` y `corpseOf` coincide con una unidad
  de `state.enemies`. El cadáver de jugador se conserva con huecos `null` como
  hoy.
- No crear una segunda ruta de transferencia. `equipItem` desde contenedor es la
  ruta actual y debe reflejar la retirada; TASK-0136 reutilizará el mecanismo.

# Pruebas mínimas

- Enemigo con objetos saqueables y no saqueables en equipo y mochila: el cadáver
  contiene solo los saqueables; el muerto queda sin objetos y los no saqueables
  no aparecen en `allInstances`.
- Enemigo sin ningún saqueable: sin contenedor y unidad vacía.
- Muerte por ataque, réplica y hechizo: el contenedor se crea donde corresponde.
- El enemigo sigue en `enemies` con `hp: 0`; victoria y derrota no cambian.
- El cadáver no bloquea: un vivo ocupa su tile y varios cadáveres comparten tile.
- Retirar el último objeto de un cadáver de enemigo lo elimina; retirar el último
  de uno de jugador lo conserva.
- Idempotencia, JSON serializable y RNG intacto.
- Actualizar los tests que hoy afirman que el enemigo muerto no genera cadáver,
  sin debilitar su intención. `pnpm run verify` pasa.
