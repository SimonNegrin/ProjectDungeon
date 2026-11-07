---
type: Requirement Sheet
id: REQ-003
title: Generación procedural del mapa y colocación de muros
description: Mapa 32×32 generado por semilla con salas variadas, pasillos rectos y con esquinas, huecos para puertas y muros con los tiles top/side correctos.
status: stable
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-07T17:35:33Z
updated_at: 2026-11-07T17:43:55Z
related_tasks: [TASK-0007]
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T17:35:33Z }
verified:
  - by: human:simon
    at: 2026-11-07T17:43:55Z
    note: Aprueba REQ-003 v1; el algoritmo se decide con EXP-001.
---

# Contexto

El primer hito jugable usa una sala fija de 20×20. `REQ-002` ya fijó el marco
16:9, el sub-viewport cuadrado de 12×12 tiles, la cámara y el HUD. El siguiente
paso es que cada partida se juegue en una mazmorra generada a partir de una
semilla, sin dejar de ser un tablero táctico legible.

La mazmorra debe tener salas grandes y pequeñas, pasillos rectos y con esquinas,
y huecos reservados para puertas. Las puertas abiertas/cerradas y las escaleras
quedan fuera de este corte, pero el modelo de mapa debe guardar la información
necesaria para añadirlas después.

El algoritmo exacto se decide con `EXP-001`. Esta hoja fija las propiedades que
debe cumplir cualquier variante y los valores de sensación que el usuario ya ha
elegido.

# Objetivos de experiencia

- Cada semilla produce una mazmorra distinta, pero reconocible y navegable.
- El recorrido se lee como un laberinto con ramificaciones, no como un
  laberinto ciego ni como una sala vacía.
- Hay sitios claros donde poner puertas sin rehacer el mapa.
- Los muros se ven correctos: la cara vertical solo aparece donde toca y no hay
  huecos ni parches aleatorios.
- El jugador explora, encuentra al enemigo y puede planificar el camino sin
  perderse.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | El mapa mide 32×32 tiles en este corte. El tamaño es un parámetro interno para poder añadir dificultades más adelante sin reescribir el generador. | El mapa generado mide 32×32; el generador acepta `mapWidth`/`mapHeight` y los tests pueden generar 24×24 y 40×40 sin cambios de código. |
| R-002 | Hay entre 8 y 12 salas rectangulares, no solapadas y separadas por al menos 1 tile de muro. Al menos 2 son grandes (7×7 a 11×11) y al menos 3 son pequeñas (3×3 a 5×5); el resto son medianas (6×6 a 8×8). | Un validador cuenta las salas y comprueba tamaños, solapes y separación. Con la semilla de referencia se cumple el mínimo de grandes y pequeñas. |
| R-003 | Los pasillos tienen 1 tile de ancho, recorrido ortogonal y conectan todas las salas. Hay al menos un tramo recto de 5 tiles o más y al menos un pasillo con dos o más esquinas (L o Z). | El validador mide tramos y esquinas; el grafo de salas es conexo. No hay pasillos diagonales ni pasos de 2 tiles. |
| R-004 | La estructura es mayormente en árbol, con 1 a 3 conexiones extra (bucles) para evitar backtracking excesivo. Los callejones sin salida, si existen, no superan 4 tiles desde la última bifurcación. | El validador compara el número de conexiones con el árbol de expansión: 1-3 extra. Ningún callejón supera 4 tiles. |
| R-005 | Cada sala tiene entre 1 y 3 huecos de puerta en sus accesos. Un hueco es un tile de suelo en el paso entre sala y pasillo, con muro a ambos lados perpendiculares al paso, y no está en una esquina. Se guarda su orientación (`horizontal` o `vertical`). | Un validador recorre cada hueco: hay muro en los dos lados correctos, no es esquina, no se repite y la orientación coincide con el eje del muro. El total es la suma de accesos de las salas. |
| R-006 | Las puertas no se renderizan ni bloquean el paso en este corte. Los huecos son transitables y se muestran solo en la capa de debug. | Se puede caminar por un hueco; el render normal no dibuja puerta; `F1` los marca. |
| R-007 | El jugador aparece en una sala con al menos una salida. El enemigo aparece en la sala con mayor distancia de camino desde la del jugador, nunca en la misma sala. La distancia de camino mínima es 12 tiles y el enemigo queda fuera del viewport inicial de 12×12. | Un BFS confirma distinta sala, distancia ≥12 y enemigo fuera del rectángulo inicial de cámara. Ambos aparecen sobre suelo, no sobre un hueco de puerta. |
| R-008 | Los muros usan la regla por borde: la cara vertical (`wallSide1`) se usa solo en un tile de muro que tiene suelo transitable al sur; el resto usa la tapa horizontal (`wallTop`). `wallSide2` queda reservado y no se usa en este corte. | Un test por tabla cubre las combinaciones de vecinos; solo hay `wallSide1` cuando el sur es suelo; `wallSide2` no aparece en ningún mapa. |
| R-009 | Los suelos usan variantes deterministas (`floor1`, `floor2`, `floor3`) que no cambian entre frames ni entre partidas con la misma semilla. | Dos renders del mismo estado son idénticos; no se usa `Math.random` en el render. |
| R-010 | El mapa está cerrado por muro en todo el borde. La cámara sigue limitada a los bordes y no se ve suelo fuera del mapa. | El borde es muro en las cuatro direcciones; los tests de cámara de `REQ-002` siguen pasando. |
| R-011 | La capa de debug muestra semilla, límites de salas, huecos de puerta y puntos de aparición. Está oculta por defecto y no altera la partida. | `F1` alterna la capa; con ella activa se leen los datos; al desactivarla el juego se ve igual que sin ella. |
| R-012 | El modelo guarda las salas con identificador, límites y accesos, y no genera ni renderiza escaleras. Al menos una sala hoja queda identificable para una futura escalera. | El estado serializado incluye `rooms` y sus accesos; no hay tiles ni entidades de escalera. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | La generación es una función pura, determinista y sin DOM en `src/game/`. Recibe semilla y opciones y devuelve rejilla, salas, huecos de puerta y apariciones. | `generateDungeon(seed, options)` no importa nada de `src/host/`, no usa `Math.random`, `Date.now` ni `performance.now` y se puede ejecutar en Vitest sin jsdom. |
| T-002 | El generador usa un PRNG local sembrado con un entero de 32 bits. La misma semilla y opciones producen exactamente el mismo mapa en cualquier ejecución y plataforma. | Dos llamadas con la misma semilla devuelven estructuras profundamente iguales; semillas distintas producen al menos una diferencia estructural. |
| T-003 | El estado sigue siendo serializable. El modelo de mapa incluye `seed`, `rooms`, `doors` y `spawns`, y `window.__game` los expone en el snapshot. | `JSON.parse(JSON.stringify(snapshot))` conserva los datos y los tests pueden leerlos. |
| T-004 | Hay validadores puros y tests para conectividad, tamaños de sala, pasillos, bucles, huecos, apariciones y muros. | Vitest cubre cada criterio con al menos un caso positivo y uno negativo; no se debilitan tests existentes. |
| T-005 | La selección de tile de muro es una función pura y testeable, separada del render. | `wallTileFor(grid, x, y)` se prueba con una tabla de casos; el renderer solo consume el resultado. |
| T-006 | La semilla se puede fijar por URL (`?seed=<entero>`). Sin parámetro se usa una semilla por defecto documentada. `R` reinicia con la misma semilla; `F2` genera una semilla nueva en modo debug. | E2E: dos cargas con la misma URL producen el mismo snapshot; `R` conserva la semilla; `F2` la cambia y regenera. |
| T-007 | La generación de 32×32 no bloquea el arranque ni el render. Objetivo: menos de 100 ms en el entorno de CI y 60 fps estables. | Test de rendimiento con umbral holgado y medición registrada en el artefacto; el E2E no detecta tirones. |
| T-008 | Se mantienen el marco 16:9, el viewport 12×12, la cámara, el HUD y el feedback de `REQ-002`. | Los tests de `REQ-002` y el E2E de encuadre siguen pasando; solo cambian mapa, aparición y debug. |
| T-009 | No se añaden dependencias nuevas. El PRNG y los validadores son código local. | `package.json` no incorpora dependencias de generación. |
| T-010 | La capa de debug y los atajos viven en el host; el motor no conoce teclas ni Canvas. | El motor no importa input, Canvas ni DOM; `F1`/`F2` se resuelven en `src/host/`. |

# Requisitos no funcionales

- **Rendimiento:** generación de 32×32 por debajo de 100 ms en CI; render a 60 fps
  con el viewport actual.
- **Accesibilidad:** el mapa y los muros deben leerse con contraste suficiente;
  la capa de debug no debe tapar la información principal.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin red, sin persistencia y sin datos personales.
- **Mantenibilidad:** generador, validadores y render separados; tipos claros;
  sin ECS ni motor genérico.

# Dependencias

- `REQ-002` cerrada: marco 16:9, viewport 12×12, cámara y HUD.
- [ADR-002](../decisions/ADR-002-stack.md): TypeScript, Vite y Canvas 2D.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): tiles y sprites
  de 32rogues.
- `EXP-001`: experimento comparativo para elegir el algoritmo.
- Las tareas de producción se crean después de aprobar esta hoja y cerrar
  `EXP-001`.

# Experimento propuesto: EXP-001

**Pregunta:** ¿Qué generador produce la mazmorra legible, variada y con los
pasillos y huecos de puerta que queremos?

**Variantes** (misma semilla y mismos parámetros):

| Variante | Enfoque | Tradeoff |
|---|---|---|
| A | BSP: partición recursiva, salas en hojas y pasillos en L/Z entre salas. | Estructura clara y salas variadas; puede sentirse jerárquica. |
| B | Salas colocadas al azar + árbol de expansión + pasillos en L/Z + bucles. | Más orgánico; riesgo de espacios vacíos y pasillos largos. |
| C | Híbrido: salas + relleno laberíntico entre ellas + bucles. | Más sensación de mazmorra; más difícil de leer y de validar. |

**Parámetros compartidos:** semilla, `mapSize = 32`, `roomTarget = 10` (8-12),
`roomMin = 3`, `roomMax = 11`, `corridorWidth = 1`, `loopRatio = 20 %` (0-40 %),
`showDoors = true`.

**Métricas:** número de salas; mínimo/mediana/máximo de área; porcentaje de
suelo; pasillos y esquinas; callejones; bucles; huecos de puerta; conectividad;
distancia de camino jugador→enemigo; tiempo de generación.

**Criterio de decisión:** la variante que produzca salas grandes y pequeñas
reconocibles, pasillos con esquinas sin laberinto ciego y huecos de puerta
claros, con conectividad total. La decisión se registra en el JSON del shell y
actualiza esta hoja a v2.

**Nota:** el experimento usa la regla de muros por borde ya elegida para que la
comparación se vea con el aspecto real. No decide la regla de muros.

# Fuera de alcance

- Puertas abiertas/cerradas, llaves, cerraduras, puertas secretas y trampas.
- Escaleras, varios niveles y transiciones entre niveles.
- Varios enemigos, cambios de IA, niebla de guerra, iluminación, minimapa,
  props, tesoro y objetos.
- Selector de dificultad en la UI; solo se deja el tamaño como parámetro interno.
- Arte y audio finales; tiles nuevos que no estén ya en 32rogues.
- Cambios en la economía de turno, el combate o el HUD.
- Guardado, carga y persistencia.

# Preguntas abiertas

- ¿Qué variante de `EXP-001` gana? La hoja ya está aprobada; la variante se
  registrará en la v2.
- Los rangos de salas, bucles y distancia de aparición son objetivos de la v1;
  `EXP-001` puede ajustarlos si la sensación no funciona.
- Se propone `F2` para generar una semilla nueva y `F1` para la capa de debug.
  Confirmar si esos atajos son cómodos o si se prefiere otro control.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-07 | Mapa de 32×32, con el tamaño como parámetro interno para futuras dificultades. | human:simon | aceptada |
| 2026-11-07 | El algoritmo se elige con un experimento comparativo (`EXP-001`), no en abstracto. | human:simon | aceptada |
| 2026-11-07 | Sensación "legible con ramificaciones": pasillos de 1 tile, mayoría en árbol, 1-3 bucles y callejones cortos. | human:simon | aceptada |
| 2026-11-07 | Regla de muros por borde: cara vertical solo con suelo al sur; tapa horizontal en el resto. | human:simon | aceptada |
| 2026-11-07 | Jugador en una sala y enemigo en la sala más lejana por camino. | human:simon | aceptada |
| 2026-11-07 | Reservar `wallSide2` y no alternarlo; usarlo solo si una tarea futura le da un propósito. | requirements-writer | propuesta |
| 2026-11-07 | Semilla por URL, `R` conserva la semilla y `F2` genera una nueva en debug. | requirements-writer | propuesta |
| 2026-11-07 | Se aprueba `REQ-003` v1. El algoritmo se decide con `EXP-001` y la variante elegida actualizará la hoja a v2. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha descrito las decisiones creativas.
- [x] El usuario ha aprobado la hoja completa.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar un grafo de tareas: `TASK-0007` construye `EXP-001` y
      las tareas de producción esperan la decisión.
- [x] No hay contradicciones abiertas.
