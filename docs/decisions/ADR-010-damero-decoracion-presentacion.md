---
type: ADR
title: "ADR-010: damero por tinte y decoración de presentación"
description: El damero y los decals del suelo se componen en el host; el motor sigue siendo la única verdad y la decoración no bloquea.
status: stable
decision_status: accepted
decided_by: [human:simon, deepseek/v4.1-flash]
decided_at: 2026-11-08T11:55:58Z
superseded_by: [ADR-011]
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:55:58Z }
---

> **Nota (2026-11-08):** [ADR-011](ADR-011-suelo-programatico-ambientes.md)
> sustituye la capa de suelo por colores planos generados por código y amplía la
> decoración por ambientes. El principio de presentación no bloqueante, la
> paridad global y el orden de capas de este ADR siguen vigentes.

# Contexto

El suelo de la mazmorra usa tres variantes de `stone floor` con el mismo fondo
oscuro y piedritas dispersas. El resultado es homogéneo y dificulta contar
casillas, estimar distancias y leer el tamaño de una sala. `REQ-007` pide un
damero de dos tonos y decoración plana no bloqueante.

El tileset 32rogues no tiene un par de suelos de piedra claro/oscuro: todos sus
suelos comparten la base. Además, `ADR-006` limita la modificación de los sprites
a recortes o escalado que no alteren el original. La solución debe dar dos tonos
legibles sin tocar los PNG y sin mezclar arte con reglas.

# Decisión

- **Damero global**: paridad `(x + y) % 2`, 1 tile por casilla, en todo tile
  transitable (salas, pasillos y umbrales). Los muros no llevan damero. El patrón
  no se reinicia por sala ni cambia con la cámara o la semilla.
- **Dos tonos por tinte de presentación**: la base es el tile de piedra existente
  y la paridad alterna recibe una capa translúcida sutil (~10 % hacia gris-azul).
  El tinte se aplica antes de los decals y no toca el PNG. `ADR-006` se matiza:
  el tinte es una capa de presentación, no una modificación del asset.
- **Luminancia, no solo tono**: los dos tonos deben distinguirse también en
  escala de grises, para no depender del color.
- **Decoración solo en el host**: una planificación determinista elige decals
  planos del tileset (suciedad, huesos, sangre/slime, hierba y setas) según
  semilla y coordenada. Densidad objetivo: 12-18 % en salas y 6-8 % en pasillos;
  máximo un decal por tile; nunca en apariciones ni umbrales.
- **Sin bloqueo**: la decoración no se escribe en `state.grid.tiles` y no añade
  colisiones, coste ni reglas de camino. El jugador puede ocupar cualquier tile
  decorado.
- **Orden de capas**: base → tinte → decals → camino/cursor → unidades → HUD. La
  decoración queda debajo de lo que el jugador necesita leer.
- **Una única planificación**: el render y el resumen de debug de
  `window.__game.snapshot()` consumen la misma lista determinista, para que la
  evidencia de test coincida con lo dibujado.

# Consecuencias

- `src/game/` no cambia: el motor sigue sin conocer arte, Canvas ni decoración.
- El damero es estable entre semillas; solo cambia la decoración. Esto ayuda a
  comparar mapas y a depurar.
- La planificación depende de `state.map.rooms`, `doors` y `spawns`; si cambia el
  mapa, cambia la decoración, pero no las reglas.
- El tinte y la mezcla de decals son ajustables en playtest sin tocar la hoja.
- Los objetos que bloquean el paso serán un concepto de motor separado; no se
  simulan como decoración.
- El coste por frame es despreciable: un tinte por tile alterno y un decal en
  ~15 % de los tiles visibles.

# Alternativas descartadas

- **Dos suelos literales del tileset (carbón + vino o carbón + azul):** evita el
  tinte, pero el damero se vuelve más colorido y compite con el gris de los
  muros.
- **Suelo vacío + suelo con piedritas:** el fondo es idéntico; el contraste es
  insuficiente para contar casillas.
- **Modificar el PNG para crear un segundo tono:** rompe `ADR-006`, pierde
  flexibilidad y obliga a mantener dos assets.
- **Decoración en el motor:** mezcla presentación con reglas y complica los
  tests; la decoración no bloqueante no necesita estado de juego.
- **Props como decoración:** cofres, barriles o rocas parecen sólidos e invitan a
  esperar interacción o bloqueo; se posponen al requisito de objetos.

# Enlaces

- [REQ-007](../requirements/REQ-007-damero-decoracion-suelo.md)
- [ADR-006](ADR-006-arte-placeholder-32rogues.md)
- [ADR-007](ADR-007-map-generator.md)
- [ADR-008](ADR-008-presentacion-animada.md)
- [Arquitectura](../design/architecture.md)
- [TASK-0021](../tasks/TASK-0021-host-damero-decoracion.md)
- [TASK-0022](../tasks/TASK-0022-e2e-qa-damero-decoracion.md)
