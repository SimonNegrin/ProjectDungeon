---
type: ADR
title: "ADR-011: suelo programático por sala y decoración ambiental"
description: El suelo se pinta con dos colores planos y una paleta curada por sala; la decoración se agrupa por ambientes y sigue sin bloquear.
status: stable
decision_status: accepted
decided_by: [human:simon, deepseek/v4.1-flash]
decided_at: 2026-11-08T14:29:18Z
supersedes: [ADR-010]
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T14:29:18Z }
---

# Contexto

`REQ-007` resolvió la legibilidad del suelo con un damero por tinte sobre los
tiles de piedra `10.b-d` y 23 decals planos. El resultado se aprobó en playtest,
pero el tile de piedra conserva dibujo, el tinte no da identidad por sala y la
densidad de decoración (15 %/7 %) deja el escenario vacío. Además, la lista de
decals tiene las filas 9 y 10 mal etiquetadas: la fila 9 es tierra y la 10 es
piedra/ladrillo.

El nuevo corte pide un suelo de color sólido, más decoración y ambientes
reconocibles. No pide cambiar el motor, la generación, los muros, el camino ni
las reglas.

# Decisión

- **Suelo programático plano**: el damero global `(x + y) % 2` se pinta con un
  `fillRect` por tile. No se recortan tiles de suelo del PNG ni se modifica el
  asset. Esto elimina el dibujo de piedra y permite controlar el contraste.
- **Modelo A**: una base común `#0d1519` para toda la mazmorra y un segundo tono
  por sala. Cinco paletas curadas: neutra `#16232b`, humedad `#142528`,
  muerte/combate `#2a2026`, ruina `#2b2419` y vegetación/abandono `#24261f`.
- **Asignación por contraste**: la paleta se elige para contrastar con la
  decoración dominante, no para imitarla. Nada de suelo rojo en la sala de
  sangre ni verde en la de plantas. Pasillos y umbrales usan la paleta neutra.
- **Contraste verificable**: cada paleta debe tener una diferencia de luminancia
  simple (escala 0-255) ≥ 12, leerse en escala de grises y no competir con camino
  ni cursor.
- **Decoración plana ampliada**: 33 sprites con fondo transparente: piedritas,
  hierba, tierra, ladrillos azules y rojos, huesos, siete plantas pequeñas,
  setas, cadáveres y sangre/slime. Fuera props, variantes con fondo y cultivos
  altos.
- **Ambientes por sala**: cada sala recibe un ambiente dominante (humedad,
  muerte/combate, ruina, vegetación o mixta), materializado en 1-3 focos locales
  con 20-30 % de mezcla. Algunas salas pueden ser solo dispersas. Los pasillos
  usan mezcla y no tienen foco.
- **Densidad**: 35 % de los tiles elegibles en salas y 16 % en pasillos, con
  tolerancia de ±3; máximo un decal por tile; nunca en apariciones ni umbrales.
- **Sin bloqueo**: la decoración no se escribe en `state.grid.tiles` y no añade
  colisiones, coste ni reglas de camino.
- **Orden de capas**: base de suelo → decals → camino/cursor → unidades → HUD.
  Los muros no reciben paleta ni decoración.
- **Una única planificación**: el render y `window.__game.snapshot()` consumen la
  misma lista determinista y las mismas paletas por sala.

# Consecuencias

- `src/game/` no cambia: el motor sigue sin conocer arte, Canvas, paletas ni
  decoración.
- `floorTileFor` y los recortes `TILE_RECTS.floor*` dejan de usarse en el
  render; el suelo no depende de un tile del PNG.
- El damero es estable entre semillas; cambian los ambientes, las paletas y los
  decals. Esto ayuda a comparar mapas y a depurar.
- La asignación de ambientes y paletas depende de `state.map.rooms`, `doors` y
  `spawns`; si cambia el mapa, cambia la presentación, pero no las reglas.
- Las paletas y la densidad son ajustables en playtest sin tocar la hoja.
- Los futuros biomas podrán añadir paletas y familias sin reabrir este ADR; el
  sistema de superficie con plantas y árboles queda fuera de este corte.
- El coste por frame sigue siendo despreciable: un relleno por tile y un decal
  en ~35 % de los tiles de sala.

# Alternativas descartadas

- **Tiles literales de la columna izquierda (`7.a + 8.a`)**: son fieles al
  tileset, pero el contraste es bajo (~5,4 de luminancia) y el tinte púrpura no
  aporta identidad.
- **Mantener el tinte sobre la piedra de `REQ-007`**: no elimina el dibujo del
  tile, no permite paletas por sala y ya se validó como insuficiente para la
  variedad que se busca.
- **Una sola paleta por bioma**: da cohesión, pero no la identidad por sala que
  se pide para este corte.
- **Dos colores propios por sala (Modelo B)**: multiplica la variedad, pero
  también el riesgo de fragmentar la mazmorra y de perder contraste con la
  decoración; se pospone.
- **Paleta que imita el ambiente**: hace obvio el tema, pero sangre sobre rojo y
  plantas sobre verde pierden legibilidad.
- **Colores generados al azar por sala**: produce resultados incoherentes y
  difíciles de validar; se usa una lista curada.
- **Decoración en el motor**: mezcla presentación con reglas; la decoración no
  bloqueante no necesita estado de juego.

# Enlaces

- [REQ-008](../requirements/REQ-008-suelo-programatico-decoracion-ambiental.md)
- [REQ-007](../requirements/REQ-007-damero-decoracion-suelo.md)
- [ADR-006](ADR-006-arte-placeholder-32rogues.md)
- [ADR-010](ADR-010-damero-decoracion-presentacion.md)
- [Arquitectura](../design/architecture.md)
- [TASK-0023](../tasks/TASK-0023-host-suelo-programatico-ambientes.md)
- [TASK-0024](../tasks/TASK-0024-e2e-qa-suelo-ambientes.md)
