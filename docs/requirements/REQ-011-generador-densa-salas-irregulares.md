---
type: Requirement Sheet
id: REQ-011
title: Generador de mazmorra densa con salas irregulares
description: Segundo MapGenerator seleccionable con mapas pequeños y densos, 4-6 salas poligonales en mapas normales y 3 en cavernas (mínimo global 3), pasillos de 0-3 tiles, pasillos anchos ocasionales, caverna excepcional y puertas decorativas con soporte de muro y separación.
status: stable
version: 4
decision_owner: human:simon
review_required: true
created_at: 2026-11-08T23:55:54Z
updated_at: 2026-11-09T15:30:00Z
related_tasks: [TASK-0040, TASK-0041, TASK-0042, TASK-0043, TASK-0044, TASK-0045, TASK-0046, TASK-0047, TASK-0048, TASK-0049]
related_requirements: [REQ-003, REQ-008, REQ-012, REQ-013]
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T23:55:54Z }
verified:
  - by: human:simon
    at: 2026-11-08T23:55:54Z
    note: >-
      Aprueba el resumen de REQ-011: segundo generador seleccionable, mapas
      ~22×18 parametrizables, 4-6 salas poligonales con muescas, pared con
      pared, pasillos de 0-3 tiles, anchos ocasionales en 1 de cada 3 mapas,
      caverna en 1 de cada 6, puertas decorativas por zona, un solo material
      de muro y experimento EXP-004 antes de fijar el algoritmo.
  - by: human:simon
    at: 2026-11-09T10:50:25Z
    note: >-
      Aprueba la v2: puertas solo con dos muros en la línea y suelo a ambos
      lados, conexión entre dos salas, separación Chebyshev ≥3, máximo una por
      pasillo, sin puertas en pasillos anchos y boca abierta con aviso cuando
      la geometría no permite una puerta válida.
  - by: human:simon
    at: 2026-11-09T12:21:36Z
    note: >-
      Aprueba la v3: mínimo global de 3 salas; mapas normales de 4-6 y
      caverna de 3 (caverna + 2 anexas). La exploración mínima y la salida de
      nivel se definen en REQ-013.
  - by: human:simon
    at: 2026-11-09T14:59:21Z
    note: >-
      Aprueba la v4: growth es el método elegido y pasa a generador por defecto
      en producción. La configuración registrada en EXP-004 es la candidata:
      22×18, 5 salas, salas de 3-8 tiles, pasillo máximo 3, ancho 33 %, muro 1,
      caverna 15 % y mínimo 6 huecos. BSP sigue disponible como alternativa
      inyectable y conserva sus tests; BSP con máscaras y plantillas quedan en
      el experimento hasta que se pidan.
---

# Contexto

`REQ-003` cerró una mazmorra BSP de 32×32 con 8-12 salas rectangulares y
pasillos de 1-2 tiles. Funciona, pero su lenguaje visual es otro: salas muy
separadas, pasillos largos y bordes rectos. El usuario ha mostrado tres mapas
hechos con el mismo tileset de 32rogues que responden a una intención distinta:
mazmorras **densas**, talladas dentro de una masa de muro, con salas de silueta
caprichosa, rincones, pasillos muy cortos y habitaciones que comparten pared.

Este corte añade un **segundo** `MapGenerator` seleccionable y, tras el playtest
de `EXP-004`, `growth` pasa a ser el generador por defecto de producción. BSP se
mantiene como implementación alternativa inyectable, no se borra y conserva sus
tests. No se sustituye el motor, la cámara, el HUD, el combate ni la IA.

La comparación A/B/C no vive en producción: sigue en `EXP-004`. El build de
producción importa solo la variante elegida de forma estática y no incluye un
`switch` runtime ni los módulos de las variantes descartadas.

La referencia visual está en las tres capturas aportadas por el usuario en la
conversación de requisitos del 2026-11-08. El experimento `EXP-004` reproduce el
estilo con el tileset real y decide el algoritmo y los parámetros de forma.

# Objetivos de experiencia

- La mazmorra se lee como un lugar construido y denso, no como una retícula de
  salas separadas por pasillos.
- Cada sala tiene una silueta reconocible: entrantes, salientes, rincones y
  hornacinas que invitan a mirar y a colocarse.
- El recorrido no tiene pasillos largos ni tiempos muertos: se pasa de una sala
  a otra con una puerta o un tramo de 1-3 tiles.
- Las salas pegadas y las puertas crean cuellos de botella tácticos; las
  hornacinas ofrecen refugio y las salas grandes permiten maniobrar.
- El estilo no depende del color del muro: la geometría debe funcionar con un
  único material y las paletas de suelo de `REQ-008`.
- La mazmorra sigue siendo legible: el jugador distingue salas, pasillos,
  puertas y límites sin perderse.

# Relación con REQ-003

- No se sustituye BSP: se añade una implementación nueva tras la interfaz
  `MapGenerator` de [ADR-007](../decisions/ADR-007-map-generator.md).
- Se reutilizan las reglas de muro por borde, el cierre del borde del mapa, el
  determinismo, la serialización y las paletas por sala.
- Los pasillos anchos de 2 tiles de `REQ-003` dejan de ser obligatorios en este
  generador y pasan a ser ocasionales.
- La aparición de jugadores y enemigos se rige por `REQ-012`, no por `R-007` de
  `REQ-003`.
- La entrada y la salida de nivel se rigen por `REQ-013`: este generador reserva
  el tile de salida y lo excluye de enemigos, decoración y huecos de spawn.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | El mapa por defecto mide 22×18 tiles. El tamaño es un parámetro interno para que los niveles futuros puedan variar. | `generate` acepta `mapWidth`/`mapHeight`; con la configuración por defecto el mapa mide 22×18; los tests generan 16×14 y 32×32 sin cambios de código. |
| R-002 | Hay al menos **3 salas en cualquier mapa**. Los mapas normales tienen **4-6 salas**: al menos 1 es grande (caja de 7×7 o más, o área ≥50 tiles) y al menos 1 es pequeña (caja de 3×3 a 4×4, o área ≤19 tiles); el resto son medianas. En los mapas con caverna (R-007) hay exactamente **3 salas**: la caverna y **2 anexas**. | Un validador cuenta salas y roles, comprueba que no se solapan y que ninguna sala queda fuera del borde transitable. En mapas normales el recuento está en 4-6; en caverna es 3; ningún mapa baja de 3. Con la semilla de referencia se cumple el mínimo de grandes y pequeñas cuando aplica. |
| R-003 | Las salas son polígonos rectilíneos: todas sus celdas de suelo están conectadas en ortogonal, sin celdas sueltas ni islas. Al menos una sala por mapa no es un rectángulo y tiene una muesca, un entrante o una forma en L/T. Las hornacinas y muescas miden 1-2 tiles de fondo. | Un validador comprueba conectividad de celdas, ausencia de islas, al menos una sala no rectangular y al menos 3 hornacinas de 1-2 tiles por mapa. La relación área/caja de las salas no rectangulares queda entre 0,55 y 0,92. |
| R-004 | Las salas pueden compartir pared: al menos una pareja de salas queda separada por 1-2 tiles de muro y se conecta con una puerta válida en esa pared, directa o con un tile de paso. El grosor de muro entre salas es de 1-2 tiles y el borde exterior del mapa es muro en todo su perímetro. Una puerta de salida de `REQ-013` puede dibujarse sobre un tile de muro del borde, pero no abre paso ni crea suelo fuera. | Un validador encuentra al menos una pareja con distancia de 2 tiles entre suelos y una puerta válida entre ellos; mide el grosor de muro entre salas (1-2) y comprueba el cierre del borde, incluida la puerta de salida si existe. |
| R-005 | Las conexiones son puertas directas (0 tiles de pasillo) o pasillos de 1-3 tiles de recorrido. No hay pasillos de 4 o más tiles salvo el pasillo ancho de R-006. El grafo de salas es conexo y tiene entre 0 y 3 bucles. | Un BFS confirma conectividad; la distribución de longitudes de pasillo está entre 0 y 3; el número de conexiones extra sobre el árbol está entre 0 y 3; no hay pasos diagonales. |
| R-006 | En aproximadamente 1 de cada 3 mapas aparece un pasillo ancho de 2 tiles, con al menos 3 tiles de longitud, sin puertas. Como máximo hay uno por mapa y no aparece en todos. | Sobre 30 semillas, entre el 25 % y el 40 % tiene exactamente un pasillo `wide` de 2 tiles y longitud ≥3; ninguna tiene más de uno; ningún `wide` tiene puerta. |
| R-007 | En aproximadamente 1 de cada 6 mapas (~15 %), el mapa es una caverna: una sala irregular grande (≥55 % del suelo de sala) más **2 salas anexas** (3 salas en total). La caverna tiene al menos 4 muescas y el resto del mapa conserva pasillos cortos. | Sobre 60 semillas, entre el 10 % y el 20 % son mapas de caverna; la sala principal cumple área, muescas y número total de salas **3**; el resto de mapas no activa la variante. |
| R-008 | La sala de spawn se elige y se expone según `REQ-012`: la más protegida (evitando la mayor en empate), con **6 huecos válidos** para los 6 jugadores futuros y sin enemigos. El generador devuelve la sala, los 6 huecos, la entrada, la salida y los enemigos ya repartidos. | Un validador comprueba que la sala de spawn admite 6 huecos, que no hay enemigos en ella y que los 6 huecos son suelo distinto, fuera de puertas, salida y armas. |
| R-009 | Cada acceso entre dos salas distintas tiene una **puerta decorativa** transitable cuando la geometría cumple las reglas; si no, queda una **boca abierta con aviso**. Una puerta válida ocupa un tile de muro con **dos vecinos de muro en la línea del muro** (arriba/abajo o izquierda/derecha) y **suelo transitable a ambos lados** del eje de paso. La separación global entre puertas es **Chebyshev ≥3** y hay **como máximo una puerta por pasillo** de 0-3 tiles; los pasillos anchos no llevan puertas. La puerta no bloquea, no tiene llave ni estado abierto/cerrado y no cambia las reglas. Su estilo visual se deriva de la zona o la paleta de la sala y es estable por semilla. | Un validador comprueba soporte de muro, suelo a ambos lados, conexión entre dos salas distintas, separación Chebyshev ≥3, una puerta por pasillo y ausencia en pasillos anchos. Cada puerta tiene estilo; caminar por ella no cuesta más; dos partidas con la misma semilla usan los mismos estilos; las posiciones inválidas no dibujan puerta y aparecen como boca abierta con motivo en debug/métricas. |
| R-010 | Cada sala usa una paleta de suelo de `REQ-008`; los pasillos usan la paleta neutra. La asignación se hace por sala completa, incluidas sus muescas, y no cambia dentro de una misma sala. En la caverna, toda la sala comparte una paleta. | Un validador comprueba que todas las celdas de una sala comparten paleta, que los pasillos son neutros y que la decoración no invade puertas ni huecos de spawn. |
| R-011 | La cámara y el render siguen limitados al mapa; no se ve suelo fuera del borde. El viewport 13×13 de `REQ-005` se mantiene. | Los tests de cámara y encuadre de `REQ-002`/`REQ-005` siguen pasando con el generador nuevo. |
| R-012 | La decoración plana de `REQ-008` se mantiene: 35 % en salas y 16 % en pasillos, sin bloquear ni cambiar muros. Las hornacinas pueden decorarse; las puertas y los huecos de spawn nunca. | Dos renders de la misma semilla son idénticos; la densidad está dentro de los rangos; no hay decals en puertas, spawns ni muros. |
| R-013 | La capa de debug muestra la máscara de cada sala, sus límites, las puertas y su estilo, la sala de spawn, los huecos de spawn, la entrada y la salida de nivel (`REQ-013`), la anchura de cada pasillo y si el mapa es una caverna. Está oculta por defecto. | `F1` alterna la capa; con ella activa se leen los datos; al desactivarla el juego se ve igual que sin ella. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | La generación es una función pura, determinista y sin DOM. Recibe semilla y opciones y devuelve un `GeneratedMap` completo. | No importa `src/host/`; no usa `Math.random`, `Date.now` ni `performance.now`; dos llamadas con la misma semilla devuelven estructuras profundamente iguales. |
| T-002 | La implementación de `growth` se encapsula tras `MapGenerator` con `id = 'growth'` y pasa a ser la implementación por defecto. BSP queda como alternativa inyectable. El host no elige variante en runtime: el punto de composición importa `growth` de forma estática. | `MapGenerator` no cambia de forma incompatible; `createInitialState` usa `growth` si no se inyecta nada; los tests inyectan BSP y siguen pasando; no hay registro de plugins ni `switch` de variantes en producción. |
| T-003 | El modelo de sala deja de ser solo rectangular. `Room` conserva `x`, `y`, `width`, `height` como caja de límites y añade la máscara de celdas o la lista de rectángulos que forma la sala. `roomAt` y cualquier consulta de pertenencia usan la máscara. | Un test comprueba que una celda de una muesca pertenece a la sala correcta y que una celda de la caja que no es suelo no pertenece a ninguna sala; el estado sigue siendo serializable. |
| T-004 | `GeneratedMap.spawns` se amplía con la sala de spawn y 6 posiciones de grupo. `spawns.player` se conserva como alias del primer hueco para no romper el motor actual. `spawns.enemy` queda como dato heredado y no es la fuente de verdad de la colocación. | El snapshot incluye `spawnRoomId`, `party` y al menos 1 jugador; los tests antiguos que leen `spawns.player` siguen funcionando; el motor usa `party[0]` para el jugador. |
| T-005 | `MapOptions` gana parámetros de forma: número de salas, tamaño mínimo/máximo **en tiles**, longitud máxima de pasillo, probabilidad de pasillo ancho, grosor de muro, probabilidad de caverna y mínimo de huecos de spawn. Los valores imposibles se corrigen con aviso, sin lanzar. El recuento de salas nunca baja de 3; los mapas normales usan 4-6 y la caverna fija 3. | Los tests pasan opciones extremas y reciben un mapa válido con `warnings`; la configuración por defecto es 22×18, 5 salas, salas de 3-8 tiles, pasillo máximo 3, ancho 33 %, muro 1 (se admite 1-2), caverna 15 % y spawn mínimo 6. `roomMin`/`roomMax` son tamaños de sala, no número de salas. |
| T-006 | `Door` incluye un estilo visual estable (`wood`, `metal`, `grated` o equivalente) derivado del ambiente/paleta de la sala. El host dibuja el tile correspondiente de 32rogues. | El estilo está en el estado serializable; el render no usa `Math.random`; la misma semilla produce los mismos estilos; hay al menos 3 estilos disponibles. |
| T-007 | El render consume la máscara de sala y dibuja puertas decorativas solo en huecos válidos, por debajo de las unidades; las bocas abiertas se dibujan sin puerta. La regla de muro por borde (`wallSide1` solo con suelo al sur, `wallTop` en el resto) se mantiene. | Una tabla de casos cubre la selección de tile de muro; las puertas se dibujan en horizontal y vertical; el jugador puede estar sobre la puerta; no hay puertas dibujadas en pasillos anchos ni en bocas abiertas inválidas. |
| T-008 | Hay validadores puros y tests para conectividad, formas, muescas, muros compartidos, longitud de pasillos, frecuencia de anchos y cavernas, spawn y puertas. | Vitest cubre cada criterio con al menos un caso positivo y uno negativo; no se debilitan tests de `REQ-003` ni de `REQ-008`. |
| T-009 | La generación de 22×18 no bloquea el arranque ni el render. Objetivo: menos de 50 ms en CI con la semilla de referencia y 60 fps estables. | Test de rendimiento con umbral holgado y medición registrada; el E2E no detecta tirones. |
| T-010 | No se añaden dependencias nuevas. El PRNG, los validadores y la forma de las salas son código local. | `package.json` no incorpora dependencias de generación. |
| T-011 | El estado sigue siendo serializable y expone en el snapshot la semilla, las salas con su forma, las puertas con estilo, la sala de spawn, los huecos de spawn y los enemigos. | `JSON.parse(JSON.stringify(snapshot))` conserva los datos y los tests pueden leerlos. |
| T-012 | BSP sigue funcionando y conserva su estructura, sus salas rectangulares y sus tests, salvo la aparición de `REQ-012`. La implementación nueva no comparte estado mutable con BSP. | Todos los tests de BSP pasan; la misma semilla produce el mismo mapa BSP que antes salvo spawns; no hay estado global compartido. |
| T-013 | Los tests existentes no se borran, saltan ni debilitan para hacer pasar el generador nuevo. Las diferencias de contrato se documentan y se cubren con tests nuevos. | El diff de tests solo añade casos o adapta expectativas de spawn justificadas por `REQ-012`; el resto queda intacto. |
| T-014 | La colocación de puertas es una función pura y determinista que valida soporte de muro, suelo a ambos lados, conexión entre dos salas distintas, separación global Chebyshev ≥3 y máximo una puerta por pasillo. Devuelve las puertas válidas y la lista de bocas abiertas con su motivo. | Dos llamadas con la misma semilla y geometría devuelven las mismas puertas y bocas; un mapa con una puerta sin dos muros, dos puertas a distancia <3, dos puertas en un pasillo o una puerta en pasillo ancho conserva como máximo una puerta válida y convierte el resto en bocas abiertas con aviso, nunca en puertas inválidas. |
| T-015 | El generador se organiza en `src/game/chambers/core/` para lo compartido y `src/game/chambers/variants/growth.ts` para la variante elegida. El punto de composición de producción importa solo `growth`, de forma estática. No hay un `switch (variant)` runtime ni imports de `experiments/` en producción. | El build de producción no contiene marcadores de variantes no elegidas (`buildBsp`, `pickTemplate` u otros) ni chunks de `bsp`/`templates`; un test o comprobación de CI lo verifica. Añadir una variante exige un módulo y un import estático nuevos, no un registro dinámico. |
| T-016 | La comparación A/B/C vive en `EXP-004` y en el servidor de desarrollo. El build de producción no incluye los entry points de `experiments/`; si se necesitan, se construyen con un comando separado. | `pnpm run build` genera solo el entry de producción y la guarda de bundle pasa; `pnpm run build:experiments` (o equivalente) construye los experimentos sin contaminar el bundle de juego. |

# Requisitos no funcionales

- **Rendimiento:** generación de 22×18 por debajo de 50 ms en CI; render a
  60 fps con el viewport actual.
- **Legibilidad:** la silueta de cada sala debe distinguirse del muro; las
  puertas deben verse sin tapar la información táctica; la capa de debug no
  debe ser necesaria para jugar.
- **Accesibilidad:** contraste suficiente entre suelo, muro y puerta; ningún
  elemento depende solo del color.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin red, sin persistencia y sin datos personales.
- **Mantenibilidad:** generador tras interfaz, validadores y render separados;
  tipos claros; sin ECS ni motor genérico.

# Dependencias

- `REQ-003` cerrada: interfaz `MapGenerator`, BSP, regla de muros y semilla por
  URL.
- `REQ-008` cerrada: paletas por sala y decoración no bloqueante.
- `REQ-012` aprobada: sala de spawn protegida, adyacencia de grupo y reparto
  orgánico de enemigos.
- `REQ-013` aprobada: entrada, salida y exploración mínima por nivel.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): tiles y sprites
  de 32rogues.
- [ADR-007](../decisions/ADR-007-map-generator.md): interfaz inyectable.
- `EXP-004`: comparador de algoritmos y parámetros de forma; decide el algoritmo
  antes de crear las tareas de implementación. La v3 añade distribución orgánica,
  emboscadas y salida.
- `TASK-0040`: construye `EXP-004`. `TASK-0041`: aplica la v2 de puertas, spawn
  y enemigos.

# Fuera de alcance

- Materiales de muro distintos por zona o sala; en este corte hay uno solo.
- Puertas funcionales, llaves, cerraduras, puertas secretas y trampas. La
  entrada, la salida y su representación como puerta o escalera se definen en
  `REQ-013`.
- Pasillos de 3 tiles de ancho, barricadas y objetos tácticos.
- Transiciones funcionales entre niveles y generación del siguiente mapa;
  `REQ-013` solo define el dato de salida y su visualización.
- Bestiario nuevo, cambios de IA o de combate más allá de `REQ-012`.
- Implementar el cooperativo; solo se reservan los 6 huecos de spawn.
- Paletas de suelo o decals nuevos; se reutiliza `REQ-008`.
- Promover BSP con máscaras o plantillas a producción; quedan en `EXP-004`
  hasta que se pidan expresamente.
- Un selector de generador en runtime o un registro de plugins.
- La cámara secreta; se añadirá después, solo sobre la variante elegida.
- Arte y audio finales.

# Preguntas abiertas

1. **Cámara secreta:** se añadirá después de validar `growth` en producción,
   solo sobre la variante elegida. No entra en este corte.
2. **Caverna grande:** una sola paleta de suelo para toda la caverna. Si el
   playtest la ve monótona, se prueban dos subzonas.
3. **Mapeo exacto puerta-zona:** se elige viendo el experimento con el tileset
   real; la hoja solo exige estabilidad y al menos 3 estilos.
4. **Umbrales de forma:** la relación área/caja 0,55-0,92 y las 3 hornacinas son
   objetivos; el playtest de producción puede ajustarlos si la sensación no
   funciona.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-08 | Segundo generador seleccionable; BSP sigue siendo el defecto hasta decidir tras jugar. | human:simon | sustituida por la decisión del 2026-11-09 |
| 2026-11-08 | Mapas pequeños y densos por defecto (~22×18), con tamaño parametrizable para niveles futuros. | human:simon | aceptada |
| 2026-11-08 | 4-6 salas, 1-2 grandes; caverna excepcional en ~1 de cada 6 mapas. | human:simon | aceptada |
| 2026-11-08 | Salas poligonales rectilíneas con muescas, entrantes, salientes y hornacinas de 1-2 tiles. | human:simon | aceptada |
| 2026-11-08 | Salas pared con pared, muros de 1-2 tiles irregulares y pasillos de 0-3 tiles. | human:simon | aceptada |
| 2026-11-08 | Pasillos anchos de 2 tiles ocasionales, en ~1 de cada 3 mapas. | human:simon | aceptada |
| 2026-11-08 | Puerta decorativa en cada hueco, acorde a la zona, sin reglas de bloqueo. | human:simon | aceptada |
| 2026-11-08 | Un solo material de muro por ahora; el estilo viene de la geometría. | human:simon | aceptada |
| 2026-11-08 | Validar el estilo en `EXP-004` antes de fijar el algoritmo y las tareas. | human:simon | aceptada |
| 2026-11-08 | El modelo de sala pasa a máscara de celdas conservando la caja de límites. | requirements-writer | aceptada en v4 |
| 2026-11-08 | La nueva implementación se llamará `chambers` y se seleccionará explícitamente. | requirements-writer | sustituida: variante `growth` |
| 2026-11-09 | Puertas con dos muros en la línea, suelo a ambos lados y conexión entre dos salas distintas; sustituye la puerta en cada hueco. | human:simon | aceptada |
| 2026-11-09 | Separación global Chebyshev ≥3 y máximo una puerta por pasillo; ninguna en pasillo ancho. | human:simon | aceptada |
| 2026-11-09 | Si no hay posición válida, boca abierta con aviso; nunca una puerta inválida. | human:simon | aceptada |
| 2026-11-09 | Mínimo global de 3 salas; normales 4-6; caverna 3 (caverna + 2 anexas). | human:simon | aceptada |
| 2026-11-09 | La entrada y la salida de nivel se definen en `REQ-013`; este generador reserva el tile de salida. | human:simon | aceptada |
| 2026-11-09 | `growth` es el método elegido y pasa a generador por defecto en producción; BSP queda como alternativa inyectable. | human:simon | aceptada |
| 2026-11-09 | Configuración candidata registrada en `EXP-004`: semilla 2738263054, 22×18, 5 salas, salas 3-8, pasillo 3, ancho 33 %, muro 1, caverna 15 %, spawn 6, 6 jugadores y `exitMode` random. | human:simon | aceptada |
| 2026-11-09 | Módulos por variante, import estático de `growth` y build de producción sin `experiments/` ni variantes descartadas. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] Los requisitos son verificables.
- [x] Está claro el fuera de alcance.
- [x] No hay contradicciones abiertas; las sustituciones de `REQ-003` y
      `REQ-009` se registran en `REQ-012`.
- [x] Las dependencias están claras.
- [x] Hay un experimento definido (`EXP-004`) antes de las tareas de
      implementación.
- [x] La hoja tiene versión y fecha.
