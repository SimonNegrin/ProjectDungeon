---
type: Requirement Sheet
id: REQ-013
title: Entrada, salida y exploración mínima por nivel
description: Cada nivel tiene una entrada reconocible en la sala de spawn y una salida única en una sala no-spawn a distancia de grafo ≥2, preferiblemente la más lejana; la salida se representa como puerta exterior o escalera y se valida en EXP-004 sin transición funcional.
status: draft
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-09T12:21:36Z
updated_at: 2026-11-09T12:21:36Z
related_tasks: []
related_requirements: [REQ-011, REQ-012]
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T12:21:36Z }
verified:
  - by: human:simon
    at: 2026-11-09T12:21:36Z
    note: >-
      Aprueba: mínimo 3 salas por nivel; entrada = acceso de spawn; salida en
      sala no-spawn a distancia de grafo ≥2 y preferiblemente la más lejana;
      una salida por mapa, representada como puerta exterior o escalera
      (abajo/arriba) con `exitMode` en EXP-004; sin transición funcional todavía.
---

# Contexto

La idea futura es encadenar niveles: los jugadores entran por una puerta, exploran
la mazmorra y deben encontrar la salida para pasar al siguiente mapa. Para que eso
sea posible, el mapa necesita distinguir **entrada** y **salida**, y la salida no
puede quedar al lado del spawn.

Hoy `REQ-011` define salas, puertas decorativas y pasillos, pero no hay salida.
`REQ-012` define el acceso de spawn, que es el punto de entrada natural. Esta hoja
añade el dato de salida, su distancia mínima de exploración y su representación
visual. No implementa la transición al siguiente nivel.

# Objetivos de experiencia

- El jugador entiende dónde ha entrado y que la salida está en otra zona.
- La salida obliga a recorrer al menos una sala intermedia: queda en otra zona
  del mapa, no junto al spawn.
- La salida se lee como salida, no como una puerta decorativa más.
- La representación puede ser una puerta exterior o una escalera, para comparar
  las dos lecturas antes de fijar el encadenado.
- Llegar a la salida no depende de un tile bloqueado, un enemigo encima ni una
  decoración que tape la información.

# Relación con REQ-011 y REQ-012

- `REQ-011` v3 garantiza al menos **3 salas** por mapa (4-6 normales y 3 en
  caverna), el mínimo para que exista una sala intermedia entre entrada y salida.
- `REQ-012` v3 define la entrada (el acceso de spawn) y reserva el tile de salida
  para que no reciba enemigos, huecos de spawn ni decoración.
- `EXP-004` v3 muestra la puerta o escalera y mide la distancia de grafo. La
  decisión de representación queda abierta al playtest.
- No se modifica `REQ-003` ni BSP en este corte: el dato de salida se define para
  el generador denso y el experimento.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | En un mapa válido hay **exactamente una entrada y una salida**. La entrada es el **acceso de spawn** (`party[0]`). La salida está en una sala que **no es la de spawn**. Solo el fallback de R-007 puede dejar `exit` vacío, con aviso. | Un validador comprueba una entrada y una salida por mapa; la entrada cae dentro de la sala de spawn; la salida cae en otra sala; el fallback vacío emite `warnings`. |
| R-002 | La sala de salida está a **distancia de grafo ≥2** desde la sala de spawn: debe existir al menos una sala intermedia. Entre las salas válidas se prefiere la **más lejana**; los empates se resuelven por menor `id` y después por mayor área. La sala también debe admitir la representación elegida: `door` exige que toque el **borde del mapa**; las escaleras admiten cualquier sala. | Un BFS sobre el grafo de salas devuelve distancia ≥2; la elegida es la de mayor distancia entre las que admiten el modo; con 3 salas el camino es spawn → intermedia → salida; el desempate es determinista. |
| R-003 | La salida se representa con **`exitMode`**: `door` (puerta dibujada sobre un tile de muro del **borde del mapa**, con suelo dentro de la sala de salida), `stairs-down` (escalera que baja), `stairs-up` (escalera que sube) o `random` (elige una de las tres de forma determinista por semilla). Hay una sola salida por mapa. La puerta de salida **sigue siendo muro para el movimiento y la conectividad**: no abre paso ni crea suelo fuera del borde. Si `door` no encuentra una sala a distancia ≥2 que toque el borde, cae a `stairs-down` con aviso. | El modo se expone y se serializa; `door` cae en un muro del borde con suelo dentro de la sala y no es transitable; `stairs-down`/`stairs-up` usan los tiles `staircase down`/`staircase up` sobre suelo; `random` es estable con la misma semilla; el fallback de `door` emite `warnings`. |
| R-004 | La salida es **alcanzable** y no altera la conectividad ni las reglas de movimiento. Para `door`, se llega al **tile de suelo interior adyacente**; para escaleras, al tile de la escalera. Ningún enemigo, hueco de spawn, arma, puerta decorativa ni decoración ocupa su tile ni su acceso. | Un camino desde el spawn llega al acceso de la salida; el tile y su acceso están libres; la conectividad del mapa no cambia; no hay fichas ni decals encima. |
| R-005 | **Exploración mínima:** con el mínimo de 3 salas, el camino más corto desde la entrada hasta el acceso de la salida atraviesa al menos **2 salas no-spawn** (una intermedia y la de salida). En mapas mayores se conserva la distancia ≥2 y se prefiere la salida más lejana. | Un validador cuenta las salas del camino; hay al menos una sala intermedia distinta de spawn y salida; la distancia no baja de 2. |
| R-006 | La salida se distingue de una puerta decorativa: la puerta de salida tiene un estilo propio y la escalera usa el tile específico; ambas se etiquetan en debug. No es funcional todavía: no cambia de mapa. | En el render normal se reconoce la salida; en debug aparece su tipo, sala y distancia; cruzar la salida no inicia ninguna transición. |
| R-007 | Si el mapa no tiene una sala válida a distancia ≥2, no falla: elige la sala no-spawn más lejana alcanzable y emite un aviso. Si no existe ninguna sala no-spawn alcanzable, deja `exit` vacío con aviso. | Un mapa stub de 1-2 salas produce un `GeneratedMap` con `warnings` y sin excepción; nunca coloca la salida en la sala de spawn. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | La selección de la salida es una función pura, determinista y sin DOM. Deriva del mapa, las salas, las puertas y la semilla; no usa `Math.random`, relojes ni estado global. | Dos llamadas con la misma semilla y mapa devuelven la misma salida; se ejecuta en Vitest sin jsdom. |
| T-002 | El modelo serializable expone `entrance` y `exit`: `entrance = { roomId, position }`; `exit = { roomId, kind, position, access, tile }`, con `kind` en `door`, `stairs-down` o `stairs-up`. En `door`, `position` es el muro del borde y `access` el suelo interior adyacente; en escaleras, `access` coincide con `position`. `spawns.player` sigue siendo el alias de `party[0]`. | `JSON.parse(JSON.stringify(state))` conserva ambos datos; el snapshot los incluye; los tests pueden leer `kind`, `roomId`, `position` y `access`. |
| T-003 | La salida se elige después de salas, puertas y spawn, y antes de enemigos y decoración; su tile se reserva y se excluye de las colocaciones posteriores. | Un test con una salida rodeada de candidatos comprueba que no recibe enemigos, spawn ni decals; el orden de generación es determinista. |
| T-004 | El grafo de salas y la distancia se calculan con las conexiones existentes, sin contar puertas decorativas como nodos. El desempate usa distancia, menor `id` y mayor área. Para `door` se filtra a salas que tocan el borde del mapa; para escaleras no se filtra. | El test de un mapa de 3 salas en cadena devuelve la tercera; un mapa con dos salas a la misma distancia elige por `id`; una sala interior no se elige para `door`; no hay bucles infinitos. |
| T-005 | `EXP-004` expone `exitMode` con los cuatro valores y muestra sala, tipo, posición, distancia de grafo y camino hasta la salida. El JSON de decisión incluye el modo y la salida elegida. | La página permite cambiar el modo y exportar la decisión; `random` produce el mismo resultado con la misma semilla; el payload serializa sala, tipo y distancia. |
| T-006 | Hay validadores y tests de salida: positiva en mapa de 3 salas, y negativas para salida en spawn, distancia 1, sala inalcanzable, tile o acceso ocupado, puerta fuera del borde, puerta en sala interior y escalera sobre muro. También cubre el fallback de `door` a escalera y que la puerta no abre paso. | Vitest cubre cada caso; los tests de conectividad y spawn de `REQ-011`/`REQ-012` siguen pasando. |
| T-007 | La capa de debug muestra entrada, salida, tipo, sala, distancia y camino; el HUD normal no cambia. | `F1` alterna la capa; sin `F1` no aparece información nueva; la salida se lee también en la vista 13×13. |
| T-008 | No se añaden dependencias y el cálculo no bloquea el arranque. | `package.json` no cambia; la generación de 22×18 con salida queda por debajo de 50 ms en CI. |

# Requisitos no funcionales

- **Legibilidad:** la salida se distingue de las puertas decorativas por forma o
  tile, no solo por color; se reconoce a escala 13×13.
- **Accesibilidad:** el contraste de la puerta o escalera es suficiente; el debug
  no tapa el HUD.
- **Rendimiento:** la selección de salida añade menos de 5 ms a la generación.
- **Compatibilidad:** Chromium de escritorio; Firefox y Safari recientes como
  deseables.
- **Seguridad:** sin red, sin persistencia y sin datos personales.
- **Mantenibilidad:** selección de salida, render y debug separados; el tipo de
  salida es un dato, no una regla del motor.

# Dependencias

- `REQ-011` v3: salas, conectividad, puertas y mínimo de 3 salas.
- `REQ-012` v3: acceso de spawn, reserva del tile de salida y reparto de enemigos.
- `EXP-004` v3: comparador que muestra y mide la salida.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): tiles de
  32rogues, incluidas `staircase down` y `staircase up`.

# Fuera de alcance

- Transición funcional al siguiente nivel, generación del mapa siguiente y
  conservación de estado entre niveles.
- Varias salidas, puertas con llave, objetivos o condiciones de apertura.
- Escaleras que cambien de profundidad o de planta en el motor actual.
- Persistencia, guardado, minimapa y grafo de niveles.
- Aplicar el dato de salida a BSP antes de que exista el encadenado.

# Preguntas abiertas

1. **Representación final:** puerta exterior, escalera abajo o escalera arriba.
   Se decide tras comparar las tres en `EXP-004`; el experimento no cierra la
   decisión.
2. **Semántica de las escaleras:** si bajar y subir representan profundidad,
   plantas o simplemente dos estilos. Se fijará al definir el encadenado.
3. **Entrada exterior:** hoy la entrada es el acceso interior de spawn. Si el
   nivel encadenado necesita una puerta de entrada visible desde fuera, se añade
   en una versión posterior.
4. **Salida bloqueada:** si la salida debe requerir una llave u objetivo. Queda
   fuera de este corte.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-09 | Mínimo de 3 salas por nivel; normales 4-6 y caverna 3. | human:simon | aceptada |
| 2026-11-09 | Entrada = acceso de spawn; salida en sala no-spawn a distancia de grafo ≥2, preferiblemente la más lejana. | human:simon | aceptada |
| 2026-11-09 | Una salida por mapa; representación como puerta exterior o escalera (abajo/arriba), seleccionable en EXP-004 con `exitMode`. | human:simon | aceptada |
| 2026-11-09 | Sin transición funcional: solo dato, render, debug y métricas. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] Los requisitos son verificables.
- [x] Las contradicciones con `REQ-011` y `REQ-012` están identificadas.
- [x] Las dependencias están claras.
- [x] Hay un experimento (`EXP-004` v3) que muestra la salida antes de
      implementarla.
- [x] La hoja tiene versión y fecha.
