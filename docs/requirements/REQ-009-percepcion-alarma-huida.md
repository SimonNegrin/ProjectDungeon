---
type: Requirement Sheet
id: REQ-009
title: Percepción, alarma y huida enemiga
description: Campo de visión con línea de visión, activación por pasos, alarma de una onda y huida determinista del perfil cobarde, con un bestiario mínimo de 4 enemigos.
status: stable
version: 3
decision_owner: human:simon
review_required: true
created_at: 2026-11-08T14:57:04Z
updated_at: 2026-11-08T20:31:53Z
related_tasks: [TASK-0034, TASK-0035, TASK-0036, TASK-0037, TASK-0038, TASK-0039]
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T20:29:01Z }
verified:
  - by: human:simon
    at: 2026-11-08T20:29:01Z
    note: >-
      Aprueba el bestiario y los radios (Centinela/Bruto/Cobarde, visión 6/4/5,
      alarma 8), los 4 enemigos de la semilla de referencia, el uso de los 4 MP
      en alerta y huida, el feedback, el daño como despertador y la huida
      determinista al 40 %. Cierra la memoria en 3 fases totales (2 investigando
      y 1 volviendo) y deja la hoja stable.
---

# Contexto

La IA actual es una persecución permanente: todos los enemigos conocen al
jugador desde el primer turno, eligen al más cercano, atacan si están en
adyacencia y, si no, avanzan un tile. No hay percepción, no hay sorpresa y no
hay forma de evitar un combate salvo matar.

Este corte introduce tres comportamientos:

- **Centinela dormido**: el enemigo no reacciona hasta que ve al jugador.
- **Alarma**: el que ve avisa a los enemigos cercanos, que acuden al combate.
- **Huida**: un perfil cobarde puede escapar si recibe mucho daño en poco tiempo.

Hoy solo existe un enemigo en la partida. Sin varios enemigos no se puede
validar la alarma, y sin perfiles no se puede cumplir que solo algunos huyan.
Por eso el corte incluye un bestiario mínimo de 4 enemigos y dos perfiles
(valiente y cobarde).

La hoja está **cerrada** como `stable` v3. La percepción, la alarma y la huida
están decididas; el umbral del 40 % y la probabilidad por arma salen de la tabla
A de [REQ-010](REQ-010-combate-equipo-acierto-defensa.md). Este corte no cambia
los valores de combate ni la economía de turno.

# Objetivos de experiencia

- Sentir que la mazmorra está habitada: hay centinelas que vigilan y no todos
  corren hacia el jugador al empezar.
- Poder evitar un combate leyendo la línea de visión, las esquinas y los
  pasillos, sin una mecánica de sigilo aparte.
- Entender al instante por qué un enemigo se despierta: lo ha visto o le han
  avisado.
- Vivir la escalada de la alarma: un error activa a un grupo, no al mapa entero.
- Leer qué enemigo es cobarde y decidir si perseguirlo o dejar que huya.
- No confundir la información de debug con reglas de juego.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | La visión es de 360° con línea de visión: un enemigo ve a un jugador vivo si está dentro de su radio y una línea de Bresenham entre ambos no cruza un muro. Las unidades no bloquean la visión. | Con un muro entre ambos no hay detección; sin muro y dentro del radio, sí; dos enemigos alineados no se tapan entre sí. |
| R-002 | Cada tipo de enemigo tiene un radio de visión propio, definido en una tabla única de bestiario. | Cambiar el radio de un tipo no cambia el de los demás; un test comprueba cada valor de la tabla. |
| R-003 | Los enemigos empiezan dormidos: no se mueven, no atacan y no patrullan hasta ver a un jugador o recibir una alerta. | En el turno 1, sin visión, el enemigo no cambia de posición ni ataca; el estado se conserva entre turnos. |
| R-004 | La detección se evalúa tras cada paso individual del jugador, no solo al cerrar el turno. Cruzar una línea de visión activa al enemigo aunque el jugador termine fuera de ella. | Un `MoveTo` que cruza la vista y acaba tras un muro deja al enemigo alertado y emite la detección en el paso correcto. |
| R-005 | Al ver a un jugador, el enemigo pasa a alerta y guarda la última posición conocida. Si deja de verlo, se dirige a esa posición e investiga hasta 2 fases enemigas; en la tercera vuelve a su puesto y se duerme al llegar. Si no llega, sigue volviendo sin atacar hasta su puesto. | El enemigo llega al último punto visto, investiga hasta 2 fases y en la tercera regresa; si vuelve a ver al jugador, reinicia la memoria. |
| R-006 | Al ver por primera vez en un episodio, el enemigo da la alarma: una onda de radio 8 desde su posición que no requiere línea de visión y no se propaga en cadena. Los enemigos dentro de la onda que no lo habían visto pasan a alerta y acuden a la última posición conocida. | Un enemigo a 8 tiles tras un muro se alerta; uno a 9 no; un alertado no genera una segunda onda; el aviso no atraviesa el mapa entero. |
| R-007 | La alerta se enfría tras 3 fases enemigas sin ver al jugador y sin recibir daño: en las 2 primeras se dirige a la última posición conocida y la investiga; en la tercera vuelve a su puesto. Al enfriarse deja de perseguir y de atacar; si no está en su puesto, lo alcanza sin atacar y se duerme al llegar. | Tres fases sin contacto devuelven al enemigo a su puesto y lo duermen; una nueva visión reinicia el contador; recibir daño también lo reinicia y lo devuelve a alerta. |
| R-008 | Recibir daño despierta y alerta a un enemigo dormido aunque no haya visto al jugador; guarda como última posición conocida la del atacante y, si sobrevive, da la alarma. | Atacar a un centinela desde fuera de su visión lo alerta, guarda la posición del atacante y activa a los enemigos dentro de su radio. |
| R-009 | Solo el perfil cobarde huye. Huye de forma determinista cuando un golpe le quita al menos el 40 % de su vida máxima y sobrevive; no hay tirada adicional de moral ni de huida. Si se acorrala, lucha. No desaparece del mapa ni se rinde. Mientras la alerta siga activa, si ve a un jugador elige la casilla alcanzable que maximiza la distancia y rompe la línea de visión; si no ve a ninguno, vuelve a su puesto. Al enfriarse la alerta se duerme allí. | Con 8 PV el umbral es 4 de daño; un impacto que lo cruce hace huir. La probabilidad de que un impacto ya conectado cruce el umbral con la tabla A de [REQ-010](REQ-010-combate-equipo-acierto-defensa.md) es 72 % con espada, 92 % con hacha y 58 % con daga contra armadura 0. El valiente nunca huye; el cobarde acorralado ataca; sigue vivo y cuenta para la victoria; un nuevo golpe que cruce el umbral renueva la huida. |
| R-010 | El bestiario mínimo de este corte es de 4 enemigos y 2 perfiles: valiente y cobarde. La semilla de referencia coloca 2 centinelas, 1 bruto y 1 cobarde. Aparecen en salas distintas, ninguno dentro de la visión inicial del jugador, y al menos una pareja queda dentro del radio de alarma para poder probarla. | La semilla de referencia coloca 4 enemigos en salas distintas; ninguno ve al jugador al inicio; hay al menos una pareja a ≤8 tiles y un enemigo a >8 de los demás. |
| R-011 | El enemigo que ve al jugador muestra un "!" sobre su cabeza y el host muestra un aviso breve de alarma. Los radios de visión y alarma solo se dibujan en el overlay de debug `F1`. | El "!" aparece en el paso de detección y desaparece al enfriarse la alerta; el aviso no bloquea el juego; sin `F1` no se dibujan radios. |
| R-012 | La presentación no revela el estado interno de todos los enemigos: en juego normal solo se ve el "!" del que detecta y el aviso de alarma. | El estado de alerta, la última posición conocida y los radios quedan en `F1`; no hay líneas de visión permanentes. |

## Bestiario mínimo

| Tipo | Perfil | Visión | Alarma | Papel | Unidades |
|---|---|---:|---:|---|---:|
| Centinela | Valiente | 6 | 8 | Guardia estándar; ve, persigue y avisa. | 2 |
| Bruto | Valiente | 4 | 8 | Poco perceptivo; castiga el contacto y depende de la alarma. | 1 |
| Cobarde | Cobarde | 5 | 8 | Huye al cruzar el umbral; acorralado, lucha. | 1 |

Total: 4 enemigos, 3 valientes y 1 cobarde. Los nombres y roles quedan fijados
en este corte; los sprites y el arte final siguen provisionales y fuera de
alcance. Las PV, el arma, la armadura y el escudo de cada tipo viven en
[REQ-010](REQ-010-combate-equipo-acierto-defensa.md). La visión es 6/4/5 y el
radio de alarma es 8 para todos; cambiarlo exige una nueva versión de la hoja.

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | La percepción vive en un módulo puro de `src/game/`: radio por tipo, línea de visión de Bresenham, estados de alerta, regreso y memoria. No conoce DOM, Canvas, red ni relojes. | Tests unitarios importan el módulo sin DOM; las funciones son puras y deterministas. |
| T-002 | La detección se evalúa tras cada paso aceptado de `Move` y `MoveTo`; no consume MP ni acción y emite un evento ordenado por paso. | Un movimiento de 3 pasos que cruza una vista emite la detección en el paso correcto; el MP y la acción no cambian por ser visto. |
| T-003 | El estado del enemigo añade `awareness` (`dormant` / `alert` / `returning`), `fleeing`, `home`, `lastKnown`, `alertTurns` y `hasShouted`; es serializable y `window.__game.snapshot()` lo expone en solo lectura. | El snapshot muestra el estado, la huida, el puesto y la última posición conocida; dos llamadas seguidas coinciden; no hay mutadores expuestos. |
| T-004 | La alarma se resuelve en el instante de la detección: una onda desde el enemigo que ve, sin cadena, con orden determinista por índice. Los receptores vivos dentro del radio pasan o permanecen en alerta, comparten `lastKnown` y marcan `hasShouted` para no generar otra onda. Los alertados que aún no han actuado en la fase actual actúan; los que ya actuaron esperan al siguiente turno. | Dos ejecuciones idénticas dan el mismo conjunto de alertados; un enemigo que ya actuó no vuelve a actuar por ser alertado; ningún receptor genera una segunda onda en el mismo episodio. |
| T-005 | `planEnemyAction` distingue dormido (esperar), alerta (atacar si es adyacente; si no, gastar hasta todo el MP avanzando por BFS a `lastKnown` y atacar si termina adyacente y conserva la acción; si no hay ruta, esperar), regreso (volver a `home` sin atacar) y huida (plan del cobarde). Mantiene el desempate por índice. | Tests de los cuatro estados; el dormido no se mueve; el alertado converge a la última posición y ataca al llegar; el que regresa no ataca; el cobarde huye. |
| T-006 | La huida elige, entre las casillas alcanzables con el MP disponible, las que rompen la línea de visión de todos los jugadores visibles y maximizan la distancia al más cercano, con desempate determinista. Si ninguna rompe la visión, elige la que más se aleja; si no hay ninguna que mejore, se queda y ataca si está adyacente. Sin jugador visible, vuelve a `home`. | La ruta elegida rompe la visión; dos ejecuciones coinciden; acorralado, ataca en vez de esperar; sin visión, vuelve a su puesto. |
| T-007 | La colocación de 4 enemigos es determinista por semilla y se deriva del mapa: salas distintas, distancia mínima entre enemigos y al jugador, ninguna visión inicial, al menos una pareja dentro del radio de alarma y un enemigo fuera. | La semilla de referencia cumple todas las restricciones; otra semilla también; no se usa `Math.random`. |
| T-008 | El motor emite eventos de percepción (`EnemySpotted`, `AlarmRaised`, `EnemyFled`, `EnemyReturned` o equivalentes) para que el host presente el feedback y el E2E los verifique. | Los eventos aparecen en orden y con el `unitId` correcto; el host no necesita leer estado interno. |
| T-009 | Se actualizan la sección de IA de `docs/design/turn-economy.md`, el glosario y la arquitectura si procede; no se cambian los valores de combate ni la economía de turno. | `pnpm run docs:check` pasa; el diff de valores de combate está vacío. |
| T-010 | Tests nuevos: línea de visión, radios por tipo, detección por paso, memoria, alarma sin cadena, enfriamiento, daño, huida determinista, duración, uso de MP, colocación de 4 y determinismo. No se borran, saltan ni debilitan tests existentes. | `pnpm run verify` pasa; los tests existentes conservan su intención. |
| T-011 | Sin dependencias nuevas, sin red y sin cambios en el arte final; el motor sigue sin DOM y el host sigue siendo presentación. | `package.json` y `pnpm-lock.yaml` no cambian; no hay imports de `src/host/` en `src/game/`. |

# Requisitos no funcionales

- **Rendimiento:** 4 enemigos, línea de visión por paso y mapa de 32×32. El
  coste debe ser despreciable frente al render; objetivo de 60 fps. Medir antes
  y después.
- **Determinismo:** misma semilla, mismo estado y mismas entradas producen los
  mismos eventos y las mismas posiciones, incluida la alarma y la huida.
- **Accesibilidad:** la detección no se comunica solo por color: "!" y aviso de
  texto. Los radios quedan en `F1` para no saturar la pantalla.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables. Sin red ni persistencia.
- **Seguridad:** sin datos personales, sin red y sin nuevas dependencias.
- **Mantenibilidad:** una tabla de bestiario, un módulo de percepción puro y
  estados serializables; la IA sigue siendo determinista y testeable.

# Dependencias

- [REQ-003](REQ-003-generacion-mapa.md): salas, pasillos, puertas y apariciones
  del mapa generado.
- [REQ-005](REQ-005-viewport-impar-13.md): viewport de 13×13; una visión de 6
  equivale a media pantalla.
- [REQ-006](REQ-006-movimiento-animado.md): presentación paso a paso; la
  detección por paso se alinea con la animación.
- [REQ-001](REQ-001-primer-prototipo-local.md) y
  [REQ-002](REQ-002-encuadre-16-9.md): economía de turno y combate provisional.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): sprites
  placeholder; el sprite de cada tipo queda pendiente.
- [ADR-007](../decisions/ADR-007-map-generator.md): `MapGenerator` y datos de
  salas y apariciones.
- [ADR-008](../decisions/ADR-008-presentacion-animada.md): capas de presentación
  sobre un motor atómico.
- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): combate con equipo,
  estadísticas de cada tipo y umbral de huida. Está `stable`; esta hoja usa su
  tabla A.
- Puntos de integración previstos: `src/game/ai.ts`, `turn.ts`, `engine.ts`,
  `types.ts` y `map.ts`; `src/host/feedback.ts`, `debug.ts` y `renderer.ts`.

# Fuera de alcance

- Cono frontal, orientación, patrullas, oído, ruido, sigilo, camuflaje o
  escondites.
- Ataques a distancia, cobertura, hechizos y habilidades.
- Cadena de alarma, alarma global, refuerzos que aparecen o enemigos que
  despiertan a otros sin ver al jugador.
- Huida fuera del mapa, rendición, prisioneros, moral negociable o
  negociación.
- Tiradas adicionales de moral o de huida: la probabilidad emerge del daño y de
  la tabla A.
- Reequilibrio de combate: daño variable, ataque y defensa, armas y armadura.
  Va en la hoja anterior.
- Arte final, nuevos PNG y animaciones de los tipos.
- Hotseat, red, persistencia y guardado.

# Preguntas abiertas

Ninguna. Las decisiones de esta versión están registradas en la tabla siguiente.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-08 | Visión 360° con línea de visión; los muros bloquean y las unidades no. | human:simon | aceptada |
| 2026-11-08 | Visión variable por tipo; bestiario mínimo de 3-4 enemigos y 2 perfiles. La v3 fija 4. | human:simon | aceptada |
| 2026-11-08 | Detección en cada paso del jugador, no solo al cerrar el turno. | human:simon | aceptada |
| 2026-11-08 | Memoria: investiga la última posición conocida hasta 2 turnos. | human:simon | aceptada |
| 2026-11-08 | Alarma de una sola onda, sin cadena, hacia la última posición conocida. | human:simon | aceptada |
| 2026-11-08 | La alerta se enfría a los 3 turnos sin contacto. | human:simon | aceptada |
| 2026-11-08 | Huida: romper la línea de visión y alejarse; acorralado, lucha; no desaparece. | human:simon | aceptada |
| 2026-11-08 | El umbral de huida se fija con la hoja de combate. | human:simon | aceptada |
| 2026-11-08 | Umbral de huida: un golpe de al menos el 40 % de la vida máxima, sobreviviendo. | human:simon | aceptada |
| 2026-11-08 | Probabilidad de huida del cobarde con la tabla A: espada 72 %, hacha 92 %, daga 58 % contra armadura 0 (8 PV, umbral 4). | human:simon | aceptada |
| 2026-11-08 | Dejar `REQ-009` en borrador y abordar primero el combate. | human:simon | aceptada |
| 2026-11-08 | Bestiario definitivo: Centinela/Bruto/Cobarde, visión 6/4/5 y alarma 8; 4 enemigos en la semilla de referencia. | human:simon | aceptada |
| 2026-11-08 | Alerta y huida usan los 4 MP; el enemigo ataca al llegar si conserva la acción. | human:simon | aceptada |
| 2026-11-08 | Feedback: "!" sobre el que detecta, aviso breve y radios solo en `F1`. | human:simon | aceptada |
| 2026-11-08 | Atacar a un dormido lo despierta y, si sobrevive, da la alarma. | human:simon | aceptada |
| 2026-11-08 | Huida determinista al cruzar el 40 %; los porcentajes son la probabilidad de que un impacto cruce el umbral, sin tirada extra. | human:simon | aceptada |
| 2026-11-08 | La huida dura mientras la alerta siga activa; sin jugador visible vuelve al puesto y al enfriarse se duerme. | human:simon | aceptada |
| 2026-11-08 | Memoria y enfriamiento unificados: 3 fases totales, 2 investigando y 1 volviendo. | human:simon | aceptada |
| 2026-11-08 | Cerrar la hoja como `stable` v3 tras aprobar los puntos abiertos. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado el modelo de percepción y alarma.
- [x] El usuario ha aprobado la detección por pasos y la memoria de 2 turnos.
- [x] El usuario ha aprobado la alarma de una onda, la última posición y los
      3 turnos.
- [x] El usuario ha aprobado la huida del cobarde y que no desaparezca.
- [x] El usuario ha aprobado 4 enemigos y 2 perfiles en este corte.
- [x] El usuario ha aprobado el bestiario, los radios y el uso de los 4 MP.
- [x] El usuario ha aprobado el feedback y los radios solo en `F1`.
- [x] El usuario ha aprobado que el daño despierte y active la alarma.
- [x] El usuario ha aprobado la huida determinista y su duración.
- [x] La memoria y el enfriamiento quedan unificados en 3 fases.
- [x] El umbral y la probabilidad de huida están fijados con la tabla A.
- [x] Los requisitos son verificables en su totalidad.
- [x] No hay contradicciones abiertas.
- [x] Las dependencias están claras y se puede generar el grafo de tareas.
