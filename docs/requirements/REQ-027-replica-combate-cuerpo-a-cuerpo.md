---
type: Requirement Sheet
id: REQ-027
title: Réplica en combate cuerpo a cuerpo
description: "Un ataque cuerpo a cuerpo fallido permite al defensor replicar de inmediato, gratis, sin cadena y con la misma tirada de ataque."
status: draft
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-11T15:10:00Z
updated_at: 2026-11-11T15:10:00Z
related_tasks: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T15:10:00Z }
verified:
---

# Contexto

El usuario quiere que fallar un ataque tenga consecuencias inmediatas: si un
personaje ataca cuerpo a cuerpo y **falla**, el defensor puede responder en el
acto, aunque no sea su turno. Si el ataque impacta, no hay réplica. La réplica es
gratuita, puede fallar y puede matar.

La regla premia la precisión y castiga el ataque temerario. También cambia el
balance: un arma fiable vale más, y atacar a un enemigo con buena defensa es
peligroso.

# Enmienda a documentos vigentes

- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): el combate deja de ser una
  resolución aislada; un fallo cuerpo a cuerpo abre una reacción.
- [REQ-009](REQ-009-percepcion-alarma-huida.md): un enemigo dormido atacado
  replica al despertar; la IA debe asumir el riesgo de fallar.
- [REQ-017](REQ-017-feedback-visual-eventos.md): la réplica necesita beat,
  feedback y un anclaje propio.
- [REQ-026](REQ-026-economia-acciones-rebalanceo.md): la réplica entra en el
  método de balance y puede consumir el turno del atacante si lo mata.

# Objetivos de experiencia

- Que fallar se sienta como un riesgo real, no como un turno perdido sin más.
- Que la precisión y la defensa ganen valor táctico.
- Que la respuesta sea inmediata y legible: se ve el fallo y se ve el contraataque.
- Que no haya bucles ni cadenas infinitas.
- Que el jugador pueda anticipar el riesgo antes de atacar.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Un ataque **cuerpo a cuerpo fallido** permite al defensor replicar de inmediato. Un ataque que impacta no genera réplica. | Impacto: sin réplica. Fallo: réplica del defensor. |
| R-002 | La réplica es **gratuita**: no gasta acción, maná ni recurso alguno. | Replicar no cambia el contador de acciones ni el maná del defensor. |
| R-003 | Cada fallo genera su propia réplica; dos ataques fallidos permiten dos réplicas. | Dos fallos en el mismo turno producen dos réplicas. |
| R-004 | La réplica solo existe en **cuerpo a cuerpo adyacente**; los ataques físicos a distancia y los mágicos no la generan. | Un arquero a distancia no recibe réplica; un ataque mágico tampoco. |
| R-005 | Solo replica quien puede hacer un ataque físico válido **con arma**; sin arma no hay réplica. | Una unidad sin arma no replica aunque esté adyacente. |
| R-006 | Un enemigo **dormido** atacado replica al instante; uno **que huye** no replica salvo que esté acorralado. | Tests de estado dormido, alerta, huida y acorralado. |
| R-007 | La réplica es una tirada de ataque normal con el equipo del defensor: puede impactar o fallar, y puede matar. | Se usa la misma fórmula y el mismo RNG; un impacto letal mata al atacante. |
| R-008 | **No hay cadena**: si la réplica falla, el atacante original no replica de vuelta. | Un fallo en la réplica termina la secuencia. |
| R-009 | La réplica se resuelve **inmediatamente** tras el fallo, antes de la siguiente acción del atacante. | El estado y el feedback reflejan la réplica antes de continuar el turno. |
| R-010 | La réplica no crea estados pendientes ni se guarda como acción en curso; es una reacción atómica. | Cargar una partida no reproduce réplicas pendientes. |
| R-011 | Una penalización de −1 a la tirada de réplica queda como **regla futura**, no de este corte. | No se aplica en la implementación inicial. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El resolvedor de combate, tras un fallo cuerpo a cuerpo, emite un evento de réplica y resuelve un ataque del defensor al atacante con la misma fórmula. | Tests unitarios: impacto sin réplica; fallo con réplica; réplica con impacto y con fallo. |
| T-002 | La réplica no consume acciones, maná ni MP, y no recursa: una réplica fallida no dispara otra. | Tests de contadores intactos y de ausencia de bucle. |
| T-003 | Si la réplica mata al atacante, el turno del atacante termina y no se ejecutan sus acciones restantes. | Test: atacante con 2 acciones muere en la primera; la segunda no se ejecuta. |
| T-004 | La elegibilidad del defensor se valida antes de resolver: arma, estado, adyacencia y tipo de ataque. | Tests de unidad sin arma, en huida, a distancia y con ataque mágico. |
| T-005 | La IA enemiga no cambia de objetivo por la réplica en este corte, pero el riesgo entra en el balance de `REQ-026`. | La IA sigue determinista; el experimento de balance mide el efecto. |
| T-006 | La presentación de la réplica tiene beat propio y se distingue del ataque normal. | `REQ-017` añade la cue; la QA visual la muestra. |
| T-007 | Tests nuevos: impacto, fallo, dos fallos, réplica letal, réplica fallida, sin arma, huida, dormido y ataque a distancia. | `pnpm run verify` pasa; los tests de `REQ-010` y `REQ-017` conservan su intención. |
| T-008 | Se actualizan economía de turno, arquitectura y glosario; se registra un ADR de la réplica. | `docs:check` pasa; el glosario define "réplica". |
| T-009 | Sin dependencias nuevas, sin red y sin arte final. | `package.json` y `pnpm-lock.yaml` no cambian. |

# Requisitos no funcionales

- **Ritmo:** cada réplica añade un beat; la fase enemiga puede alargarse. Se mide
  con `REQ-017`.
- **Legibilidad:** el jugador distingue un ataque normal de una réplica.
- **Accesibilidad:** el aviso de riesgo se explica con texto antes del ataque.
- **Mantenibilidad:** una única función de ataque reutilizada por ataque y
  réplica.
- **Balance:** la réplica favorece la precisión y la defensa; se mide con el
  método de `REQ-026`.

# Dependencias

- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): fórmula de ataque y
  equipo.
- [REQ-009](REQ-009-percepcion-alarma-huida.md): estados dormido, alerta y huida.
- [REQ-017](REQ-017-feedback-visual-eventos.md): beats y feedback.
- [REQ-026](REQ-026-economia-acciones-rebalanceo.md): acciones y rebalanceo.
- [REQ-004](REQ-004-cursor-seleccion.md): aviso de riesgo en acciones por destino.

# Fuera de alcance

- Réplica a distancia o mágica.
- Penalización de −1 al acierto de la réplica.
- Réplica de oportunidad al moverse o huir.
- Cadenas de réplicas.
- IA que planifique explícitamente el riesgo de réplica; solo lo mide el balance.
- Arte y audio de la réplica.

# Preguntas abiertas

1. **Aviso previo.** ¿El HUD muestra la probabilidad de réplica antes de atacar o
   solo el riesgo cualitativo?
2. **Estados.** ¿Un enemigo acorralado que huye replica siempre o solo si el
   ataque falla? Provisional: solo si falla, como el resto.
3. **Armas futuras.** ¿Una unidad sin arma pero con ataque mágico cuerpo a cuerpo
   replica? Provisional: no; la réplica exige ataque físico con arma.
4. **Presentación.** ¿La réplica usa el mismo sprite de ataque o uno propio?
5. **Tope de réplicas.** ¿El tope de 4 acciones limita también las réplicas por
   turno o son independientes? Provisional: independientes; cada fallo replica.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-11 | Solo un ataque cuerpo a cuerpo fallido genera réplica; un impacto no. | human:simon | aceptada |
| 2026-11-11 | La réplica es gratuita, inmediata, sin cadena y puede matar. | human:simon | aceptada |
| 2026-11-11 | Cada fallo genera su réplica; dos fallos, dos réplicas. | human:simon | aceptada |
| 2026-11-11 | Solo cuerpo a cuerpo, con arma; dormido sí, huyendo no salvo acorralado. | human:simon | aceptada |
| 2026-11-11 | El −1 al acierto de la réplica queda como regla futura. | human:simon | provisional |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [ ] El usuario ha revisado el texto de la hoja.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [ ] El grafo de tareas es posible; depende de `REQ-026` y del rebalanceo.
