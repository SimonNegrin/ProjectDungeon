---
type: Requirement Sheet
id: REQ-030
title: "Alcance visible de los hechizos"
description: "Contorno de las casillas que marcan el alcance máximo y mínimo de un hechizo, recortado por muros y línea de visión, mientras el jugador elige o apunta; mismas reglas de alcance, solo presentación."
status: draft
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-13T15:00:00Z
updated_at: 2026-11-13T15:00:00Z
related_tasks: []
related_requirements: [REQ-004, REQ-023, REQ-025, REQ-029]
related_decisions: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T15:00:00Z }
verified:
---

# Contexto

Lanzar un hechizo con `X` es a ciegas: mientras se apunta no hay ninguna señal de
hasta dónde llega el hechizo ni de qué casillas quedan bloqueadas por un muro. El
motor rechaza sin gastar maná ni acción, pero el jugador solo aprende el alcance
por ensayo, y los seis hechizos no se comportan igual.

Datos del corte actual:

- Alcance **Chebyshev** (cuadrado), con mínimo y máximo por hechizo: Eléctrico I
  1–3, Fuego II 1–3, Eléctrico III 1–4, Fuego IV 1–4, **Curación III 2–3** y
  **Resurrección IV 1–1**.
- La línea de visión es Bresenham contra muros; un muro intermedio bloquea.
- La lista de hechizos es un panel flotante (`Q`) que se superpone al escenario.
- El HUD de detalle bajo el cursor es REQ-023 y no se rediseña aquí.

La pieza se propone reutilizable para cuando existan **ataques a distancia**. Hoy
no existen: `ranged` está declarado como tipo de ataque, pero ningún arma declara
alcance y todo el combate es cuerpo a cuerpo.

# Objetivos de experiencia

- Que el jugador vea **antes de gastar** dónde llega el hechizo que va a lanzar.
- Que al recorrer la lista distinga hechizos por alcance sin memorizar cifras.
- Que el contorno explique el hueco del alcance mínimo (curación no alcanza una
  casilla adyacente).
- Que el mecanismo sirva después para los ataques a distancia sin rehacerlo.

# Relación con documentos vigentes

- **REQ-004** (cursor y camino): el contorno convive con el resaltado del camino
  y el cursor; no los sustituye.
- **REQ-023** (detalle bajo el cursor): el contorno es presentación del tablero,
  no una columna del HUD.
- **REQ-025** (magia): aporta los alcances y el objetivo de cada hechizo. Esta
  hoja no cambia ninguno.
- **REQ-029** (tipos de daño): no interviene; el contorno no muestra daño.

No enmienda ninguna hoja: solo añade presentación sobre reglas ya aprobadas.

# Requisitos creativos (propuestos, pendientes de aprobación)

| ID | Requisito | Cómo se comprueba |
|---|---|---|
| R-001 | El contorno se dibuja cuando hay un hechizo **en uso**: con la lista abierta se ve el del hechizo resaltado y cambia al mover la fila; con un hechizo elegido y la lista cerrada se ve mientras se apunta con `X`. | Abrir `Q`, recorrer la lista y ver cambiar el contorno; cerrar y comprobar que sigue el hechizo elegido. |
| R-002 | Se marca el **borde exterior** del alcance máximo y el **hueco interior** del mínimo; el área intermedia no se rellena. | Con Curación III (2–3) se ve un anillo, no un cuadrado lleno; con Resurrección IV se ve una sola casilla. |
| R-003 | El contorno **respeta muros y línea de visión**: marca lo que el motor aceptaría por distancia y visión, no un cuadrado geométrico abstracto. | Un muro entre el lanzador y una casilla del borde deja esa casilla fuera del contorno. |
| R-004 | La marca es una **línea por casilla del perímetro**, por encima del suelo y por debajo de unidades, cursor y feedback; color propio de magia y sin animación. | Capturas a 1280×720 y 900×700; el cursor y las unidades se leen por encima. |
| R-005 | Si el hechizo resaltado **no es lanzable** (nivel, maná o tope), el contorno se atenúa en gris en vez de desaparecer. | Con maná insuficiente el contorno sigue visible, apagado, y la fila muestra su motivo. |
| R-006 | **No cambia ninguna regla**: alcance, coste, maná, LOS, objetivo y tope siguen exactamente igual. | Los tests de alcance y rechazo existentes pasan sin cambios. |
| R-007 | El mecanismo es **reutilizable**: recibe origen, alcance mínimo y máximo y línea de visión, y no conoce hechizos. Los ataques a distancia lo usarán cuando existan; esta hoja no añade UI de ataque. | El cálculo se prueba sin catálogo de hechizos; no hay cambios en el comando `Attack`. |
| R-008 | El contorno no tapa la lista de hechizos ni el HUD, y se ve completo en las dos resoluciones de QA. | Capturas en ambas resoluciones. |

# Requisitos técnicos (borrador)

- T-001: modelo de presentación puro y testeable que devuelve las casillas del
  borde exterior y del hueco interior; sin DOM en el cálculo.
- T-002: la capa visual reutiliza el overlay del tablero; sin canvas nuevo, sin
  arte y sin dependencias nuevas.
- T-003: se recalcula al abrir o cerrar la lista, al mover la fila, al cambiar de
  hechizo y al mover el cursor; no hay trabajo por fotograma.
- T-004: el cálculo usa las mismas funciones de distancia y visión que el motor
  (`magic.ts` y `perception.ts`) para no duplicar reglas.

# Requisitos no funcionales

- N-001: el contorno no introduce retraso perceptible al abrir la lista ni al
  apuntar con el cursor.
- N-002: la información no depende solo del color; la lista sigue mostrando
  nivel, coste y disponibilidad con texto.
- N-003: con `prefers-reduced-motion` no hay diferencia, porque no hay animación.

# Fuera de alcance

- **Avisos de rechazo con texto propio** (maná, nivel, alcance, LOS, tope,
  objetivo ausente, muerto, aliado): se aplazan. Hoy el motor rechaza sin
  consumir y el HUD mantiene el aviso genérico.
- **Sonido** asociado a rechazos o a lanzamientos.
- **Ataques a distancia jugables** y su previsualización.
- Cambiar alcance, objetivo, coste, LOS o el tope de hechizos.
- Relleno del área, iconos, arte nuevo o animación del contorno.
- Mostrar el alcance de los enemigos o de la IA.

# Preguntas abiertas

- **P-001.** El criterio «el jugador no puede lanzar el hechizo a una casilla que
  no esté ocupada por un adversario»: ¿es una regla nueva o describe el rechazo
  actual? Aplicado literal choca con Curación III (objetivo aliado) y
  Resurrección IV (objetivo cadáver); si solo vale para hechizos de daño, ya es
  el comportamiento actual y no requiere cambios.
- **P-002.** ¿Se muestra el contorno solo con la lista abierta, también mientras
  se apunta con `X`, o solo al apuntar? Se propone lo primero y lo segundo.
- **P-003.** ¿Contorno recortado por muros y LOS (fiel al motor, puede quedar
  irregular) o cuadrado geométrico del alcance con los muros marcados de otra
  forma? Se propone el recortado.
- **P-004.** ¿El alcance mínimo se marca como hueco interior en todos los
  hechizos o solo cuando es mayor que 1?
- **P-005.** ¿El estado no lanzable se atenúa en gris, se dibuja igual que uno
  lanzable o no se dibuja?
- **P-006.** ¿Un color para todos los hechizos o color por familia (eléctrico,
  fuego, vida)?
- **P-007.** ¿Se dibuja también para el hechizo elegido cuando la lista está
  cerrada pero la fase ya no es del jugador, o el contorno desaparece con el
  turno?

# Decisiones

| Fecha | Decisión | Quién |
|---|---|---|
| 2026-11-13 | La hoja se abre como borrador con las preguntas anteriores. | human:simon |
| 2026-11-13 | Los avisos de rechazo con texto propio y el sonido quedan fuera de esta hoja. | human:simon |

# Aceptación de la hoja

Pendiente. Se acepta cuando el usuario resuelva P-001 a P-007; después se crean
las tareas de presentación, tests y QA visual.
