---
type: Requirement Sheet
id: REQ-018
title: Inventario y equipo por personaje
description: "Ocho huecos de equipo, ocho de mochila y un panel único de gestión; equipar, recoger y soltar cuestan 1 MP, equipar desde el suelo o un contenedor va directo al hueco, el catálogo inicial se limita a armas, escudos y armaduras y el arma solo se cambia desde el panel. Sustituye el modelo de tres armas y la recogida con G de REQ-010."
status: stable
version: 7
decision_owner: human:simon
review_required: true
created_at: 2026-11-10T20:00:00Z
updated_at: 2026-11-14T02:14:13Z
related_tasks: [TASK-0093, TASK-0094, TASK-0095, TASK-0096, TASK-0097, TASK-0098, TASK-0101, TASK-0102, TASK-0103]
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T18:00:00Z }
verified:
  - by: human:simon
    at: 2026-11-11T19:30:00Z
    note: >-
      Lee y aprueba la v2: ocho huecos de equipo y ocho de mochila, panel único
      con `I` (sin `G`), 1 MP por equipar y recoger sin gastar acción, piezas
      secundarias aplazadas a REQ-019, equipo inicial de REQ-015, dos manos con
      escudo e intercambio con la mochila llena.
  - by: human:simon
    at: 2026-11-13T16:52:06Z
    note: >-
      Aprueba la v3: alineación con REQ-019 (anillo, collar y guantes; traits en
      el panel), REQ-029 (paquetes y bandas), REQ-026 (soltar un equipado) y
      REQ-021 (cadáver y fantasma); equipar desde el suelo o un contenedor cuesta
      1 MP, el sustituido vuelve a la mochila y si no cabe se rechaza entero.
  - by: human:simon
    at: 2026-11-13T19:22:51Z
    note: >-
      Aprueba la v4: el inventario y el equipo se implementan **antes** del
      hotseat, como base del saqueo, del fantasma y de la columna del jugador;
      cierra las preguntas de calendario y de visibilidad en hotseat. Sin cambios
      de reglas. El arte de objetos sale de `items.png`, ya copiado del pack.
  - by: human:simon
    at: 2026-11-13T21:29:30Z
    note: >-
      Aprueba la v5: enmienda R-004. Este corte no trae arma a dos manos
      jugable; la regla vive en el modelo y en sus unitarios y el E2E de dos
      manos con escudo se traslada a la tarea de REQ-019 que añade la maza.
  - by: human:simon
    at: 2026-11-13T23:44:56Z
    note: >-
      Aprueba la v6: el panel pasa a tres columnas con la figura humana, la
      rejilla deja de mostrar stats y traits (se leen en el HUD derecho con el
      equipado al lado y sin delta), el suelo se muestra siempre y los cadáveres
      del tile entran en la columna derecha con scroll; sin cambios de reglas ni
      costes ([REQ-032](REQ-032-estilo-visual-interaccion-ui.md)). La v6 describe
      el panel objetivo y **no está implementada**: el código sigue con el panel
      de la v5 hasta que se ejecuten las tareas de REQ-032.
  - by: human:simon
    at: 2026-11-14T02:14:13Z
    note: >-
      Aprueba la v7: la v6 queda implementada por TASK-0099 a TASK-0102 (fuente y
      tokens, pantalla en tres zonas, panel de tres columnas con figura y
      navegación por proximidad, ficha de dos bloques y submenú contextual). El
      usuario hizo playtest del panel y lo aprueba. El HUD derecho queda reducido
      a los tipos existentes; contenedores y cofres llegan con REQ-020.
---

# Contexto

El equipo actual viene de [REQ-010](REQ-010-combate-equipo-acierto-defensa.md):
el jugador lleva tres armas en una lista, recoge con `G` (1 MP), equipa
automáticamente y cambia con `1`-`3`; la armadura y el escudo son fijos. Ese
modelo fue suficiente para el corte de combate, pero no permite inventario,
objetos equipados por hueco, accesorios ni objetos que aporten traits.

El pack 32rogues incluye `items.png` con armas, escudos, armaduras, guantes,
botas, cascos, colgantes, anillos, pociones, pergaminos, llaves, munición,
monedas y comida. El proyecto usará todo el pack con el tiempo; este corte no lo
define entero.

Esta hoja define el **inventario personal y el equipo**: qué es un objeto, qué
categorías entran, qué huecos tiene un personaje, cómo se equipa y desequipa,
cómo se guardan los objetos y cómo se suman sus stats. No define los efectos
especiales de los objetos ([REQ-019](REQ-019-traits-objetos.md)) ni los cofres y
el saqueo ([REQ-020](REQ-020-cofres-saqueo.md)).

La **v2 cierra** las decisiones que quedaban abiertas: capacidad, coste de
equipar, aporte de las piezas secundarias, flujo de recogida y equipo inicial.
La hoja queda **stable** tras la revisión del texto.

La **v3** no reabre ninguna decisión de la v2: corrige la vigencia frente a las
hojas aprobadas después y fija el coste de equipar desde el suelo o un
contenedor.

La **v4** solo adelanta el calendario: este corte se implementa **antes** del
hotseat, con las tareas TASK-0093 a TASK-0098, porque es la base del saqueo, del
fantasma y de la columna del jugador. No cambia ninguna regla.

# Objetivos de experiencia

- Que el equipo se lea de un vistazo: qué llevo puesto y qué llevo en la mochila.
- Que elegir objeto sea una decisión: arma, escudo, armadura y accesorios cambian
  el combate.
- Que recoger y equipar no sea una pelea con la interfaz.
- Que la mochila obligue a decidir qué se deja atrás y a repartir con el grupo.
- Que el inventario sea personal y comprensible en hotseat.
- Que el modelo aguante traits, cofres y contenido futuro sin rehacerse.

# Enmiendas a documentos vigentes

- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): su recogida con `G`, el
  auto-equipado y el cambio con `1`-`3` quedan sustituidos por `I` y el panel de
  esta hoja. La armadura y el escudo fijos pasan a ser objetos de hueco.
- [REQ-026](REQ-026-economia-acciones-rebalanceo.md): recoger y soltar siguen
  costando 1 MP y ninguna acción; esta hoja solo cambia la tecla y el destino, que
  pasa a ser la mochila.
- [REQ-015](REQ-015-roster-arquetipos.md): su tabla de equipo inicial se mantiene
  sin cambios; esta hoja fija que los cinco huecos secundarios arrancan vacíos.
- [REQ-022](REQ-022-hud-izquierdo-jugador.md): la columna izquierda puede mostrar
  un resumen; la vista interactiva completa es el panel modal de esta hoja. La
  relación entre ambos se resuelve al implementar `REQ-022`.
- [Economía de turno](../design/turn-economy.md): la tabla de controles cambia `G`
  por `I` y se añade el coste de equipar.
- [ADR-021](../decisions/ADR-021-inventario-equipo.md): se registra el modelo de
  inventario, huecos y panel único.

# Notas de vigencia

- **REQ-019 v2:** entrega anillo, collar y guantes y activa el campo de traits;
  casco y botas siguen vacíos. El panel muestra traits y desglose de stats.
- **REQ-029 v1:** las armas se leen como paquetes de ataque con tipo de daño y
  bandas de resistencia; la armadura solo absorbe daño físico.
- **REQ-026:** soltar un objeto equipado cuesta 1 MP, lo desequipa y lo deja en
  la casilla; sacar de un contenedor es gratis y equipar desde él cuesta 1 MP.
- **REQ-021 v3:** al morir, inventario y equipo pasan al cadáver; el fantasma no
  abre este panel y mueve un objeto por acción.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Cada personaje tiene un inventario personal además de su equipo. | El estado de cada personaje distingue inventario y equipo; el inventario no es compartido por defecto. |
| R-002 | Cada personaje tiene ocho huecos de equipo: arma, escudo, armadura, casco, botas, guantes, collar y **un** anillo. | El panel muestra los ocho huecos; cada uno acepta solo su categoría; hay un único hueco de anillo. |
| R-003 | El hueco de arma admite armas a una mano o a dos manos. Un arma a dos manos anula el escudo. | Con un arma a dos manos no se puede llevar escudo; con un arma a una mano, sí. |
| R-004 | El catálogo de este corte incluye armas melee a **una mano**, escudos y armaduras corporales. La regla de dos manos existe en el modelo y se prueba con unitarios; la primera arma a dos manos jugable es la maza de `REQ-019`. Anillo, collar y guantes llegan con `REQ-019` y entran por `REQ-020`; casco y botas siguen vacíos. | El catálogo inicial solo contiene esas tres categorías y ninguna arma a dos manos; los cinco huecos secundarios existen y se muestran vacíos hasta que llegue su pieza; el estado no admite arma a dos manos y escudo a la vez. |
| R-005 | Quedan fuera del primer corte los consumibles, la magia, las llaves, la munición y las monedas. | Esos objetos no aparecen en el catálogo ni en el inventario de este corte. |
| R-006 | Consumibles, munición y llaves, cuando existan, viven en la mochila, se usan desde ella y **nunca** ocupan hueco de equipo. | Ninguno de esos objetos admite un hueco de equipo; el modelo los representa como objetos de mochila. |
| R-007 | El inventario y el equipo son por personaje; no hay una bolsa compartida. | Cada personaje tiene su propio inventario; los cofres de `REQ-020` serán el almacenamiento común. |
| R-008 | Equipar y desequipar mueve el objeto entre inventario y hueco, sin duplicarlo ni perderlo. | Un objeto está exactamente en un sitio; el número total de objetos no cambia. |
| R-009 | Si el hueco está ocupado, el objeto anterior vuelve a la mochila. Si no cabe, la operación se rechaza y nada cambia. **Cuando el objeto entrante sale de la propia mochila, el intercambio siempre cabe**: el hueco que libera es el que ocupa el saliente. | La validación se hace sobre el estado resultante, no sobre el inicial: mochila llena con la espada guardada y una daga equipada → equipar la espada intercambia, no rechaza. El intercambio es atómico; la mochila no se desborda. |
| R-010 | La mochila tiene **8 huecos personales**; la capacidad es un parámetro del modelo, no una constante fija. | Un personaje con la mochila llena no puede recoger más; cambiar el parámetro cambia la validación sin tocar la interfaz. |
| R-011 | El equipo equipado no ocupa huecos de mochila: son ocho y ocho independientes. | Un personaje puede llevar ocho objetos puestos y hasta ocho guardados. |
| R-012 | Equipar y desequipar cuestan **1 MP** y no gastan acción, en cualquier situación, con o sin enemigos alertados, y también al hacerlo desde el suelo o un contenedor. | El contador de acciones no cambia; con 0 MP se rechaza; la regla no depende del estado de alarma; equipar desde fuera de la mochila no cobra además la transferencia. |
| R-013 | Recoger y soltar cuestan **1 MP** y no gastan acción. Con la mochila llena, recoger se rechaza sin mover nada. Soltar una pieza equipada la desequipa y la deja en la casilla. | Recoger con la mochila llena no altera ni el suelo ni la mochila; soltar libera un hueco; soltar desde un hueco de equipo no pasa por la mochila. |
| R-014 | El equipo no se apila: dos espadas iguales son dos instancias y ocupan dos huecos. No hay durabilidad ni afijos en este corte. | El número de objetos y de huecos ocupados coinciden; no existe una pila de equipo. |
| R-015 | La gestión de equipo y mochila ocurre en un **único panel modal** sobre el mapa, abierto con `I`. El panel reúne el equipo, la mochila, los objetos del suelo del tile y los cadáveres del tile. | `I` abre el panel siempre, haya o no objetos en el suelo; el suelo se muestra siempre y los cadáveres se apilan encima con su nombre, con scroll propio cuando no caben (REQ-032). |
| R-016 | Desde el panel se equipa, se desequipa, se recoge y se suelta. `G` desaparece y no recoge por sí mismo. | No queda ninguna acción de recogida fuera del panel; recoger mueve el objeto del suelo a la mochila. |
| R-017 | El cambio de arma se hace **solo** desde el panel: no hay atajos de cambio rápido ni ranuras `1`-`3`. | Un ataque siempre usa el arma equipada en el hueco; cambiarla exige abrir el panel y pagar 1 MP. |
| R-018 | El equipo inicial es exactamente la tabla de [REQ-015](REQ-015-roster-arquetipos.md): arma temática y, si corresponde, armadura y escudo. Los cinco huecos secundarios arrancan vacíos. | El Guerrero empieza con espada, armadura 1 y escudo 1; ningún arquetipo empieza con casco, botas, guantes, collar ni anillo. |
| R-019 | Al equipar un arma a dos manos con escudo puesto, el escudo vuelve a la mochila. Si no cabe, se rechaza el cambio completo. Equipar un escudo con un arma a dos manos puesta se rechaza; no se desequipa el arma automáticamente. | El estado nunca contiene arma a dos manos y escudo a la vez; el rechazo no deja cambios parciales; el escudo no se niega en silencio ni desequipa el arma. |
| R-020 | Repartir objetos entre jugadores se hace dejando en el suelo y recogiendo. No hay traspaso directo en este corte. | Un jugador suelta (1 MP) y otro recoge (1 MP); no existe un comando de entrega entre personajes. |
| R-021 | Equipar un objeto que está en el suelo del tile o en un contenedor abierto cuesta **1 MP** y va directo al hueco. El objeto sustituido vuelve a la mochila; si no cabe, se rechaza la operación entera. | Con hueco libre el objeto pasa del suelo al hueco; con hueco ocupado y sitio en la mochila, se intercambian; con la mochila llena se rechaza sin mover nada; el número total de objetos no cambia. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El catálogo de objetos es dato, no código: ID estable, nombre, categoría, hueco, manos, modificadores de atributos, paquetes de ataque con tipo de daño y bandas, traits, sprite y descripción. Los objetos sin efecto no entran en el catálogo. | Cambiar un valor del catálogo cambia el juego sin tocar fórmulas; los IDs son estables; el catálogo es la única fuente de valores; el arma se resuelve como paquete y la armadura solo absorbe físico. |
| T-002 | Cada objeto del mundo es una instancia con ID propio y una localización única: mochila, hueco de equipo, contenedor o suelo. | El snapshot expone la localización; no hay objetos duplicados ni huérfanos. |
| T-003 | El inventario y el equipo son serializables; la capacidad de mochila es un parámetro del modelo con valor 8 por defecto, no una constante dispersa. | Cambiar la capacidad cambia la validación sin tocar la UI ni el motor; el guardado la reconstruye. |
| T-004 | Hay un único punto de agregación de stats efectivos: inherentes de [REQ-014](REQ-014-atributos-inherentes-personajes.md) + modificadores del equipo + traits cuando existan. | Combate y UI leen los stats efectivos; no hay una suma paralela en el host. |
| T-005 | Equipar, desequipar, recoger y soltar son operaciones atómicas: validan hueco, categoría, manos y capacidad antes de mover; si fallan, no dejan cambios parciales. La capacidad se valida sobre el estado resultante: si el objeto entrante viene de la mochila, su hueco cuenta como libre; si viene del suelo o de un contenedor, no libera ningún hueco de mochila. | Tests de invariantes: no se duplica, no se pierde y no se supera la capacidad; el intercambio con la mochila llena no se rechaza; equipar desde el suelo con la mochila llena se rechaza sin mover nada. |
| T-006 | La regla de dos manos se aplica en el modelo: un arma a dos manos ocupa el hueco de arma y bloquea el escudo; el escudo vuelve a la mochila y, si no cabe, la operación se rechaza entera. Equipar un escudo con un arma a dos manos puesta se rechaza sin desequipar el arma. | El modelo no permite un estado con arma a dos manos y escudo equipados; no hay pérdida de objetos en el rechazo; ambos lados del conflicto se comportan igual. |
| T-007 | El motor sigue siendo puro: sin DOM, sin red y sin relojes; el host presenta y traduce input. | `src/game/` no importa `src/host/`; los tests del motor corren sin DOM. |
| T-008 | El host presenta un panel modal **en DOM** sobre el marco 16:9, nunca dibujado en Canvas, con tres columnas: equipo en figura humana de ocho posiciones, mochila de ocho casillas y columna de cadáveres y suelo. La rejilla no muestra stats ni traits: el detalle del objeto seleccionado se lee en el HUD derecho, con el objeto equipado en ese hueco al lado (REQ-032). | El panel coincide con el estado; se puede gestionar todo solo con teclado; hay foco visible espacial y comparación de stats en el HUD derecho antes de equipar; el Canvas sigue siendo solo el mundo. |
| T-009 | El input del panel es `I`: abre siempre en el turno del jugador activo, cierra con `Escape` y bloquea los comandos del mapa mientras está abierto. Abrir el panel no cuesta MP ni acción; los costes se cobran al confirmar cada operación. El panel se refresca con el estado de presentación, no con el snapshot final. | Con el panel abierto, el mapa no acepta comandos; no se abre en fase enemiga, durante una animación ni en el turno de un fantasma; `G` no existe; el panel no muestra un objeto recogido antes de su cue. |
| T-010 | El snapshot de debug expone mochila, equipo por hueco, capacidad y objetos del suelo. | La UI y `F1` leen del mismo estado; no hay listas duplicadas. |
| T-011 | El arte de objetos sale de `items.png` mediante el mapa de `items.txt` ([ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md)); el catálogo referencia el sprite, no lo incrusta. | Cada objeto del catálogo tiene sprite; cambiar el pack no cambia la lógica. |
| T-012 | Tests nuevos: catálogo con paquetes y bandas, instancias, capacidad 8 y rechazo con la mochila llena, intercambio con la mochila llena, equipar/desequipar, equipar desde el suelo y desde contenedor, soltar un equipado, intercambio de hueco, dos manos/escudo por ambos lados, agregación de stats, serialización, panel con suelo vacío y E2E del panel. No se debilitan tests existentes. | `pnpm run verify` pasa; los tests de `REQ-010` conservan su intención y se actualizan donde `G` deja de existir. |
| T-013 | Se actualizan glosario, [economía de turno](../design/turn-economy.md) y arquitectura; se registra [ADR-021](../decisions/ADR-021-inventario-equipo.md). | `pnpm run docs:check` pasa; no queda `G` ni el inventario de tres armas como modelo vigente. |
| T-014 | Sin dependencias nuevas, sin red y sin persistencia entre sesiones. | `package.json` y `pnpm-lock.yaml` no cambian; no hay llamadas de red. |

# Requisitos no funcionales

- **Rendimiento:** mochilas de ocho objetos y operaciones O(n); el coste no debe
  afectar al objetivo de 60 fps ni al render.
- **Accesibilidad:** navegación completa por teclado, foco visible, texto legible
  y información que no dependa solo del color o el icono; la zona de suelo
  anuncia si está vacía, no solo la oculta.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin datos personales, sin red y sin nuevas dependencias.
- **Mantenibilidad:** catálogo como fuente única, IDs estables, un punto de
  agregación de stats y operaciones atómicas reutilizables por `REQ-020`.

# Dependencias

- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): combate, armas y recogida
  vigentes; esta hoja sustituye su inventario de tres armas, su equipo fijo y su
  tecla de recogida.
- [REQ-014](REQ-014-atributos-inherentes-personajes.md): nueve atributos y capa de
  absorción; el equipo aporta modificadores sobre ellos.
- [REQ-015](REQ-015-roster-arquetipos.md): arquetipos, arma temática, equipo
  inicial y nombre; esta hoja conserva su tabla de equipo.
- [REQ-019](REQ-019-traits-objetos.md): traits, piezas de anillo, collar y guantes
  y presentación de traits en el panel.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): muerte, cadáver saqueable y
  fantasma; al morir, inventario y equipo pasan al cadáver y el fantasma no usa
  el panel.
- [REQ-026](REQ-026-economia-acciones-rebalanceo.md): recoger y soltar cuestan
  1 MP y ninguna acción; esta hoja añade el coste de equipar y el panel.
- [REQ-029](REQ-029-tipos-dano-resistencias.md): paquetes de ataque, tipos de daño
  y bandas; el catálogo de armas los expresa.
- [REQ-022](REQ-022-hud-izquierdo-jugador.md): columna del jugador activo; el
  panel modal complementa su resumen.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): arte placeholder
  y licencia del pack.
- [ADR-014](../decisions/ADR-014-balance-provisional-fuente-unica.md): valores en
  catálogos y balance provisional; el equipo nuevo exigirá una pasada de ajuste.
- [ADR-015](../decisions/ADR-015-atributos-inherentes-absorcion.md): esquema de
  atributos y resistencia como absorción.
- [ADR-021](../decisions/ADR-021-inventario-equipo.md): inventario, huecos y
  panel único.
- **Sucesoras:** `REQ-019` (traits de objetos) y `REQ-020` (cofres y saqueo).

# Fuera de alcance

- Los efectos especiales de los objetos y el sistema de traits (`REQ-019`).
- Cofres, cadáveres saqueables y transferencia (`REQ-020`).
- Consumibles, pociones, comida, pergaminos, magia, llaves, munición y monedas:
  su contenido no entra, aunque el modelo ya reserva su sitio en la mochila.
- Arcos, ballestas y bastones: dependen de puntería y magia.
- Apilado de objetos, crafting, durabilidad, peso, rareza, afijos, comercio y
  tienda.
- Traspaso directo de objetos entre jugadores y cualquier forma de bolsa común.
- Atajos de cambio rápido de arma y ranuras `1`-`3`.
- Audio y sonido del panel: fuera de ADR-017 y pendiente de su propio ADR.
- Rebalanceo completo de equipo y bestiario; este corte fija el modelo y un
  catálogo mínimo. Los números se ajustan con el método de `ADR-014`.
- Implementación de hotseat, red, QR, persistencia y guardado.
- Arte final.

# Preguntas abiertas

1. **Calendario.** Cerrada en v4: se implementa antes del hotseat, en el orden
   REQ-018 → REQ-020 → REQ-019. TASK-0093 a TASK-0098 cubren este corte.
2. **Visibilidad en hotseat.** Cerrada por
   [REQ-031](REQ-031-hotseat-local.md) R-011: el panel es público, solo se abre
   en el turno del jugador activo y el fantasma no lo usa.
3. **Catálogo concreto.** Qué armas, escudos y armaduras entran en el primer
   catálogo y qué sprite de `items.txt` les corresponde. Queda como dato de la
   tarea de implementación, con `ADR-006` para los sprites, `REQ-029` para los
   paquetes y `ADR-014` para el ajuste.
4. **Ajuste de la capacidad.** Ocho huecos es el valor inicial; si en playtest se
   queda corto o largo, se cambia el parámetro sin rehacer el modelo.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-10 | Tres hojas separadas: inventario/equipo, traits y cofres/saqueo. | human:simon | aceptada |
| 2026-11-10 | Alcance inicial: equipo y accesorios; consumibles, magia, llaves, munición y monedas fuera. | human:simon | aceptada |
| 2026-11-10 | Ocho huecos: arma, escudo, armadura, casco, botas, guantes, collar y un anillo; un arma a dos manos anula el escudo. | human:simon | aceptada |
| 2026-11-10 | Inventario y equipo por personaje; sin bolsa compartida por defecto. | human:simon | aceptada |
| 2026-11-10 | Definir en orden `REQ-018` → `REQ-019` → `REQ-020`; aplicar `REQ-018` → `REQ-020` → `REQ-019`. | human:simon | aceptada |
| 2026-11-10 | Implementación después de cerrar hotseat. | human:simon | sustituida el 2026-11-13 |
| 2026-11-13 | Implementación **antes** del hotseat: es la base del saqueo, del fantasma y del HUD del activo; orden REQ-018 → REQ-020 → REQ-019 y hotseat al final. | human:simon | aceptada |
| 2026-11-11 | Mochila de **8 huecos personales**, parámetro modificable; el equipo puesto no cuenta. | human:simon | aceptada |
| 2026-11-11 | Equipar y desequipar cuestan **1 MP** y no gastan acción, siempre y también desde contenedor; sin condición de alerta. | human:simon | aceptada |
| 2026-11-11 | Casco, botas, guantes, collar y anillo solo aportan traits; en este corte ninguna pieza secundaria entra en el catálogo (enmienda R-004). | human:simon | aceptada |
| 2026-11-11 | Un **único** hueco de anillo; los ocho huecos no cambian. | human:simon | aceptada |
| 2026-11-11 | Un solo panel modal abierto con `I`: equipo, mochila y suelo del tile. Se descarta `G`. | human:simon | aceptada |
| 2026-11-11 | Recoger y soltar cuestan 1 MP y no gastan acción; con la mochila llena, recoger se rechaza. | human:simon | aceptada |
| 2026-11-11 | El cambio de arma se hace solo desde el panel; sin atajos ni ranuras `1`-`3`. | human:simon | aceptada |
| 2026-11-11 | Equipo inicial: solo la tabla de `REQ-015`; los cinco huecos secundarios arrancan vacíos. | human:simon | aceptada |
| 2026-11-11 | Arma a dos manos con escudo: el escudo vuelve a la mochila y, si no cabe, se rechaza el cambio completo. | human:simon | aceptada |
| 2026-11-11 | Con la mochila llena, equipar un objeto guardado **intercambia**: el hueco que libera el entrante es el que ocupa el saliente. No se rechaza. | human:simon | aceptada |
| 2026-11-11 | Equipar un escudo mientras hay un arma a dos manos puesta se rechaza; no se desequipa el arma automáticamente. | human:simon | aceptada |
| 2026-11-11 | El equipo no se apila; cada pieza es una instancia; sin durabilidad ni afijos. | human:simon | aceptada |
| 2026-11-11 | Consumibles, munición y llaves viven en la mochila y se usan desde ella; sin contenido en este corte. | human:simon | aceptada |
| 2026-11-11 | Repartir objetos entre jugadores se hace soltando al suelo y recogiendo; el traspaso directo se aplaza a hotseat. | human:simon | aceptada |
| 2026-11-13 | v3: alineación con REQ-019/029/021/026; anillo, collar y guantes llegan con REQ-019 y entran por REQ-020; casco y botas siguen vacíos. | human:simon | aceptada |
| 2026-11-13 | Equipar desde el suelo o un contenedor cuesta 1 MP y va directo al hueco; el sustituido vuelve a la mochila y si no cabe se rechaza entero. | human:simon | aceptada |
| 2026-11-13 | Soltar una pieza equipada cuesta 1 MP, la desequipa y la deja en la casilla (REQ-026 R-010). | human:simon | aceptada |
| 2026-11-13 | Enmienda R-004: este corte no trae arma a dos manos jugable; la regla vive en el modelo y sus unitarios, y el E2E de dos manos con escudo se traslada a la tarea de REQ-019 que añade la maza. | human:simon | aceptada |
| 2026-11-13 | v6: panel en tres columnas con figura humana, rejilla sin stats (detalle en el HUD derecho con el equipado), suelo siempre visible y cadáveres con scroll; sin cambios de reglas ni costes. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado la capacidad del inventario.
- [x] El usuario ha aprobado el coste de equipar y desequipar.
- [x] El usuario ha aprobado el aporte de casco, botas y guantes.
- [x] El usuario ha aprobado el flujo de recogida y la UI.
- [x] El usuario ha aprobado el equipo inicial por arquetipo.
- [x] El usuario ha resuelto el cambio de arma a dos manos con escudo.
- [x] El usuario ha aprobado el apilado, el anillo único y el destino de
      consumibles, munición y llaves.
- [x] El usuario ha aprobado el intercambio con la mochila llena y el rechazo de
      equipar un escudo con arma a dos manos.
- [x] El usuario ha aprobado equipar desde el suelo y los contenedores.
- [x] La hoja está alineada con REQ-019, REQ-026, REQ-029 y REQ-021.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar un grafo de tareas.
- [x] El usuario ha revisado el texto de la v3 y la hoja sigue `stable`.
