---
type: Requirement Sheet
id: REQ-028
title: "Ajuste interactivo de balance de enemigos y armas"
description: "Mesa de EXP-003 con objetivos de victoria editables por enemigo, editor expandible de stats compartidos y tabla global de armas para afinar el win % y diagnosticar desviaciones."
status: stable
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-11T20:15:00Z
updated_at: 2026-11-11T20:15:00Z
related_tasks: [TASK-0066, TASK-0067, TASK-0068]
related_requirements: [REQ-010, REQ-015, REQ-026, REQ-027]
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T20:15:00Z }
verified:
  - by: human:simon
    at: 2026-11-11T20:15:00Z
    note: >-
      Aprueba la mesa de ajuste: enemigo compartido, armas globales, editor
      expandible, recálculo de solo las filas afectadas y objetivos de victoria
      editables por el usuario en la propia tabla. La guía 75/85/30 es solo un
      punto de partida; el diagnóstico 4-de-4 no aprueba ni bloquea. El análisis
      de problemas de los objetivos elegidos se hará al volver con los
      resultados.
---

# Contexto

La v2.0 de [EXP-003](../../experiments/EXP-003-mesa-combate/experiment.md) mide
12 emparejamientos 1v1 con 1.000 duelos cada uno. Los 12 quedan entre el 96,3 % y
el 100 % de victorias del héroe: el catálogo actual no está equilibrado y el TTK
es de 1–2 rondas. La mesa actual solo muestra resultados; para probar un valor hay
que editar el catálogo y volver a ejecutar.

El usuario necesita convertir la mesa en un **banco de ajuste**: editar los stats
de enemigos y armas desde la propia tabla, ver el efecto en el win % y afinar
hasta que cada enemigo se acerque al objetivo que él mismo elija. El objetivo no
es aprobar un balance automáticamente, sino explorar y llevarse un candidato
reproducible para analizarlo después.

La guía inicial de objetivos es **75 % Centinela, 85 % Cobarde y 30 % Bruto**,
pero es solo un punto de partida editable. El usuario puede fijar otros valores.
La elección de objetivos es una decisión creativa suya, no de la herramienta.

# Relación con documentos vigentes

- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): no cambia fórmulas ni
  valores. La mesa permite explorar los stats de armas, armaduras, escudos y
  enemigos con las reglas ya vigentes.
- [REQ-015](REQ-015-roster-arquetipos.md): concreta el método de balance por
  porcentaje de victorias con una herramienta de ajuste y diagnóstico.
- [REQ-026](REQ-026-economia-acciones-rebalanceo.md): da soporte al rebalanceo de
  acciones y stats; no modifica la economía de acciones.
- [REQ-027](REQ-027-replica-combate-cuerpo-a-cuerpo.md): la réplica sigue
  midiéndose con las mismas reglas; la mesa no la altera.
- **EXP-003**: la página gana el banco de ajuste. El motor de duelo, el escenario
  1D y los 12 emparejamientos no cambian.

# Objetivos de experiencia

- Ajustar un stat y ver el nuevo win % sin editar código ni recargar la página.
- Entender de un vistazo si el enemigo está cerca del objetivo elegido, cuánto
  falta y qué héroes quedan fuera.
- Poder expresar roles distintos: un enemigo fácil individualmente pero peligroso
  en número, y otro que exige ataque coordinado en grupo.
- Detectar cuándo un objetivo no es alcanzable con un solo bloque de stats
  compartido o cuándo un arma global mueve a los dos bandos.
- Salir con un export reproducible del catálogo ajustado, los objetivos elegidos
  y el diagnóstico, para analizarlo en la siguiente sesión.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | El **objetivo de victorias del héroe** se define por enemigo y es editable en la tabla. Se aplica a sus cuatro filas (Guerrero, Pícaro, Mago y Clérigo). | Cada enemigo tiene un campo de objetivo entero entre 0 y 100; cambiarlo actualiza su objetivo y el diagnóstico de sus cuatro filas. |
| R-002 | Los valores de guía iniciales son **75 % Centinela, 85 % Cobarde y 30 % Bruto**, pero no son normativos. | La página arranca con esa guía; el usuario puede cambiarla y restablecerla sin editar código. |
| R-003 | Los stats del enemigo son un **bloque compartido**: editar el Centinela cambia sus cuatro filas, no una copia por fila. | Cambiar PV, stats o equipo de un enemigo recalcula exclusivamente sus cuatro emparejamientos. |
| R-004 | Las armas son **globales**: acierto y daño de un arma afectan a todos los combatientes que la equipan. | La tabla de armas muestra qué unidades usan cada arma; cambiar la espada recalcula los emparejamientos de Guerrero y Centinela. |
| R-005 | El editor vive en una **fila expandible** por emparejamiento. La tabla de resultados sigue legible y una acción «Ajustar» abre el editor del enemigo y de su arma. | La fila muestra un botón «Ajustar»; al abrirlo aparecen todos los stats editables y el arma equipada. |
| R-006 | Son editables, como mínimo: **PV, habilidad, fuerza, defensa, resistencia, acciones, armadura, escudo y arma equipada** del enemigo; **acierto y daño** de cada arma. | Todos los campos existen en el editor y modifican la simulación; no hay stats «de adorno». |
| R-007 | Cada fila muestra **objetivo, win % real, delta y estado** respecto al margen de referencia de **±5 pp**. | La fila indica, por ejemplo, «objetivo 75 %, real 71,2 %, −3,8 pp, dentro» o «fuera». |
| R-008 | Cada enemigo muestra un **diagnóstico 4-de-4**: cuántas de sus cuatro filas están dentro del margen y cuáles quedan fuera. | El panel del enemigo muestra «4/4 dentro» o «3/4; Mago fuera por +7,1 pp» con los héroe e importes concretos. |
| R-009 | El 4-de-4 es **diagnóstico, no aprobación**. La herramienta no bloquea, no corrige stats y no declara el balance aprobado. | Aunque queden filas fuera, se puede seguir editando, exportar y restablecer. |
| R-010 | La herramienta señala **problemáticas** de los objetivos elegidos: dispersión entre héroes, fila imposible con el bloque compartido y efecto de un arma global sobre ambos bandos. La coherencia con el rol del enemigo se interpreta en la sesión posterior, no la decide la herramienta. | El diagnóstico incluye avisos legibles y el export los conserva; no se inventan causas ni se cambian valores automáticamente. |
| R-011 | El usuario puede **restablecer** un stat, un enemigo, un arma o toda la mesa a los valores base y a la guía inicial. | Existen acciones de reset por campo, por enemigo/arma y global; tras el reset la medición vuelve a ser idéntica a la base. |
| R-012 | El export incluye **catálogo ajustado, objetivos elegidos, semilla, duelos, resultados y diagnóstico**. | El JSON se puede volver a cargar o reproducir y contiene todos esos bloques; dos ejecuciones con los mismos valores son idénticas. |
| R-013 | El análisis de si los objetivos elegidos suponen un problema se hace **después**, cuando el usuario vuelve con el resultado. | La hoja no fija la conclusión; la sesión posterior interpreta el diagnóstico y decide si se toca el objetivo, el enemigo, el arma o un héroe. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El catálogo base es inmutable y la mesa trabaja sobre una **copia/overlay** de trabajo; el catálogo de producción no se toca. | Los cambios viven solo en el estado del experimento; recargar la página vuelve a la base salvo que se exporte. |
| T-002 | Al editar un stat se recalculan **solo los emparejamientos afectados**, manteniendo semilla y número de duelos. | Cambiar un enemigo recalcula sus 4 filas; cambiar un arma recalcula las filas de las unidades que la equipan. |
| T-003 | El recálculo es **automático con retardo** al escribir, con estado visible de «recalculando» y sin bloquear la interfaz. | La UI muestra el estado; no se pierden cambios ni se reordena la tabla. |
| T-004 | Los campos validan enteros y rangos: PV mínimo 1, acciones mínimo 0, objetivo 0–100; los valores fuera de rango se rechazan con aviso. | Un PV 0 o un objetivo 101 no se aplican; el campo conserva el último valor válido. |
| T-005 | La API `window.__experiment` se amplía sin romper la existente: overrides, objetivos, recálculo, snapshot, export y reset. | Los tests pueden leer y cambiar el estado de ajuste de forma determinista. |
| T-006 | El export distingue una ejecución ajustada de la base con un identificador determinista de overrides, sin marca de tiempo. | Mismos valores producen el mismo identificador; el nombre de archivo no sobrescribe el de la base. |
| T-007 | El motor de duelo y el escenario 1D no cambian; la mesa solo inyecta catálogo y objetivos. | Los tests de determinismo y equivalencia del motor siguen pasando sin cambios de reglas. |
| T-008 | Se cubren con tests el overlay, la evaluación de objetivos, el recálculo afectado, el reset, la exportación y el determinismo. | Tests unitarios, de integración y E2E verdes; `pnpm run verify` pasa. |

# Requisitos no funcionales

- **Rendimiento:** recalcular un enemigo (4 × 1.000 duelos) debe completarse sin
  bloquear la interacción; si en la máquina de referencia supera 1 s, la UI debe
  mostrar el estado y permitir seguir editando. El umbral se mide y se documenta.
- **Accesibilidad:** etiquetas asociadas a cada campo, navegación por teclado,
  estado de recálculo con `aria-live` y contraste suficiente en dentro/fuera.
- **Compatibilidad:** la página sigue funcionando en Chromium y en el modo
  determinista `?test=1&seed=1017`.
- **Mantenibilidad:** nada de listas de enemigos o armas hardcodeadas en la UI;
  todo sale del catálogo y del catálogo ajustado.
- **Reproducibilidad:** misma semilla, duelos, overrides y objetivos producen el
  mismo resultado y el mismo export.

# Fuera de alcance

- Editar stats de héroes, hechizos, IA o perfiles.
- Añadir grupos 2v2, posiciones 2D, terreno o línea de visión.
- Aprobar o fijar automáticamente el balance; la herramienta no optimiza.
- Cambiar las fórmulas de combate o los valores base del catálogo.
- Trasladar los valores ajustados al juego de producción.
- Comparar dos candidatos en paralelo o guardar presets con nombre.

# Preguntas abiertas

Ninguna bloquea la implementación. La interpretación de los resultados y la
aprobación de valores quedan para la sesión posterior, cuando el usuario vuelva
con el export del banco de ajuste.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-11 | Enemigo compartido entre sus cuatro filas; armas globales; editor expandible; recálculo solo de filas afectadas. | human:simon | aceptada |
| 2026-11-11 | Objetivos editables por enemigo; guía 75/85/30 solo como punto de partida; margen ±5 pp y 4-de-4 como diagnóstico, no como aprobación. | human:simon | aceptada |
| 2026-11-11 | El análisis de problemas de los objetivos elegidos se hará al volver con los resultados. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar un grafo de tareas.
