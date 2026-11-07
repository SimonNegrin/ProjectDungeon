---
type: Requirement Sheet
id: REQ-003
title: Generación procedural del mapa y colocación de muros
description: Mapa 32×32 generado por semilla con BSP, salas variadas, pasillos estrechos y anchos, huecos para puertas y muros con los tiles top/side correctos.
status: stable
version: 2
decision_owner: human:simon
review_required: true
created_at: 2026-11-07T17:35:33Z
updated_at: 2026-11-07T23:50:11Z
related_tasks: [TASK-0007, TASK-0008, TASK-0009, TASK-0010, TASK-0011]
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T23:50:11Z }
verified:
  - by: human:simon
    at: 2026-11-07T17:43:55Z
    note: Aprueba REQ-003 v1; el algoritmo se decide con EXP-001.
  - by: human:simon
    at: 2026-11-07T22:11:52.376Z
    note: Decide A (BSP) en EXP-001.
  - by: human:simon
    at: 2026-11-07T22:17:27Z
    note: Aprueba la v2 con pasillos anchos de 2 tiles (1-2 según semilla), cada sala con al menos un acceso estrecho con puerta y validación directa en playtest.
  - by: human:simon
    at: 2026-11-07T23:37:14Z
    note: "Aprueba el playtest del mapa generado: salas, muros, pasillos anchos, cámara, debug y HUD. REQ-003 completada."
---

# Contexto

El primer hito jugable usa una sala fija de 20×20. `REQ-002` ya fijó el marco
16:9, el sub-viewport cuadrado de 12×12 tiles, la cámara y el HUD. El siguiente
paso es que cada partida se juegue en una mazmorra generada a partir de una
semilla, sin dejar de ser un tablero táctico legible.

`EXP-001` comparó tres generadores y el usuario eligió **A · BSP**. La v2
incorpora esa decisión, encapsula el algoritmo tras una interfaz `MapGenerator`
y añade pasillos anchos de 2 tiles para combate táctico.

La mazmorra debe tener salas grandes y pequeñas, pasillos estrechos con puertas y
pasillos anchos sin puertas. Las puertas abiertas/cerradas, las barricadas, los
pasillos de 3 tiles y las escaleras quedan fuera de este corte, pero el modelo de
mapa debe guardar la información necesaria para añadirlos después.

# Objetivos de experiencia

- Cada semilla produce una mazmorra distinta, pero reconocible y navegable.
- El recorrido se lee como un laberinto con ramificaciones, no como un
  laberinto ciego ni como una sala vacía.
- Hay sitios claros donde poner puertas sin rehacer el mapa.
- Los pasillos anchos ofrecen espacio para dos unidades o una futura barricada,
  sin convertirse en salas ni en un laberinto.
- Los muros se ven correctos: la cara vertical solo aparece donde toca y no hay
  huecos ni parches aleatorios.
- El jugador explora, encuentra al enemigo y puede planificar el camino sin
  perderse.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | El mapa mide 32×32 tiles en este corte. El tamaño es un parámetro interno para poder añadir dificultades más adelante sin reescribir el generador. | El mapa generado mide 32×32; el generador acepta `mapWidth`/`mapHeight` y los tests pueden generar 24×24 y 40×40 sin cambios de código. |
| R-002 | Hay entre 8 y 12 salas rectangulares, no solapadas y separadas por al menos 1 tile de muro. Al menos 2 son grandes (7×7 a 11×11) y al menos 3 son pequeñas (3×3 a 5×5); el resto son medianas (6×6 a 8×8). La configuración de referencia del corte es 9 salas, sala mínima 4 y máxima 11. | Un validador cuenta las salas y comprueba tamaños, solapes y separación. Con la semilla `279837264` y la configuración de referencia se cumple el mínimo de grandes y pequeñas. |
| R-003 | Los pasillos de conexión tienen 1 tile de ancho y recorrido ortogonal; conectan todas las salas. Además, el mapa incluye entre 1 y 2 pasillos anchos de 2 tiles y al menos 4 tiles de longitud para combate táctico, según la semilla. Los pasillos anchos no llevan puertas y pueden ser rectos o con esquinas. Hay al menos un tramo recto de 5 tiles o más y al menos un pasillo con dos o más esquinas. | El validador distingue `narrow` y `wide`; hay 1-2 `wide` de 2 tiles y longitud ≥4; no hay puertas en `wide`; el grafo es conexo y no hay pasos diagonales. |
| R-004 | La estructura es mayormente en árbol, con 1 a 3 conexiones extra (bucles) para evitar backtracking excesivo. Un bucle puede ser un pasillo estrecho o ancho. Los callejones sin salida, si existen, no superan 4 tiles desde la última bifurcación. | El validador compara el número de conexiones con el árbol de expansión: 1-3 extra. Ningún callejón supera 4 tiles. |
| R-005 | Cada sala tiene entre 1 y 3 huecos de puerta en sus accesos de 1 tile. Al menos uno de sus accesos debe ser estrecho y tener hueco; los accesos anchos no generan hueco. Un hueco es un tile de suelo en el paso entre sala y pasillo, con muro a ambos lados perpendiculares al paso, y no está en una esquina. Se guarda su orientación (`horizontal` o `vertical`). | Un validador recorre cada hueco: hay muro en los dos lados correctos, no es esquina, no se repite y la orientación coincide con el eje del muro. Cada sala tiene al menos un hueco; ningún pasillo ancho tiene hueco. |
| R-006 | Las puertas no se renderizan ni bloquean el paso en este corte. Los huecos son transitables y se muestran solo en la capa de debug. | Se puede caminar por un hueco; el render normal no dibuja puerta; `F1` los marca. |
| R-007 | El jugador aparece en una sala con al menos una salida. El enemigo aparece en la sala con mayor distancia de camino desde la del jugador, nunca en la misma sala. La distancia de camino mínima es 12 tiles y el enemigo queda fuera del viewport inicial de 12×12. | Un BFS confirma distinta sala, distancia ≥12 y enemigo fuera del rectángulo inicial de cámara. Ambos aparecen sobre suelo, no sobre un hueco de puerta. |
| R-008 | Los muros usan la regla por borde: la cara vertical (`wallSide1`) se usa solo en un tile de muro que tiene suelo transitable al sur; el resto usa la tapa horizontal (`wallTop`). `wallSide2` queda reservado y no se usa en este corte. | Un test por tabla cubre las combinaciones de vecinos; solo hay `wallSide1` cuando el sur es suelo; `wallSide2` no aparece en ningún mapa. |
| R-009 | Los suelos usan variantes deterministas (`floor1`, `floor2`, `floor3`) que no cambian entre frames ni entre partidas con la misma semilla. | Dos renders del mismo estado son idénticos; no se usa `Math.random` en el render. |
| R-010 | El mapa está cerrado por muro en todo el borde. La cámara sigue limitada a los bordes y no se ve suelo fuera del mapa. | El borde es muro en las cuatro direcciones; los tests de cámara de `REQ-002` siguen pasando. |
| R-011 | La capa de debug muestra semilla, límites de salas, huecos de puerta, puntos de aparición y anchura de pasillos. Está oculta por defecto y no altera la partida. | `F1` alterna la capa; con ella activa se leen los datos; al desactivarla el juego se ve igual que sin ella. |
| R-012 | El modelo guarda las salas con identificador, límites, rol y accesos, y los pasillos con anchura, tipo y si admiten puerta. No genera ni renderiza escaleras. Al menos una sala hoja queda identificable para una futura escalera. | El estado serializado incluye `rooms` y `corridors`; no hay tiles ni entidades de escalera. |
| R-013 | El pasillo ancho es un espacio táctico: 2 tiles de ancho, entre 1 y 2 por mapa según la semilla, con al menos 4 tiles de longitud. No lleva puertas y no se implementan barricadas en este corte. | Una comprobación geométrica confirma dos columnas transitables adyacentes durante al menos 4 tiles; aparecen 1-2 pasillos anchos; no hay barricadas ni puertas en ellos. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | La generación es una función pura, determinista y sin DOM en `src/game/`. Recibe una semilla y opciones y devuelve un `GeneratedMap` con rejilla, salas, pasillos, huecos de puerta, apariciones y avisos. | `generate(...)` no importa nada de `src/host/`, no usa `Math.random`, `Date.now` ni `performance.now` y se puede ejecutar en Vitest sin jsdom. |
| T-002 | El generador usa un PRNG local sembrado con un entero de 32 bits. La misma semilla y opciones producen exactamente el mismo mapa en cualquier ejecución y plataforma. | Dos llamadas con la misma semilla devuelven estructuras profundamente iguales; semillas distintas producen al menos una diferencia estructural. |
| T-003 | El estado sigue siendo serializable. El modelo de mapa incluye `seed`, `rooms`, `corridors`, `doors` y `spawns`, y `window.__game` los expone en el snapshot. | `JSON.parse(JSON.stringify(snapshot))` conserva los datos y los tests pueden leerlos. |
| T-004 | Hay validadores puros y tests para conectividad, tamaños y roles de sala, pasillos estrechos y anchos, bucles, huecos, apariciones y muros. | Vitest cubre cada criterio con al menos un caso positivo y uno negativo; no se debilitan tests existentes. |
| T-005 | La selección de tile de muro es una función pura y testeable, separada del render. | `wallTileFor(grid, x, y)` se prueba con una tabla de casos; el renderer solo consume el resultado. |
| T-006 | La semilla se puede fijar por URL (`?seed=<entero>`). Sin parámetro se usa una semilla por defecto documentada. `R` reinicia con la misma semilla; `F2` genera una semilla nueva en modo debug. | E2E: dos cargas con la misma URL producen el mismo snapshot; `R` conserva la semilla; `F2` la cambia y regenera. |
| T-007 | La generación de 32×32 no bloquea el arranque ni el render. Objetivo de producción: menos de 100 ms en CI con la semilla de referencia y 60 fps estables. La maqueta de `EXP-001` midió 250,9 ms para A; la implementación de producción debe optimizarse sin cambiar la estructura. | Test de rendimiento con umbral holgado y medición registrada; el E2E no detecta tirones. |
| T-008 | Se mantienen el marco 16:9, el viewport 12×12, la cámara, el HUD y el feedback de `REQ-002`. | Los tests de `REQ-002` y el E2E de encuadre siguen pasando; solo cambian mapa, aparición y debug. |
| T-009 | No se añaden dependencias nuevas. El PRNG y los validadores son código local. | `package.json` no incorpora dependencias de generación. |
| T-010 | La capa de debug y los atajos viven en el host; el motor no conoce teclas ni Canvas. | El motor no importa input, Canvas ni DOM; `F1`/`F2` se resuelven en `src/host/`. |
| T-011 | La generación se encapsula tras una interfaz `MapGenerator` inyectable, con `BspMapGenerator` como implementación por defecto. El motor depende de la interfaz, no de BSP. | `MapGenerator` expone `id` y `generate(seed, options): GeneratedMap`; `createInitialState` acepta un generador y usa `BspMapGenerator` por defecto; un stub determinista puede sustituirlo en tests sin tocar el motor. Ver [ADR-007](../decisions/ADR-007-map-generator.md). |
| T-012 | El modelo de corredor incluye `width`, `kind` (`narrow`/`wide`), `doorEligible` y `path`. Los huecos de puerta solo se calculan sobre corredores estrechos. | El validador comprueba que ningún `Door` cae en un corredor `wide` y que todo corredor `wide` tiene `doorEligible: false`. |
| T-013 | BSP selecciona 1-2 conexiones con holgura suficiente, las ensancha a 2 tiles y las etiqueta como `wide`. El ensanchado no rompe salas ni deja suelo inaccesible, y cada sala conserva al menos un acceso estrecho con hueco. | Tests con semillas de referencia y alternativas comprueban anchura, longitud, conectividad y que cada sala tiene al menos un hueco. Si no hay holgura, el generador elige otra conexión o añade espacio sin falsear el resultado. |

# Requisitos no funcionales

- **Rendimiento:** generación de 32×32 por debajo de 100 ms en CI; render a 60 fps
  con el viewport actual.
- **Accesibilidad:** el mapa y los muros deben leerse con contraste suficiente;
  la capa de debug no debe tapar la información principal.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin red, sin persistencia y sin datos personales.
- **Mantenibilidad:** generador tras interfaz, validadores y render separados;
  tipos claros; sin ECS ni motor genérico.

# Dependencias

- `REQ-002` cerrada: marco 16:9, viewport 12×12, cámara y HUD.
- [ADR-002](../decisions/ADR-002-stack.md): TypeScript, Vite y Canvas 2D.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): tiles y sprites
  de 32rogues.
- [ADR-007](../decisions/ADR-007-map-generator.md): interfaz `MapGenerator`
  inyectable.
- `EXP-001` decidido: A · BSP con semilla `279837264` y parámetros `9/4/11/20`.
- `TASK-0007` construyó el experimento; las tareas de producción se crean
  después de aprobar esta v2.

# Resultado de EXP-001

`EXP-001` decidió **A · BSP** con semilla `279837264` y parámetros `9/4/11/20`
(`roomTarget 9`, `roomMin 4`, `roomMax 11`, `loopRatio 20 %`). La implementación
queda tras `MapGenerator` (`T-011`) y los pasillos anchos en `R-003`, `R-013` y
`T-013`. La comparativa A/B/C, el motivo del usuario y las preguntas que
incorpora la v2 están en el [anexo de EXP-001](REQ-003-anexo-exp-001.md), que es
informativo y no normativo.

# Fuera de alcance

- Puertas abiertas/cerradas, llaves, cerraduras, puertas secretas y trampas.
- Barricadas y objetos tácticos; solo se reserva el espacio del pasillo ancho.
- Puertas en pasillos anchos.
- Pasillos de 3 tiles; quedan para una dificultad futura.
- Escaleras, varios niveles y transiciones entre niveles.
- Varios enemigos, cambios de IA, niebla de guerra, iluminación, minimapa,
  props, tesoro y objetos.
- Selector de dificultad en la UI; solo se dejan tamaño y anchura como
  parámetros internos.
- Arte y audio finales; tiles nuevos que no estén ya en 32rogues.
- Cambios en la economía de turno, el combate o el HUD.
- Guardado, carga y persistencia.

# Preguntas abiertas

No hay preguntas bloqueantes. Los pasillos anchos quedan cerrados en 2 tiles,
1-2 por mapa según la semilla, sin puertas y con al menos un acceso estrecho por
sala. El ancho 3 queda fuera de este corte.

- Los rangos de salas, bucles y distancia de aparición son objetivos; la
  implementación puede ajustarlos si la sensación no funciona.
- `F2` para generar una semilla nueva y `F1` para la capa de debug son decisiones
  técnicas revisables; el usuario puede pedir otro control en el playtest.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-07 | Mapa de 32×32, con el tamaño como parámetro interno para futuras dificultades. | human:simon | aceptada |
| 2026-11-07 | El algoritmo se elige con un experimento comparativo (`EXP-001`), no en abstracto. | human:simon | aceptada |
| 2026-11-07 | Sensación "legible con ramificaciones": mayoría en árbol, 1-3 bucles y callejones cortos. | human:simon | aceptada |
| 2026-11-07 | Regla de muros por borde: cara vertical solo con suelo al sur; tapa horizontal en el resto. | human:simon | aceptada |
| 2026-11-07 | Jugador en una sala y enemigo en la sala más lejana por camino. | human:simon | aceptada |
| 2026-11-07 | Reservar `wallSide2` y no alternarlo; usarlo solo si una tarea futura le da un propósito. | requirements-writer | propuesta |
| 2026-11-07 | Semilla por URL, `R` conserva la semilla y `F2` genera una nueva en debug. | requirements-writer | propuesta |
| 2026-11-07 | Se aprueba `REQ-003` v1. El algoritmo se decide con `EXP-001`. | human:simon | aceptada |
| 2026-11-07 | `EXP-001`: se elige A · BSP con semilla `279837264` y parámetros `9/4/11/20`. | human:simon | aceptada |
| 2026-11-07 | Encapsular la generación tras `MapGenerator`; BSP es la implementación por defecto. | human:simon | aceptada |
| 2026-11-07 | Incluir 1-2 pasillos anchos de 2 tiles según la semilla, sin puertas, con al menos 4 tiles de longitud; cada sala conserva un acceso estrecho con hueco. | human:simon | aceptada |
| 2026-11-07 | El ancho 3 y las barricadas quedan fuera de este corte. | human:simon | aceptada |
| 2026-11-07 | Playtest aprobado: mapa generado, muros, pasillos anchos, cámara, debug y HUD. `REQ-003` completada. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha descrito las decisiones creativas.
- [x] El usuario ha aprobado la v1.
- [x] El usuario ha confirmado el alcance de los pasillos anchos y aprueba la v2.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar el grafo de tareas de BSP, pasillos anchos, integración y
      QA.
- [x] No hay contradicciones abiertas.
- [x] El usuario ha hecho el playtest y ha aprobado el mapa generado.
