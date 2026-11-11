---
type: Requirement Sheet
id: REQ-028
title: "Ajuste interactivo de balance de enemigos, armas y héroes"
description: "Mesa de EXP-003 con tres tablas editables a ancho completo: combates con stats compartidos de enemigo, armas globales y héroes; objetivos editables, recálculo quirúrgico y export reproducible."
status: stable
version: 2
decision_owner: human:simon
review_required: true
created_at: 2026-11-11T20:15:00Z
updated_at: 2026-11-11T22:30:00Z
related_tasks: [TASK-0066, TASK-0067, TASK-0068, TASK-0069, TASK-0070, TASK-0071]
related_requirements: [REQ-010, REQ-015, REQ-026, REQ-027]
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T20:15:00Z }
verified:
  - by: human:simon
    at: 2026-11-11T20:15:00Z
    note: >-
      Aprueba la v1 de la mesa de ajuste: enemigo compartido, armas globales,
      editor expandible, recálculo de solo las filas afectadas y objetivos
      editables por el usuario. La guía 75/85/30 es solo un punto de partida.
  - by: human:simon
    at: 2026-11-11T22:30:00Z
    note: >-
      Aprueba la v2 tras probar la v1: tres tablas inline a ancho completo
      (combates, armas y héroes), enemigo compartido con celdas agrupadas,
      Acierto/Daño como stat propio, armas solo con acierto/daño, tabla de
      héroes con set completo y arma inicial, sustitución de la tabla de 18
      columnas y recálculo por enemigo (4 filas), héroe (3 filas) o arma (todas
      sus filas). El detalle conserva las métricas y añade banda, TTK, turnos y
      daño.
---

# Contexto

La v1 del banco de ajuste ([TASK-0066 a TASK-0068](../../docs/tasks/index.md))
demostró que el motor y el diagnóstico funcionan, pero el editor expandible
obliga a abrir y cerrar filas y no deja comparar stats a simple vista. El usuario
pide una mesa más directa: tres tablas con edición inline, todas las columnas a
la vista y el ancho completo de la ventana.

La v2 no cambia el motor de duelo ni las fórmulas. Cambia la forma de editar:
los stats se tocan en la propia tabla, el enemigo sigue siendo un bloque
compartido entre sus cuatro filas y el recálculo se limita a las filas que usan
el campo modificado.

Se mantienen las decisiones de la v1 que no entran en conflicto: objetivos
elegidos por el usuario, guía 75/85/30 no normativa, margen de referencia ±5 pp,
diagnóstico 4-de-4 informativo y export reproducible. La herramienta no aprueba
el balance; el análisis de problemas se hace cuando el usuario vuelve con el
resultado.

# Relación con documentos vigentes

- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): no cambia fórmulas ni
  valores. La mesa permite explorar armas, armaduras, escudos, enemigos y héroes
  con las reglas vigentes.
- [REQ-015](REQ-015-roster-arquetipos.md): concreta el método de balance por
  porcentaje de victorias con una herramienta de ajuste y diagnóstico.
- [REQ-026](REQ-026-economia-acciones-rebalanceo.md): da soporte al rebalanceo de
  acciones y stats; no modifica la economía de acciones.
- [REQ-027](REQ-027-replica-combate-cuerpo-a-cuerpo.md): la réplica sigue
  midiéndose con las mismas reglas; la mesa no la altera.
- **EXP-003**: la página gana las tres tablas. El motor de duelo, el escenario 1D
  y los 12 emparejamientos no cambian.

# Objetivos de experiencia

- Ver de un vistazo los 12 combates, los stats del enemigo, el objetivo y el
  resultado real, sin abrir paneles.
- Editar un stat en la celda y ver el recálculo de las filas afectadas.
- Entender que el enemigo es un bloque compartido: una sola fila de stats sirve
  a sus cuatro héroes.
- Ajustar las armas globales y los héroes en tablas separadas, con el alcance de
  cada cambio visible.
- Trabajar a 1280 px de ancho sin desbordamiento de página y con inputs
  legibles; en ventanas más estrechas, scroll interno de la tabla.
- Salir con un export reproducible del catálogo ajustado, los objetivos y el
  diagnóstico.

# Requisitos creativos

## Tabla 1 · Combates

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | La tabla de combates tiene las columnas: **Héroe, Enemigo, Victorias héroe, Victorias enemigo, % objetivo, % real** y una columna editable por cada stat del enemigo: **PV, Acierto, Daño, Defensa, Resistencia, Acciones, Armadura, Escudo y Arma**. | Las 12 filas muestran todas esas columnas; no hay columnas de diagnóstico adicionales. |
| R-002 | Las filas se agrupan por enemigo: **4 héroes por bloque**. El enemigo, el objetivo y los stats compartidos se muestran en celdas agrupadas verticalmente; el valor es uno solo, no cuatro copias. | Cada bloque tiene un solo input por stat compartido; al enfocar uno se resaltan sus cuatro filas. |
| R-003 | Editar un stat del enemigo recalcula **sus cuatro filas**. | Cambiar PV, Acierto, Daño, Defensa, Resistencia, Acciones, Armadura, Escudo o Arma del Centinela recalcula las cuatro filas del Centinela y ninguna de los otros enemigos. |
| R-004 | **Acierto** es la habilidad propia del enemigo y **Daño** es su fuerza propia. El arma suma su acierto y daño aparte; la celda del arma muestra esos valores. | Editar Acierto no cambia el arma; editar el arma en la tabla de armas mueve el resultado de las filas que la usan. |
| R-005 | **% objetivo** es un entero 0–100 editable por enemigo y se comparte con sus cuatro filas. La guía inicial es 75 Centinela, 85 Cobarde y 30 Bruto; no es normativa. | Cambiar el objetivo de un enemigo actualiza sus cuatro filas; el usuario puede fijar otro valor y restablecer la guía. |
| R-006 | **% real** muestra el win % del héroe en esa fila e incluye el delta contra el objetivo y el estado dentro/fuera del margen de ±5 pp. El 4-de-4 se muestra en la celda del enemigo. | La fila permite leer, por ejemplo, «71,2 % · −3,8 pp · dentro»; el bloque indica «4/4» o «3/4» con el héroe fuera. |
| R-007 | **Victorias héroe** y **Victorias enemigo** muestran los recuentos de la simulación; si hay empates, se muestran como sufijo. | Los recuentos y el % real son coherentes con la misma medición. |

## Tabla 2 · Armas

| ID | Requisito | Aceptación |
|---|---|---|
| R-008 | La tabla de armas tiene las columnas **Arma, Acierto y Daño**, con una fila por arma del catálogo. | Espada, hacha, daga y cuchillo aparecen; no hay columnas de defensa ni absorción. |
| R-009 | Bajo el nombre del arma se muestran las **unidades que la usan** en el catálogo de trabajo. | La lista cambia si un héroe o un enemigo cambia de arma. |
| R-010 | Editar acierto o daño de un arma recalcula **todas las filas donde se use**, sean de héroes o de enemigos, sin duplicar la fila en la que coinciden. | La espada recalcula las filas de Guerrero y Centinela; la daga, las de Pícaro y Cobarde; el hacha, las del Bruto; el cuchillo no mueve filas si nadie lo usa. |

## Tabla 3 · Héroes

| ID | Requisito | Aceptación |
|---|---|---|
| R-011 | La tabla de héroes tiene las columnas **Héroe, Arma inicial, PV, Acierto, Daño, Defensa, Resistencia, Acciones, Armadura, Escudo y Nivel de magia**. | Los cuatro héroes aparecen con todas esas columnas editables. |
| R-012 | **Arma inicial** es un selector con todas las armas del catálogo y la opción **sin arma**; muestra el acierto y daño del arma elegida. | Cambiar el arma de un héroe recalcula sus tres filas y actualiza la lista de unidades de la tabla de armas. |
| R-013 | **Acierto** y **Daño** son la habilidad y la fuerza propias del héroe; el arma suma aparte. **Nivel de magia** es un entero 0–4 que ajusta el maná máximo como en las reglas vigentes. | Editar un stat recalcula las tres filas del héroe; editar el nivel de magia cambia su maná y sus opciones de hechizo. |
| R-014 | Armadura y escudo son selectores del catálogo, con opción **sin armadura** o **sin escudo**. | Cambiar la armadura o el escudo recalcula las tres filas del héroe. |

## Comportamiento común

| ID | Requisito | Aceptación |
|---|---|---|
| R-015 | Las tres tablas usan el **ancho completo de la ventana**, con inputs compactos y sin desbordamiento horizontal de la página a 1280×720. En ventanas más estrechas, la tabla puede tener scroll interno. | A 1280 px no aparece scroll horizontal de documento; a 900 px el contenido sigue siendo legible y el scroll, si existe, queda dentro de la tabla. |
| R-016 | La tabla actual de 18 columnas se **sustituye** por la tabla de combates. El detalle del emparejamiento se conserva y añade banda, TTK, turnos/rondas y daño a las métricas existentes. | No hay dos tablas de resultados duplicadas; al seleccionar una fila se actualiza el detalle. |
| R-017 | El **recálculo es quirúrgico**: stat de enemigo → sus 4 filas; stat de héroe → sus 3 filas; stat de arma → todas las filas donde se use; objetivo → solo el diagnóstico, sin repetir duelos. | El estado visible indica cuántas filas se han recalculado y la tabla no pierde el foco. |
| R-018 | Hay **reset por tabla y global**. Restaura el catálogo base y la guía de objetivos; no hay botones de reset por campo dentro de las celdas. | Los botones «Restablecer enemigos», «Restablecer armas», «Restablecer héroes» y «Restablecer todo» funcionan y no deforman la tabla. |
| R-019 | El **export** incluye catálogo ajustado (enemigos, armas y héroes), objetivos, diagnóstico, semilla, duelos e identificador determinista de overrides. Sin overrides conserva el nombre base; con overrides usa `bench-overrides-<id>`. | Dos ejecuciones con el mismo estado producen el mismo JSON; el export ajustado se distingue del base. |
| R-020 | El banco **no aprueba** el balance. El 4-de-4 y los avisos son diagnósticos; la decisión y el análisis posterior son del usuario. | Se puede seguir editando y exportando con filas fuera; no hay bloqueo ni corrección automática. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El catálogo base sigue siendo inmutable. Los overrides cubren enemigos, armas y **héroes**; el catálogo de trabajo se reconstruye sin mutar la base. | Los tests comprueban que `CATALOG` no cambia y que el reset vuelve a la base. |
| T-002 | La selección de filas afectadas se amplía a **héroe** (sus 3 filas) y **arma** (todas las filas donde se use en el catálogo de trabajo), con deduplicación y orden fijo. | Enemigo = 4, héroe = 3, espada/daga = 6 sin overrides, hacha = 4, cuchillo = 0. |
| T-003 | El recálculo reutiliza semilla y duelos y solo vuelve a medir las filas afectadas. Cambiar un objetivo no ejecuta duelos. | Los tests comparan los resultados no afectados antes y después. |
| T-004 | La tabla de combates usa celdas agrupadas verticalmente (`rowspan`) para enemigo, objetivo y stats compartidos; los inputs se sincronizan dentro del bloque y conservan el foco tras recalcular. | Tests de DOM y E2E: un solo input por stat compartido; el foco no se pierde; las 4 filas se actualizan. |
| T-005 | El layout es full-width y usa `table-layout` estable, inputs numéricos compactos y cabeceras legibles. No hay overflow horizontal de documento a 1280×720. | QA visual a 1280×720 y 900×700; `document.scrollWidth <= clientWidth` a 1280. |
| T-006 | Validación de campos: PV 1–999; stats −10–20; acciones 0–10; objetivo 0–100; acierto de arma −5–10; daño 0–100; nivel de magia 0–4; selectores de armadura, escudo y arma desde el catálogo; arma inicial puede ser `null`. | Un valor inválido no se aplica, se marca el campo y se conserva el último valor válido. |
| T-007 | La API `window.__experiment` se amplía con selección y campos de héroe, resets por tabla y lectura del catálogo de trabajo, sin romper la API existente. | Los tests pueden editar enemigo, arma y héroe; resetear por tabla; exportar y leer el diagnóstico de forma determinista. |
| T-008 | El export y el `overridesId` incluyen los overrides de héroe; el payload conserva el esquema determinista sin timestamp. | Mismo estado → mismo JSON e identificador; cambiar un héroe cambia el identificador. |
| T-009 | Tests unitarios, de integración y E2E cubren el nuevo layout, el recálculo por selección, los resets, el export y el determinismo. | `pnpm run verify` y `pnpm run test:e2e` verdes; sin debilitar los tests existentes. |

# Requisitos no funcionales

- **Rendimiento:** enemigo (4 × 1.000 duelos) ~61 ms en la máquina de
  referencia; héroe (3 × 1.000) y arma (hasta 6 × 1.000) por debajo de 1 s. La UI
  muestra el estado de recálculo y no bloquea la edición.
- **Accesibilidad:** cada input tiene etiqueta y `scope` de cabecera; foco visible;
  estado de recálculo con `aria-live`; dentro/fuera se comunica con texto, no solo
  con color; celdas agrupadas con encabezados claros.
- **Compatibilidad:** Chromium y modo determinista `?test=1&seed=1017`.
- **Mantenibilidad:** las columnas y opciones salen del catálogo; nada de listas
  de enemigos, armas o héroes hardcodeadas en la UI.
- **Reproducibilidad:** misma semilla, duelos, overrides y objetivos producen el
  mismo resultado y el mismo export.

# Fuera de alcance

- Editar MP de movimiento, hechizos, perfiles de IA o fórmulas de combate.
- Añadir defensa o absorción a las armas.
- Copias de enemigo por fila: el enemigo sigue siendo un bloque compartido.
- Resets por campo dentro de las celdas.
- Aprobar o fijar automáticamente el balance; la herramienta no optimiza.
- Grupos 2v2, posiciones 2D, terreno o línea de visión.
- Trasladar los valores ajustados al juego de producción.

# Preguntas abiertas

Ninguna bloquea la implementación. La interpretación de los resultados y la
aprobación de valores quedan para la sesión posterior, cuando el usuario vuelva
con el export de las tres tablas.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-11 | Enemigo compartido entre sus cuatro filas; armas globales; objetivos editables por enemigo; margen ±5 pp y 4-de-4 como diagnóstico. | human:simon | aceptada |
| 2026-11-11 | Tres tablas inline a ancho completo: combates, armas y héroes. La tabla de 18 columnas se sustituye por la de combates; el detalle conserva las métricas y añade banda, TTK, turnos/rondas y daño. | human:simon | aceptada |
| 2026-11-11 | Acierto y Daño son stat propio (habilidad y fuerza); el arma suma aparte. Las armas solo editan acierto y daño. | human:simon | aceptada |
| 2026-11-11 | La tabla de héroes incluye PV, Acierto, Daño, Defensa, Resistencia, Acciones, Armadura, Escudo, Nivel de magia y Arma inicial (con «sin arma»). | human:simon | aceptada |
| 2026-11-11 | Recálculo: enemigo → 4 filas; héroe → 3 filas; arma → todas las filas donde se use; objetivo → solo diagnóstico. Reset por tabla y global, sin resets por campo. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar un grafo de tareas.
