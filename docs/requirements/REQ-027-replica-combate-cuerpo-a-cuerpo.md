---
type: Requirement Sheet
id: REQ-027
title: Réplica en combate cuerpo a cuerpo
description: "Un ataque cuerpo a cuerpo fallido permite al defensor replicar de inmediato, gratis, sin cadena y con la misma fórmula de ataque."
status: stable
version: 2
decision_owner: human:simon
review_required: true
created_at: 2026-11-11T15:10:00Z
updated_at: 2026-11-11T16:20:00Z
related_tasks: [TASK-0079, TASK-0080]
amends: [REQ-009, REQ-010]
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T15:10:00Z }
verified:
  - by: human:simon
    at: 2026-11-11T16:20:00Z
    note: >-
      Revisa y aprueba la hoja v2: dormido no atacable en melé, el que regresa
      replica, sin aviso en el HUD, presentación con la animación de ataque y sin
      texto, réplicas independientes del tope y −1 aplazado.
---

# Contexto

El usuario quiere que fallar un ataque tenga consecuencias inmediatas: si un
personaje ataca cuerpo a cuerpo y **falla**, el defensor puede responder en el
acto, aunque no sea su turno. Si el ataque impacta, no hay réplica. La réplica es
gratuita, puede fallar y puede matar. Solo existe en melé con arma equipada; un
enemigo dormido no puede ser atacado cuerpo a cuerpo porque acercarse lo
despierta, y un enemigo que huye no replica salvo que esté acorralado.

La regla premia la precisión y castiga el ataque temerario. También cambia el
balance: un arma fiable vale más, y atacar a un enemigo con buena defensa es
peligroso.

# Enmienda a documentos vigentes

- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): el combate deja de ser una
  resolución aislada; un fallo cuerpo a cuerpo abre una reacción. El test de
  tiradas se acota a ataques sin réplica: un fallo con réplica añade las tiradas
  del defensor.
- [REQ-009](REQ-009-percepcion-alarma-huida.md): el enemigo que regresa a su
  puesto replica; el dormido no puede ser atacado cuerpo a cuerpo porque
  acercarse lo despierta. `R-008` se limita a ataques a distancia o mágicos.
- [REQ-017](REQ-017-feedback-visual-eventos.md): la réplica necesita un cue
  propio en la timeline, una fila en la matriz y una excepción al techo de 1,3 s.
  La animación es la de ataque con giro hacia el atacante y sin texto.
- [REQ-026](REQ-026-economia-acciones-rebalanceo.md): la réplica entra en el
  método de balance y puede consumir el turno del atacante si lo mata. El tope de
  4 acciones no limita las réplicas.

# Objetivos de experiencia

- Que fallar se sienta como un riesgo real, no como un turno perdido sin más.
- Que la precisión y la defensa ganen valor táctico.
- Que la respuesta sea inmediata y legible: se ve el fallo y se ve el contraataque.
- Que no haya bucles ni cadenas infinitas.
- Que el riesgo sea coherente con las reglas y se pueda consultar en la ayuda y
  el glosario, sin un indicador en el HUD.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Un ataque **cuerpo a cuerpo fallido** permite al defensor replicar de inmediato. Un ataque que impacta no genera réplica. | Impacto: sin réplica. Fallo: réplica del defensor. |
| R-002 | La réplica es **gratuita**: no gasta acción, maná ni recurso alguno. | Replicar no cambia el contador de acciones ni el maná del defensor. |
| R-003 | Cada fallo genera su propia réplica; dos ataques fallidos permiten dos réplicas. | Dos fallos en el mismo turno producen dos réplicas. |
| R-004 | La réplica solo existe en **cuerpo a cuerpo adyacente**; los ataques físicos a distancia y los mágicos no la generan. | Un arquero a distancia no recibe réplica; un ataque mágico tampoco. |
| R-005 | Solo replica quien puede hacer un ataque físico válido **con arma equipada**; sin arma no hay réplica. | Una unidad sin arma o con el arma desequipada no replica aunque esté adyacente. |
| R-006 | Un enemigo **que huye** no replica salvo que esté acorralado; uno que **regresa** a su puesto sí replica, sin reanudar la persecución. Un enemigo **dormido** no puede ser atacado cuerpo a cuerpo: acercarse lo despierta, porque la visión es de 360° y la adyacencia queda siempre dentro de su radio y su línea de visión. | Tests de huida, acorralado y regreso. El dormido no es atacable en melé y no existe réplica de dormido. |
| R-007 | La réplica es una tirada de ataque normal con el equipo del defensor: puede impactar o fallar, y puede matar. Usa la misma fórmula y el mismo RNG, pero no reutiliza la tirada del ataque fallido. | Se usa la misma fórmula y el mismo RNG; un impacto letal mata al atacante; el orden es ataque y luego réplica. |
| R-008 | **No hay cadena**: si la réplica falla, el atacante original no replica de vuelta. | Un fallo en la réplica termina la secuencia. |
| R-009 | La réplica se resuelve **inmediatamente** tras el fallo, antes de la siguiente acción del atacante. | El estado y el feedback reflejan la réplica antes de continuar el turno. |
| R-010 | La réplica no crea estados pendientes ni se guarda como acción en curso; es una reacción atómica. | Cargar una partida no reproduce réplicas pendientes. |
| R-011 | Una penalización de −1 a la tirada de réplica queda como **regla futura**, no de este corte. | No se aplica en la implementación inicial. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El resolvedor de combate, tras un fallo cuerpo a cuerpo, emite un evento de réplica y resuelve un ataque del defensor al atacante con la misma fórmula, en el orden ataque → réplica y sin reutilizar tiradas. | Tests unitarios: impacto sin réplica; fallo sin réplica si el defensor no es elegible; fallo con réplica; réplica con impacto y con fallo; orden de tiradas y de eventos. |
| T-002 | La réplica no consume acciones, maná ni MP, y no recursa: una réplica fallida no dispara otra. | Tests de contadores intactos y de ausencia de bucle. |
| T-003 | Si la réplica mata al atacante, este no puede seguir actuando: sus acciones restantes se descartan y, si es el jugador, la partida termina. | Test: atacante con 2 acciones muere en la primera; la segunda no se ejecuta. |
| T-004 | La elegibilidad del defensor se valida antes de resolver: arma equipada, estado (alerta, regresando o huyendo acorralado), adyacencia y tipo de ataque. | Tests de unidad sin arma o desequipada, en huida, acorralada, regresando, a distancia y con ataque mágico; un dormido no es atacable en melé. |
| T-005 | La IA enemiga no cambia de objetivo por la réplica en este corte; un enemigo que regresa sigue regresando aunque replique, y el riesgo entra en el balance de `REQ-026`. | La IA sigue determinista; el experimento de balance mide el efecto. |
| T-006 | La presentación de la réplica usa la misma animación de ataque con giro hacia el atacante y sin texto; tiene un cue propio en la timeline y el orden inmediato tras el fallo la distingue. `REQ-017` añade la fila, el beat y la excepción al techo de 1,3 s. | La QA visual muestra el giro y la secuencia; el E2E verifica el evento de réplica entre el fallo y la siguiente acción. |
| T-007 | Tests nuevos: impacto sin réplica; fallo con réplica; dos fallos; réplica letal; réplica fallida; sin arma; huida; acorralado; regreso; ataque a distancia; ataque mágico; orden de tiradas y determinismo. | `pnpm run verify` pasa; los tests de `REQ-010` y `REQ-017` conservan su intención; el test de tiradas de `REQ-010` se acota a ataques sin réplica. |
| T-008 | Se actualizan economía de turno, arquitectura y glosario; se registra un ADR de la réplica y se anotan las enmiendas a `REQ-009`, `REQ-010` y `REQ-017`. | `docs:check` pasa; el glosario define "réplica" y su elegibilidad. |
| T-009 | Sin dependencias nuevas, sin red y sin arte final. | `package.json` y `pnpm-lock.yaml` no cambian. |

# Requisitos no funcionales

- **Ritmo:** cada réplica añade un beat; la fase enemiga puede alargarse. Con el
  balance v1, una fase enemiga completa puede generar varias réplicas si todos
  atacan. Se mide con `REQ-017` y `EXP-003` v2.
- **Legibilidad:** el jugador distingue una réplica por el giro del defensor y su
  aparición inmediata tras el fallo, sin texto.
- **Accesibilidad:** la regla se explica en la ayuda y el glosario; el HUD no
  muestra probabilidad ni aviso por ataque. El juego sigue siendo operable solo
  con teclado.
- **Mantenibilidad:** una única función de ataque reutilizada por ataque y
  réplica.
- **Balance:** la réplica favorece la precisión y la defensa; se mide con el
  método de `REQ-026` y se revisa en `EXP-003` v2.

# Dependencias

- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): fórmula de ataque y
  equipo.
- [REQ-009](REQ-009-percepcion-alarma-huida.md): estados dormido, alerta,
  regreso y huida.
- [REQ-017](REQ-017-feedback-visual-eventos.md): beats y feedback.
- [REQ-026](REQ-026-economia-acciones-rebalanceo.md): acciones y rebalanceo.
- [REQ-004](REQ-004-cursor-seleccion.md): cursor, objetivo y acción Moverse sobre
  enemigo; no se añade aviso de riesgo.

# Fuera de alcance

- Réplica a distancia o mágica.
- Penalización de −1 al acierto de la réplica.
- Réplica de oportunidad al moverse o huir.
- Cadenas de réplicas.
- IA que planifique explícitamente el riesgo de réplica; solo lo mide el balance.
- Aviso, probabilidad o indicador de réplica en el HUD.
- Arte, texto y audio propios de la réplica.

# Preguntas abiertas

Ninguna. Cerradas el 2026-11-11: no hay aviso de riesgo en el HUD; la réplica se
dispara siempre con un fallo y la elegibilidad cubre alerta, regreso y huida
acorralada; el dormido no es atacable en melé; sin arma equipada no hay réplica;
la presentación reutiliza la animación con giro y sin texto; las réplicas no
comparten el tope de 4 acciones.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-11 | Solo un ataque cuerpo a cuerpo fallido genera réplica; un impacto no. | human:simon | aceptada |
| 2026-11-11 | La réplica es gratuita, inmediata, sin cadena y puede matar. | human:simon | aceptada |
| 2026-11-11 | Cada fallo genera su réplica; dos fallos, dos réplicas. | human:simon | aceptada |
| 2026-11-11 | Solo cuerpo a cuerpo, con arma; dormido sí, huyendo no salvo acorralado. | human:simon | sustituida |
| 2026-11-11 | El −1 al acierto de la réplica queda como regla futura. | human:simon | aplazada |
| 2026-11-11 | La réplica usa la misma fórmula y el mismo RNG, pero no reutiliza la tirada del ataque fallido. | human:simon | aceptada |
| 2026-11-11 | El dormido no es atacable cuerpo a cuerpo: acercarse lo despierta. El que regresa sí replica, sin reanudar la persecución. | human:simon | aceptada (sustituye la fila de estados) |
| 2026-11-11 | Sin aviso ni probabilidad de réplica en el HUD; la regla se explica en la ayuda y el glosario. | human:simon | aceptada |
| 2026-11-11 | La réplica reutiliza la animación de ataque con giro hacia el atacante y sin texto; cue propio en la timeline. | human:simon | aceptada |
| 2026-11-11 | Las réplicas no comparten el tope de 4 acciones; cada fallo replica. | human:simon | aceptada |
| 2026-11-11 | Se acota el test de tiradas de `REQ-010` a ataques sin réplica y se aclara `REQ-009` R-008. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] El usuario ha revisado el texto de la hoja.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] No hay contradicciones abiertas: `REQ-009` y `REQ-010` quedan enmendados;
      `REQ-017` queda declarado para la tarea de presentación.
- [x] El grafo de tareas es posible; el rebalanceo queda como tarea de `EXP-003`
      v2.
