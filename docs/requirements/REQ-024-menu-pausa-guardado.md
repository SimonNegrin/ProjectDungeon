---
type: Requirement Sheet
id: REQ-024
title: Menú de pausa, guardado y carga locales
description: "Menú de pausa global con reanudar, nueva partida, cargar .json o .zip, guardar .zip y controles; guardado solo en fase de personajes y sin animación, carga desde el menú principal o la pausa y sin reinicio rápido."
status: stable
version: 3
decision_owner: human:simon
review_required: true
created_at: 2026-11-11T13:10:00Z
updated_at: 2026-11-14T22:19:59Z
related_tasks: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T13:10:00Z }
verified:
  - by: human:simon
    at: 2026-11-14T22:19:59Z
    note: >-
      Aprueba la v3: menú de pausa con Reanudar, Nueva partida, Cargar partida,
      Guardar partida y Controles; sin reinicio rápido en pausa ni en resultado;
      una confirmación para Nueva y otra para Cargar; guardado solo en fase de
      personajes y sin animación; límites de 5 MB / 20 MB / 4 entradas; manifiesto
      con nombres y arquetipos; sin guardado tras el resultado y sin audio en este
      corte.
---

# Contexto

El usuario quiere una pantalla de menú que pause la partida y permita cargar,
guardar, empezar otra partida y consultar los controles. El guardado es un
archivo local: un `.zip` con la partida y un manifiesto. La carga acepta ese
`.zip` o un `.json` de partida.

Esto cierra la pregunta de persistencia abierta en la visión: la persistencia es
local y por archivo, sin cuentas, servidor ni base de datos. No implica
progresión entre partidas ni guardado automático.

La v3 fija el menú de pausa definitivo —**Reanudar, Nueva partida, Cargar
partida, Guardar partida y Controles**— y retira por completo el reinicio con la
misma party y semilla: ni la pausa ni el resultado lo ofrecen. «Nueva partida»
usa una sola confirmación. También cierra las preguntas que quedaban: límites de
carga, manifiesto, audio y resultado sin guardado.

La v3 incorpora la relación con el menú principal de
[REQ-016](REQ-016-pantalla-inicio-configuracion.md), que ofrece «Cargar» al
arrancar y confirma la pérdida de progreso al elegir «Nueva» desde la pausa.

# Enmienda a documentos vigentes

- [Visión](../vision.md) y [alcance](../scope.md): la persistencia queda definida
  como archivo local de partida; no hay guardado entre runs.
- [REQ-016](REQ-016-pantalla-inicio-configuracion.md) v3: el menú principal ofrece
  «Cargar» y «Nueva». La carga y la validación viven aquí; el botón, allí.
- [REQ-017](REQ-017-feedback-visual-eventos.md): la pausa congela la timeline de
  presentación; el menú no genera eventos de juego.
- [REQ-020](REQ-020-cofres-saqueo.md) y
  [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): el guardado incluye
  contenedores, cadáveres y fantasmas; el formato debe representarlos.
- [REQ-022](REQ-022-hud-izquierdo-jugador.md) y
  [REQ-023](REQ-023-hud-derecho-detalle-cursor.md): al cargar, los HUD se
  reconstruyen desde el estado; no se guarda su contenido.
- [REQ-031](REQ-031-hotseat-local.md): pausa global, guardado restringido a la
  fase de personajes y carga en el activo. Sus R-019, R-020 y T-010 (menú con
  «Reiniciar» y resultado con «Reiniciar») quedan sustituidos: no hay reinicio
  rápido en ningún sitio.
- [Economía de turno](../design/turn-economy.md): la tabla de controles pasa a
  `N` y `Esc` y se alimenta de un único mapa de teclas.

# Objetivos de experiencia

- Poder dejar la partida y retomarla exactamente donde estaba.
- Que guardar y cargar sea comprensible sin manual: un botón, un archivo.
- Que un archivo inválido no rompa ni corrompa la partida en curso.
- Que la pausa se sienta como una pausa real, no como un menú que sigue jugando.
- Que en hotseat cualquier jugador pueda pausar sin romper el turno.
- Que un guardado se reconozca por su nombre y su manifiesto antes de abrirlo.
- Que las acciones que descartan progreso se confirmen.
- Que los controles estén a mano cuando alguien nuevo se sienta a la mesa.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Existe un menú de pausa que detiene la partida y se abre con `Esc` en cualquier momento de la partida y para cualquier jugador: fase de personajes, fase enemiga, paneos y animaciones. Con el panel abierto, el primer `Esc` cierra el panel. | Con el menú abierto no avanza ningún turno, beat ni animación; `Esc` lo abre desde cualquier fase; con el panel abierto primero se cierra el panel. |
| R-002 | El menú ofrece, en este orden, **reanudar, nueva partida, cargar partida, guardar partida y controles**. `Esc` en el menú reanuda; en un submenú o aviso, `Esc` vuelve al menú. | Las cinco acciones aparecen en ese orden y se navegan con teclado; `Esc` vuelve a jugar desde el menú raíz. |
| R-003 | Guardar solo está disponible desde el menú de pausa, **en la fase de personajes y sin animación ni paneo**, y produce **un** archivo `.zip`. Fuera de la pausa no hay atajo; en fase enemiga o animación la acción se desactiva con el motivo en texto. | Fuera de la pausa no hay atajo; la acción desactivada explica por qué; cada guardado descarga un único archivo. |
| R-004 | El `.zip` contiene `manifiesto.json` y `partida.json`. El manifiesto incluye **versión del formato, versión del juego, fecha, semilla y resumen** con nombre y arquetipo de cada jugador, turno, ronda y fase. | Un guardado se puede identificar y validar sin abrir la partida. |
| R-005 | Cargar acepta un `.zip` de guardado o un `.json` de partida. Desde el **menú principal** carga directo, sin confirmación; desde la **pausa** pide confirmación. | Ambos orígenes cargan; desde la pausa hay confirmación; desde el menú principal no hay partida que reemplazar. |
| R-006 | Cargar con una partida en curso pide confirmación y reemplaza la partida actual. Al confirmar, la pausa se cierra y el control vuelve al jugador activo. Cancelar no cambia nada; un archivo inválido se rechaza con mensaje y deja la partida intacta. | Cancelar no cambia nada; confirmar reconstruye la partida cargada; el error no altera el estado. |
| R-007 | La pantalla de controles explica las teclas vigentes con texto; no permite remapear. `Esc` vuelve al menú de pausa. | La lista coincide con los controles del juego; no hay editor de teclas. |
| R-008 | La partida guardada conserva el estado completo: semilla, RNG, turno, **orden de jugadores, jugador activo y ronda**, jugadores vivos, fantasmas, cadáveres, contenedores, objetos, equipo, **acciones restantes/máximas, maná, nivel de magia y cupo de hechizos**, y el estado de alerta y memoria de los enemigos. | Cargar y volver a guardar produce un estado equivalente; el control vuelve al activo. |
| R-009 | El guardado no incluye presentación: ni timeline de feedback, ni cámara, ni cursor, ni panel abierto. Al cargar se reconstruye la presentación en el estado final, sin beats pendientes ni aviso de ronda. | La partida cargada se ve en estado final, con la cámara en el activo y sin avisos. |
| R-010 | **«Nueva partida»** pide una confirmación que avisa de que se pierde el progreso no guardado y, al confirmar, descarta la partida y abre el paso 1 de REQ-016. No existe reinicio con la misma party y semilla. | Nueva encadena confirmación y configuración; no hay acción que repita la mazmorra y la party actuales. |
| R-011 | La pausa es **global**: cualquier jugador la abre y afecta a todos. No hay pausa por jugador. | En hotseat, cualquier jugador pausa; reanudar devuelve el control al activo. |
| R-012 | No se puede guardar después de ganar o perder: la pantalla de resultado no tiene pausa ni guardado, solo «Nueva partida». | El resultado no ofrece guardar; no hay archivo de una run terminada. |
| R-013 | «Nueva partida» se puede elegir en **cualquier fase**, incluida la enemiga y una animación en curso: al confirmar se descarta el estado y no se reanuda la fase anterior. | Se ofrece en cualquier fase; no quedan restos ni reanudación de la partida descartada. |
| R-014 | No hay audio en este corte. Cuando exista, la pausa **silencia** la música y el sonido; reanudar los recupera. | Sin implementación de audio ahora; la regla queda escrita para cuando llegue. |
| R-015 | El nombre del archivo y el manifiesto permiten reconocer un guardado antes de abrirlo. | El nombre incluye semilla y fecha; el manifiesto lista la party. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El estado del motor es serializable de forma completa y determinista: versión de formato y semilla; mapa generado; estado del RNG; fase, turno, ronda y activo; configuración de party (arquetipo, variante, nombre y orden); unidades con stats, PV, MP, acciones, maná, cupo de hechizos, inventario y equipo; fantasmas; cadáveres; contenedores; objetos en el suelo; estado de IA y contadores de ids. | Test de ida y vuelta: serializar, cargar y serializar produce el mismo estado, incluido el siguiente resultado del RNG. |
| T-002 | El guardado se construye desde el motor, no desde el host: el host solo empaqueta, descarga y lee archivos. | El formato no contiene datos de presentación ni de DOM. |
| T-003 | El `.zip` se genera y se lee sin red y sin dependencias: se usa `CompressionStream`/`DecompressionStream` con un contenedor propio que escribe `deflate` y acepta `store` y `deflate` al leer. | El archivo se abre en un lector estándar; `package.json` y `pnpm-lock.yaml` no cambian. |
| T-004 | El manifiesto valida el formato antes de aplicar la partida: `format_version` debe ser 1; `game_version` es informativo y no bloquea; `created_at` ISO UTC; `seed`; `summary` con `players` (nombre y arquetipo), `turn`, `round` y `phase`. | Un manifiesto ausente, malformado o con versión desconocida se rechaza sin cambios. |
| T-005 | `partida.json` se valida contra un esquema estricto antes de tocar el estado; lleva su propio `format_version` para permitir cargar un `.json` suelto; no se usa `eval`; no se aceptan campos extra, tipos erróneos, nombres de ruta ni entradas ejecutables. | Tests con JSON corrupto, campos extra, tipos erróneos y versión desconocida: rechazo limpio. |
| T-006 | Límites de carga: máximo **5 MB comprimido**, **20 MB descomprimido**, **4 entradas** en el `.zip` y 5 MB por archivo. Solo se aceptan `manifiesto.json` y `partida.json` en la raíz; carpetas, rutas y entradas extra se rechazan. | Un `.zip` con demasiadas entradas, rutas o tamaño desmedido se rechaza con mensaje antes de descomprimir. |
| T-007 | La pausa detiene la timeline de presentación y bloquea el input de juego; reanudar continúa exactamente desde el mismo estado. Guardar se desactiva en fase enemiga, paneo o animación. | Tests: beats congelados, input ignorado, reanudar sin saltos, guardar desactivado fuera de la fase de personajes. |
| T-008 | La pausa y el menú viven en el host; el motor no conoce el menú ni el archivo. | El motor no expone comandos de pausa ni de archivo; los tests del motor no cambian. |
| T-009 | La descarga usa `proyectdungeon-<semilla>-<AAAAMMDD-HHmmss>.zip` con fecha UTC; la carga usa un selector de archivo local. Dos guardados no se sobrescriben. | Dos guardados en segundos distintos tienen nombres distintos; el selector acepta `.zip` y `.json`. |
| T-010 | Tests nuevos: ida y vuelta, manifiesto, validación estricta, límites y rutas, pausa, confirmación de carga, controles sin deriva, guardado restringido, carga en el activo, «Nueva partida» en fase enemiga y E2E de descarga y carga de `.zip` y `.json`. | `pnpm run verify` pasa; los tests de `REQ-017` conservan su intención. |
| T-011 | Se actualizan glosario, arquitectura, visión y alcance; se registra **ADR-028** del formato de guardado con el esquema v1; se anotan REQ-016 y REQ-031. | `pnpm run docs:check` pasa; no queda la persistencia como pregunta abierta. |
| T-012 | Sin red, sin cuentas, sin base de datos y sin dependencias nuevas. | No hay peticiones de red; el guardado funciona con la pestaña offline. |
| T-013 | «Nueva partida» descarta el estado en memoria al confirmar y abre REQ-016; no queda copia ni reanudación de la partida anterior, y no existe reinicio rápido ni atajo de teclado. | Tras confirmar no se puede volver a la partida anterior; no queda `R` ni acción equivalente. |
| T-014 | La lista de controles se genera desde el mapa único de teclas del host; no se duplica en texto suelto. | Un cambio de tecla se refleja en la ayuda sin editar el texto; un test detecta la deriva. |
| T-015 | La carga restaura fase, ronda y activo, cierra la pausa, centra la cámara en el activo y redibuja los HUD desde el estado. | Tras cargar, el HUD y la cámara muestran al activo; no aparece «Ronda N» ni beats pendientes. |
| T-016 | El menú principal y la pausa usan el **mismo** cargador y validador; no hay dos rutas de carga. | Ambos orígenes comparten el flujo y los tests de validación. |

# Formato de guardado (v1)

```text
proyectdungeon-<semilla>-<AAAAMMDD-HHmmss>.zip
├── manifiesto.json
└── partida.json
```

`manifiesto.json`:

```json
{
  "format_version": 1,
  "game_version": "0.1.0",
  "created_at": "2026-11-14T22:03:18Z",
  "seed": 2738263054,
  "summary": {
    "players": [
      { "name": "Ana", "archetype": "warrior" },
      { "name": "Bru", "archetype": "mage" }
    ],
    "turn": 12,
    "round": 3,
    "phase": "players"
  }
}
```

`partida.json`: estado completo del motor con su propio `format_version`, semilla,
RNG, mapa generado, fase/turno/ronda/activo, configuración de party, unidades,
fantasmas, cadáveres, contenedores, objetos y contadores de ids. Sin timeline,
cámara, cursor ni panel.

# Requisitos no funcionales

- **Rendimiento:** guardar y cargar no bloquean el hilo principal más de lo
  necesario para serializar; el archivo típico debe ser pequeño.
- **Accesibilidad:** menú navegable con teclado, foco visible y textos claros;
  los avisos de error se anuncian con `aria-live`.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** archivos no confiables; validación estricta, rutas rechazadas y
  límites de tamaño.
- **Mantenibilidad:** formato versionado y esquema único; migraciones futuras
  explícitas.

# Dependencias

- [REQ-002](REQ-002-encuadre-16-9.md) y [REQ-005](REQ-005-viewport-impar-13.md):
  marco y presentación que se pausa y se reconstruye.
- [REQ-016](REQ-016-pantalla-inicio-configuracion.md) v3: menú principal con
  «Cargar», arranque, party y semilla.
- [REQ-017](REQ-017-feedback-visual-eventos.md): timeline que la pausa congela.
- [REQ-018](REQ-018-inventario-equipo.md): inventarios y equipo serializados.
- [REQ-020](REQ-020-cofres-saqueo.md): contenedores y cadáveres; el formato v1 se
  cierra con el modelo `Container` actual y se sube de versión antes de publicar
  si esa hoja cambia el modelo.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): fantasmas, cupo de
  hechizos y resurrección.
- [REQ-031](REQ-031-hotseat-local.md): pausa global, activo y ronda; el
  esquema de guardado depende de su modelo de estado. Su reinicio rápido queda
  sustituido por esta hoja.
- [ADR-012](../decisions/ADR-012-combate-equipo-rng.md): RNG sembrado y
  serializable; el guardado reutiliza ese estado.
- **ADR-028** (se registra con la primera tarea de guardado): esquema v1 del
  archivo.

# Fuera de alcance

- Guardado en la nube, cuentas, servidor o base de datos.
- Varios slots por partida, autoguardado y guardado rápido.
- Migración entre versiones de formato; la v1 rechaza versiones desconocidas.
- Remapeo de controles y perfiles.
- Menú de arranque; el inicio sigue en `REQ-016`.
- Guardar la presentación: beats, cámara, cursor y feedback.
- Guardado durante la fase remota o sincronización entre dispositivos.
- Guardar después de la pantalla de resultado.
- Reinicio rápido con la misma party y semilla: retirado en la pausa y en el
  resultado; repetir una mazmorra exige reescribir su semilla.
- Cifrado, firma o detección de manipulación del archivo.

# Preguntas abiertas

Ninguna. La v3 fija el menú de pausa con cinco botones y retira el reinicio
rápido de todo el juego; también cierra el tamaño máximo (T-006), el guardado tras
el resultado (R-012), el manifiesto (R-004) y el audio (R-014).

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-11 | El menú existe solo en pausa; el arranque sigue en `REQ-016`. | human:simon | aceptada |
| 2026-11-11 | Guardar solo desde el menú de pausa, con un archivo por partida. | human:simon | aceptada |
| 2026-11-11 | El `.zip` contiene `partida.json` y `manifiesto.json` con versión, fecha, semilla y resumen. | human:simon | aceptada |
| 2026-11-11 | Cargar acepta `.zip` o `.json`, pide confirmación y reemplaza la partida actual. | human:simon | aceptada |
| 2026-11-11 | Los controles son texto informativo; sin remapeo. | human:simon | aceptada |
| 2026-11-11 | La persistencia es local por archivo, sin cuentas ni servidor. | human:simon | aceptada |
| 2026-11-13 | Pausa global con `Esc`; cualquier jugador la abre y afecta a todos. | human:simon | aceptada |
| 2026-11-13 | Guardar solo en fase de personajes y sin animación; cargar en el turno activo. | human:simon | aceptada |
| 2026-11-13 | Reiniciar vive en el menú con «Nueva» y «Reiniciar»; misma party y semilla; sin `R`. | human:simon | sustituida |
| 2026-11-13 | El guardado incluye semilla, party, orden, activo y ronda. | human:simon | aceptada |
| 2026-11-14 | «Nueva» usa dos confirmaciones: el diálogo y un aviso de pérdida de progreso. | human:simon | sustituida |
| 2026-11-14 | No se guarda después de ganar o perder. | human:simon | aceptada |
| 2026-11-14 | El manifiesto lleva nombres y arquetipos de la party, turno, ronda y fase. | human:simon | aceptada |
| 2026-11-14 | Sin audio en este corte; la pausa lo silenciará cuando exista. | human:simon | aceptada |
| 2026-11-14 | Límites: 5 MB comprimido, 20 MB descomprimido, 4 entradas y 5 MB por archivo. | human:simon | aceptada |
| 2026-11-14 | Reiniciar se permite en cualquier fase; la fase enemiga se aborta. | human:simon | sustituida |
| 2026-11-14 | Menú de pausa con Reanudar, Nueva partida, Cargar partida, Guardar partida y Controles, en ese orden; sin «Reiniciar partida». | human:simon | aceptada |
| 2026-11-14 | «Nueva partida» y «Cargar partida» usan una confirmación cada una. | human:simon | aceptada |
| 2026-11-14 | El resultado solo ofrece «Nueva partida»; el reinicio rápido desaparece de todo el juego. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] El usuario ha aprobado la pausa global, el guardado restringido y el menú de cinco botones.
- [x] El usuario ha resuelto los límites, el manifiesto, el audio y la retirada del reinicio rápido.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras; el grafo es posible con el modelo de estado de REQ-031 y el formato versionado frente a REQ-020.
- [x] El usuario ha revisado el texto de la v3 y la hoja queda `stable`.

# Notas de vigencia

- **v3 (2026-11-14):** cierra las preguntas abiertas y fija el menú de pausa con
  Reanudar, Nueva partida, Cargar partida, Guardar partida y Controles; retira
  «Reiniciar partida» de la pausa y del resultado. Añade límites de carga,
  nombres en el manifiesto, una sola confirmación para Nueva y otra para Cargar,
  silencio de audio y la entrada «Cargar» desde el menú principal. El formato v1
  se versiona en ADR-028.
- **v2 (2026-11-13):** incorporó hotseat (pausa global, guardado solo en fase de
  personajes, carga en el activo) y movió el reinicio aquí, con misma party y
  semilla. Sustituyó el reinicio instantáneo con `R`.
- **v1 (2026-11-11):** menú de pausa con guardado `.zip`, carga
  `.json`/`.zip` con confirmación y controles.
