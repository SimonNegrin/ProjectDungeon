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
  magia de identidad. El jugador por defecto se crea con
  `createPlayerFromArchetype('warrior', ...)` en el spawn del mapa;
  `Unit.archetypeId` guarda la identidad serializable y es `null` en enemigos y
  unidades sintéticas. El HUD deriva el nombre del arquetipo del roster y no
  duplica valores.
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
  `Unit.mana { current, max }`; `max = nivel × 4` y se recarga al inicio del
  turno junto a MP y acciones. El maná no altera el MP.
- La curación y la resurrección son hechizos sin tirada de impacto; la
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
  el turno cuestan 0. Recoger/soltar cuesta 1 MP; abrir un contenedor cuesta 1
  acción y transferir es gratis.
- El `+1` de los objetos vive en `actionsBonus` del equipo; los bonus acumulan con
  un tope de 4 provisional y `REQ-019` puede exponerlo como trait después.
- `Moverse` sobre un enemigo se resuelve como movimiento (MP) + un ataque (1
  acción); no encadena ataques.
- El turno no auto-termina: se cierra con `EndTurn`. El HUD, el snapshot y el
  guardado exponen acciones máximas y restantes (`REQ-022`/`REQ-024`).
- La IA enemiga encadena acciones: en alerta ataca hasta agotar acciones o matar;
  dormido/regresando no ataca; huyendo usa MP y solo ataca si está acorralado.
- La presentación encadena un beat por acción en secuencia; el turno completo se
  mide con `REQ-017`.

Ver [ADR-020](../decisions/ADR-020-economia-acciones.md).

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
  atómicos: validan antes de mover, cuestan 1 MP y no gastan acción. `Container`
  existe como tipo; los cofres jugables llegan con
  [REQ-020](../requirements/REQ-020-cofres-saqueo.md).
- **Punto único de stats efectivos**: `src/game/stats.ts` agrega atributos
  inherentes, modificadores del equipo y traits con `aggregateEffectiveStats` y
  `effectiveStats`. Combate, hechizos, IA y HUD leen ese perfil; el host no suma
  valores de equipo por su cuenta.
- **Separación motor/host del panel**: `src/host/inventory-panel.ts` es el modelo
  puro que convierte el estado en filas, comparaciones y comandos sin tocar el
  DOM; `src/host/inventory-panel-view.ts` es la vista DOM del modal, con filas
  estables, foco visible y `Escape`/`I` gestionados por el host. El host solo
  despacha el comando confirmado: costes y rechazos vienen del motor.
- **Panel de tres columnas**: el modelo expone `equipment`, `backpack`, `ground`
  y `corpses`, y la vista los pinta en tres columnas de un tercio: figura humana
  de ocho huecos (`inventory-figure`), ocho casillas de mochila y columna derecha
  con los cadáveres apilados arriba y el suelo siempre abajo. La columna derecha
  tiene scroll propio; a 1280×720 el panel completo con mochila llena y cuatro
  objetos en el suelo no hace scroll. `src/host/inventory-navigation.ts` resuelve
  la navegación por proximidad (`findNeighbor`, `nearestTo` y `cycleZone`).
- **Ficha y submenú**: con el panel abierto, `src/host/hud-detail.ts` compone
  `buildPanelDetail` en dos bloques independientes —el objeto seleccionado y el
  equipado en ese hueco, con stats, traits y descripción, o «Vacío»—, sin delta
  numérico. `buildPanelMenu` publica las opciones del submenú
  (`PanelMenuOption`) por contexto, con el coste de 1 MP anunciado, la opción
  deshabilitada con su motivo si falta MP y sin «recoger» con la mochila llena;
  `Enter` abre el submenú, `Escape` lo cierra sin ejecutar y este es el único
  camino de acción.

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
- **Input**: durante la animación se descartan las intenciones de juego; `F1` y
  `R` siguen activos y `R` cancela. `window.__game.dispatch` completa la
  presentación pendiente antes de aplicar un comando de test.
- **Debug**: `window.__game` expone `animation` (activa, paso, posición visual,
  cámara) y `advance(ms)` para avanzar el reloj de presentación de forma
  determinista, sin mutadores del estado vivo.

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
- **Input**: se bloquea y se descarta mientras hay un beat; `F1` y `R` siguen
  activos.
- **Accesibilidad**: `prefers-reduced-motion` elimina tween, sacudida y parpadeo,
  pero conserva texto, banner, marca estática y estado final.
- **Cadáver**: solo presentación sobre la unidad muerta que ya conserva el
  motor; no bloquea ni se escribe en la rejilla. `corpse-22a/b` se reserva para
  muertes reales y deja de ser decoración ambiental.
- **Debug**: `window.__game.animation` incluye los cues activos y `advance(ms)`
  avanza el reloj de forma determinista; sin animación activa consume también la
  persistencia de textos, banners y marcas, y `advance(0)` solo congela y repinta.

Ver [ADR-017](../decisions/ADR-017-feedback-visual-eventos.md) y
[REQ-017](../requirements/REQ-017-feedback-visual-eventos.md).

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

La UI sigue [REQ-032](../requirements/REQ-032-estilo-visual-interaccion-ui.md) y
[ADR-025](../decisions/ADR-025-estilo-visual-ui.md): DOM sobre el marco 16:9,
Pixelify Sans local y tokens `--ui-*` con la línea calculada desde el tile.

- **Tres zonas**: HUD izquierdo con la ficha del jugador activo
  ([REQ-022](../requirements/REQ-022-hud-izquierdo-jugador.md)), mapa cuadrado de
  13×13 y HUD derecho con el detalle bajo el cursor
  ([REQ-023](../requirements/REQ-023-hud-derecho-detalle-cursor.md)). El HUD vive
  dentro del marco; no queda ninguna barra superior fuera de él.
- **Panel modal**: se abre con `I` y solo cubre la franja del mapa; los dos HUD
  siguen visibles. Tres columnas de un tercio: figura de equipo, mochila y
  cadáveres/suelo. `Escape` o `I` cierran y el mapa no acepta comandos.
- **Detalle y acción**: el HUD derecho muestra el detalle del cursor; con el panel
  abierto pasa a la ficha de dos bloques y `Enter` abre el submenú contextual.
  `Tab`/`Shift+Tab` cambian de zona y las flechas o `WASD` se mueven por
  proximidad entre objetos existentes.
- **Límites de layout**: el panel no hace scroll global a 1280×720; a 900×700
  solo se desplaza la columna derecha (cadáveres y suelo). Los contenedores y el
  inventario de cadáver llegan con
  [REQ-020](../requirements/REQ-020-cofres-saqueo.md) y
  [REQ-021](../requirements/REQ-021-muerte-fantasma-resurreccion.md).

# Render del host

- **Canvas 2D** con resolución lógica fija y escalado por `devicePixelRatio`.
- **Cámara**: sigue a la unidad activa, redondea a píxel entero y se limita al
  mapa. El HUD no se transforma con la cámara.
- **Capa**: HUD en DOM, no dibujado en Canvas; el Canvas no es accesible por sí
  solo, así que el HUD refleja vida, turno y fase con `data-testid` y `aria-live`
  para los eventos importantes. No se depende solo del color.
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
