---
type: Glossary
title: Glosario
description: Términos compartidos por el equipo humano y los agentes.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Glosario

| Término | Definición |
|---|---|
| **Host** | Pestaña o pantalla compartida que muestra la partida. No es la autoridad del estado. |
| **Controlador** | Interfaz del jugador. En la fase remota será el móvil; ahora es el teclado. |
| **Sala de juego** | Sesión de juego identificada por un código. En remoto la emite el servidor. En las hojas de requisitos, «sala» sin calificar suele referirse a una sala de la mazmorra. |
| **Sala de la mazmorra** | Habitación generada por el mapa; unidad `Room`. Puede ser rectangular (BSP) o un polígono rectilíneo con muescas y hornacinas (generador denso). |
| **Generador denso** | `MapGenerator` de producción (`growth`) con mapas pequeños, al menos 3 salas poligonales pegadas, pasillos de 0-3 tiles, puertas validadas, enemigos calculados por superficie y jugadores con emboscadas, y salida de nivel. Es el generador por defecto; BSP queda como alternativa inyectable. |
| **Pared compartida** | Dos salas separadas por 1-2 tiles de muro que se conectan con una puerta válida en esa pared, directa o con un tile de paso. |
| **Sala protegida** | Sala de spawn con menos accesos, al menos 6 huecos libres para los jugadores y sin enemigos ni línea de visión enemiga al empezar. En empate se prefiere una sala que no sea la de mayor área. |
| **Acceso de spawn** | Tile de suelo interior junto a la puerta elegida de la sala de spawn (o junto a su boca de pasillo si no hay puerta); ancla del grupo al empezar y entrada del nivel en `REQ-013`. |
| **Componente de adyacencia** | Grupo de fichas conectadas por vecindad de 8 direcciones. En `REQ-012` v3 ninguna componente de jugadores o enemigos puede superar 2 fichas; se permiten parejas. |
| **Punto caliente** | Celda de suelo de una sala no-spawn con ≥3 vecinos ortogonales de muro o sin línea de visión a ningún acceso de la sala, candidata a emboscada. |
| **Enemigo emboscado** | Enemigo colocado en un punto caliente mediante una tirada determinista independiente con `hiddenEnemyChance` (0,5 por defecto). Consume el presupuesto; no añade fichas. |
| **Entrada de nivel** | Acceso de spawn por el que empieza el grupo; se expone como dato serializable. |
| **Salida de nivel** | Salida única de una sala no-spawn a distancia de grafo ≥2 desde el spawn, preferiblemente la más lejana. Puede ser una puerta dibujada sobre el muro del borde (no transitable) o una escalera (abajo/arriba) sobre suelo; no es funcional en este corte. |
| **Caverna** | Variante excepcional del generador denso: una sala irregular grande (≥55 % del suelo de sala) más 2 salas anexas (3 salas en total). |
| **Puerta decorativa** | Puerta transitable dibujada solo en un hueco válido: dos muros en la línea, suelo a ambos lados y conexión entre dos salas distintas; separación Chebyshev ≥3 y máximo una por pasillo. No bloquea, no tiene llave ni estado. |
| **Boca abierta** | Acceso entre salas que no cumple las reglas de puerta; se deja transitable sin puerta y se registra el motivo en métricas y debug. |
| **Presupuesto de enemigos** | Total `T = ceil(enemySurfaceFactor × N) + ceil(enemyPlayersFactor × P)` del generador denso, con `N` = tiles de suelo de sala y `P` = jugadores; por defecto 0,02 por tile, 1,2 por jugador y 6 jugadores. Se reparte por área con mínimo 1 por sala no-spawn. |
| **Fase de jugadores** | Periodo en el que cada jugador usa su turno, en orden fijo. |
| **Fase enemiga** | Periodo posterior en el que actúan todos los enemigos. |
| **MP** | Puntos de movimiento disponibles en un turno. |
| **Acción** | Intervención que consume una de las acciones del turno: atacar, interactuar o lanzar hechizos. Esperar y terminar el turno son libres y no consumen acción ([REQ-026](requirements/REQ-026-economia-acciones-rebalanceo.md)). |
| **Hotseat** | Varios jugadores comparten el mismo teclado y juegan por turnos. |
| **Local-first** | Construir y validar el juego en local antes de añadir red. |
| **Experimento** | Página interactiva que responde una pregunta de diseño o técnica y registra una decisión. |
| **Requisito** | Necesidad creativa o técnica aprobada, con criterios de aceptación. |
| **Tarea** | Unidad atómica de trabajo derivada de un requisito. |
| **Artefacto** | Evidencia de una tarea: informe, tests, capturas, logs o diff. |
| **OKF** | Open Knowledge Format: Markdown con frontmatter YAML y enlaces. |
| **Determinista** | Mismo estado inicial, comandos y semilla producen el mismo resultado. |
| **Semilla** | Valor que inicializa el generador pseudoaleatorio. |
| **RNG sembrado** | Generador pseudoaleatorio determinista inicializado por la semilla; su estado es serializable y reproducible. |
| **Atributos inherentes** | Los nueve valores propios de un personaje, independientes del equipo: habilidad, fuerza, defensa, resistencia, puntería, magia, PV, MP y acciones por turno. |
| **Habilidad** | Atributo inherente que se suma al acierto del arma para resolver el impacto; sustituye al antiguo modificador de acierto. |
| **Fuerza** | Atributo inherente que se suma solo al paquete físico del arma; los paquetes mágico y eléctrico no escalan con ella. Sustituye al antiguo modificador de daño ([REQ-029](requirements/REQ-029-tipos-dano-resistencias.md)). |
| **Defensa** | Atributo inherente que se suma al escudo para resistir el impacto. |
| **Resistencia** | Atributo inherente que ahora es un **perfil de cinco bandas**, una por tipo de daño; sustituye a la resistencia numérica única ([REQ-029](requirements/REQ-029-tipos-dano-resistencias.md)). |
| **Tipo de daño** | Categoría de un paquete de daño: filo, contundente, punzante, mágico o eléctrico. Fuego y hielo no son tipos en este corte; serán traits de estado ([REQ-029](requirements/REQ-029-tipos-dano-resistencias.md)). |
| **Paquete de daño** | Componente de un ataque con tipo y cantidad propios; tira su daño y su resistencia. Un arma del primer corte puede llevar un paquete físico y uno elemental ([REQ-029](requirements/REQ-029-tipos-dano-resistencias.md)). |
| **Banda de resistencia** | Grado de resistencia a un tipo: vulnerable ×1,5, normal ×1, resistente ×0,5 y muy resistente ×0,25; se aplica después de la absorción, con redondeo hacia abajo y mínimo 1 global ([REQ-029](requirements/REQ-029-tipos-dano-resistencias.md)). |
| **Perfil de resistencia** | Conjunto de bandas de una unidad, una por tipo de daño; la banda ausente es `normal`. Vive en `UnitStats.resistencia` y sustituye a la resistencia numérica única ([REQ-029](requirements/REQ-029-tipos-dano-resistencias.md)). No confundir con el perfil de comportamiento del bestiario (`brave`/`coward`, [REQ-009](requirements/REQ-009-percepcion-alarma-huida.md)). |
| **Acierto del arma** | Bonus del arma que se suma a la habilidad al resolver el impacto. |
| **Daño del arma** | Paquete o paquetes de daño del arma; la fuerza se suma solo al paquete físico. Un arma puede añadir un paquete mágico o eléctrico ([REQ-029](requirements/REQ-029-tipos-dano-resistencias.md)). |
| **Puntería** | Atributo inherente reservado al ataque a distancia; sin efecto en este corte. |
| **Magia** | Atributo inherente de nivel entero único 0–4 (0 = sin magia). Determina el maná máximo, el acceso a hechizos y el bono de impacto mágico (nivel + acierto del hechizo); las familias son categorías de hechizo, no niveles. No confundir con el **tipo de daño mágico**, que es independiente y cualquier héroe puede usar con un arma encantada ([REQ-029](requirements/REQ-029-tipos-dano-resistencias.md), [REQ-025](requirements/REQ-025-magia-hechizos-mana.md)). |
| **Maná** | Recurso de hechizos separado del MP; su máximo es nivel × 4 y se recarga completo al inicio de cada turno. |
| **Acciones por turno** | Noveno atributo inherente: cuántas acciones puede gastar una unidad en su turno (2 por defecto, Pícaro 3; tope 4 provisional). Atacar, interactuar y lanzar hechizos consumen una; moverse, recoger/soltar del suelo, esperar y terminar el turno no. |
| **Objeto** | Entrada del catálogo único `ITEMS` (`ItemDefinition` en `src/game/equipment.ts`): ID estable, categoría, hueco, manos, modificadores, traits, sprite y descripción. Los objetos sin efecto no entran en el catálogo ([REQ-018](requirements/REQ-018-inventario-equipo.md)). |
| **Instancia de objeto** | Ejemplar concreto de un objeto con ID propio (`ItemInstance` en `src/game/inventory.ts`). El catálogo define el tipo; la instancia es lo que se mueve entre sitios. |
| **Localización de objeto** | Sitio único de una instancia: hueco de mochila, hueco de equipo, suelo o contenedor. `ItemLocation` y `locateInstance` la derivan de la contención; no hay listas paralelas. |
| **Equipar** | Mover una instancia a su hueco de equipo con `equipItem`; cuesta 1 MP y no gasta acción. Valida categoría, manos y capacidad, y un rechazo no deja cambios parciales. |
| **Desequipar** | Devolver una instancia equipada a la mochila con `unequipItem`; cuesta 1 MP y no gasta acción. Si no cabe, se rechaza entero. |
| **Recoger** | Pasar una instancia del suelo del tile a la mochila con `pickUpItem`; cuesta 1 MP, no gasta acción y no auto-equipa. |
| **Soltar** | Dejar una instancia en el suelo del tile con `dropItem`; cuesta 1 MP y no gasta acción. Si estaba equipada, se desequipa en la misma operación. |
| **Contenedor** | Cofre o cadáver con inventario propio (`Container` en `src/game/inventory.ts`); abrir o registrar cuesta 1 acción y exige adyacencia; transferir es gratis y se permite «coger todo» ([REQ-020](requirements/REQ-020-cofres-saqueo.md)). Sin cofres jugables en este corte. |
| **Hechizo** | Efecto mágico con nivel mínimo, coste de maná, alcance, acierto, objetivo y efecto; los de daño declaran un paquete mágico o eléctrico y usan el resolvedor común. Consume una acción y se limita a dos por turno en el primer corte (provisional) ([REQ-025](requirements/REQ-025-magia-hechizos-mana.md), [REQ-029](requirements/REQ-029-tipos-dano-resistencias.md)). |
| **Réplica** | Contraataque gratuito e inmediato del defensor cuando un ataque cuerpo a cuerpo falla. Solo replica quien está vivo, adyacente y con arma equipada, y está alerta, regresando o huyendo acorralado; un dormido nunca replica. Es una tirada nueva con la misma fórmula y RNG, puede fallar o matar, no gasta acción, maná ni MP y no se encadena. Solo existe en melé: ni a distancia ni mágica. |
| **Escudo** | Equipo que suma a la defensa; decide si un ataque impacta, no cuánto duele. |
| **Armadura** | Equipo que resta al daño de los paquetes **físicos** (filo, contundente y punzante); no protege de mágico ni eléctrico. No evita el impacto ([REQ-029](requirements/REQ-029-tipos-dano-resistencias.md)). |
| **Equipo** | Conjunto de instancias equipadas por una unidad en sus ocho huecos (`EquipmentSlots`): arma, escudo, armadura, casco, botas, guantes, collar y un anillo. El equipo puesto no ocupa la mochila ([REQ-018](requirements/REQ-018-inventario-equipo.md)). |
| **Mochila** | Inventario personal (`Inventory`) de un personaje: ocho huecos por defecto, capacidad paramétrica; no se comparte y no apila equipo. Consumibles, munición y llaves, cuando existan, viven aquí y nunca ocupan hueco de equipo. |
| **Hueco de equipo** | Ranura tipada (`EquipmentSlot`) de `EquipmentSlots` que contiene como máximo una instancia: arma, escudo, armadura, casco, botas, guantes, collar y un anillo. |
| **Hueco de mochila** | Posición de `Inventory.items` que contiene como máximo una instancia; ocho por defecto. Un objeto está exactamente en un hueco. |
| **Panel de personaje** | Vista modal sobre la franja del mapa, abierta con `I`, que reúne en tres columnas la figura de equipo, la mochila y los objetos del suelo y cadáveres del tile; desde ella se equipa, desequipa, recoge y suelta con el submenú de `Enter`. ([REQ-018](requirements/REQ-018-inventario-equipo.md), [REQ-032](requirements/REQ-032-estilo-visual-interaccion-ui.md)). |
| **Ficha del objeto** | Composición del HUD derecho con el panel abierto (`buildPanelDetail` en `src/host/hud-detail.ts`, `PanelDetail`/`PanelDetailBlock`): dos bloques independientes con el objeto seleccionado y el equipado en ese hueco, con sprite, stats verticales y traits solo si existen, sin descripciones ni delta numérico; sin pieza equipada, el segundo bloque dice «Vacío». Al cerrar el panel vuelve el detalle del cursor ([REQ-023](requirements/REQ-023-hud-derecho-detalle-cursor.md)). |
| **Figura de equipo** | Disposición espacial de los ocho huecos de equipo (`inventory-equipment-figure`/`inventory-figure` en `index.html`, filas `PanelItem` de `inventory-panel.ts`): cabeza, torso, manos y pies en posiciones absolutas, no una lista. El foco la recorre por proximidad ([REQ-032](requirements/REQ-032-estilo-visual-interaccion-ui.md)). |
| **Zona de cadáveres** | Parte superior de la columna derecha del panel (`inventory-cadavers`, `InventoryPanelModel.corpses`): cadáveres del tile apilados con su nombre; comparte el scroll propio de la columna con el suelo, que queda siempre abajo. Reservada hasta que [REQ-021](requirements/REQ-021-muerte-fantasma-resurreccion.md) les dé inventario. |
| **Submenú de acciones** | Menú flotante del panel (`inventory-submenu`, `buildPanelMenu`/`PanelMenuOption` en `src/host/inventory-panel.ts`): `Enter` sobre un objeto muestra las acciones válidas por contexto, anuncia `1 MP` y marca las no disponibles con su motivo; `Escape` lo cierra sin ejecutar y las flechas recorren opciones. Es el único camino de acción ([REQ-032](requirements/REQ-032-estilo-visual-interaccion-ui.md)). |
| **Navegación por proximidad** | Recorrido del panel con flechas o `WASD` sobre un plano único de tres columnas (`findNeighbor`, `nearestTo` y `cycleZone` en `src/host/inventory-navigation.ts`): cada pulsación elige el objeto más próximo estrictamente en esa dirección, solo entre objetos existentes, con empate por desviación perpendicular y orden de lectura; `Tab`/`Shift+Tab` saltan de zona ([REQ-032](requirements/REQ-032-estilo-visual-interaccion-ui.md), N-001 a N-011). |
| **Damero** | Patrón de suelo de dos colores planos generados por código que alternan por tile; la paridad es global `(x + y) % 2` y no se reinicia por sala. |
| **Paleta de sala** | Par de colores del damero: una base común para la mazmorra y un segundo tono curado por sala. Se asigna por contraste con el ambiente, no por imitación. |
| **Ambiente decorativo** | Familia dominante de decoración de una sala: humedad, muerte/combate, ruina, vegetación o mixta. Se materializa en focos locales con mezcla. |
| **Decoración** | Decal plano del tileset dibujado sobre el suelo; no bloquea, no se escribe en la rejilla y no cambia reglas. |
| **Feedback visual** | Presentación de un evento del motor mediante un cue: destello, sacudida, parpadeo, texto, banner u onda. No cambia reglas ni estado. |
| **Beat** | Tiempo mínimo en que el input sigue bloqueado para que el ojo registre un evento; los textos y marcas pueden persistir más allá. |
| **Cadáver** | Marca persistente en el tile donde murió una unidad. El de enemigo es presentación y no se interactúa; el de jugador es contenedor saqueable y origen del fantasma ([REQ-021](requirements/REQ-021-muerte-fantasma-resurreccion.md)). |
| **Resurrección** | Vuelta a la vida de un jugador muerto como hechizo de nivel 4: exige nivel 4 y 8 de maná, adyacencia al cadáver y casilla sin vivos; el resucitado vuelve en la casilla del cadáver con el 60 % de su PV máximo, redondeado hacia arriba ([REQ-021](requirements/REQ-021-muerte-fantasma-resurreccion.md)). |
| **Percepción** | Regla que decide si un enemigo ve a un jugador: visión 360°, radio por tipo y línea de visión de Bresenham; los muros bloquean y las unidades no. |
| **Dormido** | Estado `dormant`: el enemigo no se mueve, no ataca y no patrulla hasta ver a un jugador, recibir daño o una alarma. |
| **Alerta** | Estado `alert`: el enemigo persigue la última posición conocida y ataca si llega a adyacencia con acción. |
| **Regreso** | Estado `returning`: el enemigo vuelve a su puesto sin atacar y se duerme al llegar. |
| **Alarma** | Onda única de radio 5 al ver por primera vez en un episodio; alerta a los enemigos vivos dentro del radio, sin línea de visión y sin cadena. |
| **Última posición conocida** | `lastKnown`: punto al que acude un enemigo alertado o al que se comparte la alarma. |
| **Memoria** | `alertTurns`: 2 fases enemigas investigando y 1 volviendo antes de dormirse. |
| **Huida** | Movimiento determinista del perfil cobarde tras un golpe de ≥40 % de sus PV máximos: rompe la línea de visión y maximiza la distancia; acorralado, lucha. |
| **Debug hook** | API de desarrollo que expone estado o permite avanzar el juego en tests. |
| **Playtest** | Sesión en la que el usuario prueba una build y evalúa sensaciones. |
| **Arquetipo** | Personaje jugable del roster con stats inherentes, equipo inicial, dos variantes de sprite e identidad (rol y magia). El nombre de instancia es editable y, por defecto, el del arquetipo. |
| **Roster** | Catálogo de los nueve arquetipos jugables de [REQ-015](requirements/REQ-015-roster-arquetipos.md) en `src/game/roster.ts`; fuente única de sus stats, equipo, variantes e identidad. |
