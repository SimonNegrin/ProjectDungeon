---
type: Verification
title: "TASK-0169: verificación del intento 1"
description: "Apertura de cofre con 1 acción, depósito atómico y persistencia; criterios firmados y verify:task en verde."
task: TASK-0169
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T17:19:11Z }
---

# Resultado

`ok`. `pnpm run verify:task TASK-0169` pasa: ficha, estado, informe, siete
criterios firmados, alcance dentro de `feature` sin cambios y `pnpm run verify`
completo. La salida mecánica está en `verify-task.txt`.

# Criterios

Los siete quedan firmados:

- `OpenContainer` gasta una acción y no MP, exige Chebyshev 1 (las ocho
  direcciones), rechaza mismo tile, distancia 2, cofre inexistente, sin acción y
  contenedor que no es cofre sin tocar el estado. Reabrir uno abierto es gratis
  incluso con 0 acciones.
- El fantasma recibe `dead-unit` al intentar abrir y conserva
  `InspectContainer` con el contenido; solo el activo en fase de jugador abre.
- `DepositItem` mueve al primer hueco libre sin acción ni MP para el vivo,
  valida tipo, apertura, adyacencia, índice y capacidad antes de mover, y rechaza
  cadáveres y cofres cerrados. El fantasma paga una acción por objeto.
- `TakeAll` sobre cofre abierto es atómico: con 2 objetos y 1 hueco libre se
  rechaza entero con `inventory-full` y el estado no cambia.
- El cofre abierto y vacío permanece en `state.containers` con `opened: true`;
  coger uno conserva el resto del contenido.
- El snapshot del host y el guardado v1 conservan posición, capacidad, `opened` y
  contenido; cargar y volver a guardar produce el mismo `.save` y el mismo
  manifiesto.
- Tests nuevos de apertura, depósito, saqueo, fantasma y round-trip; los tests de
  cadáver de REQ-034 mantienen su intención (el único aserto actualizado pasa de
  `unknown-container` a `container-closed` porque el cofre ya es un contenedor
  jugable). `pnpm run verify` en verde con 1878 tests.

# Diff revisado

`git diff main...HEAD`:

- `src/game/types.ts`: comandos y motivos nuevos.
- `src/game/inventory.ts`: `openContainer`, `depositItem`, acceso de cofre en
  `takeContainerItem`/`takeAllContainerItems`, sin tocar la ruta del cadáver.
- `src/game/engine.ts`: reducers, coste de contenedor y despacho.
- Tests: `containers.test.ts` nuevo y ampliaciones de `inventory`, `turn`,
  `save-schema` y `host/debug`.

Sin cambios fuera de alcance. Riesgo medio controlado: la transferencia reutiliza
la maquinaria existente y los rechazos se prueban por identidad de estado.

# Notas para el hito

- El cofre no bloquea el paso: una unidad sobre su casilla no puede abrirlo con
  Chebyshev 1 estricto. Es la lectura literal de R-003; se decide en playtest si
  el mismo tile también vale.
- `OpenContainer` y `DepositItem` no emiten `GameEvent` todavía. TASK-0170 debe
  producir el feedback de apertura y transferencia desde el cambio de estado o
  añadiendo su evento; no se considera defecto de esta tarea.

# Qué debe probar el usuario

En el playtest: abrir un cofre desde una casilla vecina con una acción, reabrirlo
sin coste, coger uno y «coger todo», depositar un objeto y comprobar que el cofre
vacío sigue en el mapa tras guardar y cargar.
