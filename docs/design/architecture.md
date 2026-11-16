---
type: Architecture
title: Arquitectura local-first
description: Separación entre motor, render, input y la futura capa de red.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:04:36Z }
---

# Principios

- **Local-first**: primero un juego local con teclado; la red llega al final.
- **Motor determinista**: mismo estado, comandos y semilla producen el mismo
  resultado.
- **Render separado**: el motor no conoce Canvas ni el DOM.
- **Input separado**: el motor recibe comandos, no teclas.
- **Estado serializable**: el estado debe poder guardarse, compararse y enviarse
  por red en el futuro.
- **Sin sobreingeniería**: nada de ECS ni motor genérico para el primer hito.

# Módulos previstos

```text
src/
  game/        # Estado, reglas, turnos, rejilla, combate, IA
  host/        # Canvas, cámara, input de teclado, HUD
  ui/          # Componentes de HUD y overlays
  shared/      # Tipos y utilidades compartidas
  server/      # Fase remota, todavía no existe
  controller/  # Fase remota, todavía no existe
```

El shell de experimentos vive en `experiments/` y no debe ser importado por
producción. El código validado en un experimento se promociona a `src/`.

# Flujo local

```text
Teclado
  -> InputSource
  -> Command
  -> GameEngine.reduce(state, command)
  -> Events
  -> PresentationTimeline (host: movimiento + feedback)
  -> Renderer + HUD + Cursor
```

El motor no lee teclado, no dibuja y no usa `Date.now()` para reglas. El bucle de
render puede usar tiempo real, pero la simulación de turnos avanza por comandos
y eventos.

# Configuración de partida

`src/game/config.ts` define `GameConfig`: semilla y de 1 a 6 `PlayerConfig` en
orden de turno, cada uno con arquetipo, variante `1|2` y nombre. Es serializable
y el motor la valida antes de generar el mapa con `GameConfigError` tipado
(`player-count`, `unknown-archetype`, `invalid-variant`, `invalid-seed`), sin
estado parcial. `createInitialState` es el único constructor: crea
`player-1..N` desde la lista, ocupa los huecos de `spawns.party` en orden,
resuelve el nombre vacío con el del arquetipo y guarda `state.config`. Host,
`GameSession`, `load`, `regenerate` y `Restart` consumen ese mismo camino.
`Unit.variant` viaja al snapshot y no cambia cálculos; el motor sigue puro, sin
importar `src/host/` ni conocer el DOM ([REQ-016](../requirements/REQ-016-pantalla-inicio-configuracion.md#requisitos-técnicos)).

El host recorre menú principal, paso 1, jugador a jugador y resumen. El resumen
solo lee `PlayerPartyConfig` (`playerCount`, `seed` y `players`): pinta las filas
1..N y la semilla sin editarla, «Atrás» devuelve la pantalla de jugador con sus
valores y «Cancelar» descarta la configuración. «Empezar» crea una `GameSession`
nueva con `{ seed, players }`; no valida ni construye estado en el host
([REQ-016](../requirements/REQ-016-pantalla-inicio-configuracion.md#requisitos-creativos-decididos)).

# Combate y azar

El combate vive en `src/game/` y es puro y determinista. El modelo vigente es el
de [REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md) y
[ADR-023](../decisions/ADR-023-tipos-dano-paquetes-bandas.md), que sustituyen la
absorción única de
[ADR-015](../decisions/ADR-015-atributos-inherentes-absorcion.md).

- `damage.ts` es el resolvedor único y puro de paquetes: por paquete, un dado de
  daño y uno de resistencia en el orden declarado; los paquetes físicos suman
  fuerza y restan armadura, y los mágicos y eléctricos ignoran ambas. La banda
  del perfil se aplica después de la absorción con `floor`, cada paquete se
  recorta a 0 y el total es `max(1, suma)`. Armas, réplicas y hechizos pasan por
  aquí; no hay una fórmula paralela en `magic.ts` ni en la IA.
- `combat.ts` resuelve el impacto con `habilidad + acierto del arma` contra
  `defensa + escudo`; el empate falla. Un fallo consume dos tiradas (ataque y
  escudo); un impacto consume dos más por paquete (daño y resistencia), en orden
  fijo. Los perfiles de resistencia viven en las unidades
  (`UnitStats.resistencia`), no en una tabla aparte.
- `equipment.ts` guarda el catálogo de siete armas con `damagePackets`, armaduras
  y escudos con IDs estables. Las armas nuevas de REQ-029 se marcan con
  `estimatedV1`; el martillo se coloca en el mapa.
- `bestiary.ts` guarda por tipo los nueve atributos, equipo, visión, alarma y
  perfil de comportamiento. El perfil de resistencia se compone de una plantilla
  de familia (humanoide, constructo, no muerto, bestia, elemental y dragón) más
  una sobrescritura parcial del enemigo.
- `roster.ts` es la fuente única de los nueve arquetipos jugables de REQ-015:
  stats (incluido el perfil de resistencia), equipo inicial, variantes, rol y
  magia de identidad. `createPlayerFromArchetype` construye una unidad desde el
  arquetipo y la variante; `Unit.archetypeId` y `Unit.variant` guardan la
  identidad serializable, con `null` en enemigos y unidades sintéticas. El HUD
  deriva el nombre del arquetipo del roster y no duplica valores.
- `rng.ts` implementa un d6 serializable. El estado guarda la semilla y el
  contador; la misma semilla y los mismos comandos dan la misma secuencia.
- Los eventos `AttackPerformed`, `ReplicaPerformed` y `SpellCast` incluyen
  impacto, daño total, PV resultante, tiradas y `damageBreakdown` por paquete:
  tipo, cantidad base, dados de daño y resistencia, bruto, banda, multiplicador y
  daño final. El host no recalcula reglas.
- El jugador y los enemigos comparten el mismo resolvedor. La recogida y el
  cambio de arma son comandos del motor; desde
  [REQ-018](../requirements/REQ-018-inventario-equipo.md) la tecla `G` y el cambio
  con `1`-`3` desaparecen y la gestión pasa por el panel abierto con `I`.

Ver [REQ-014](../requirements/REQ-014-atributos-inherentes-personajes.md),
[REQ-015](../requirements/REQ-015-roster-arquetipos.md),
[REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md) y
[ADR-023](../decisions/ADR-023-tipos-dano-paquetes-bandas.md). El combate con
equipo y RNG de
[REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md) y
[ADR-012](../decisions/ADR-012-combate-equipo-rng.md) queda como historia; el
balance v1 de enemigos y armas se conserva, y la resistencia numérica de
[ADR-015](../decisions/ADR-015-atributos-inherentes-absorcion.md) se sustituye por
el perfil de bandas. La implementación se cerró en TASK-0085 a TASK-0090 y se
documenta en [turn-economy](turn-economy.md#combate).

## Magia y maná

La magia de [REQ-025](../requirements/REQ-025-magia-hechizos-mana.md) vive en
`src/game/` y comparte el RNG y las capas de combate:

- `spells.ts` es el catálogo de hechizos: id, familia, nivel mínimo, coste,
  alcance, acierto, `damagePacket`, objetivo, efecto y presentación. Es dato
  serializable y fuente única; añadir un hechizo no toca el resolvedor. Los
  hechizos de daño declaran un paquete eléctrico o mágico; curación y
  resurrección no declaran paquete.
- `magic.ts` valida y resuelve hechizos con el RNG sembrado: acción, maná, nivel,
  objetivo, alcance, línea de visión y tope. Un rechazo no consume nada. El daño
  de un hechizo pasa por el resolvedor de `damage.ts`, no por una fórmula
  paralela.
- El comando `CastSpell` apunta a una casilla y resuelve el objetivo por facción;
  `Unit.spellsCast` cuenta los hechizos del turno (tope 2) y se reinicia con MP,
  acciones y maná. El evento `SpellCast` de daño lleva impacto, daño, PV
  resultante, tiradas y `damageBreakdown`; curación y resurrección llevan su
  efecto para que el host no recalcule reglas.
- El ataque mágico reutiliza las capas de `combat.ts`: el impacto suma el nivel
  de magia y el acierto del hechizo contra defensa + escudo; el daño usa el
  paquete del hechizo contra el perfil de resistencia del objetivo. Mágico y
  eléctrico ignoran fuerza y armadura: la armadura no absorbe daño mágico ni
  eléctrico, aunque el escudo sí cuenta para el impacto. El nivel de magia solo
  afecta a acceso, maná e impacto; no decide el tipo ni la resistencia.
- `mana.ts` implementa el recurso de este corte: `UnitStats.magicLevel` (0–4) y
  `Unit.mana { current, max }`; `max = nivel × 4` y se recuperan +4 al inicio del
  turno junto a MP y acciones. El maná no altera el MP.
- La curación y la resurrección son hechizos sin tirada de impacto; la curación
  alcanza 1 casilla (diagonales) y puede aplicarse al propio lanzador; la
  resurrección conserva las condiciones de
  [REQ-021](../requirements/REQ-021-muerte-fantasma-resurreccion.md).

Ver [ADR-019](../decisions/ADR-019-magia-mana-hechizos.md) y
[ADR-023](../decisions/ADR-023-tipos-dano-paquetes-bandas.md).

## Economía de acciones

La economía de [REQ-026](../requirements/REQ-026-economia-acciones-rebalanceo.md)
vive en `src/game/` y es determinista:

- `Unit` guarda `actions { max, remaining }`; se restauran al inicio del turno
  junto a MP y maná. La IA y el jugador usan el mismo contador.
- Cada comando declara cuántas acciones consume (0 o 1): atacar, interactuar y
  lanzar hechizos cuestan 1; moverse, recoger/soltar del suelo, esperar y cerrar
  el turno cuestan 0. Recoger/soltar cuesta 1 MP; abrir un cofre cuesta 1 acción
  (reabrirlo es gratis) y transferir o depositar es gratis. El cofre tiene 4
  huecos fijos.
- El `+1` de los objetos vive en `actionsBonus` del equipo; los bonus acumulan con
  un tope de 4 provisional y `REQ-019` puede exponerlo como trait después.
- `Moverse` sobre un enemigo se resuelve como movimiento (MP) + un ataque (1
  acción); no encadena ataques.
- El turno no auto-termina: se cierra con `N` (`EndTurn`). El HUD, el snapshot y el
  guardado exponen acciones máximas y restantes (`REQ-022`/`REQ-024`).
- La IA enemiga encadena acciones: en alerta ataca hasta agotar acciones o matar;
  dormido/regresando no ataca; huyendo usa MP y solo ataca si está acorralado.
- La presentación encadena un beat por acción en secuencia; el turno completo se
  mide con `REQ-017`.

Ver [ADR-020](../decisions/ADR-020-economia-acciones.md).

# Hotseat

El modo de [REQ-031](../requirements/REQ-031-hotseat-local.md) v2 admite de 1 a 6
jugadores en el mismo teclado y la misma pantalla. El modelo vive en `src/game/` y
la presentación en `src/host/` ([ADR-029](../decisions/ADR-029-hotseat-local.md)).

- **Estado**: `GameState.activePlayerId`, `round` y `phase`, con el orden fijo de
  `state.players`. Todo es serializable y el guardado lo conserva; cargar reanuda
  en el activo y la ronda guardados.
- **Cierre de turno**: `EndTurn` (`N`, `src/host/keymap.ts`) valida que la unidad
  sea la activa, cierra su turno y elige al siguiente vivo o fantasma con índice
  mayor (`resolveEndTurn` en `src/game/turn.ts`). Los comandos de otra unidad se
  rechazan. Sin siguiente jugador se entra en la fase enemiga.
- **Recursos por jugador**: `restorePlayerTurn` restaura MP, acciones y cupo de
  hechizos, y sube el maná +4 hasta el máximo, solo al activo al empezar su turno;
  los que no han actuado conservan lo que tuvieran. La fase enemiga restaura a los
  enemigos con la misma función.
- **Una fase enemiga por ronda**: los enemigos actúan en orden de índice y el
  motor publica por enemigo actor, objetivo y espera (`enemyPhase` del
  `TurnResult`). Los dormidos esperan sin presentación. El motor no decide cámara
  ni HUD.
- **Muerte y resurrección**: si el activo muere, su acción se resuelve, el turno
  se cierra y pasa al siguiente; el wipe termina la partida. El resucitado vuelve
  a `players` en su índice, así que actúa esa ronda si aún no ha pasado y, si no,
  en la siguiente, sin estado adicional.
- **Presentación**: `src/host/camera-pan.ts` hace el paneo de relevo de 300 ms y
  publica `panning`; el host anuncia «Ronda N» (2 s, no bloqueante) y «El master
  mueve» (~800 ms, solo si un enemigo actúa), cambia el HUD izquierdo y derecho por
  fase, muestra «Jugador N de M» con el activo y pinta el resultado con
  «Nueva partida» y «Cargar partida». El panel de inventario solo se abre en el
  turno del activo y el fantasma no lo abre.
- **Controles**: `N` termina el turno y `Esc` abre la pausa global; `E` y `R` no
  existen. La pausa y el guardado son los de
  [REQ-024](../requirements/REQ-024-menu-pausa-guardado.md); no hay temporizadores.

Ver [REQ-031](../requirements/REQ-031-hotseat-local.md),
[ADR-029](../decisions/ADR-029-hotseat-local.md) y
[ADR-008](../decisions/ADR-008-presentacion-animada.md).

## Muerte y fantasma

`hp === 0` sigue siendo la única señal de muerte. `death.ts`
(`settleUnitDeath`) resuelve jugadores y enemigos. Al morir un jugador, crea su
cadáver contenedor, vacía equipo y mochila y marca `Unit.ghost`. Al morir un
enemigo, crea cadáver solo si conserva alguna instancia `lootable`; el contenedor
lleva exactamente esas instancias, el resto se descarta con la unidad y la unidad
permanece en `enemies` con 0 PV y sin objetos; sin saqueables no hay contenedor
([REQ-034](../requirements/REQ-034-objetos-saqueables-botin-enemigos.md)).
`grid.ts` deriva `isGhost`/`lifeState` sin guardar un estado paralelo. El fantasma
no bloquea (`isOccupied` solo cuenta vivos), planifica con
`BlockingOptions.ignoreUnits` —muros y esquinas siguen
bloqueando—, tiene `GHOST_ACTIONS = 1`, usa su `maxMp` intrínseco y solo acepta
mover, recoger, soltar, inspeccionar contenedores
(`InspectContainer`/`ContainerInspected`) y cerrar el turno. Los vivos pagan
recoger/soltar con 1 MP; el fantasma, con su única acción. La IA, la percepción y
el ataque filtran por `isAlive`, así que el fantasma no es objetivo ni obstáculo.
La resurrección (`magic.ts`, TASK-0148) exige lanzador vivo de nivel 4, 8 de
maná, adyacencia a la casilla del cadáver y ausencia de vivos; consume el
contenedor `corpseOf` del jugador y devuelve a su equipo y mochila las instancias
que aún guardaba, sin duplicar lo saqueado. El turno por jugador queda en
TASK-0146.

## Botín de enemigos

La saqueabilidad se decide al crear al enemigo. `src/game/loot.ts`
(`rollEnemyLoot`) recorre el equipo y la mochila en orden estable y fija
`ItemInstance.lootable`; `src/game/equipment.ts` declara `lootPolicy`
(`common`/`progression`) y `LOOT_CHANCES` como datos (25 %/100 %). Un objeto
`progression` nace saqueable sin consumir tirada. El RNG de botín se deriva de
la semilla y del ID estable del enemigo con `deriveLootRng`, no lee ni avanza
`state.rng` y no usa `Math.random`; `rollPercent` devuelve 0–99. Al morir,
`death.ts` filtra las instancias saqueables, descarta el resto y crea un
`Container` `kind: 'corpse'` en el tile; sin saqueables no hay contenedor.
`takeContainerItem`/`takeAllContainerItems` exigen el mismo tile, no cobran al
vivo y el fantasma paga una acción por objeto; `withoutEmptyEnemyCorpse` retira
el cadáver de enemigo vacío. El guardado conserva `lootable` y contenedores sin
repetir la tirada; el snapshot expone `lootPolicy` y el resultado. Ver
[ADR-030](../decisions/ADR-030-saqueabilidad-botin-enemigos.md).

## Cofres

La generación y el contenido de [REQ-020](../requirements/REQ-020-cofres-saqueo.md)
viven en `src/game/chests.ts` y se ejecutan en `createInitialState`:

- `generateChests` es pura y determinista. Deriva un `mulberry32` propio de la
  semilla del mapa con una sal distinta de la del combate, las armas y los
  enemigos, así que no lee ni avanza `state.rng`. Recibe el grupo para orientar el
  botín, la profundidad (hoy 1, sin efecto) y opciones de tirada.
- Cada sala no-spawn tira 50 % de cofre y, si acierta, 20 % de un segundo. Si el
  nivel no genera ninguno, se fuerza uno. La colocación exige suelo libre y
  bloquea spawn, entrada, salida, puertas, enemigos, armas y otros cofres; el
  generador BSP pasa sus fichas de `placeMapEnemies` como celdas bloqueadas.
- El contenido son dos objetos por cofre. `bestPowerBySlot` toma el mejor
  `powerScore` equipado por el grupo en cada hueco y `selectUpgrade` elige la
  mejora de menor margen; sin mejora, el primer objeto cae a relleno común. La
  pieza de traits garantizada por nivel va fuera de la curva en el segundo hueco
  de uno de los cofres. `powerScore` vive en `equipment.ts` y suma acierto, daño,
  absorción, evasión y el poder declarado de los traits.
- El cofre es un `Container` `kind: 'chest'` con capacidad 4, `opened` y dos
  instancias. `openContainer` exige adyacencia Chebyshev 1, gasta 1 acción y
  rechaza al fantasma; reabrirlo es gratis. `takeContainerItem`,
  `takeAllContainerItems` y `depositItem` son atómicos y no gastan acción ni MP
  al vivo. Un cofre vacío no se retira.
- El snapshot del host expone posición, capacidad, `opened` y contenido. El panel
  usa la columna derecha como fuente exclusiva: «Suelo» con `I` o «Cofre» tras
  abrirlo; el HUD derecho no revela contenido de un cofre cerrado. El render dibuja
  un marcador provisional de cofre, no arte definitivo.
- El guardado v1 conserva cofres, estado y contenido sin repetir tiradas. La
  presentación añade cues de apertura (300 ms) y transferencia (250 ms) sobre la
  matriz de [REQ-017](../requirements/REQ-017-feedback-visual-eventos.md#matriz-evento--feedback).
- El host no decide reglas de cofres: solo interpreta comandos y lee el snapshot.
  Ver [ADR-033](../decisions/ADR-033-cofres-poder-botin-progresivo.md).

## Réplica

La réplica de [REQ-027](../requirements/REQ-027-replica-combate-cuerpo-a-cuerpo.md)
vive en `src/game/combat.ts` y se presenta en el host:

- `resolveAttack` emite `AttackPerformed` y, si el ataque es melé, falla y el
  defensor es elegible, resuelve una tirada nueva y emite `ReplicaPerformed` con
  el defensor como `attackerId` y el atacante original como `targetId`.
- `canReplicate` valida vivo, adyacente, arma equipada y estado (alerta,
  regresando o huyendo acorralado); un dormido nunca replica. No hay cadena.
- La reacción es atómica y no crea estado pendiente; el evento lleva impacto,
  daño, PV resultante y tiradas, y el host no recalcula reglas.
- `motion.ts` crea un cue `replica` con beat propio de
  `FEEDBACK_CONFIG.beats.replica` y datos de atacante/objetivo. No emite texto.
- `world-effects.ts` reutiliza la reacción de ataque con la embestida del
  defensor hacia el atacante; impacto con destello y retroceso, fallo con
  esquiva. `presentationState` retrasa los PV del objetivo hasta el cue.
- El debug expone el cue con su `hit`; el HUD no muestra aviso, probabilidad ni
  indicador de réplica.

Ver [ADR-022](../decisions/ADR-022-replica-cuerpo-a-cuerpo.md).

# Inventario y equipo

El inventario y el equipo de [REQ-018](../requirements/REQ-018-inventario-equipo.md)
viven en `src/game/` y comparten una regla de propiedad: cada objeto está
exactamente en un sitio.

- **Catálogo único**: `src/game/equipment.ts` expone `ITEMS` como
  `Record<ItemId, ItemDefinition>` con ID estable, categoría, hueco, manos,
  modificadores, traits, sprite y descripción. `WEAPONS`, `ARMORS` y `SHIELDS`
  son vistas de ese catálogo; añadir un objeto no toca las operaciones.
- **Instancias con localización única**: `src/game/inventory.ts` define
  `ItemInstance` (ID propio e `itemId`) y deriva su sitio de la contención en
  `Unit.inventory.items`, `Unit.equipment`, `GameState.groundItems` o
  `GameState.containers`; `ItemLocation` y `locateInstance` no mantienen listas
  paralelas. `pickUpItem`, `equipItem`, `unequipItem` y `dropItem` son puros y
  atómicos: validan antes de mover, cuestan 1 MP y no gastan acción.
  `takeContainerItem` y `takeAllContainerItems` reutilizan la misma localización
  y aceptan cadáveres y cofres: un cadáver exige el mismo tile; un cofre, estar
  abierto y adyacente. No cobran al vivo y el fantasma paga una acción por
  objeto; «coger todo» es atómico. `depositItem` solo acepta cofres abiertos y
  adyacentes, valida capacidad y mueve en una sola operación. No hay una segunda
  ruta de saqueo.
  `Container` es la representación única de cofres y cadáveres; desde TASK-0131
  el cadáver de jugador lo crea `death.ts` con `kind: 'corpse'` y `corpseOf`, transfiere
  todo su equipo y mochila sin tirada y permanece como objetivo de resurrección;
  al resucitar se consume y su contenido vuelve al resucitado (REQ-021
  R-014/T-014). Desde TASK-0133 el
  cadáver de enemigo contiene solo instancias `lootable`, descarta el resto y se
  elimina al retirar su último objeto; el de jugador solo se retira al resucitar
  (REQ-020 v4 limita la persistencia tras vaciarse a los enemigos). Los cofres
  añaden `kind: 'chest'`, capacidad 4 y `opened`; se generan al crear la partida
  ([REQ-020](../requirements/REQ-020-cofres-saqueo.md), TASK-0168) y un cofre
  abierto y vacío permanece como mueble.
- **Punto único de stats efectivos**: `src/game/stats.ts` agrega atributos
  inherentes, modificadores del equipo y traits con `aggregateEffectiveStats` y
  `effectiveStats`. Combate, hechizos, IA y HUD leen ese perfil; el host no suma
  valores de equipo por su cuenta.
- **Separación motor/host del panel**: `src/host/inventory-panel.ts` es el modelo
  puro que convierte el estado en filas, comparaciones y comandos sin tocar el
  DOM; `src/host/inventory-panel-view.ts` es la vista DOM del modal, con filas
  estables, foco visible y `Escape`/`I` gestionados por el host. El host solo
  despacha el comando confirmado: costes y rechazos vienen del motor.
- **Panel de tres columnas**: el modelo expone `equipment`, `backpack`, `ground`,
  `corpses`, `chest` y `rightTitle`, y la vista pinta tres columnas tituladas
  Equipo, Bolsa y Suelo/Cofre, con marco outset y slots cuadrados inset de un
  único tamaño. Equipo conserva la figura humana de ocho huecos
  (`inventory-figure`), Bolsa es una rejilla 2×4 con contador, y la columna
  derecha es una sola fuente: «Suelo» pone los cadáveres-contenedor del tile en
  rejilla al inicio (solo si existen) y debajo los objetos en dos columnas;
  «Cofre» muestra solo el contenido del cofre abierto, con su capacidad y el
  depósito disponible. Los cadáveres se leen de `state.containers`
  (`kind: 'corpse'`), no de unidades muertas; la tarjeta muestra nombre, sprite y
  «sin coste», y sus objetos son filas navegables en `inventory-corpse-items`,
  con scroll dentro de la columna derecha. Sin cabecera ni ayuda, solo un título
  accesible y «Cerrar». La columna derecha tiene scroll propio; a 1280×720 el
  panel completo con mochila llena y cuatro objetos no hace scroll.
  `src/host/inventory-navigation.ts` resuelve la navegación por proximidad
  (`findNeighbor`, `nearestTo` y `cycleZone`).
- **Ficha y submenú**: con el panel abierto, `src/host/hud-detail.ts` compone
  `buildPanelDetail` en dos bloques independientes —el objeto seleccionado y el
  equipado en ese hueco, con sprite, stats verticales y traits solo si existen,
  o «Vacío»—, sin descripciones ni delta numérico. `buildPanelMenu` publica las
  opciones del submenú (`PanelMenuOption`) por contexto, con el coste anunciado
  por acción: «sin coste» para coger, «coger todo» o depositar en un cofre,
  «1 MP» para equipar y el coste histórico de las operaciones de inventario; la
  opción queda deshabilitada con su motivo si falta el recurso y no se ofrece
  «recoger» con la mochila llena. `Enter` abre el submenú, `Escape` lo cierra sin ejecutar y este
  es el único camino de acción. El panel solo se abre para el jugador activo vivo
  y es público para la mesa.

Ver [ADR-021](../decisions/ADR-021-inventario-equipo.md).

# Percepción, alarma y huida

La percepción vive en `src/game/perception.ts`, es pura y no conoce DOM, Canvas,
red ni relojes:

- `visionRadius` y `canSee` aplican visión 360° con Bresenham; los muros
  bloquean y las unidades no. El bestiario es la única tabla de radios (visión
  6/4/5, alarma 5) y de MP por tipo (5/4/6).
- La detección se evalúa tras cada paso aceptado de `Move`/`MoveTo` y emite
  `EnemySpotted` con el paso; no consume MP ni acción.
- `raiseAlarm` resuelve una onda de radio 5 desde el detector, sin línea de
  visión y sin cadena; los receptores comparten `lastKnown` y `hasShouted`.
- El estado de cada enemigo añade `awareness` (`dormant`/`alert`/`returning`),
  `fleeing`, `home`, `lastKnown`, `alertTurns` y `hasShouted`; todo es
  serializable y se expone en solo lectura en `window.__game.snapshot()`.
- `noteDamage` despierta al dormido y guarda la posición del atacante; la huida
  del cobarde es determinista y se decide en `planEnemyAction`.
- Los eventos `EnemySpotted`, `AlarmRaised`, `EnemyFled` y `EnemyReturned`
  permiten al host presentar el feedback sin leer estado interno.

Ver [REQ-009](../requirements/REQ-009-percepcion-alarma-huida.md).

# Presentación del movimiento

El motor resuelve cada comando de movimiento de forma atómica. El host no vuelve
a simular: `src/host/motion.ts` construye una timeline de presentación con los
eventos ordenados de la acción (`UnitMoved` con `from`, `to` y `mpLeft`, más los
eventos de ataque, turno y fin de partida).

- **Estado**: el estado del motor es la única verdad. La timeline produce
  overrides de posición y cámara para el render, y un estado derivado para HUD y
  overlay; no muta ni sustituye el estado del motor.
- **Ritmo**: una única `MOTION_CONFIG` con 125 ms por paso, 70 ms de pausa por
  tile (inicio, intermedios y destino) y diagonal a duración constante. `n`
  pasos generan `n + 1` pausas.
- **Reloj**: `requestAnimationFrame` con delta acotado; el avance interno usa
  subtramos para no saltar fases. `prefers-reduced-motion: reduce` aplica el
  estado final de forma instantánea.
- **Render**: las posiciones visuales son centros de tile en píxeles enteros; el
  sprite se dibuja con `imageSmoothingEnabled = false` y el recorte del viewport
  existente. La cámara sigue a la unidad animada, redondea a entero y se limita
  al mapa; mover el cursor no la desplaza.
- **Input**: durante la animación se descartan las intenciones de juego; `F1`
  sigue activo y `Esc` abre la pausa global, que congela el reloj. `R` ya no
  existe. `window.__game.dispatch` completa la presentación pendiente antes de
  aplicar un comando de test.
- **Debug**: `window.__game` expone `animation` (activa, paso, posición visual,
  cámara), `panning` y `advance(ms)` para avanzar el reloj de presentación de
  forma determinista, sin mutadores del estado vivo.
- **Relevo hotseat**: al cerrar turno, `src/host/camera-pan.ts` decide el destino
  (jugador activo final) y, si cambia el turno o la ronda y hay más de un
  jugador, programa un paneo lineal de 300 ms con reloj propio; el input usa
  `panning` y se libera al llegar. Ronda 1 y `prefers-reduced-motion` saltan sin
  animación; con un jugador no hay paneo de relevo
  ([REQ-031](../requirements/REQ-031-hotseat-local.md)).

Ver [ADR-008](../decisions/ADR-008-presentacion-animada.md) y
[REQ-006](../requirements/REQ-006-movimiento-animado.md).

# Feedback visual

Todo evento del motor se presenta con un **cue** determinista sobre el mismo
reloj que el movimiento. El host no recalcula reglas: deriva de los eventos qué
ha pasado y retrasa el estado visible hasta el cue correspondiente.

- **Timeline**: movimiento y feedback comparten reloj y estructura. Un cue tiene
  tipo, inicio, duración, ancla y datos de presentación; el beat es el máximo de
  los cues bloqueantes de un evento.
- **Estado intermedio**: la vida baja en el impacto, la unidad muerta se dibuja
  como viva hasta `UnitDied`, el arma permanece en el suelo hasta `PickUp` y el
  arma equipada cambia en `SelectWeapon`. La alarma y los avisos salen en su
  evento, no al aplicar el comando.
- **Capas**: Canvas para destellos, embestidas, retrocesos, ondas y cadáveres;
  DOM para textos, `!`, banners y avisos. Orden: suelo → decals → cadáveres →
  camino/cursor → unidades → efectos → texto/banners → HUD.
- **Ritmo**: `FEEDBACK_CONFIG` centraliza las duraciones de `REQ-017`; el
  movimiento conserva `MOTION_CONFIG` (125/70). La fase enemiga es secuencial y
  usa un atajo de 150 ms para acciones que empiezan y terminan fuera de pantalla.
- **Input**: se bloquea y se descarta mientras hay un beat; `F1` sigue activo y
  `Esc` abre la pausa global. `R` ya no existe.
- **Accesibilidad**: `prefers-reduced-motion` elimina tween, sacudida y parpadeo,
  pero conserva texto, banner, marca estática y estado final.
- **Cadáver**: el render lo dibuja desde los contenedores `kind: 'corpse'`, no
  desde unidades muertas: sin contenedor no hay decal, aparece al acabar el beat
  de muerte, varios en la misma casilla comparten decal con contador `×N` y el
  de jugador persiste vacío. No bloquea ni se escribe en la rejilla.
  `corpse-22a/b` se reserva para muertes reales y deja de ser decoración
  ambiental.
- **Debug**: `window.__game.animation` incluye los cues activos y `advance(ms)`
  avanza el reloj de forma determinista; sin animación activa consume también la
  persistencia de textos, banners y marcas, y `advance(0)` solo congela y repinta.

Ver [ADR-017](../decisions/ADR-017-feedback-visual-eventos.md) y
[REQ-017](../requirements/REQ-017-feedback-visual-eventos.md).

# Pausa y menú

La pausa es global y vive en el host; el motor no conoce menús ni archivos
([REQ-024](../requirements/REQ-024-menu-pausa-guardado.md#requisitos-técnicos)).
`src/host/pause-menu.ts` es el modelo puro: cinco acciones en orden fijo
(Reanudar, Nueva partida, Cargar partida, Guardar partida y Controles), pantalla
raíz, controles y dos confirmaciones, y disponibilidad de guardado con motivo.
`src/host/pause-menu-view.ts` pinta ese estado en un diálogo modal, mueve el foco
y consume las teclas que gestiona; `main.ts` congela `tick` y `textTick` sin
tocar la sesión y vuelve a engancharlos al reanudar.

`Esc` abre la pausa desde cualquier fase y animación; si el panel o la lista de
hechizos están abiertos, el primer `Esc` los cierra. `src/host/keymap.ts` es la
fuente única de teclas: de él salen el traductor de input, la ayuda del HUD y la
lista de controles de la pausa. Guardar se desactiva fuera de la fase de
personajes, con animación o con paneo; al activarse descarga un único `.zip`
construido desde el estado del motor con el nombre
`proyectdungeon-<semilla>-<AAAAMMDD-HHmmss>.zip`, y un error se anuncia sin
descarga parcial.

Cargar vive en `src/host/load-game.ts`, con un único módulo y un único
`input[type=file]` para menú principal y pausa. Acepta un `.zip` de guardado o un
`.json` de partida: `readSaveZip` aplica los límites y el rechazo de rutas y
entradas de T-006, el esquema v1 valida la partida y, en el `.zip`, el manifiesto
se cruza con el estado (semilla, turno/ronda, fase y party). El menú principal
carga directo; la pausa confirma antes de reemplazar. Al aplicar, se cierra la
pausa, se sustituye la sesión, se limpian animación, feedback, avisos y modales,
la cámara se centra una vez en el activo y los HUD se redibujan desde el estado;
no se restaura presentación. Un archivo inválido muestra un mensaje y deja la
partida en curso intacta. «Nueva partida» confirma y abre el paso 1 del arranque.

# Guardado local

La persistencia es un archivo local, sin cuentas, nube, base de datos ni guardado
entre runs ([REQ-024](../requirements/REQ-024-menu-pausa-guardado.md)). El
formato v1 se registra en [ADR-028](../decisions/ADR-028-formato-guardado-v1.md).

`src/game/save.ts` es el esquema puro y la única fuente del formato. Construye
`partida.json` —estado completo del motor con su propio `format_version`: semilla,
RNG, mapa, fase, turno, ronda, activo, party, unidades, fantasmas, contenedores,
objetos y contadores— y `manifiesto.json` con `format_version: 1`,
`game_version` informativa, `created_at` ISO UTC, `seed` y `summary` con nombre y
arquetipo de cada jugador, turno, ronda y fase. La lectura es estricta: claves
desconocidas, tipos erróneos, números no finitos, referencias rotas y versiones
desconocidas rechazan el archivo entero antes de tocar el estado; no se usa
`eval`. La v1 se fija con el `Container` actual (`kind`/`corpseOf`/`opened`
opcionales) y conserva cofres, estado de apertura y contenido sin repetir
tiradas.

`src/host/save-zip.ts` empaqueta y lee un ZIP clásico propio con
`CompressionStream`/`DecompressionStream`: escribe `deflate` y acepta `store` y
`deflate`, sin dependencias nuevas. Solo admite `manifiesto.json` y
`partida.json` en la raíz y aplica los límites de 5 MB comprimido, 20 MB
descomprimido, 4 entradas y 5 MB por archivo, también durante la descompresión.
`src/host/save-game.ts` une motor y descarga: comprime antes de entregar el único
`.zip` y usa el nombre `proyectdungeon-<semilla>-<AAAAMMDD-HHmmss>.zip` con fecha
UTC.

El archivo no guarda presentación: ni timeline, ni cámara, ni cursor, ni panel.
Al cargar, `src/host/load-game.ts` —el único cargador de menú principal y
pausa— valida el `.json` o el `.zip` con el mismo esquema, cruza el manifiesto
con la semilla, el turno, la ronda, la fase y la party del estado, y solo
entonces reemplaza la sesión. La carga continúa la secuencia del RNG y conserva
`lootable`, los contenedores y el estado `opened` de los cofres sin repetir la
tirada de botín
([REQ-020](../requirements/REQ-020-cofres-saqueo.md),
[REQ-034](../requirements/REQ-034-objetos-saqueables-botin-enemigos.md)); la
presentación se reconstruye en el estado final.

# Suelo y decoración

El suelo transitable se pinta con un damero global de 1×1: paridad `(x + y) % 2`
en salas, pasillos y umbrales. Los dos colores se generan por código con un
`fillRect` por tile; no se recortan tiles de suelo del PNG. La base `#0d1519` es
común a toda la mazmorra y cada sala recibe un segundo tono de una paleta curada:
neutra, humedad, muerte/combate, ruina o vegetación. La paleta se asigna por
contraste con el ambiente, no por imitación; pasillos y umbrales usan la neutra.

Encima del damero se dibujan 31 decals planos ambientales del tileset:
piedritas, hierba, tierra, ladrillos azules y rojos, huesos, siete plantas
pequeñas, setas y sangre/slime. Los dos cadáveres de 32rogues se reservan para
muertes reales desde `REQ-017`; no aparecen como decoración. El planificador
determinista asigna un ambiente
dominante por sala, con 1-3 focos locales y 20-30 % de mezcla; algunas salas son
solo dispersas. La densidad objetivo es 35 % en salas y 16 % en pasillos; como
máximo un decal por tile; nunca en apariciones ni umbrales. La decoración no se
escribe en `state.grid.tiles`, no bloquea y no añade reglas.

Ver [ADR-011](../decisions/ADR-011-suelo-programatico-ambientes.md) y
[REQ-008](../requirements/REQ-008-suelo-programatico-decoracion-ambiental.md).
El corte anterior queda en
[ADR-010](../decisions/ADR-010-damero-decoracion-presentacion.md) y
[REQ-007](../requirements/REQ-007-damero-decoracion-suelo.md).

# Interfaz y pantalla

La UI de juego sigue
[REQ-033](../requirements/REQ-033-revision-visual-hud-panel.md) sobre la base de
[REQ-032](../requirements/REQ-032-estilo-visual-interaccion-ui.md) y
[ADR-025](../decisions/ADR-025-estilo-visual-ui.md); la escala continua y el
relieve vintage se registran en
[ADR-026](../decisions/ADR-026-escala-continua-relieve-vintage.md) y la
corrección v7 en
[ADR-027](../decisions/ADR-027-correccion-visual-v7.md). DOM sobre el marco 16:9,
Pixelify Sans local y tokens `--ui-*`.

- **Escala única**: `computeFrameLayout` deriva `scale` del marco 16:9 y el host
  la publica como `--ui-scale` y `--ui-unit`. Tipografía, interlineado, huecos,
  bordes, iconos, sprites, slots y submenú se calculan con
  `calc(var(--ui-unit) * n)`; no hay tamaños fijos por componente, breakpoints
  ni `clamp()` de viewport. `computeUiLine` publica `--ui-line` de forma lineal
  (`scale × tile / 32`), sin redondeo a píxel de dispositivo; se acepta el render
  fraccionario. El relieve de cajas usa `--ui-bevel = 2 × --ui-line` y el cursor
  `4 × --ui-line`; ambos derivan de la misma línea y crecen hacia fuera. Chromium
  pinta el borde/outline cuantizado a píxel entero (2/3 px a 900×700/1280×720
  frente a 2,35/3,20 px del token): se acepta como limitación conocida y la
  geometría se valida con `getBoundingClientRect`. A 900×700 la escala es 1,1737
  y el cuerpo 13,15 px; a 1280×720, 1,6010 y 17,93 px. El overlay de `F1` queda
  fuera.
- **Paleta**: ocho tokens opacos y semánticos, sin literales por componente:
  `--ui-bg` `#2f142f` (fondo y borde oscuro), `--ui-panel` `#2a584f` (panel),
  `--ui-raised` `#774448` (zona o sección elevada), `--ui-line-color` `#6eb8a8`
  (línea clara y texto atenuado), `--ui-text` `#fcffc0` (texto), `--ui-accent`
  `#ee9c5d` (acento), `--ui-danger` `#c6505a` (peligro) y `--ui-focus`
  `#74a33f` (foco y positivo). `--ui-muted` y `--ui-positive` son alias de rol.
- **Relieve**: `.ui-outset` (claro al noroeste, oscuro al sureste) marca
  superficies —marco, zonas del HUD, secciones de la ficha y columnas del
  panel—; `.ui-inset` invierte el par y marca receptáculos —slots de item y
  ventanas de sprite del HUD—. No hay radios, sombras difusas, degradados, blur
  ni translucidez. Un bisel comunica función: outset = superficie, inset =
  hueco. Todos miden `2 × --ui-line` y se pintan con contornos exteriores en L;
  el área interior de la caja y su contenido no se reducen ni se desplazan
  (δ interior ≤0,82 px).
- **Tres zonas**: HUD izquierdo con la ficha del jugador activo en tres zonas
  enmarcadas —Personaje en dos columnas, Arma y Stats+Traits—
  ([REQ-022](../requirements/REQ-022-hud-izquierdo-jugador.md)), mapa cuadrado
  de 13×13 y HUD derecho con el detalle bajo el cursor
  ([REQ-023](../requirements/REQ-023-hud-derecho-detalle-cursor.md)). Fase,
  turno, PV del enemigo y estado salen del HUD y quedan solo en `F1`; las teclas
  y la sugerencia se mantienen como texto plano al pie. El HUD vive dentro del
  marco; no queda ninguna barra superior fuera de él. La miniatura de Personaje
  y el sprite del jugador en el mapa usan la misma celda 32×32 de `rogues.png`:
  `variantCellFor(archetypeId, variant)` resuelve la tabla de 18 celdas de
  REQ-016 y ambos consumidores la comparten. La miniatura cambia en el mismo
  render que el nombre y el arquetipo sin alterar su caja. Una variante ausente
  o inválida cae en la 1 del mismo arquetipo; un `archetypeId` nulo o
  desconocido no pinta sprite. Stats y
  traits se pintan como listas verticales (`ul`/`li`), una entrada por línea y
  sin separador `·`, con la misma estructura en el HUD izquierdo y en la ficha
  derecha; PV, MP y acciones conservan su formato.
- **Panel modal**: se abre con `I` y solo cubre la franja del mapa; los dos HUD
  siguen visibles. Tres columnas tituladas Equipo, Bolsa y Suelo, con figura de
  equipo, rejilla 2×4 y cadáveres/suelo en rejilla; slots cuadrados, iguales y
  solo icono; sin cabecera ni ayuda. Las tres columnas alinean su contenido
  arriba: el título queda arriba y el contenido empieza inmediatamente debajo;
  en Equipo el casco ocupa la fila superior central y no hay bloque de cabeza,
  solo torso, brazos y piernas. La figura mide las cinco filas de la rejilla y
  sus piernas desbordan la caja por abajo de forma intencionada para verse bajo
  los pies. Los ocho slots de Equipo vacíos muestran una silueta sólida
  `--ui-line-color` (#6eb8a8) derivada de `items.png`; la silueta desaparece con
  objeto equipado y Bolsa y Suelo no crean esa capa. «Bolsa» es la etiqueta de
  UI; el modelo y la documentación siguen diciendo «mochila». `Escape` o `I`
  cierran y el mapa no acepta comandos. La disposición preferida es la de tres
  columnas; la
  alternativa 1/3 + dos filas solo se activa por medición de espacio, no por
  breakpoint. A 900×700 las tres columnas encajan (columnas de 137,06 px y slots
  de 39,89 px), así que la alternativa no se usa.
- **Cursor superpuesto**: el slot activo se marca con `.inventory-cursor`, una
  capa ligada al foco DOM con borde de `4 × --ui-line` y color `--ui-text`
  (#fcffc0), el mismo del cursor del mapa en estado de jugador; centro
  transparente y `z-index` 10, por encima de columnas, slots, títulos y figura
  pero por debajo del submenú (30). Se coloca con `transform` y anima cualquier
  cambio de slot —fila, columna o zona— en 150 ms lineales (140-160 ms); salta
  al instante al abrir, con scroll, al redimensionar, al actualizar el modelo y con
  `prefers-reduced-motion`; no tapa el sprite ni el bisel y el foco real sigue
  en el slot. El cursor del mapa conserva su color y su ancho.
- **Detalle y acción**: el HUD derecho muestra el detalle del cursor; con el panel
  abierto pasa a la ficha de dos bloques —seleccionado y equipado, sin delta— y
  `Enter` abre el submenú contextual. `Tab`/`Shift+Tab` cambian de zona y las
  flechas o `WASD` se mueven por proximidad entre objetos existentes.
- **Anti-CLS**: abrir o cerrar el panel, navegar, equipar, recoger o soltar,
  cambiar de tile y aparecer o desaparecer cadáveres no mueven el marco, las
  columnas, los títulos ni los slots ya colocados; los cambios ocurren dentro de
  su zona. A 1280×720 el panel no hace scroll global; a 900×700 solo se desplaza
  la columna derecha (cadáveres y suelo) y los slots mantienen el mismo lado en
  las tres columnas. La medición de CLS de TASK-0108, TASK-0109 y TASK-0171 no
  registra desplazamientos prohibidos; el contenido del cofre y el cambio
  Cofre/Suelo tampoco mueven el marco. Los contenedores de cofre y cadáver están
  integrados en el panel
  ([REQ-020](../requirements/REQ-020-cofres-saqueo.md),
  [REQ-021](../requirements/REQ-021-muerte-fantasma-resurreccion.md)).

# Render del host

- **Canvas 2D** con resolución lógica fija y escalado por `devicePixelRatio`.
- **Cámara**: sigue a la unidad activa, redondea a píxel entero y se limita al
  mapa. El HUD no se transforma con la cámara.
- **Capa**: HUD en DOM, no dibujado en Canvas; el Canvas no es accesible por sí
  solo, así que el HUD refleja vida, MP, acciones, maná y traits con
  `data-testid` y `aria-live` para los eventos importantes. Fase, turno, PV del
  enemigo y estado quedan solo en `F1`. No se depende solo del color.
- **Panel de personaje** ([REQ-018](../requirements/REQ-018-inventario-equipo.md)):
  DOM sobre la franja del mapa, dentro del marco 16:9 y nunca dibujado en Canvas.
  Reutiliza nodos estables y `data-testid`; los iconos de objeto salen de
  `items.png` como fondo CSS posicionado. El modal se abre fuera del bucle de
  render, lee el snapshot al abrirse y se refresca con los eventos del motor. La
  navegación es por teclado con foco visible y atrapado en el diálogo
  (`role="dialog"`, `aria-modal`): flechas o `WASD` por proximidad, `Tab` por
  zonas, `Enter` abre el submenú y `Escape`/`I` cierran.
- **Panel y timeline** ([ADR-017](../decisions/ADR-017-feedback-visual-eventos.md)):
  el panel no añade eventos ni cues propios. Los comandos que lanza (recoger,
  equipar, soltar) siguen produciendo sus beats de mundo, y el panel se refresca
  con el **estado de presentación**, no con el snapshot final, para no adelantarse
  al evento. Sus transiciones CSS usan una configuración propia y son instantáneas
  en modo test y con `prefers-reduced-motion`.
- **Panel y feedback de mundo**: el modal es interfaz, no feedback. Puede tapar el
  mapa; la regla de ADR-017 de no tapar rejilla, cursor ni camino se aplica al
  feedback de mundo, que sigue sin dibujarse sobre el panel.
- **Audio**: fuera de ADR-017 por decisión del usuario. Cuando entre, tendrá su
  propio ADR y consumirá los mismos cues, sin cambiar el motor ni la timeline.
- **Orden de dibujo**: limpiar, base de suelo con la paleta de la sala, decals,
  camino/cursor, entidades, efectos y overlay de debug.
- **Debug y test**: `?debug=1`, `?test=1&seed=...`, `window.__game` y paso manual
  determinista. Nada de animaciones no deterministas en modo test.
- **Rendimiento**: evitar objetos por frame, precargar assets, un solo canvas
  para el tablero y medir antes de optimizar. El modo test no usa reloj real.

# Flujo remoto futuro

```text
Móvil -> WebSocket -> Servidor autoritativo
                         -> GameEngine
                         -> Events -> Host (Canvas)
```

El host seguirá siendo una pantalla. El servidor emitirá el identificador de
sala y el host mostrará el QR. El servidor validará las acciones; el cliente no
será autoridad.

# Tecnología

- TypeScript.
- pnpm como gestor de paquetes.
- Vite para desarrollo y build.
- Canvas 2D para el tablero del host.
- DOM/CSS para HUD, controles y experimentos.
- Vitest para unitarios.
- Playwright para E2E y capturas.
- Node para scripts y, más adelante, servidor.

Ver [ADR-002](../decisions/ADR-002-stack.md) y
[ADR-004](../decisions/ADR-004-pnpm.md).

# Cámara y mapa

- Mapa de rejilla cuadrada.
- Cámara que sigue al jugador activo y se limita al mapa.
- Tilemap con capas desde el punto de vista del modelo, aunque el primer nivel
  sea una sola sala.
- Varios niveles y profundidad se posponen.

# Testing

- Unitarios: movimiento, diagonal, colisiones, turnos, combate, IA, victoria.
- Integración: input -> comando -> estado -> eventos.
- E2E: partida local corta con Playwright.
- Visual: capturas de estados clave y modo test determinista.
- Manual: playtest del usuario para sensación y legibilidad.

# No objetivos

- Servidor, WebSocket, QR, salas y reconexión en la fase actual.
- Persistencia en base de datos.
- Multijugador local o remoto.
- Arte y audio finales.
- Generación procedural como sistema de producción.
