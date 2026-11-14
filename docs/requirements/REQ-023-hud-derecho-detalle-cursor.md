---
type: Requirement Sheet
id: REQ-023
title: HUD derecho de detalle bajo el cursor
description: "Columna derecha del marco con las stats exactas de la unidad, objeto, contenedor o puerta bajo el cursor, limitadas a la línea de visión de un jugador vivo."
status: draft
version: 2
decision_owner: human:simon
review_required: true
created_at: 2026-11-11T13:05:00Z
updated_at: 2026-11-13T23:44:56Z
related_tasks: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T13:05:00Z }
verified:
  - by: human:simon
    at: 2026-11-13T23:44:56Z
    note: >-
      Aprueba la v2: el HUD derecho muestra el detalle del cursor y, con el panel
      abierto, el objeto seleccionado junto al equipado en ese hueco, sin delta.
---

# Contexto

La columna derecha del marco 16:9 muestra información de lo que hay bajo el
cursor: enemigos, cofres, puertas y otros elementos. El cursor atraviesa muros
(`REQ-004`), así que el panel no puede revelar lo que el grupo no ve: la
información se limita a la línea de visión de algún jugador vivo. Sin visión, el
panel muestra «desconocido».

La decisión creativa está tomada: stats exactas de lo visible. Quedan abiertos
los detalles de presentación y el tratamiento de algunos estados.

# Enmienda a documentos vigentes

- [REQ-004](REQ-004-cursor-seleccion.md): el cursor no lo bloquean muros ni
  unidades. Esta hoja añade la restricción de información por línea de visión.
- [REQ-009](REQ-009-percepcion-alarma-huida.md): la percepción y la línea de
  visión ya existen en el motor; el panel las reutiliza, no las redefine.
- [REQ-011](REQ-011-generador-densa-salas-irregulares.md): las puertas son
  decorativas; el panel las describe sin sugerir que se abren.
- [REQ-020](REQ-020-cofres-saqueo.md): cofres y contenedores; el panel muestra
  estado y contenido solo si el contenedor está abierto.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): el fantasma puede
  inspeccionar cofres; el panel de un vivo no hereda esa capacidad.
- [REQ-032](REQ-032-estilo-visual-interaccion-ui.md): el HUD derecho también
  presenta el objeto seleccionado en el panel abierto, con el equipado al lado.

# Geometría compartida

La columna derecha mide 161,77 px lógicos (≈5 tiles) y comparte marco, viewport y
constantes con [REQ-022](REQ-022-hud-izquierdo-jugador.md). Esta hoja no define la
columna izquierda ni cambia el mapa.

# Objetivos de experiencia

- Decidir con información: qué enemigo atacar, qué cofre abrir, qué puerta cruzar.
- Que el panel responda al cursor sin obligar a mirar otra pantalla.
- Que no se revele lo que el grupo no puede ver.
- Que un cofre cerrado siga siendo una incógnita.
- Que el panel no tape el mapa ni compita con el cursor.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | El panel muestra información de la casilla bajo el cursor en la columna derecha del marco. | Al mover el cursor, el panel cambia a la casilla actual sin retardo perceptible. |
| R-002 | Enemigo visible: nombre o tipo, PV actuales y máximos, arma, defensa, resistencia, equipo, **acciones restantes** y, si lanza hechizos, **nivel de magia y maná**. | Los valores coinciden con el estado del motor para un enemigo con línea de visión. |
| R-003 | Aliado vivo: nombre, arquetipo y stats relevantes; el fantasma muestra su estado y MP, sin equipo ni inventario. | El panel distingue aliado vivo y fantasma; no inventa equipo en el fantasma. |
| R-004 | Objeto en el suelo: nombre y cantidad. Contenedor abierto: contenido. Contenedor cerrado: estado y tipo, **sin contenido ni trampa**. | Un cofre cerrado nunca revela contenido ni trampa; uno abierto muestra sus objetos. |
| R-005 | Puerta: tipo y zona, como elemento decorativo; no se muestra cerrada con llave ni interactuable si no lo es. | El texto no promete una regla que no existe. |
| R-006 | Casilla sin unidad ni objeto: describe el terreno relevante (suelo, muro, entrada, salida). | Suelo, muro, entrada y salida se distinguen con texto. |
| R-007 | Sin línea de visión de ningún jugador vivo, el panel muestra «desconocido» y no revela tipo, stats ni contenido. | Tests con muro entre el jugador y la casilla: el panel no filtra la identidad de lo oculto. |
| R-008 | El panel respeta la niebla de guerra y la percepción existentes; no crea un canal de información nuevo. | Un enemigo no percibido no aparece detallado aunque el cursor esté encima. |
| R-009 | Con el panel de inventario abierto, el HUD derecho muestra el detalle del objeto seleccionado y, en un segundo bloque, el equipado en ese hueco; sin delta numérico. Al cerrar el panel vuelve al detalle del cursor. | Navegar por la rejilla cambia la ficha; el bloque del equipado dice «vacío» cuando no hay pieza; abrir y cerrar no altera el estado. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El host construye la información del panel a partir del snapshot y de un helper de línea de visión del motor; no duplica reglas de percepción. | Tests unitarios del helper reutilizan la lógica de `REQ-009`; el host no decide visibilidad por su cuenta. |
| T-002 | La consulta de inspección es de solo lectura y no altera el estado, el RNG ni la percepción. | Mover el cursor y consultar no cambia snapshot, RNG ni alertas. |
| T-003 | El panel se actualiza al mover el cursor y al cambiar el estado, sin reconstruir el mapa ni el marco. | Tests de presentación y capturas; sin parpadeos ni desplazamientos de tiles. |
| T-004 | El panel se dibuja en la capa de HUD del host (Canvas o DOM alineado al marco) sin alterar la resolución lógica. | El mapa conserva 13×13 y 16:9; el texto no queda bajo el mapa. |
| T-005 | El contenido del panel se compone por tipo: unidad, objeto, contenedor, puerta y terreno, con un tipo «desconocido». | Tests por tipo y capturas de cada estado. |
| T-006 | La información de cofres cerrados proviene solo del estado del contenedor; la de abiertos, de su inventario. | Tests con cofre cerrado, abierto, vacío y con trampa oculta: la trampa no se filtra. |
| T-007 | Tests nuevos: línea de visión bloqueada, enemigo visible, aliado, fantasma, objeto, cofre cerrado/abierto, puerta, terreno y E2E de captura. | `pnpm run verify` pasa; los tests de `REQ-004` y `REQ-009` conservan su intención. |
| T-008 | Se actualizan arquitectura, glosario y `REQ-004`/`REQ-005`; sin dependencias nuevas, red ni arte final. | `docs:check` pasa; `package.json` y `pnpm-lock.yaml` no cambian. |

# Requisitos no funcionales

- **Rendimiento:** la consulta por casilla es O(1) o cacheada; mover el cursor no
  recalcula percepción de todo el mapa.
- **Accesibilidad:** la información se expresa con texto; los colores no son el
  único canal.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Legibilidad:** una columna estrecha obliga a jerarquía clara; los datos
  secundarios pueden abreviarse.
- **Mantenibilidad:** un modelo de inspección por tipo, sin lógica de juego en el
  host.

# Dependencias

- [REQ-004](REQ-004-cursor-seleccion.md): cursor y casilla seleccionada.
- [REQ-009](REQ-009-percepcion-alarma-huida.md): línea de visión y percepción.
- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): stats y equipo de enemigos.
- [REQ-011](REQ-011-generador-densa-salas-irregulares.md): puertas decorativas.
- [REQ-014](REQ-014-atributos-inherentes-personajes.md): atributos y MP.
- [REQ-020](REQ-020-cofres-saqueo.md): contenedores, contenido y trampas.
- [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): estado fantasma.
- [REQ-022](REQ-022-hud-izquierdo-jugador.md): geometría y columna izquierda.

# Fuera de alcance

- La columna izquierda (`REQ-022`).
- Revelar trampas o contenido de cofres cerrados.
- Interacción desde el panel (abrir, atacar, coger).
- Tooltips flotantes sobre el mapa.
- Comparación de equipo fuera del panel de inventario y simulación de combate.
- Arte final de iconos.

# Preguntas abiertas

1. **Formato de las stats.** ¿Números, barras o ambos? ¿PV actual/máximo?
2. **Equipo del enemigo.** ¿Se listan todas las piezas o solo arma y armadura?
3. **Aliados.** ¿Se muestra su inventario o solo stats y estado?
4. **Puertas.** ¿Se distingue la zona o el estilo, o solo «puerta»?
5. **Casilla vacía.** ¿El panel se queda vacío o describe siempre el terreno?
6. **Rendimiento del cursor.** ¿Actualización por tile o solo al detenerse?

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-11 | El detalle del cursor ocupa la columna derecha del marco. | human:simon | aceptada |
| 2026-11-11 | Se muestran stats exactas de lo visible, no información cualitativa. | human:simon | aceptada |
| 2026-11-11 | Las stats exactas exigen línea de visión de un jugador vivo; sin ella, «desconocido». | human:simon | aceptada |
| 2026-11-11 | Un cofre cerrado muestra estado y tipo, nunca contenido ni trampa. | human:simon | aceptada |
| 2026-11-13 | Con el panel abierto, el HUD derecho muestra el seleccionado y el equipado en ese hueco, sin delta; al cerrar vuelve al cursor. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [ ] El usuario ha revisado el texto de la hoja.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] El grafo de tareas es posible; el orden depende de `REQ-020` para cofres.
