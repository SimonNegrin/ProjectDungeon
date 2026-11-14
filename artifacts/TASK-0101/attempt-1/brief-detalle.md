---
type: Task Brief Detail
title: "TASK-0101: detalle del intento 1"
description: Layout, navegación, foco, puente de acciones y tests que cambian.
task: TASK-0101
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T01:20:00Z }
---

# Layout

El panel sigue dentro de `.frame`, con la geometría de TASK-0100 (`left: 21.875%`,
`width: 56.25%`, alto completo) y sin scroll global a 1280×720. Distribución:

- Cabecera: título, jugador y MP.
- Ayuda corta: flechas/WASD, Tab por zonas, Enter en una acción, 1 MP.
- `inventory-columns`: tres secciones de un tercio con `min-width: 0`.
  1. `data-zone="equipment"`: figura humana y 8 huecos.
  2. `data-zone="backpack"`: 8 casillas en 2×4, con contador.
  3. `data-zone="right"`: cadáveres arriba y suelo abajo con scroll propio.
- Barra de acciones del objeto seleccionado.
- Mensaje de rechazo (`role="status"`) y pie con `inventory-close`.

La columna derecha no desplaza a las otras: `overflow: hidden` en panel, cuerpo y
columnas; solo el contenedor del suelo lleva `overflow-y: auto`. El suelo existe
siempre: sin objetos muestra un estado vacío, no se oculta.

# Figura de equipo

Ocho posiciones absolutas dentro de la figura, con una silueta de bloques hecha
con CSS (sin arte nuevo, sin radios):

| Hueco | Posición |
|---|---|
| `head` | arriba, centrado |
| `neck` | bajo la cabeza, a la izquierda del cuello |
| `ring` | bajo la cabeza, a la derecha del cuello |
| `armor` | torso, centrado |
| `shield` | altura de manos, izquierda |
| `hands` | altura de manos, centro |
| `weapon` | altura de manos, derecha |
| `feet` | abajo, centrado |

Cada hueco conserva `data-testid="inventory-slot-<slot>"` y un hijo
`inventory-slot-<slot>-name`. Con objeto: icono `items.png` (mismo recorte que el
mundo), nombre accesible y estado. Vacío: se ve atenuado, `aria-disabled="true"`,
sin icono y sin ser parada de foco. Mantén `inventory-equipment` como contenedor.

# Mochila y derecha

- Mochila: 8 celdas con `data-testid="inventory-backpack-<i>"` y nombre
  `inventory-backpack-<i>-name`; icono, nombre y estado (hueco/ocupado), sin
  stats, traits ni comparación. Vacías visibles y no seleccionables.
- Cadáveres: `inventory-cadavers`, reservado y vacío en este corte; muestra el
  título y un texto de vacío. No inventes cadáveres ni trasvases.
- Suelo: `inventory-ground-section` siempre visible, `inventory-ground` y filas
  `inventory-ground-<id-normalizado>` con sus nombres. Scroll solo aquí.

# Navegación (N-001 a N-010)

Implementa la resolución en un módulo puro nuevo, inyectando el centro de cada
celda; la vista lo alimenta con `getBoundingClientRect()` relativo al panel.
Pruebas unitarias con puntos sintéticos:

- Solo entran objetos existentes (equipo puesto, mochila, suelo; cadáveres
  cuando existan). Vacíos fuera del conjunto.
- Dirección estricta: el candidato debe estar estrictamente arriba/abajo/
  izquierda/derecha del centro actual; misma altura o detrás no cuenta.
- Métrica: distancia entre centros (euclídea). Empate: menor desviación
  perpendicular; si persiste, orden de lectura arriba→abajo, izquierda→derecha.
- Sin candidato: no se mueve (sin rebote).
- Al abrir: último objeto usado si sigue existiendo; si no, primero en orden de
  lectura. La clave estable es `slot:<slot>`, `backpack:<i>`, `ground:<id>`.
- Tras equipar/recoger/soltar/refrescar: misma clave si existe; si desapareció,
  el más próximo euclídeo a su centro anterior (empate por orden de lectura).
- Flechas y `WASD` equivalentes, una pulsación = un movimiento; el foco real se
  mueve al objeto elegido (roving tabindex: solo el seleccionado es tabbable).
- `Tab`/`Shift+Tab`: equipo → mochila → derecha → acciones → cerrar y vuelta;
  al entrar en una zona enfoca su último objeto (o el primero). Zonas sin
  objetos se saltan. El foco nunca sale del diálogo.
- En la derecha, enfocar desplaza solo el scroll del suelo para dejarlo visible.
- Foco visible con `var(--ui-focus)` y sin sombras/radios.

# Puente de acciones

Hasta TASK-0102 no hay submenú. La barra `inventory-actions` muestra solo las
acciones del objeto seleccionado, con los `data-testid`
`inventory-action-<kind>-<rowkey>` actuales. `Enter` sobre un objeto no abre nada;
`Enter` sobre un botón ejecuta la acción. Un rechazo deja el mensaje y no mueve
selección, estado ni MP. Tras ejecutar, aplica la regla de foco de N-008.

# Tests que cambian

- `tests/unit/host/inventory-panel.test.ts`: el suelo pasa a lista siempre
  presente (vacío = `[]` + aviso de vacío), añade `corpses: []`. Conserva y no
  debilites los tests de comparación, stats, comandos, cues y rechazos.
- Nuevo `tests/unit/host/inventory-navigation.test.ts`: vecino por dirección,
  empates por desviación y orden de lectura, bordes sin rebote, primero por
  lectura, más próximo a un punto y zonas.
- Nuevo test de estructura (puede vivir en `ui-foundations.test.ts`): HTML con
  tres columnas y sin `inventory-stats`; CSS del panel sin literales de color ni
  grosor, sin radios ni sombras difusas, con `--ui-focus` y scroll solo en suelo.
- `tests/e2e/inventory-equipment-qa.spec.ts`: actualiza el suelo vacío (visible),
  retira de la rejilla las aserciones de stats/comparación (siguen cubiertas en
  unitario del modelo y pasan a TASK-0102 en UI) y sustituye
  `pressPanelAction` por: seleccionar el objeto con Tab de zona + flechas y
  después Tab a la acción. No borres los flujos de 1 MP, rechazos, mochila llena,
  recoger/soltar ni sprites.
- `tests/e2e/combat-equipment-qa.spec.ts` y `equipment-hud-qa.spec.ts`: el suelo
  vacío sigue visible; actualiza el selector/recorrido de la acción de recogida.
- `tests/e2e/hud-three-zones-qa.spec.ts`: mantén las comprobaciones de geometría,
  HUD visibles y bloqueo; actualiza el comentario/aserción de scroll interno al
  contrato nuevo (sin scroll global).
- Nuevo `tests/e2e/panel-three-columns-qa.spec.ts`: tres columnas, 8 huecos y 8
  casillas, huecos vacíos no seleccionables, recorrido con flechas y WASD,
  empate determinista, borde sin rebote, foco conservado al reabrir y tras una
  operación, Tab por zonas y `Shift+Tab`, scroll del suelo acompañando al foco,
  1280×720 con mochila llena + 4 objetos sin scroll en panel/cuerpo/columnas,
  900×700 sin scroll global y capturas.

# Evidencia

- `pnpm exec vitest run tests/unit/host/inventory-navigation.test.ts tests/unit/host/inventory-panel.test.ts` (120 s).
- `pnpm run verify` (120 s) y `$E2E_ARTIFACTS_DIR=artifacts/TASK-0101/attempt-1 pnpm run test:e2e` (180 s).
- Capturas 1280×720 y 900×700: panel con mochila llena y 4 objetos, suelo vacío,
  foco en cada zona y selección tras reabrir.
