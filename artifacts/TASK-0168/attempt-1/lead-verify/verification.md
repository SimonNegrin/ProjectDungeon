---
type: Verification
title: "TASK-0168: verificación del intento 1"
description: "Cofres deterministas por sala con botín progresivo, pieza de traits garantizada y snapshot completo; criterios firmados y verify:task en verde."
task: TASK-0168
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T17:10:21Z }
---

# Resultado

`ok`. `pnpm run verify:task TASK-0168` pasa: ficha, estado, informe, siete
criterios firmados, alcance dentro de `feature` sin cambios y `pnpm run verify`
completo. La salida mecánica está en `verify-task.txt`.

# Criterios

Los siete quedan firmados:

- **50/20**: `generateChests` tira por sala no-spawn en orden de id y, si acierta,
  vuelve a tirar para un segundo cofre en esa sala. El test estadístico con 400
  mapas sintéticos da 0,45–0,55 para el primero y 0,15–0,25 para el segundo.
- **Colocación**: 200 semillas de `growth` más 30 semillas × 1–6 jugadores no
  pisan spawn, entrada, salida, puertas, muros, enemigos, armas ni otro cofre; el
  caso BSP bloquea las cuatro fichas de `placeMapEnemies`.
- **Forzado**: con `chestChance: 0` y 40 semillas siempre hay exactamente un
  cofre en una sala no-spawn.
- **Determinismo**: mismo mapa y grupo dan cofres idénticos; otra semilla cambia
  posiciones; otro grupo conserva posiciones y cambia contenido. `state.rng`
  queda en `createRng(seed)` con estado 0 y una sal propia alimenta los cofres.
- **Contenido**: capacidad 4 y dos objetos; el primero es la mejora de menor
  margen sobre el mejor equipo del grupo por hueco, o relleno si no existe; el
  segundo es relleno común salvo en los cofres que portan la pieza garantizada.
- **Pieza de traits**: una por nivel por defecto, configurable, fuera de la curva,
  en el primer cofre que la recibe; las cuatro son alcanzables con semillas fijas
  y los demás objetos son siempre `lootPolicy: common`.
- **Snapshot**: `state.containers` y el snapshot del host exponen posición,
  capacidad, `kind`, `opened` y contenido; `depth` se acepta y no altera el
  resultado. El defecto de `cloneContainer` que detectó la revisión quedó
  corregido y cubierto.

# Decisiones de la revisión

- **Pieza de traits en el hueco 1 del primer cofre.** Con dos objetos por cofre,
  R-005 (mejora + relleno común) y R-008 (pieza garantizada) se solapan en el
  cofre que porta la pieza. Se acepta que la pieza sustituya al relleno en ese
  cofre: sigue habiendo dos objetos y el cofre especial ofrece dos piezas útiles.
  Es reversible con datos y se valida en el playtest; si el usuario prefiere otra
  regla, se cambia sin tocar el resto del sistema.
- **Recuentos**: el catálogo real tiene 17 traits y 14 objetos frente a los 18/13
  de la ficha y ADR-033. No se inventan entradas; los tests cubren el catálogo
  completo. La corrección es documental.

# Diff revisado

`git diff main...HEAD`:

- `src/game/chests.ts`: generación, tiradas, colocación, umbral por hueco, relleno,
  pieza garantizada y `blockedCells`.
- `src/game/engine.ts`: genera cofres al crear la partida con PRNG propio y pasa
  las fichas BSP como celdas bloqueadas.
- `src/game/inventory.ts`, `src/game/save.ts`, `src/host/debug.ts`: `opened` en el
  modelo, el guardado v1 y el snapshot.
- Tests nuevos y ajuste justificado de `save-schema.test.ts` (el estado inicial ya
  tiene cofres); no se debilita ningún test de REQ-018/021/024/034.
- La corrección `edf51595` añade el snapshot y el bloqueo BSP que faltaban.

# Fricción

- Orden de claves en el guardado: el test de ida y vuelta byte-idéntico obliga a
  colocar los campos nuevos donde los reconstruye `readState`. Es una restricción
  local del serializador, ya cubierta por su test; no se abre cambio de arnés.
- Recuentos de catálogo en documentos: se corrige como máximo en la tarea de docs.
  No se reescribe REQ-020, que es una hoja estable del usuario.

# Qué debe probar el usuario

En el playtest de cofres: densidad por nivel (0–2 por sala, nunca en la sala de
spawn), que el primer objeto sea una mejora reconocible frente al equipo inicial,
que la maza circular aparezca con su pieza garantizada y que el cofre especial se
sienta especial aunque no lleve relleno común.
