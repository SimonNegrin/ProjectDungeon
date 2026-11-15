---
type: ADR
title: "ADR-030: saqueabilidad y botín de enemigos"
description: Marca lootable por instancia, política common/progression en datos, tirada con RNG derivado, cadáver como Container y retirada al vaciarse.
status: stable
decision_status: accepted
decided_by: [human:simon]
decided_at: 2026-11-14T23:23:59Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T19:10:00Z }
---

# Contexto

Hasta [REQ-034](../requirements/REQ-034-objetos-saqueables-botin-enemigos.md)
v1, todo enemigo muerto dejaba un cadáver de presentación y el panel lo listaba
en la columna Suelo. La hoja aprueba un modelo distinto: un enemigo solo deja
cadáver si al menos una instancia de su equipo o mochila es saqueable. La
saqueabilidad se decide por objeto al crear al enemigo, el cadáver es un
contenedor y el saqueo se hace desde el mismo tile sin coste.

Este ADR registra el modelo técnico implementado en TASK-0130 a TASK-0136 y el
esquema de guardado de TASK-0138. No añade reglas ni amplía alcance: concreta
cómo se cumplen R-001 a R-012 y T-001 a T-011 de la hoja.

# Decisión

- **Marca por instancia.** `ItemInstance.lootable` es un booleano fijado al
  crear la instancia (`src/game/inventory.ts`). Nace `true` para jugadores,
  suelo y cofres; para el equipo y la mochila iniciales de un enemigo es el
  resultado de la tirada. Una instancia adquirida después conserva su marca: lo
  que un enemigo recoge del suelo, de un cofre o de un jugador sigue siendo
  saqueable. `ItemDefinition.lootPolicy` declara `'common' | 'progression'` y
  `LOOT_CHANCES` guarda los porcentajes en datos (`src/game/equipment.ts`), no en
  el host.
- **Tirada por objeto al crear al enemigo.** `rollEnemyLoot`
  (`src/game/loot.ts`) recorre primero los huecos de `EQUIPMENT_SLOTS` y después
  los índices de la mochila, en orden estable, y aplica la política a cada
  instancia. `common` consume una tirada de porcentaje; `progression` no consume
  tirada y nace siempre `lootable: true`. La función es pura, devuelve copias y
  no muta las entradas. El pool de este corte es solo el equipo actual de los
  tres enemigos: espada + escudo, hacha + placa y daga + escudo. No hay todavía
  objetos `progression` en el catálogo; la política queda reservada para llaves
  y objetos especiales, que llegan con su propia hoja.
- **RNG derivado.** `deriveLootRng(seed, enemyId)` (`src/game/rng.ts`) mezcla la
  semilla normalizada con un hash FNV-1a de la identidad estable del enemigo y
  `rollPercent` produce un valor 0–99. La tirada no lee ni avanza `state.rng`,
  no usa `Math.random` y no depende del reloj. Misma semilla e identidad dan el
  mismo resultado; los mapas, el combate y los tests sembrados conservan su
  secuencia.
- **Cadáver como `Container`.** Al morir un enemigo, `settleUnitDeath`
  (`src/game/death.ts`) crea un `Container` con `kind: 'corpse'` y `corpseOf` en
  su casilla, con exactamente las instancias `lootable`; las no saqueables se
  descartan con la unidad y no hay contenedor si el conjunto queda vacío. La
  unidad permanece en `enemies` con 0 PV y sin objetos para victoria, derrota y
  estado. La operación es idempotente. El cadáver de jugador es la excepción de
  [REQ-021](../requirements/REQ-021-muerte-fantasma-resurreccion.md): conserva
  todo el equipo y la mochila sin tirada y persiste al vaciarse como objetivo de
  resurrección.
- **Una sola ruta de saqueo.** `takeContainerItem` y `takeAllContainerItems`
  (`src/game/inventory.ts`) reutilizan `locateSource` y la retirada de
  contenedor de [REQ-020](../requirements/REQ-020-cofres-saqueo.md); solo
  aceptan `kind: 'corpse'` y exigen el mismo tile. Un vivo paga 0 acciones y
  0 MP; el fantasma paga una acción por objeto y «coger todo» queda reservado al
  vivo. Al retirar el último objeto de un cadáver de enemigo,
  `withoutEmptyEnemyCorpse` elimina el contenedor; el de jugador no se elimina.
  El cofre conserva adyacencia y 1 acción.
- **Presentación y panel desde contenedores.** El render y el panel leen
  `state.containers`, no unidades muertas. Un enemigo sin botín no se dibuja ni
  se lista; el cadáver aparece al terminar el beat de muerte. La columna Suelo
  muestra «sin coste» para el cadáver y «1 acción» para el cofre
  (`containerOpenCost`), y agrupa los cadáveres que comparten casilla.
- **Determinismo y guardado.** La tirada se decide una vez, al crear al enemigo.
  El esquema v1 serializa `lootable` en cada instancia y los contenedores de
  cadáver; cargar no recalcula la tirada ni cambia qué objetos son saqueables.
  El snapshot de debug expone `lootable`, `lootPolicy` y los contenedores sin
  duplicar el inventario.

# Consecuencias

- El cadáver de enemigo deja de ser presentación universal: es una señal de que
  hay algo que coger ([REQ-017](../requirements/REQ-017-feedback-visual-eventos.md)).
- [REQ-020](../requirements/REQ-020-cofres-saqueo.md) mantiene el modelo de
  contenedor y la transferencia; la apertura distingue cofre (1 acción) y
  cadáver (0), como recoge
  [REQ-026](../requirements/REQ-026-economia-acciones-rebalanceo.md).
- [REQ-018](../requirements/REQ-018-inventario-equipo.md) muestra el coste
  correcto en el panel y «coger todo» de cadáver no gasta acción ni MP.
- El 25 % es un valor provisional de
  [ADR-014](ADR-014-balance-provisional-fuente-unica.md). Con dos objetos por
  enemigo, la probabilidad de que caiga al menos uno es ≈43,75 % y el botín
  esperado es 0,5 objetos por enemigo. Se ajusta por datos, no por reglas.
- Las enmiendas a REQ-017/018/020/021/024/026 viven en TASK-0157, no en este
  ADR.

# Alternativas descartadas

- **Tirada por enemigo:** un resultado único para todo el equipo impediría que
  dos objetos del mismo enemigo cayeran de forma distinta (R-002).
- **Consumir el RNG principal:** alteraría mapas, combate y tests sembrados
  existentes (T-002).
- **`Math.random`:** rompe la reproducibilidad y el guardado sin retirada.
- **Listas paralelas de objetos saqueables:** duplican la contención, que sigue
  siendo la única fuente de verdad (T-009).
- **Cadáver decorativo universal:** contradice el objetivo de que un cadáver
  visible signifique siempre que hay algo que coger.
- **Mismo coste para cofre y cadáver:** el cofre exige adyacencia y 1 acción; el
  cadáver se saquea en el tile y es gratis.
- **Volver a tirar al cargar:** permitiría repetir la tirada recargando y
  rompería el determinismo de R-012.
- **Guardar las instancias no saqueables en el cadáver:** las haría visibles o
  recuperables, en contra de R-004.
