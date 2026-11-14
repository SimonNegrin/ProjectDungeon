---
type: Task Brief Detail
title: "TASK-0102: detalle del intento 1"
description: Contrato de datos, foco, posiciones, retirada de la barra y tests.
task: TASK-0102
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T02:05:00Z }
---

# Flujo de datos y host

La selección del panel es estado de presentación del host. Hoy `selectedKey`
vive dentro de la vista; mantén la lógica pero publica el objeto seleccionado:

- Añade `instanceId: string | null` a `PanelItem` (`instance.id` en equipo y
  mochila, `GroundItem.id` en suelo; `null` en vacío) y exporta
  `PanelSelection = { key, itemId, instanceId, zone }`.
- `createInventoryPanelView` acepta `onSelectionChange?: (selection:
  PanelSelection | null) => void`. Emítelo al abrir, al navegar/seleccionar, al
  refrescar el modelo y con `null` al cerrar. No emitas desde el submenú.
- `main.ts` guarda `panelSelection`. En `openPanel` se fija tras abrir; en
  `closePanel`, `setupState`, `Restart` y `F2` se limpia. `render()` calcula
  `panelDetail = panelOpen && panelSelection ? buildPanelDetail(display,
  panelSelection) : null` en las dos ramas (animación y estático) y lo pasa a
  `hudView.update(state, cursor, feedback, panelDetail)` (cuarto parámetro
  opcional; los tests actuales con tres argumentos siguen valiendo).
- `onSelectionChange` refresca solo el HUD (`hudView.update(...)`), no llama a
  `render()`: navegar no reconstruye mapa ni panel. Abrir/cerrar sí usan
  `render()` como hoy.

# Ficha del HUD derecho

En `src/host/hud-detail.ts`, sin tocar `buildCursorDetail`:

- `PanelDetailBlock = { id: 'selected' | 'equipped', title, subtitle, rows,
  traits, description, empty }` y `PanelDetail = { kind: 'panel', blocks:
  readonly [selected, equipped] }`.
- `buildPanelDetail(state, selection, unitId?)` resuelve la misma unidad que el
  panel (`players.find(hp > 0) ?? players[0]`) y la definición de `ITEMS`.
  - Bloque seleccionado: nombre, subtítulo con zona (`Equipado`, `En mochila`,
    `En el suelo`), stats del objeto, traits reales (`Sin traits activos` si no
    hay) y `description`.
  - Bloque equipado en `ITEMS[itemId].slot`: nombre del equipado o `Vacío`;
    subtítulo `Equipado · <hueco>`; sus stats, traits y descripción. Sin pieza:
    `empty: true`, título `Vacío` y sin filas inventadas.
  - Sin comparación ni delta: no reutilices `comparison` ni escribas
    antes/después. Reutiliza el formateo de stats de `inventory-panel.ts`
    (expórtalo si hace falta) para no duplicar cifras.
- Render en `hud.ts`: añade en `index.html` un contenedor
  `hud-panel-detail` junto a `hud-cursor-detail`, con dos bloques y testids
  estables `hud-panel-selected`/`hud-panel-equipped` y sufijos `-title`,
  `-subtitle`, `-rows`, `-traits`, `-description`. Reutiliza clases
  `hud-detail-*` y tokens.
- Con `panelDetail` no nulo: oculta `hud-cursor-detail`, vitals y bandas y
  muestra la ficha. Al cerrar, en el mismo `update` vuelve a mostrar el detalle
  del cursor ya compuesto (sin vaciarlo antes): sin parpadeo. El detalle del
  cursor nunca manda mientras el panel está abierto.

# Submenú: modelo

En `inventory-panel.ts` (puro, sin DOM):

- `PanelMenuOption = { kind, label, command, costLabel, disabled, reason }`.
- `buildPanelMenu(state, key, unitId?)` devuelve las acciones válidas del
  objeto seleccionado, en el orden actual del modelo:
  - equipo: desequipar, soltar; mochila: equipar, soltar; suelo: recoger,
    equipar.
  - `costLabel` siempre `${INVENTORY_OPERATION_COST} MP` (importa la constante;
    no escribas 1).
  - `disabled = unit.mp < INVENTORY_OPERATION_COST`; `reason` legible
    (`rejectionMessage('no-mp')`) cuando está deshabilitada.
  - Con la mochila llena, elimina solo la opción `pickup`; `equip` desde suelo
    sigue existiendo y el motor puede rechazarlo.
- Construir el menú no despacha, no muta el estado ni gasta MP.

# Submenú: vista y teclado

- En `index.html`, retira `inventory-actions` y añade un contenedor vacío
  `inventory-submenu` (`role="menu"`, `hidden`) dentro del panel. La vista lo
  rellena y posiciona; las opciones son `role="menuitem"`, `tabindex="-1"`,
  `data-testid="inventory-submenu-option-<kind>"` y `data-kind`.
- `Enter` con el submenú cerrado abre el menú del seleccionado (si hay opciones).
  No mueve el foco DOM al menú: el resaltado va con `aria-activedescendant`,
  `data-active` y `aria-selected`. Así el teclado llega sin foco programático.
- Abierto: `ArrowUp`/`ArrowDown` recorren opciones sin salir del rango;
  `ArrowLeft`/`ArrowRight` no hacen nada; `Tab` no saca el foco; `Escape` cierra
  y devuelve el foco al objeto; `Enter` ejecuta una sola vez la opción activa y
  cierra. Ignora `event.repeat`. Con la opción deshabilitada, `Enter` no
  despacha (el motivo ya se ve en la opción).
- Renderiza cada opción con su `costLabel` visible y, si está deshabilitada,
  `aria-disabled="true"` y el motivo. Un clic de ratón ejecuta la misma ruta
  (una vez); el teclado no depende de él.
- Tras ejecutar, el host despacha como hoy; `setMessage` muestra el rechazo en
  el panel y no se mueve nada. Abrir/cerrar el menú no llama a `onCommand`.
- Posición: junto a la fila seleccionada pero fuera de su columna. Mide la fila
  y el menú tras mostrarlo: si la zona es `right`, colócalo a la izquierda; en
  `equipment`/`backpack`, a la derecha; si no cabe, al lado opuesto. Limita
  arriba/abajo al panel. A 900×700 y 1280×720 no debe solapar la columna del
  seleccionado ni salirse del panel. Usa `position: absolute`, tokens y sin
  radios/sombras.

# Retirada de la barra y foco (N-008)

- Elimina el marcado, las referencias y las reglas CSS de `inventory-actions`.
  `Tab`/`Shift+Tab` quedan: equipo → mochila → derecha → cerrar, saltando zonas
  vacías. No hay parada `actions:*` ni botones focusables.
- N-008 por identidad de instancia: antes de refrescar guarda el `instanceId` y
  el centro de la selección. Tras construir el modelo, si esa instancia sigue en
  el panel selecciona su nueva clave (equipar/desequipar/recoger/soltar pueden
  cambiarla de zona); si desapareció, usa `nearestTo` con el centro anterior.
  Conserva `lastKey` y el foco real en la fila seleccionada. Un rechazo deja
  clave, estado y foco intactos y solo muestra el mensaje.

# Tests que cambian

- `tests/unit/host/hud-detail.test.ts`: ficha con seleccionado y equipado,
  hueco vacío (`Vacío`), cambio de zona, traits/descripción y ausencia de delta;
  el detalle del cursor no cambia.
- `tests/unit/host/inventory-panel.test.ts` (o `inventory-menu.test.ts`): opciones
  por contexto, orden, `1 MP`, comandos, 0 MP deshabilitado con motivo y mochila
  llena sin `recoger`. `instanceId` en las filas.
- `tests/unit/host/ui-foundations.test.ts`: HTML con `inventory-submenu` y sin
  `inventory-actions`; CSS del submenú con tokens, sin literales/radios/sombras.
- `tests/e2e/support.ts`: conserva la API `panelActionTestId`/
  `pressPanelAction` para no reescribir todos los flujos. `focusPanelAction`
  selecciona la fila, pulsa `Enter`, espera el submenú y recorre con flechas
  hasta la opción `data-kind` con `data-active="true"`; no usa `focus()`.
  `pressPanelAction` pulsa `Enter`; si la opción está deshabilitada, falla con
  el motivo visible (los tests de 0 MP no lo usan para ejecutar).
- `tests/e2e/panel-three-columns-qa.spec.ts`: el ciclo de `Tab` pierde las
  paradas de acciones; sustituye las aserciones de barra por apertura de
  submenú y conserva navegación, foco, reapertura y recogida.
- `tests/e2e/inventory-equipment-qa.spec.ts`: los cuatro flujos siguen con la
  API; el caso 0 MP pasa a comprobar opción no disponible con motivo y estado
  intacto; mochila llena comprueba que `recoger` no se ofrece (el rechazo de
  `equipar` desde suelo se mantiene). No borres flujos.
- `equipment-hud-qa`, `combat-equipment-qa` y `damage-types-qa` deben seguir
  pasando con el helper adaptado; revisa capturas y selectores.
- Nuevo `tests/e2e/panel-submenu-hud-qa.spec.ts`: equipar, desequipar, recoger y
  soltar por teclado; abrir/cerrar no gasta MP; `Enter` ejecuta una vez;
  `Escape` cierra y enfoca el objeto; arriba/abajo y izquierda/derecha; 0 MP;
  mochila llena; dos bloques en el HUD y vuelta al cursor; capturas 1280×720 y
  900×700 del submenú y de la ficha; sin solape con la columna seleccionada.

# Evidencia y comandos

- `pnpm exec vitest run tests/unit/host/hud-detail.test.ts tests/unit/host/inventory-panel.test.ts tests/unit/host/ui-foundations.test.ts` (120 s).
- `pnpm run verify` (120 s) y `E2E_ARTIFACTS_DIR=artifacts/TASK-0102/attempt-1 pnpm run test:e2e` (180 s).
- Guarda salidas completas en el intento, no en el informe. Capturas en
  `screenshots/`; informe ≤4 KB con commit SHA.

# Decisiones y riesgos

- Sin `inventory-message` para 0 MP: no hay despacho; el motivo vive en la
  opción. El rechazo del motor se reserva para operaciones que sí se ejecutan.
- La ficha muestra dos bloques independientes aunque el seleccionado sea el
  equipado; no hay delta ni simulación de combate.
- No implementes cofres ni inventario de cadáver; no cambies rejilla, figura,
  reglas, costes ni catálogo.
