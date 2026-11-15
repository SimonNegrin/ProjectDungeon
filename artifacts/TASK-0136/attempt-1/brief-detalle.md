---
type: Task Brief Detail
title: "TASK-0136: contrato técnico del intento 1"
description: Transferencia contenedor→mochila, comandos, modelo de panel, vista y escenario E2E.
task: TASK-0136
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T18:00:00Z }
---

# Decisión de alcance

El motor no tiene todavía una transferencia contenedor → mochila: `equipItem`
es la única operación que lee un contenedor y solo mueve a un hueco de equipo.
Para cumplir «coger» y «coger todo» sin una segunda ruta, se extiende la
maquinaria existente de `inventory.ts` (`locateSource`,
`withoutEmptyEnemyCorpse`, `withBackpackItem`) con operaciones de saqueo. No se
crea una extracción paralela ni se duplica el contenido del contenedor.

Solo se saquean contenedores `kind: 'corpse'`. Los cofres y fixtures sin `kind`
siguen fuera: no se añade apertura de cofre, no se los lista en el panel y no se
les aplica coste 0. El coste declarado del cofre (1 acción) se conserva como
dato y se prueba en el modelo, sin conectarlo al panel.

No se modela estado de «abierto»: el cadáver del mismo tile se registra al abrir
el panel, sin acción ni MP (REQ-034 R-006). El estado de apertura de REQ-020
sigue sin decidirse y no entra aquí.

# Motor: operaciones de saqueo

En `src/game/inventory.ts`:

- `takeContainerItem(state, unitId, containerId, itemId, cost)`:
  - unidad en `players` (viva o fantasma, según `cost`);
  - contenedor existente y `kind === 'corpse'`; si no, `unknown-container`;
  - mismo tile: `container.x === unit.x && container.y === unit.y`; si no,
    `not-same-tile` sin cambios;
  - retirar la instancia con `locateSource` (esto ya retira el cadáver de
    enemigo vacío y conserva el de jugador);
  - `withBackpackItem` con la instancia; mochila llena → `inventory-full` sin
    cambios;
  - `cost: 'none'` no cobra; `'action'` usa `payInventoryCost(unit, 'action')`;
    sin acción → `no-action`;
  - devuelve `InventoryResult` con la unidad actualizada.
- `takeAllContainerItems(state, unitId, containerId)`:
  - solo unidad viva; un fantasma no usa «coger todo» (el comando lo rechaza);
  - mismo tile y `kind === 'corpse'` con las mismas validaciones;
  - atómico: si el número de instancias supera los huecos libres de la mochila,
    `inventory-full` y no se mueve nada (REQ-020 T-003);
  - si cabe, mueve todas en el orden estable del contenedor a los primeros
    huecos libres, deja el contenedor con `null` y aplica
    `withoutEmptyEnemyCorpse`;
  - sin MP ni acción.
- `locateSource` añade la comprobación de mismo tile para contenedores
  `kind: 'corpse'`. Así `equipItem` desde un cadáver tampoco saquea a distancia.
  No cambia el comportamiento de cofres ni de otros contenedores.

No tocar `pickUpItem`, `dropItem`, `unequipItem`, la capacidad, el catálogo ni la
retirada de cadáveres. No se emiten eventos de motor: la presentación no tiene
beat para estas operaciones.

# Motor: comandos

En `src/game/types.ts` y `src/game/engine.ts`:

- `TakeItem { unitId, containerId, itemId }`: fase de jugador; vivo o fantasma;
  vivo paga 0; fantasma paga una acción.
- `TakeAll { unitId, containerId }`: fase de jugador; solo vivo; un fantasma
  recibe `invalid-target` sin cambios.
- Ambos aparecen en `CommandType`, en el `switch` de `reduce` y se resuelven con
  `inventoryUnit`. No emiten eventos.
- `RejectionReason` gana `not-same-tile`; el panel lo traduce a un texto claro.
- `notices.ts` puede dejarlo en el `default` (`invalid-target`) salvo que ya
  exista un aviso adecuado.

# Modelo del panel

En `src/host/inventory-panel.ts`:

- `unitForPanel` resuelve por defecto con `activePlayer(state)` y exige unidad
  viva; ya no usa el primer vivo. Un `unitId` explícito se conserva para tests.
- `buildCorpses` lee `state.containers` con `kind === 'corpse'` y la misma
  posición que la unidad. No lee `hp <= 0`. Busca la unidad por `corpseOf` para
  nombre/sprite (jugador: `nombre`; enemigo: `BESTIARY[...].name`); si no la
  encuentra, usa un nombre y sprite de respaldo estables. Un cadáver de jugador
  vacío sigue listado; uno de enemigo vacío no existe en el estado.
- `PanelCorpse` gana `containerId`, `costLabel` y `items: readonly PanelItem[]`.
  Mantiene `key`, `name`, `sheet` y `sprite` para la tarjeta actual.
- Cada objeto de cadáver es un `PanelItem` normal y navegable, con clave
  `corpse:<containerId>:<instanceId>`, `instanceId` real, sprite, traits,
  comparación y `detail` que incluye el nombre del cadáver.
- Acciones del objeto de cadáver:
  - `take` («Coger»): `TakeItem`, coste `none`;
  - `take-all` («Coger todo»): `TakeAll`, coste `none`;
  - `equip` («Equipar»): `EquipItem` con `from: 'container'`, coste `mp`
    (REQ-018 R-012); no cambia la regla existente.
- `PanelAction` gana un coste opcional `'mp' | 'none' | 'action'` (por defecto
  `mp`). `buildPanelMenu` calcula `costLabel` y `disabled` por acción:
  `sin coste`, `1 MP` con `no-mp`, `1 acción` con `no-action`. No aplicar el
  coste de 1 MP a las acciones gratuitas.
- `panelRow`/`itemForKey` incluyen los objetos de cadáver. `samePanelMenu` sigue
  comparando coste y disponibilidad.
- Exponer una función pura `containerOpenCost(kind)` (o equivalente):
  `corpse` → 0 acciones, 0 MP, «sin coste»; cofre/ausente → 1 acción, 0 MP,
  «1 acción». Prueba ambos casos; el panel solo muestra cadáveres.

# Vista y apertura

En `src/host/inventory-panel-view.ts`, `index.html` y `src/host/ui.css`:

- Renderizar las filas de objetos de cadáver en la columna Suelo, después de las
  tarjetas de cadáveres y antes del suelo, en una lista propia con scroll dentro
  de `inventory-ground-scroll`. Las tarjetas de cadáver siguen sin
  `data-row-key`: el test existente «sin acciones ni paradas» se conserva.
- Las filas de cadáver son celdas normales: `data-row-key`, `data-zone="right"`,
  icono, foco, cursor, `aria-current` y navegación espacial/Tab. Actualizar
  `revealRow` para que el scroll funcione con la lista nueva.
- `stateLabel` distingue `corpse:` → «En el cadáver».
- La tarjeta de cadáver anuncia `sin coste` con texto visible/atributo estable;
  no depender solo de color.
- No añadir arte ni cambiar las tarjetas más de lo necesario.
- `src/host/input.ts`: `canOpenCharacterPanel` y la tecla `i` usan el jugador
  activo (`activePlayer`) y exigen `hp > 0`; un fantasma activo no abre el
  panel aunque otro jugador esté vivo. El panel sigue siendo público y modal.

# Tests

- `tests/unit/host/inventory-panel.test.ts`: cadáveres desde contenedores del
  tile (no adyacentes, no unidades muertas); objeto de cadáver navegable;
  acciones y costes `sin coste` / `1 MP`; «coger todo»; `containerOpenCost` para
  cadáver y cofre; modelo del activo; menú con 0 MP y 0 acciones no bloquea
  coger.
- `tests/unit/host/inventory-cursor.test.ts`: incluir filas de cadáver en la
  navegación/cursor sin romper las existentes.
- `tests/unit/host/input.test.ts`: panel solo con activo vivo; activo fantasma
  con otro vivo → no abre; fase enemiga → no abre.
- `tests/unit/game/inventory.test.ts` y `engine.test.ts`:
  - saquear desde el mismo tile y rechazo desde uno adyacente (`not-same-tile`)
    sin cambios;
  - vivo: 0 acciones y 0 MP, también con 0 MP; «coger todo» atómico y con
    mochila llena sin cambios;
  - fantasma: un objeto por acción, segundo rechazo, 0 MP, no puede equipar y
    conserva el objeto en mochila;
  - al coger el último objeto de un cadáver de enemigo desaparece el contenedor;
    el de jugador permanece;
  - un cofre no se saquea por estas operaciones y no cambia;
  - la instancia no se duplica ni se pierde; JSON serializable.
- E2E nuevo `tests/e2e/corpse-loot-panel-qa.spec.ts` (nombre orientativo):
  - estado con un cadáver de enemigo con dos objetos en el tile del activo, un
    cadáver de jugador vacío en el mismo tile y un cadáver de enemigo en una
    casilla adyacente;
  - abrir panel con `i`; listar solo los dos del tile actual y sus objetos;
  - el submenú de un objeto anuncia «sin coste»; coger y «coger todo» no cambian
    acciones ni MP; el contenedor de enemigo vaciado desaparece y el de jugador
    permanece;
  - captura del panel con cadáver y coste en
    `artifacts/TASK-0136/attempt-1/<spec>/screenshots/`.
- Actualizar los escenarios de `tests/e2e/panel-three-columns-qa.spec.ts`,
  `panel-cursor-cls-qa.spec.ts`, `qa-visual-revision-ui.spec.ts` y
  `qa-visual-correccion-ui-v7.spec.ts` que hoy crean cadáveres con unidades
  muertas: pasan a contenedores `kind: 'corpse'` con `corpseOf`, conservando
  sus aserciones de tarjetas, geometría y CLS. No borrar tests.
- No tocar tests de cofres, botín, RNG, muerte o render salvo lo imprescindible
  para que lean contenedores.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/inventory-panel.test.ts tests/unit/host/inventory-cursor.test.ts tests/unit/host/input.test.ts tests/unit/game/inventory.test.ts tests/unit/game/engine.test.ts` | 120 s |
| `pnpm run test:e2e tests/e2e/corpse-loot-panel-qa.spec.ts tests/e2e/panel-three-columns-qa.spec.ts tests/e2e/panel-cursor-cls-qa.spec.ts` | 300 s |
| `pnpm run verify` | 240 s |

# Límites

- No cambiar reglas, botín, RNG, muerte, render, cofres, capacidad ni catálogo.
- No tocar `docs/**`, `docs/requirements/**`, `docs/harness/**`,
  `docs/templates/**`, `package.json` ni `pnpm-lock.yaml`.
- No añadir una segunda ruta de saqueo. No duplicar objetos.
- Si un criterio choca con REQ-034 o con el estado actual, devolver `blocked`
  con evidencia; no improvisar una regla de producto.
