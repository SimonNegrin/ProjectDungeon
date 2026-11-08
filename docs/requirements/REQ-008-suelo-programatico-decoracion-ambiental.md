---
type: Requirement Sheet
id: REQ-008
title: Suelo programático por sala y decoración ambiental
description: Damero de dos colores planos generado por código, con base común y segundo tono por sala, y decoración plana agrupada por ambientes, sin cambiar reglas ni bloquear.
status: stable
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-08T14:29:18Z
updated_at: 2026-11-08T14:29:18Z
related_tasks: [TASK-0023, TASK-0024]
supersedes: [REQ-007]
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T14:29:18Z }
verified:
  - by: human:simon
    at: 2026-11-08T14:29:18Z
    note: >-
      Aprueba el resumen: suelo programático plano con base común y segundo tono
      por sala, cinco paletas asignadas por contraste, densidad 35/16, máximo un
      decal por tile, siete plantas pequeñas y REQ-008 como hoja nueva.
---

# Contexto

`REQ-007` resolvió la legibilidad del suelo con un damero por tinte sobre los
tiles de piedra `10.b-d` y 23 decals planos, con densidades de 15 % en salas y
7 % en pasillos. El resultado cumple, pero deja cuatro problemas:

- El tile de piedra tiene dibujo y compite con la decoración; el damero no
  controla del todo el contraste.
- El tinte no permite dar identidad a una sala sin cambiar el PNG.
- La decoración es escasa y no crea ambientes; el escenario se lee vacío.
- La lista de decals actual tiene las filas 9 y 10 mal etiquetadas: la fila 9 es
  tierra y la 10 es piedra/ladrillo, pero se usan como huesos y tierra.

Este corte sustituye la capa visual del suelo y amplía la decoración. No cambia
el motor, la generación, los muros, las colisiones, el camino ni la economía de
turno.

# Objetivos de experiencia

- Contar tiles y calcular distancias de un vistazo.
- Leer el tamaño y la forma de una sala por su patrón de suelo.
- Distinguir una sala de un pasillo y dar identidad a cada sala.
- Sentir ambientes distintos: humedad, muerte/combate, ruina, vegetación.
- No confundir un decal con un obstáculo: todo lo decorado se puede pisar.
- Mantener la nitidez del pixel art y el protagonismo del camino y el cursor.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | El suelo transitable usa un damero global de 1 tile por casilla, con paridad `(x + y) % 2`. Se aplica a salas, pasillos y umbrales; muros y tiles no transitables no lo reciben. | Dos tiles ortogonalmente adyacentes alternan color; la paridad no cambia con la cámara, la sala ni la semilla; todo el suelo recibe damero. |
| R-002 | Los dos colores se generan por código como rellenos planos, sin recortar tiles de suelo del PNG. Modelo A: base común `#0d1519` para toda la mazmorra y un segundo tono por sala. | No se usa `floorTileFor` ni ningún recorte de suelo; el render pinta cada tile con un color plano; la base es la misma en todas las salas. |
| R-003 | Hay cinco paletas curadas: neutra `#16232b`, humedad `#142528`, muerte/combate `#2a2026`, ruina `#2b2419` y vegetación/abandono `#24261f`. La paleta se asigna por contraste con el ambiente, no por imitación. Los pasillos y umbrales usan la neutra. | La sala de muerte no usa suelo rojo; la de humedad no usa suelo verde; cada paleta tiene diferencia de luminancia simple (escala 0-255) ≥ 12 y se lee en escala de grises; el cambio de color ocurre al cruzar la puerta, no dentro de la sala. |
| R-004 | La decoración usa 33 sprites planos con fondo transparente: piedritas `7.e-g`, hierba `8.e-g`, tierra `9.e-g`, ladrillos azules `10.e-g`, huesos `11.e-g`, ladrillos rojos `12.e-g`, plantas `20.a`, `20.b`, `20.e`, `20.l`, `20.n`, `20.o`, `20.p`, setas `21.a-b`, cadáveres `22.a-b` y sangre/slime `23.a-d`. | Solo se dibujan esos recuadros; las familias se mapean por fila correcta (9 = tierra, 10 = ladrillo azul, 11 = huesos); no aparece ningún prop sólido, variante con fondo, cultivo alto ni árbol. |
| R-005 | La densidad objetivo es 35 % de los tiles elegibles en salas y 16 % en pasillos, con tolerancia de ±3. Hay como máximo un decal por tile. Nunca se decora una casilla de aparición ni un umbral de puerta. | En la semilla de referencia `279837264`, la proporción medida queda en 32-38 % en salas y 13-19 % en pasillos; ningún tile tiene más de un decal; no hay decals en `map.spawns` ni en `map.doors`. |
| R-006 | Cada sala recibe un ambiente dominante: humedad, muerte/combate, ruina, vegetación o mixta. El ambiente se materializa en 1-3 focos locales, con 20-30 % de decals de otra familia como mezcla. Algunas salas pueden ser solo dispersas, sin foco dominante. Los pasillos usan decoración mixta y no tienen foco. | Dos ejecuciones de la misma semilla dan los mismos ambientes y focos; se distinguen salas húmedas, de muerte, de ruina y de vegetación; ninguna sala queda uniforme ni todas las salas son iguales. |
| R-007 | La decoración es solo presentación: no cambia `state.grid.tiles`, no bloquea el paso y no añade reglas de colisión ni de camino. | `state.grid.tiles` no cambia al renderizar; los tests de motor, camino y colisiones siguen pasando; un `MoveTo` puede terminar en un tile decorado. |
| R-008 | El damero y la decoración son deterministas: misma semilla y mapa producen el mismo resultado; otra semilla cambia ambientes y decals, pero no la paridad del damero. | Dos renders de la misma semilla son idénticos; con otra semilla el damero se mantiene y al menos un decal y un ambiente cambian. |
| R-009 | Orden de capas: base de suelo → decals → camino y cursor → unidades → HUD. La decoración queda siempre por debajo de lo que el jugador necesita leer. | El camino y el cursor se ven por encima de los decals; las unidades se dibujan por encima; ningún decal tapa un muro, el HUD o un overlay. |
| R-010 | Los muros no cambian en este corte: ni variedad, ni tono, ni regla de selección. | El diff de `wallTileFor` está vacío; las capturas muestran los mismos muros que antes. |

## Paletas y ambientes

| Ambiente | Base | Segundo tono | Decoración dominante |
|---|---|---|---|
| Neutra / pasillos | `#0d1519` | `#16232b` | Mezcla de todas las familias |
| Humedad | `#0d1519` | `#142528` | Setas, slime, hierba, plantas y tierra |
| Muerte / combate | `#0d1519` | `#2a2026` | Sangre, huesos, cadáveres, ladrillos rojos y tierra |
| Ruina | `#0d1519` | `#2b2419` | Piedritas, ladrillos azules, tierra y algún hueso |
| Vegetación / abandono | `#0d1519` | `#24261f` | Hierba, plantas, setas y piedritas |

Los valores son el punto de partida aprobado; se pueden ajustar en playtest
dentro del requisito de luminancia y sin volver a imitar el color del ambiente.

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | La lógica de paletas, ambientes, densidad y decoración vive en un módulo puro del host (`src/host/floor.ts`): base, paletas, mapeo ambiente→paleta, hash determinista, focos y lista blanca. No conoce DOM, Canvas ni relojes. | Tests unitarios importan el módulo sin DOM; la paleta, el ambiente y la selección son funciones puras. |
| T-002 | `renderScene` pinta el suelo con `fillRect` por tile usando el color de paridad y la paleta de la sala; después dibuja los decals. No usa ningún recorte de suelo del PNG. | Tests del renderer con contexto falso comprueban colores por sala y orden de dibujo; no hay `floorTileFor` ni `TILE_RECTS.floor*` en el render. |
| T-003 | Los 33 recuadros de decals se añaden a `src/host/assets.ts` desde `tiles.png`, con nombres y familias correctos por fila. No se añaden archivos ni se modifican PNG. | Los recuadros son de 32×32 y caen en la rejilla real; un test verifica que 9 = tierra, 10 = ladrillo azul y 11 = huesos; la QA visual muestra el sprite correcto. |
| T-004 | El ambiente y la paleta de cada sala se derivan del mapa y la semilla. Los pasillos y umbrales usan la paleta neutra. Los muros no reciben paleta. | La misma semilla asigna los mismos ambientes y paletas; dos salas pueden compartir ambiente; ninguna puerta ni pasillo recibe un segundo tono de sala. |
| T-005 | La agrupación usa focos deterministas y una puntuación con ruido por coordenada. No usa `Math.random`, `Date.now` ni estado global mutable. | Tests con la misma entrada producen la misma lista; dos mapas con la misma semilla coinciden; no se lee el reloj. |
| T-006 | `window.__game.snapshot()` expone un resumen de solo lectura de la decoración (posición, tipo, familia, ambiente y área) y la paleta asignada a cada sala. No expone mutadores. | El snapshot es determinista y coincide con lo dibujado; dos llamadas seguidas devuelven lo mismo; no muta el estado. |
| T-007 | Tests nuevos: contraste de paletas, lista blanca, mapeo de familias, densidades en la semilla de referencia, exclusiones, máximo un decal por tile, determinismo, focos, fallback sin mapa y no bloqueo. No se borran, saltan ni debilitan tests existentes. | `pnpm run verify` pasa; los tests existentes conservan su intención. |
| T-008 | Se registra `ADR-011` y se actualizan alcance, glosario, arquitectura, índices y log. `ADR-010` queda como histórico y matizado. | El ADR existe y está enlazado; `pnpm run docs:check` pasa; no quedan referencias vigentes contradictorias. |
| T-009 | No se modifica `src/game/`, no se añaden dependencias y no se importa código de `experiments/` desde producción. | El diff de `src/game/` está vacío; `package.json` y `pnpm-lock.yaml` no cambian. |
| T-010 | El coste por frame sigue siendo despreciable: 169 tiles visibles, un `fillRect` por tile de suelo y un decal en ~35 % de los tiles de sala. | La medición antes/después no muestra regresión perceptible; objetivo de 60 fps. |

# Requisitos no funcionales

- **Rendimiento:** objetivo de 60 fps. El viewport muestra 13×13 tiles (169). El
  coste extra es un relleno plano por tile y hasta ~60 decals visibles en una
  sala llena; debe ser despreciable frente al render actual. Medir antes y
  después.
- **Accesibilidad:** los dos tonos de cada paleta se diferencian por luminancia
  simple (escala 0-255) en al menos 12 puntos, no solo por tono, para que el
  damero se lea en escala de grises o con daltonismo. El color no es la única
  señal de juego: camino, cursor y HUD siguen funcionando igual.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables. Sin red ni persistencia.
- **Seguridad:** sin datos personales, sin red y sin nuevas dependencias.
- **Mantenibilidad:** una base, cinco paletas, un mapeo ambiente→paleta, una
  lista blanca y un hash; el motor sigue sin conocer arte ni presentación.

# Dependencias

- [REQ-005](REQ-005-viewport-impar-13.md): viewport de 13×13 y cámara.
- [REQ-006](REQ-006-movimiento-animado.md): presentación animada; las unidades y
  la cámara se dibujan sobre el suelo y la decoración.
- [REQ-007](REQ-007-damero-decoracion-suelo.md): corte anterior del damero y la
  decoración; queda como histórico.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): arte placeholder
  32rogues y sus límites de uso.
- [ADR-007](../decisions/ADR-007-map-generator.md): `MapGenerator` y datos de
  salas, pasillos, puertas y apariciones.
- [ADR-008](../decisions/ADR-008-presentacion-animada.md): capas de presentación
  sobre un motor atómico.
- [ADR-010](../decisions/ADR-010-damero-decoracion-presentacion.md): damero y
  decoración de presentación; sustituido en la capa de suelo.
- [ADR-011](../decisions/ADR-011-suelo-programatico-ambientes.md): decisión de
  este corte.
- `src/host/renderer.ts`, `src/host/assets.ts`, `src/host/floor.ts` y
  `src/host/debug.ts` son los puntos de integración previstos.

# Fuera de alcance

- Biomas y escenarios de superficie con plantas y árboles; quedan para un
  requisito posterior.
- Objetos que bloquean el paso, interacción, cofres, barriles, vasijas, ataúdes,
  rocas, árboles, cultivos altos, escaleras, fosos, placas, pinchos y trampillas.
- Más de un decal por tile; decoración animada, iluminación, sombras o partículas.
- Cambios en muros, camino, coste, MP, acción, turnos, combate o generación.
- Reiniciar la paridad por sala o usar cuadros de 2×2.
- Decoración sobre muros o fuera de tiles transitables.
- Hotseat, red, controladores remotos, guardado o persistencia.

# Preguntas abiertas

No hay decisiones creativas bloqueantes. Quedan como ajustes de playtest:

- Valor exacto de cada paleta y de la densidad dentro de los rangos aprobados.
- Si el oliva gris de vegetación compite con el camino verde, cambiarlo por un
  gris cálido sin abandonar la regla de contraste.
- Si una sala concreta necesita más o menos mezcla, ajustar los pesos de los
  focos sin cambiar el rango de densidad.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-08 | Suelo programático plano de dos colores; sin tiles de suelo del PNG. | human:simon | aceptada |
| 2026-11-08 | Modelo A: base común `#0d1519` y segundo tono por sala. | human:simon | aceptada |
| 2026-11-08 | Paletas asignadas por contraste con el ambiente, no por imitación. | human:simon | aceptada |
| 2026-11-08 | Cinco paletas: neutra, humedad, muerte/combate, ruina y vegetación. | human:simon | aceptada |
| 2026-11-08 | Densidad 35 % en salas y 16 % en pasillos, máximo un decal por tile. | human:simon | aceptada |
| 2026-11-08 | Ambiente dominante por sala con 1-3 focos y 20-30 % de mezcla. | human:simon | aceptada |
| 2026-11-08 | Siete plantas pequeñas de la fila 20; fuera los cultivos altos. | human:simon | aceptada |
| 2026-11-08 | Los muros y el motor no cambian; la decoración no bloquea. | human:simon | aceptada |
| 2026-11-08 | Registrar `REQ-008` y `ADR-011`; `REQ-007` queda como histórico. | deepseek/v4.1-flash | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado el alcance y las decisiones creativas.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar el grafo de tareas.
- [x] Está claro el fuera de alcance.
- [x] No hay contradicciones abiertas: `REQ-007` queda como histórico y
      `ADR-010` se matiza con `ADR-011`.
- [x] Las tareas `TASK-0023` y `TASK-0024` están planificadas.
