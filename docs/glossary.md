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
| **Acción** | Una intervención táctica: atacar, interactuar o esperar. |
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
| **Fuerza** | Atributo inherente que se suma al daño del arma; sustituye al antiguo modificador de daño. |
| **Defensa** | Atributo inherente que se suma al escudo para resistir el impacto. |
| **Resistencia** | Atributo inherente de absorción: se suma a la armadura en una sola capa para reducir el daño. |
| **Acierto del arma** | Bonus del arma que se suma a la habilidad al resolver el impacto. |
| **Daño del arma** | Bonus del arma que se suma a la fuerza al resolver el daño. |
| **Puntería** | Atributo inherente reservado al ataque a distancia; sin efecto en este corte. |
| **Magia** | Atributo inherente de nivel entero único 0–4 (0 = sin magia). Determina el maná máximo y el acceso a hechizos; las familias son categorías de hechizo, no niveles. |
| **Maná** | Recurso de hechizos separado del MP; su máximo es nivel × 4 y se recarga completo al inicio de cada turno. |
| **Acciones por turno** | Noveno atributo inherente: cuántas acciones puede gastar una unidad en su turno (2 por defecto, Pícaro 3; tope 4 provisional). Atacar, interactuar y lanzar hechizos consumen una; moverse, recoger/soltar del suelo, esperar y terminar el turno no. |
| **Recoger y soltar** | Manejo de un objeto del suelo: cuesta 1 MP y no acción; soltar un objeto equipado lo desequipa. |
| **Contenedor** | Cofre o cadáver con inventario propio; abrir o registrar cuesta 1 acción y exige adyacencia; transferir es gratis y se permite «coger todo». |
| **Hechizo** | Efecto mágico con nivel mínimo, coste base 2 × nivel, alcance, acierto y poder; consume una acción y se limita a dos por turno en el primer corte (provisional). |
| **Réplica** | Contraataque gratuito e inmediato del defensor cuando un ataque cuerpo a cuerpo falla; exige arma equipada, puede fallar, puede matar y no se encadena. |
| **Escudo** | Equipo que suma a la defensa; decide si un ataque impacta, no cuánto duele. |
| **Armadura** | Equipo que actúa como bonus a la resistencia; resta al daño de un impacto, no evita el impacto. |
| **Equipo** | Arma, escudo y armadura de una unidad, guardados por IDs en el estado. |
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
