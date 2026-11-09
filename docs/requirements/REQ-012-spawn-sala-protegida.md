---
type: Requirement Sheet
id: REQ-012
title: Aparición alrededor del acceso y reparto de enemigos por superficie
description: Los jugadores aparecen juntos alrededor del acceso de la sala más protegida (evitando la mayor en empate), con 6 huecos y componentes adyacentes de máximo 2; el generador denso reparte enemigos interiores con emboscadas por puntos calientes y calcula el total por superficie y jugadores. BSP conserva 4 enemigos.
status: stable
version: 4
decision_owner: human:simon
review_required: true
created_at: 2026-11-08T23:55:54Z
updated_at: 2026-11-09T15:30:00Z
related_tasks: [TASK-0040, TASK-0041, TASK-0042, TASK-0043, TASK-0044, TASK-0045, TASK-0046, TASK-0047, TASK-0048, TASK-0049]
related_requirements: [REQ-003, REQ-009, REQ-011, REQ-013]
amends: [REQ-003, REQ-009]
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T23:55:54Z }
verified:
  - by: human:simon
    at: 2026-11-08T23:55:54Z
    note: >-
      Aprueba la regla para todos los generadores: grupo en la sala más
      protegida con ≥6 huecos, sin enemigos ni línea de visión inicial; BSP
      conserva 4 enemigos; el generador denso usa 1 por sala con máximo 1
      vacía y reparte su enemigo.
  - by: human:simon
    at: 2026-11-09T10:50:25Z
    note: >-
      Aprueba la v2: grupo alrededor del acceso de la sala de spawn (radio 2,
      separación 2); total de enemigos del generador denso por superficie de
      salas y jugadores con factores 0,02 y 1,35 configurables en EXP-004;
      reparto proporcional con mínimo 1 por sala no-spawn y tipos 60/20/20.
      BSP conserva 4 enemigos.
  - by: human:simon
    at: 2026-11-09T12:21:36Z
    note: >-
      Aprueba la v3: la sala más protegida sigue mandando, pero en empate se
      evita la sala mayor; jugadores y enemigos pueden formar parejas adyacentes
      en 8 direcciones y ninguna componente puede superar 2 fichas; los enemigos
      prefieren el interior y pueden aparecer emboscados en puntos calientes con
      tirada independiente al 0,5. La salida de nivel se define en REQ-013.
  - by: human:simon
    at: 2026-11-09T14:59:21Z
    note: >-
      Aprueba la v4 con la configuración registrada en EXP-004: 6 jugadores por
      defecto, factor por jugador 1,2 y emboscadas al 0,25. El término de
      jugadores de T pasa a ceil(1,2 × 6) = 8; con N de 85-162 el total queda en
      10-12 en un mapa 22×18. BSP conserva 4 enemigos.
---

# Contexto

Hoy `REQ-003` R-007 exige que el jugador aparezca en una sala con salida y que
el enemigo esté en la sala más lejana por camino, a 12 tiles o más. `REQ-009`
R-010/T-007 exige exactamente 4 enemigos en 4 salas distintas, sin visión
inicial, con una pareja dentro del radio de alarma y un enemigo aislado.

Ese contrato funciona en un mapa BSP de 32×32, pero no encaja con el generador
denso de `REQ-011` (~22×18, 4-6 salas pegadas en mapas normales y 3 en caverna):
no caben 12 tiles de distancia y la exploración se organiza mejor por salas que
por distancia. Además, el juego futuro tendrá hasta 6 jugadores que deben
empezar juntos y seguros.

La v3 relaja la separación rígida de la v2: el grupo puede formar parejas
adyacentes, pero nunca una piña de 3 o más. En el generador denso, los enemigos
dejan de pegarse al muro por defecto y pueden aparecer emboscados en rincones o
zonas sin línea de visión, con una probabilidad que evita convertirlo en una
norma predecible.

Este corte sustituye la regla de aparición y el reparto de enemigos. No cambia
el bestiario, la percepción, la alarma ni la IA: solo dónde empiezan las
unidades y cómo se reparten las fichas.

# Objetivos de experiencia

- El grupo empieza junto, en una sala que se lee como refugio: pocos accesos y
  sitio para todos.
- La partida no empieza en combate ni con un enemigo mirando al grupo.
- El resto de la mazmorra se siente habitada: cada sala no-spawn tiene al menos
  un enemigo y las salas grandes concentran más fichas.
- El jugador entiende que la densidad crece con la superficie y con el tamaño
  del grupo; el número de enemigos no es arbitrario.
- La regla de spawn funciona igual en BSP y en el generador denso; el
  presupuesto por superficie y jugadores se aplica solo al generador denso.

# Relación con REQ-003 y REQ-009

- Sustituye `REQ-003` R-007 completo: desaparece el enemigo en la sala más
  lejana y la distancia mínima de 12 tiles.
- Sustituye `REQ-009` R-010/T-007 en lo relativo a **exactamente** 4 enemigos,
  salas distintas obligatorias y garantía de pareja de alarma/aislado para el
  generador denso.
- Mantiene el resto de `REQ-009`: visión, línea de visión, alarma, memoria,
  huida determinista y `home`.
- `REQ-011` R-008 depende de esta hoja para la sala de spawn y el reparto.
- `REQ-013` define la entrada de nivel (el acceso de spawn) y la salida. Esta
  hoja reserva el tile de salida: ningún enemigo, hueco de spawn ni decoración
  puede ocuparlo.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | La sala de spawn es la **más protegida**: la que tiene menos accesos (puertas más bocas de pasillo ancho). La protección manda. En caso de empate se prefiere una sala que **no sea la de mayor área**; después, la mayor superficie libre; después, el `id` más bajo. La sala mayor solo se elige si es la única más protegida o la única que admite 6 huecos. Debe admitir **6 huecos válidos** según R-002; si ninguna sala los admite, se elige la que más ofrece y se emite aviso. | Un validador calcula accesos y huecos por sala; la elegida tiene el mínimo de accesos; entre las empatadas no elige la mayor si otra cumple los 6 huecos; la elegida admite 6 huecos o es la de mayor número con aviso. El experimento mide cuántas veces la sala de spawn es también la mayor. |
| R-002 | Todos los jugadores aparecen juntos en esa sala, **alrededor del tile de acceso**, en huecos distintos. El acceso es el suelo interior junto a la puerta elegida: la más cercana al centro de la sala, con desempate por `id`. Si la sala no tiene puerta, se usa el suelo interior junto a la boca de pasillo más cercana al centro. `party[0]` ocupa el acceso; el resto se coloca dentro de **Chebyshev ≤2** del acceso, priorizando tiles con al menos 2 vecinos libres. Se permite **adyacencia en parejas**: con adyacencia de **8 direcciones**, ninguna componente conexa de jugadores puede superar **2** fichas; no se exige separación ≥2. Se reservan 6 huecos; el jugador actual usa el primero. Si no caben 6, se amplía a radio 3 y después a la sala completa, con aviso. | Hay 6 posiciones distintas de suelo, fuera de puertas, salida y armas, dentro de la sala; `party[0]` es el acceso; el resto está a Chebyshev ≤2; cada componente adyacente tiene ≤2 jugadores; el reparto es determinista; el fallback emite `warnings`; el motor actual sigue usando un solo jugador. |
| R-003 | La sala de spawn no contiene enemigos. | Ninguna ficha enemiga cae dentro de la máscara de la sala de spawn. |
| R-004 | Ningún enemigo empieza con línea de visión a ningún hueco de spawn. Se elimina la distancia fija de 12 tiles. | Para cada enemigo y cada hueco de spawn, la comprobación de línea de visión de `REQ-009` devuelve `false`; el test cubre muros y puertas abiertas. |
| R-005 | En BSP se mantienen **4 enemigos**: 2 centinelas, 1 bruto y 1 cobarde, en salas distintas, ninguno en la sala de spawn y ninguno con visión inicial. Se conservan la pareja de alarma y el aislado de `REQ-009`. | La semilla de referencia cumple las 4 fichas, 4 salas distintas, sin spawn, sin visión inicial, pareja ≤8 y aislado >8; otra semilla también. |
| R-006 | En el generador denso, el total de enemigos se calcula por **superficie de salas y número de jugadores**: `T = ceil(enemySurfaceFactor × N) + ceil(enemyPlayersFactor × P)`, donde `N` es la suma de tiles de suelo de las salas (sin pasillos) y `P` son los jugadores (1-6). Los valores por defecto son **0,02** por tile, **1,2** por jugador y **6 jugadores**; todos son parámetros configurables y se exponen en el experimento y en el snapshot. BSP conserva 4 enemigos y no usa esta fórmula. | Un validador comprueba el total con varias `N`, `P` y factores; con los valores por defecto de un mapa 22×18 el total queda en 10-12; factores a 0 producen 0 enemigos; cambiar un factor o `P` cambia `T` como indica la fórmula; BSP sigue con 4. |
| R-007 | El total se reparte de forma **proporcional al área** de cada sala no-spawn, con **mínimo 1 por sala**. La sala de spawn no recibe enemigos y no hay salas vacías por defecto. El reparto usa el método del mayor resto con desempate determinista. El tile de salida no recibe ninguna ficha. | La suma de presupuestos es `T`; cada sala no-spawn tiene al menos 1; la de spawn tiene 0; las salas grandes reciben al menos tantas fichas como las pequeñas salvo el mínimo; el reparto es estable por semilla; ninguna ficha cae en la salida. |
| R-008 | Composición del generador denso: **60 % centinelas, 20 % brutos y 20 % cobardes**. Brutos y cobardes se redondean a la unidad y el resto son centinelas; si `T ≥ 4` hay al menos 1 bruto y 1 cobarde. Los cobardes van a las salas más lejanas del spawn, los brutos a las de mayor área y los centinelas rellenan el resto. | Con 10 enemigos: 6 centinelas, 2 brutos y 2 cobardes; con 4: 2/1/1; con 3: 1/1/1; con 2: 2/0/0; con 0: ninguna ficha. Las posiciones y tipos son deterministas. |
| R-009 | En el generador denso, los enemigos pueden ser **adyacentes en parejas**, pero ninguna **componente conexa de adyacencia de 8 direcciones** puede superar **2** fichas. Se permiten dos enemigos que se toquen, pero no una cadena o piña de 3 o más. No hay dos fichas en el mismo tile y dos parejas distintas no pueden tocarse. BSP conserva sus 4 enemigos en salas distintas. | Un test con una pareja adyacente la acepta; otro con tres en línea o en triángulo la rechaza; dos parejas separadas por Chebyshev 2 se aceptan; no hay dos fichas en el mismo tile. |
| R-010 | La IA sigue usando `home` como sala asignada: el enemigo vuelve a su sala tras una alerta. No cambian percepción, alarma, memoria ni huida. | Los tests de `REQ-009` siguen pasando; el `home` de cada ficha cae en su sala asignada; dos enemigos en la misma sala pueden compartir alarma. |
| R-011 | Si el mapa no puede cumplir los 6 huecos o la ausencia de línea de visión, el generador no falla: elige la sala con más huecos, relaja primero los 6 y después la línea de visión, y emite un aviso honesto. Nunca coloca unidades en muro, puerta o arma. | Un mapa stub pequeño produce un `GeneratedMap` con `warnings`, al menos 1 hueco válido y sin unidades en tiles inválidos; la partida no lanza. |
| R-012 | La sala de spawn, el número de accesos, los 6 huecos y el reparto de enemigos se exponen en el snapshot y en la capa de debug. | `F1` muestra la sala, sus accesos y los huecos; el snapshot serializa `spawnRoomId`, `party` y las fichas con su sala. |
| R-013 | La regla de spawn se aplica a todos los generadores: BSP y el generador denso. No hay una variante “antigua” para BSP. | Los tests de ambos generadores comprueban la misma sala protegida, la ausencia de enemigos y la ausencia de visión inicial. |
| R-014 | En el generador denso, la colocación prefiere **celdas interiores**: una celda es interior si sus 4 vecinos ortogonales son suelo de la misma sala. El borde se usa solo cuando no queda una celda interior compatible con el presupuesto, la adyacencia, el spawn y la salida. Los emboscados de R-015 son la excepción deliberada. | Un validador comprueba que ningún enemigo no-emboscado queda en el borde si existe una celda interior libre y compatible que pueda sustituirlo sin romper reglas. Las métricas separan interiores, borde y emboscados; las salas sin interior suficiente lo declaran. |
| R-015 | **Emboscadas en puntos calientes:** un punto caliente es una celda de suelo de una sala no-spawn con **≥3 vecinos ortogonales de muro** o **sin línea de visión a ningún acceso** de la sala. Cada punto caliente elegible tiene una tirada determinista **independiente** con probabilidad `hiddenEnemyChance` (0-1, por defecto **0,25**). Si sale, ocupa una ficha del presupuesto de su sala; nunca añade enemigos. No todos los puntos calientes se ocupan: el resultado varía con la semilla. Se excluyen spawn, salida, puertas, armas y celdas que rompan R-009. Cualquier tipo puede ser emboscado. | Con probabilidad 0 no hay emboscados; con 1 se ocupan todos los puntos calientes elegibles hasta agotar el presupuesto; con 0,25 el porcentaje ocupado varía y no es 0 % ni 100 % en el barrido. Dos llamadas con la misma semilla devuelven lo mismo. No se supera `T`, no hay fichas en spawn/salida/puerta/arma y se respeta la adyacencia ≤2. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | La selección de spawn y el reparto de enemigos son funciones puras, deterministas y sin DOM. Derivan del mapa y de la semilla, sin relojes ni `Math.random`. | Dos llamadas con la misma semilla y mapa devuelven las mismas posiciones; se ejecutan en Vitest sin jsdom. |
| T-002 | `GeneratedMap.spawns` se amplía con `spawnRoomId` y `party` (6 posiciones). `spawns.player` se conserva como alias de `party[0]`. `spawns.enemy` deja de ser la fuente de verdad. | El modelo es serializable; los tests y el motor que leen `spawns.player` siguen funcionando; la colocación lee `party`/`spawnRoomId`. |
| T-003 | La colocación de BSP conserva las 4 fichas y sus restricciones de alarma, pero excluye la sala de spawn y exige ausencia de línea de visión. | `placeMapEnemies` o su sucesor acepta el mapa nuevo; la semilla de referencia mantiene 4 fichas, 4 salas, pareja ≤8 y aislado >8. |
| T-004 | La colocación del generador denso usa un presupuesto calculado por superficie y jugadores, lo reparte por área con mínimo 1 por sala no-spawn y permite varias fichas por sala con **componentes de adyacencia ≤2**, preferencia por interior y emboscadas en puntos calientes. | Un test con 4-6 salas comprueba el total, el reparto, los tipos, la adyacencia, el interior y las emboscadas; no se fuerza el cupo de 4 ni un máximo fijo por sala. |
| T-005 | La comprobación de “sin línea de visión” reutiliza la función de percepción de `REQ-009` y se evalúa para todos los huecos de spawn antes de aceptar una colocación. Si no hay combinación, se aplica R-011. | Un test con un enemigo detrás de un muro y otro delante del hueco comprueba que solo el segundo invalida la colocación. |
| T-006 | Los umbrales viven en constantes documentadas: mínimo de huecos de spawn (6), radio del acceso (2), **adyacencia de grupo en 8 direcciones y máximo 2 por componente**, factor por tile (0,02), factor por jugador (1,2), **probabilidad de emboscada (0,25)**, distancia mínima de salida (2, `REQ-013`) y jugadores por defecto (6). Los valores de BSP para sus 4 fichas se mantienen separados. | Las constantes se exportan y los tests las usan; cambiarlas no exige tocar la lógica. |
| T-007 | Hay validadores y tests para ambos generadores con la semilla de referencia y al menos 20 semillas alternativas. | Vitest cubre sala protegida, 6 huecos, sin enemigos, sin visión, reparto, adyacencia, interior, puntos calientes, probabilidad 0/1, fallback y reserva de la salida; no se debilitan tests de `REQ-003`/`REQ-009`. |
| T-008 | El host muestra en debug la sala de spawn, sus accesos, los huecos, los puntos calientes y los enemigos emboscados; el HUD no cambia en juego normal. | `F1` alterna la capa; sin `F1` no aparece información nueva; el snapshot incluye los datos. |
| T-009 | No se añaden dependencias y el coste de la colocación no bloquea el arranque. | `package.json` no cambia; la generación de 22×18 con reparto queda por debajo de 50 ms en CI. |
| T-010 | Las sustituciones de `REQ-003` R-007 y `REQ-009` R-010/T-007 se registran en esas hojas y en el glosario, incluidos **punto caliente**, **enemigo emboscado** y **componente de adyacencia**. | Las tres hojas enlazan entre sí y no queda una regla contradictoria sin marcar. |
| T-011 | No se borran, saltan ni debilitan tests existentes; las expectativas que cambian se justifican por esta hoja. | El diff de tests solo adapta los casos de spawn afectados; el resto se mantiene. |
| T-012 | `EXP-004` expone `enemySurfaceFactor` (0-0,10, por defecto 0,02), `enemyPlayersFactor` (0-3,00, por defecto 1,2), `numPlayers` (1-6, por defecto 6) y **`hiddenEnemyChance`** (0-1, por defecto 0,25). El panel muestra `N`, `P`, ambos términos, `T`, el reparto por sala, puntos calientes, emboscados y componentes adyacentes; el JSON de decisión incluye factores, probabilidad y desglose. | Un test unitario comprueba que cambiar cada factor o `P` cambia `T` según la fórmula, incluido 0; cambiar la probabilidad cambia los emboscados sin cambiar `T`; la página permite editar y exportar los cuatro valores; el payload serializa el desglose completo. |
| T-013 | La colocación de enemigos del generador denso es una función pura y determinista: puntúa celdas interiores, puntos calientes y borde, aplica la tirada de emboscada por celda y valida componentes de adyacencia ≤2. El tile de salida de `REQ-013` se excluye. | Dos llamadas con la misma semilla devuelven las mismas fichas; un test con una celda de salida comprueba que no se ocupa; la función no usa `Math.random`, relojes ni DOM. |

# Requisitos no funcionales

- **Rendimiento:** la selección de spawn y el reparto no añaden más de 10 ms a
  la generación de 22×18; el arranque sigue sin tirones.
- **Legibilidad:** la sala de spawn se reconoce sin debug por su silueta y sus
  pocos accesos; el jugador no necesita saber el número exacto de enemigos. Las
  emboscadas se leen como parte de la sala, no como fichas arbitrarias, y el
  debug distingue puntos calientes y emboscados.
- **Accesibilidad:** el debug no tapa el HUD; la información de spawn no depende
  solo del color.
- **Compatibilidad:** Chromium de escritorio; Firefox y Safari recientes como
  deseables.
- **Seguridad:** sin red, sin persistencia y sin datos personales.
- **Mantenibilidad:** selección de spawn, colocación y percepción separadas;
  constantes documentadas; sin ECS ni motor genérico.

# Dependencias

- `REQ-003` cerrada: mapa BSP, salas, puertas y `spawns` existentes.
- `REQ-009` cerrada: percepción, línea de visión, alarma, `home` y las 4 fichas.
- `REQ-011` aprobada: generador denso, sala de spawn con 6 huecos y puertas
  decorativas.
- `EXP-004` y `TASK-0040`: validan el estilo y muestran el reparto en el
  experimento antes de implementar.
- [ADR-007](../decisions/ADR-007-map-generator.md): interfaz inyectable.

# Fuera de alcance

- Implementar el cooperativo, el hotseat o los 6 jugadores; solo se reservan
  los huecos.
- Cambiar el bestiario, la percepción, la alarma, la memoria o la huida.
- Salas seguras con curación, tiendas, guardado o checkpoints.
- Puertas funcionales que bloqueen la línea de visión.
- La salida, su representación como puerta o escalera y el encadenado de niveles
  se definen en `REQ-013`; aquí solo se reserva su tile.
- Selector de dificultad o presupuesto de enemigos configurable por el jugador;
  `hiddenEnemyChance` es un parámetro de experimento, no de partida.
- Niebla de guerra, minimapa o revelado de enemigos.
- Persistencia y guardado del reparto.

# Preguntas abiertas

1. **Alarma en el generador denso:** no se garantiza una pareja ≤8 ni un
   aislado >8; la alarma se prueba con la geometría de cada mapa. Si el
   playtest echa en falta esa garantía, se añade como criterio.
2. **Tope por sala:** el reparto proporcional puede acumular 4 o más fichas en
   una sala grande o en la caverna. Por defecto no hay tope fijo; el experimento
   dirá si esa concentración se lee mal y conviene limitarla.
3. **Umbral de 6 huecos:** es el mínimo para 6 jugadores. Si una sala protegida
   tiene 6 pero muy apretados, el experimento dirá si conviene exigir 8.
4. **Factores de densidad:** 0,02, 1,2 y 6 jugadores son la configuración
   aprobada tras el playtest. El usuario puede ajustarlos sin cambiar código; el
   playtest de producción dirá si `T` queda alto o bajo.
5. **Calibración de emboscadas:** 0,25 es el valor aprobado. El playtest dirá si
   conviene bajarlo para que sorprendan más o subirlo para que se lean como
   parte de la sala. La probabilidad no altera `T`.
6. **Sala de spawn no-mayor:** el desempate evita la sala mayor solo cuando hay
   empate de protección. Si el playtest pide evitar la mayor incluso con más
   accesos, se cambiará la jerarquía en una versión posterior.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-08 | La regla de spawn se aplica a todos los generadores. | human:simon | aceptada |
| 2026-11-08 | El grupo aparece junto en la sala más protegida, con ≥6 huecos para 6 jugadores. | human:simon | aceptada |
| 2026-11-08 | La sala de spawn no tiene enemigos. | human:simon | aceptada |
| 2026-11-08 | Ningún enemigo empieza con línea de visión al spawn; se elimina la distancia de 12 tiles. | human:simon | aceptada |
| 2026-11-08 | BSP conserva 4 enemigos; el generador denso usa 1 por sala con máximo 1 vacía y reparte su enemigo. | human:simon | aceptada |
| 2026-11-08 | Composición del generador denso: centinelas = total − 2, más 1 bruto y 1 cobarde. | requirements-writer | propuesta |
| 2026-11-08 | La sala vacía se elige entre hojas y el enemigo extra va a la sala con menos fichas. | requirements-writer | propuesta |
| 2026-11-08 | El generador denso no garantiza pareja de alarma ni aislado; BSP sí los conserva. | requirements-writer | propuesta |
| 2026-11-09 | El grupo aparece alrededor del acceso de la sala de spawn, con radio 2 y separación 2. | human:simon | aceptada |
| 2026-11-09 | Total de enemigos del generador denso por superficie de salas y jugadores; factores 0,02 y 1,35 configurables en `EXP-004`. | human:simon | aceptada |
| 2026-11-09 | Reparto proporcional al área con mínimo 1 por sala no-spawn, sin salas vacías. | human:simon | aceptada |
| 2026-11-09 | Composición 60/20/20 con al menos 1 bruto y 1 cobarde si `T ≥ 4`. | human:simon | aceptada |
| 2026-11-09 | La fórmula se aplica solo al generador denso; BSP conserva 4 enemigos. | human:simon | aceptada |
| 2026-11-09 | La sala de spawn sigue siendo la más protegida; en empate se evita la sala mayor y se exigen 6 huecos. | human:simon | aceptada |
| 2026-11-09 | Adyacencia de 8 direcciones con componentes de grupo ≤2 para jugadores y enemigos; se permiten parejas. | human:simon | aceptada |
| 2026-11-09 | Enemigos interiores con borde como recurso; puntos calientes con tirada independiente al 0,5, sin enemigos extra. | human:simon | aceptada |
| 2026-11-09 | La salida se define en `REQ-013`; esta hoja solo reserva su tile. | human:simon | aceptada |
| 2026-11-09 | Valores por defecto del generador denso: 6 jugadores, factor por jugador 1,2 y emboscadas al 0,25; `T` resultante 10-12 en 22×18. | human:simon | aceptada |
| 2026-11-09 | La colocación de enemigos del generador denso se promociona con `growth`; BSP conserva sus 4 fichas y su propia colocación. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] Los requisitos son verificables.
- [x] Está claro el fuera de alcance.
- [x] Las contradicciones con `REQ-003` y `REQ-009` están identificadas y
      sustituidas.
- [x] Las dependencias están claras.
- [x] Hay un experimento (`EXP-004`) que muestra el reparto antes de
      implementarlo.
- [x] La hoja tiene versión y fecha.
