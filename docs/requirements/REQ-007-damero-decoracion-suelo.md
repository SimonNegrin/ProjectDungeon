---
type: Requirement Sheet
id: REQ-007
title: Damero de suelo y decoración no bloqueante
description: Suelo a cuadros de dos tonos en toda la superficie transitable y decoración plana del tileset que no bloquea, sin cambiar reglas, muros ni generación.
status: stable
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-08T11:55:58Z
updated_at: 2026-11-08T11:55:58Z
related_tasks: [TASK-0021, TASK-0022]
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:55:58Z }
verified:
  - by: human:simon
    at: 2026-11-08T11:55:58Z
    note: >-
      Aprueba el damero global 1×1, el tinte sutil, la decoración plana en salas
      y pasillos, las densidades 12-18 % y 6-8 %, la protección de apariciones y
      umbrales, y mantener los muros sin cambios.
---

# Contexto

Hoy el suelo de la mazmorra usa tres variantes de `stone floor` elegidas de forma
pseudoaleatoria por tile (`floorTileFor`). Las tres comparten el mismo fondo
oscuro y solo cambian las piedritas, así que una sala grande se lee como una
superficie homogénea: cuesta contar casillas, estimar distancias y distinguir el
tamaño de una sala.

El tileset 32rogues no tiene un par de suelos de piedra claro/oscuro; sus suelos
comparten la base `#0c1317`. Por eso el damero se consigue con una **capa de
presentación** sobre la piedra existente: un tinte sutil en la paridad alterna,
sin modificar el PNG. Además, el pack tiene decals planos con transparencia
(suciedad, huesos, sangre, hierba y setas) pensados para superponerse; este corte
los usa como decoración no bloqueante.

La hoja no cambia el motor, la generación, los muros, las colisiones ni la
economía de turno. Los objetos que bloquean el paso quedan para un requisito
posterior.

# Objetivos de experiencia

- Contar tiles de un vistazo y calcular distancias sin perder la cuenta.
- Leer el tamaño y la forma de una sala por su patrón de suelo.
- Distinguir una sala de un pasillo incluso en los bordes del viewport.
- Dar ambiente a la mazmorra sin que la decoración tape la lectura del suelo.
- No confundir un decal con un obstáculo: todo lo decorado se puede pisar.
- Mantener la nitidez del pixel art y el protagonismo del camino y el cursor.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | El suelo transitable lleva un damero de 1 tile por casilla, con paridad global `(x + y) % 2`. Se aplica a salas, pasillos y umbrales; los muros y tiles no transitables no llevan damero. | Dos tiles ortogonalmente adyacentes tienen tonos distintos; la paridad no cambia con la cámara, la sala ni la semilla; todos los tiles de suelo reciben damero. |
| R-002 | Los dos tonos salen de la piedra del tileset más un tinte de presentación en una de las paridades, aclarado ~10 % hacia gris-azul. No se modifica el PNG. | A 1280×720 se distinguen los dos tonos sin ampliar; en escala de grises el damero sigue visible (diferencia de luminancia, no solo de tono); el camino verde/ámbar y el cursor siguen siendo lo más visible; no cambia ningún archivo de `public/assets/`. |
| R-003 | La textura de piedra se conserva. Las variantes de piedritas pueden seguir existiendo, pero no alteran la paridad ni el tono. | Un tile de paridad A siempre tiene el mismo tono, sea cual sea su variante; no hay tiles con el tono cambiado. |
| R-004 | La decoración usa solo decals planos del tileset: suciedad/piedritas, huesos y restos, sangre/slime, hierba y setas. No se usan objetos que parezcan sólidos o interactivos. | El render solo dibuja recuadros de la lista aprobada; no aparece ningún cofre, barril, vasija, ataúd, roca, árbol, cultivo, escalera, foso, placa, pinchos ni trampilla. |
| R-005 | La densidad objetivo es 12-18 % de los tiles elegibles en salas y 6-8 % en pasillos. Hay como máximo un decal por tile. Nunca se decora una casilla de aparición ni un umbral de puerta. | En la semilla de referencia `279837264`, la proporción medida queda en los rangos; ningún tile tiene más de un decal; no hay decals en `map.spawns` ni en `map.doors`; dos ejecuciones con la misma semilla dan la misma lista. |
| R-006 | La decoración es solo presentación: no cambia `state.grid.tiles`, no bloquea el paso y no añade reglas de colisión ni de camino. | `state.grid.tiles` no cambia al renderizar; los tests de motor, camino y colisiones siguen pasando; un `MoveTo` puede terminar en un tile decorado. |
| R-007 | El damero y la decoración son deterministas: misma semilla y mapa producen el mismo resultado; otra semilla cambia la decoración pero no el damero. | Dos renders de la misma semilla son idénticos; con otra semilla el damero se mantiene y al menos un decal cambia. |
| R-008 | Orden de capas: base de suelo → tinte → decals → camino y cursor → unidades → HUD. La decoración queda siempre por debajo de lo que el jugador necesita leer. | El camino y el cursor se ven por encima de los decals; las unidades se dibujan por encima; ningún decal tapa un muro, el HUD o un overlay. |
| R-009 | Los muros no cambian en este corte: ni variedad, ni tono, ni regla de selección. | El diff de `wallTileFor` está vacío; las capturas muestran los mismos muros que antes. |

## Mezcla inicial propuesta

Propuesta ajustable en playtest; no es un requisito cerrado. Sirve como punto de
partida para la implementación:

| Familia | Peso |
|---|---:|
| Suciedad y piedritas | 40 % |
| Hierba | 20 % |
| Huesos y restos | 15 % |
| Sangre y slime | 15 % |
| Setas | 10 % |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | La lógica de damero y decoración vive en un módulo puro del host (por ejemplo `src/host/floor.ts`): paridad, configuración de tinte, lista blanca de decals, densidades y hash determinista. No conoce DOM, Canvas ni relojes. | Tests unitarios importan el módulo sin DOM; la paridad y la selección de decals son funciones puras. |
| T-002 | `renderScene` dibuja base, tinte y decals. Usa `state.map.rooms`, `state.map.doors` y `state.map.spawns` para clasificar tiles y excluir zonas. Si no hay mapa, aplica el damero y no dibuja decoración. | Tests del renderer con un contexto falso comprueban el orden de dibujo; el fallback sin mapa es determinista; no hay `Math.random` por frame. |
| T-003 | Los recuadros de los decals se añaden a `src/host/assets.ts` desde `tiles.png` (filas 7.e-g, 8.e-g, 9.e-g, 10.e-g, 11.e-g, 21.a-b, 22.a-b y 23.a-d). No se añaden archivos ni se modifican PNG. | Los recuadros son de 32×32 y caen en la rejilla real; la QA visual muestra el sprite correcto; licencia y créditos no cambian. |
| T-004 | El tinte se compone como una capa translúcida sobre el tile de suelo, antes de los decals. No se copia ni se recolorea el PNG; los valores viven en una única configuración. | Una captura sin decals muestra el damero; el tinte no afecta a muros ni a decals; no hay suavizado ni posiciones fraccionarias. |
| T-005 | El hash de decoración usa semilla, coordenada y una sal para cada familia. No usa `Math.random`, `Date.now` ni estado global mutable. | Tests con la misma entrada producen la misma salida; dos mapas con la misma semilla coinciden; no se lee el reloj. |
| T-006 | `window.__game.snapshot()` expone un resumen de solo lectura de la decoración (posiciones, tipo y área sala/pasillo) para que el E2E compruebe densidad y exclusiones. No expone mutadores. | El snapshot es determinista y coincide con lo dibujado; dos llamadas seguidas devuelven lo mismo; no muta el estado. |
| T-007 | Tests nuevos: paridad, tinte, lista blanca, densidades en la semilla de referencia, exclusiones de apariciones/umbrales, máximo un decal por tile, determinismo, fallback sin mapa y no bloqueo. No se borran, saltan ni debilitan tests existentes. | `pnpm run verify` pasa; los tests existentes conservan su intención. |
| T-008 | Se registra `ADR-010` con la decisión de damero por tinte y decoración de presentación, y se actualizan alcance, glosario, arquitectura, índices y log. `ADR-006` se matiza: el tinte es una capa de presentación, no una modificación del asset. | El ADR existe y está enlazado; `pnpm run docs:check` pasa; no quedan referencias vigentes contradictorias. |
| T-009 | No se modifica `src/game/`, no se añaden dependencias y no se importa código de `experiments/` desde producción. | El diff de `src/game/` está vacío; `package.json` y `pnpm-lock.yaml` no cambian. |

# Requisitos no funcionales

- **Rendimiento:** objetivo de 60 fps; el viewport muestra 13×13 tiles (169). El
  coste extra es un tinte por tile alterno y un decal en ~15 % de los tiles; debe
  ser despreciable frente al render actual. Medir antes y después.
- **Accesibilidad:** los dos tonos se diferencian por luminancia, no solo por
  tono, para que el damero se lea en escala de grises o con daltonismo. El color
  no es la única señal de juego: camino, cursor y HUD siguen funcionando igual.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables. Sin red ni persistencia.
- **Seguridad:** sin datos personales, sin red y sin nuevas dependencias.
- **Mantenibilidad:** una configuración de tinte, una lista blanca de decals y un
  hash; el motor sigue sin conocer arte ni presentación.

# Dependencias

- [REQ-005](REQ-005-viewport-impar-13.md): viewport de 13×13 y cámara.
- [REQ-006](REQ-006-movimiento-animado.md): presentación animada; las unidades y
  la cámara se dibujan sobre el suelo y la decoración.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): arte placeholder
  32rogues y sus límites de uso.
- [ADR-007](../decisions/ADR-007-map-generator.md): `MapGenerator` y datos de
  salas, pasillos, puertas y apariciones.
- [ADR-008](../decisions/ADR-008-presentacion-animada.md): capas de presentación
  sobre un motor atómico.
- `ADR-010`: damero por tinte y decoración de presentación.
- `src/host/renderer.ts`, `src/host/assets.ts` y `src/host/debug.ts` son los
  puntos de integración previstos.

# Fuera de alcance

- Objetos que bloquean el paso, interacción, cofres, barriles, vasijas, ataúdes,
  rocas, árboles, cultivos, escaleras, fosos, placas, pinchos y trampillas.
- Cambios en muros, iluminación, sombras, partículas o decoración animada.
- Codificar roles de sala por color, reiniciar el damero por sala o usar cuadros
  de 2×2.
- Decoración sobre muros o fuera de tiles transitables.
- Cambiar pathfinding, coste, MP, acción, turnos, combate o generación.
- Hotseat, red, controladores remotos, guardado o persistencia.

# Preguntas abiertas

No hay decisiones creativas bloqueantes. Quedan como ajustes de playtest:

- Valor exacto del tinte y de la mezcla de decals dentro de los rangos aprobados.
- Si el damero tapa demasiado la textura, bajar el tinte; si no se lee a
  1280×720, subirlo sin convertirlo en un tablero de alto contraste.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-08 | Damero de 1×1 con paridad global por coordenadas en todo el suelo transitable. | human:simon | aceptada |
| 2026-11-08 | Dos tonos con tinte de presentación sutil sobre la piedra; sin modificar el PNG. | human:simon | aceptada |
| 2026-11-08 | Damero en salas, pasillos y umbrales. | human:simon | aceptada |
| 2026-11-08 | Decoración solo con decals planos: suciedad, huesos, sangre/slime, hierba y setas. | human:simon | aceptada |
| 2026-11-08 | Densidad media en salas (12-18 %) y baja en pasillos (6-8 %). | human:simon | aceptada |
| 2026-11-08 | Sin decoración en apariciones ni umbrales; máximo un decal por tile. | human:simon | aceptada |
| 2026-11-08 | Los muros no cambian en este corte. | human:simon | aceptada |
| 2026-11-08 | Composición solo en el host; el motor, las colisiones y la generación no cambian. | human:simon | aceptada |
| 2026-11-08 | Registrar `ADR-010`; el tinte matiza `ADR-006` como capa de presentación. | deepseek/v4.1-flash | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado el alcance y las decisiones creativas.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar el grafo de tareas.
- [x] Está claro el fuera de alcance.
- [x] No hay contradicciones abiertas: `ADR-010` matiza `ADR-006` sin modificar
      el asset.
- [x] Las tareas `TASK-0021` y `TASK-0022` están planificadas.
