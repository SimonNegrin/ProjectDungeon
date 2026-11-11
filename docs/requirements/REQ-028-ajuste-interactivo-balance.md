---
type: Requirement Sheet
id: REQ-028
title: "Ajuste interactivo de balance de enemigos, armas y héroes"
description: "Mesa de EXP-003 con tres tablas editables a ancho completo: objetivos por par héroe–enemigo, filtros de fila, stats compartidos de enemigo, armas globales y héroes; recálculo quirúrgico y export reproducible."
status: stable
version: 3
decision_owner: human:simon
review_required: true
created_at: 2026-11-11T20:15:00Z
updated_at: 2026-11-11T23:50:00Z
related_tasks: [TASK-0066, TASK-0067, TASK-0068, TASK-0069, TASK-0070, TASK-0071, TASK-0072, TASK-0073, TASK-0074]
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
  - by: human:simon
    at: 2026-11-11T23:45:00Z
    note: >-
      Aprueba la v3 tras usar la v2: objetivo editable por par héroe–enemigo
      (guía 75/85/30 heredada por enemigo), retirada del aviso de dispersión y
      filtros de texto en las tres tablas, con héroe y enemigo en Combates,
      búsqueda sin mayúsculas ni tildes y sin efecto en la medición ni el
      export.
---

# Contexto

La v1 del banco de ajuste ([TASK-0066 a TASK-0068](../../docs/tasks/index.md))
demostró que el motor y el diagnóstico funcionan, pero el editor expandible
obligaba a abrir y cerrar filas y no dejaba comparar stats a simple vista. La v2
convirtió la mesa en tres tablas inline a ancho completo, con edición en celda y
recálculo quirúrgico.

Tras usarla, el usuario plantea dos límites:

- **El objetivo por enemigo no distingue héroes.** Guerrero y Clérigo no tienen
  por qué aspirar al mismo porcentaje contra el Centinela. El objetivo debe ser
  de cada par héroe–enemigo.
- **Las tablas van a crecer.** Con muchos enemigos, armas y arquetipos, encontrar
  un registro a ojo deja de ser viable. Hace falta un filtro de texto por tabla,
  y la tabla de combates necesita dos: por héroe y por enemigo.

La v3 no cambia el motor de duelo ni las fórmulas. Cambia el modelo de objetivos,
el diagnóstico y la forma de navegar las tablas.

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
- **EXP-003**: la página gana objetivos por par y filtros. El motor de duelo, el
  escenario 1D y los 12 emparejamientos no cambian.

# Objetivos de experiencia

- Ver de un vistazo los 12 combates, los stats del enemigo, el objetivo de cada
  par y el resultado real, sin abrir paneles.
- Ajustar el objetivo de un par sin arrastrar a los otros tres.
- Encontrar un enemigo, un arma o un héroe concreto en tablas que crecerán.
- Entender que el enemigo es un bloque compartido: una sola fila de stats sirve
  a sus cuatro héroes, aunque cada héroe tenga su propio objetivo.
- Ajustar las armas globales y los héroes en tablas separadas, con el alcance de
  cada cambio visible.
- Trabajar a 1280 px de ancho sin desbordamiento de página y con inputs
  legibles; en ventanas más estrechas, scroll interno de la tabla.
- Salir con un export reproducible del catálogo ajustado, los objetivos por par y
  el diagnóstico.

# Requisitos creativos

## Tabla 1 · Combates

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | La tabla de combates tiene las columnas: **Héroe, Enemigo, Victorias héroe, Victorias enemigo, % objetivo, % real** y una columna editable por cada stat del enemigo: **PV, Acierto, Daño, Defensa, Resistencia, Acciones, Armadura, Escudo y Arma**. | Las 12 filas muestran todas esas columnas; **% objetivo** es un campo por fila, no una celda compartida. |
| R-002 | Las filas se agrupan por enemigo: **4 héroes por bloque**. El enemigo y sus nueve stats se muestran en celdas agrupadas verticalmente; el valor es uno solo, no cuatro copias. El objetivo no se agrupa: cada fila tiene el suyo. | Cada bloque tiene un solo input por stat compartido; al enfocar uno se resaltan sus cuatro filas. Cada fila tiene su propio input de objetivo. |
| R-003 | Editar un stat del enemigo recalcula **sus cuatro filas**. | Cambiar PV, Acierto, Daño, Defensa, Resistencia, Acciones, Armadura, Escudo o Arma del Centinela recalcula las cuatro filas del Centinela y ninguna de los otros enemigos. |
| R-004 | **Acierto** es la habilidad propia del enemigo y **Daño** es su fuerza propia. El arma suma su acierto y daño aparte; la celda del arma muestra esos valores. | Editar Acierto no cambia el arma; editar el arma en la tabla de armas mueve el resultado de las filas que la usan. |
| R-005 | **% objetivo** es un entero 0–100 editable e independiente **por par héroe–enemigo**. Los cuatro pares de un enemigo arrancan con la guía del enemigo: Centinela 75, Cobarde 85 y Bruto 30; la guía no es normativa. | Editar el objetivo de Guerrero vs Centinela no cambia el de Clérigo vs Centinela; restablecer el objetivo de una fila devuelve la guía de su enemigo; los 12 pares pueden tener valores distintos. |
| R-006 | **% real** muestra el win % del héroe en esa fila e incluye el delta contra el objetivo de esa fila y el estado dentro/fuera del margen de ±5 pp. El 4-de-4 se muestra en la celda del enemigo y significa que sus cuatro pares están a ±5 pp de su propio objetivo. No hay aviso de dispersión entre héroes. | La fila permite leer, por ejemplo, «71,2 % · −3,8 pp · dentro»; el bloque indica «4/4» o «3/4» con el héroe y su delta; no aparece un aviso de dispersión. |
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

## Filtros

| ID | Requisito | Aceptación |
|---|---|---|
| R-021 | Cada tabla tiene un **campo de texto para filtrar registros** en su cabecera. Combates tiene dos: **héroe** y **enemigo**. Armas tiene uno. Héroes tiene uno. Los campos tienen etiqueta visible y botón para limpiar. | Los cuatro campos existen, están etiquetados y vaciarlos restaura todas las filas. |
| R-022 | La búsqueda es por **subcadena, sin distinguir mayúsculas ni tildes**. En Combates, el filtro de héroe busca en el nombre del héroe y el de enemigo en el del enemigo. En Armas busca en el nombre del arma **y en las unidades que la usan**. En Héroes busca en el nombre del héroe. | «clerigo» encuentra Clérigo; «guerrero» en Armas muestra las armas que usa el Guerrero; «centinela» en Combates deja el bloque del Centinela con sus cuatro héroes. |
| R-023 | Al filtrar se ocultan las filas que no coinciden y se conserva el orden. Las celdas agrupadas del enemigo se ajustan al número de filas visibles; si un bloque no tiene filas visibles, desaparece. Si no hay resultados, se muestra un mensaje. | Filtrar por un héroe deja una fila por bloque y el enemigo ocupa esa única fila; filtrar por un enemigo deja sus cuatro filas; un filtro sin coincidencias muestra «sin resultados» y no deja una tabla vacía sin explicación. |
| R-024 | Los filtros son **solo de vista**: no lanzan duelos, no cambian el diagnóstico ni el export, y los resets no los modifican. Se conservan al editar un stat, al recalcular y al cambiar el otro filtro. | Escribir en un filtro no cambia `% real`, 4-de-4 ni el JSON; limpiar el filtro restaura todas las filas; tras un reset el filtro sigue activo. |

## Comportamiento común

| ID | Requisito | Aceptación |
|---|---|---|
| R-015 | Las tres tablas usan el **ancho completo de la ventana**, con inputs compactos y sin desbordamiento horizontal de la página a 1280×720. En ventanas más estrechas, la tabla puede tener scroll interno. | A 1280 px no aparece scroll horizontal de documento; a 900 px el contenido sigue siendo legible y el scroll, si existe, queda dentro de la tabla. |
| R-016 | La tabla actual de 18 columnas se **sustituye** por la tabla de combates. El detalle del emparejamiento se conserva, usa el objetivo del par seleccionado y añade banda, TTK, turnos/rondas y daño a las métricas existentes. | No hay dos tablas de resultados duplicadas; al seleccionar una fila se actualiza el detalle con el objetivo de ese par. |
| R-017 | El **recálculo es quirúrgico**: stat de enemigo → sus 4 filas; stat de héroe → sus 3 filas; stat de arma → todas las filas donde se use; objetivo → solo el diagnóstico de esa fila. | El estado visible indica cuántas filas se han recalculado y la tabla no pierde el foco; cambiar un objetivo no lanza duelos ni altera el % real de las demás filas. |
| R-018 | Hay **reset por tabla y global**. Restaura el catálogo base y los objetivos a la guía: «Restablecer enemigos» devuelve a la guía los cuatro objetivos de cada enemigo; «Restablecer todo» devuelve el catálogo y los 12 objetivos. No hay botones de reset por campo dentro de las celdas. | Los botones «Restablecer enemigos», «Restablecer armas», «Restablecer héroes» y «Restablecer todo» funcionan y no deforman la tabla. |
| R-019 | El **export** incluye catálogo ajustado, objetivos por par, diagnóstico, semilla, duelos, `targetsVersion: 2` e identificador determinista de overrides. Sin overrides conserva el nombre base; con overrides usa `bench-overrides-<id>`. Si los objetivos no son la guía, el nombre añade `targets-<id>` para no colisionar. El resumen textual agrupa los objetivos por enemigo y no lista una línea por par. | Dos ejecuciones con el mismo estado producen el mismo JSON; el export ajustado se distingue del base; dos conjuntos de objetivos distintos no comparten nombre de archivo. |
| R-020 | El banco **no aprueba** el balance. El 4-de-4 y los avisos son diagnósticos; la decisión y el análisis posterior son del usuario. | Se puede seguir editando y exportando con filas fuera; no hay bloqueo ni corrección automática. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El catálogo base sigue siendo inmutable. Los overrides cubren enemigos, armas y **héroes**; el catálogo de trabajo se reconstruye sin mutar la base. | Los tests comprueban que `CATALOG` no cambia y que el reset vuelve a la base. |
| T-002 | La selección de filas afectadas se amplía a **héroe** (sus 3 filas) y **arma** (todas las filas donde se use en el catálogo de trabajo), con deduplicación y orden fijo. | Enemigo = 4, héroe = 3, espada/daga = 6 sin overrides, hacha = 4, cuchillo = 0. |
| T-003 | El recálculo reutiliza semilla y duelos y solo vuelve a medir las filas afectadas. Cambiar un objetivo solo recalcula el diagnóstico de ese par. | Los tests comparan los resultados no afectados antes y después; un cambio de objetivo no ejecuta duelos. |
| T-004 | La tabla de combates usa celdas agrupadas verticalmente (`rowspan`) para enemigo y sus nueve stats; el objetivo no usa `rowspan`. Los inputs se sincronizan dentro del bloque y conservan el foco tras recalcular. | Tests de DOM y E2E: un solo input por stat compartido; el objetivo es un input por fila; el foco no se pierde; las 4 filas se actualizan. |
| T-005 | El layout es full-width y usa `table-layout` estable, inputs numéricos compactos y cabeceras legibles. No hay overflow horizontal de documento a 1280×720. | QA visual a 1280×720 y 900×700; `document.scrollWidth <= clientWidth` a 1280. |
| T-006 | Validación de campos: PV 1–999; stats −10–20; acciones 0–10; objetivo 0–100; acierto de arma −5–10; daño 0–100; nivel de magia 0–4; selectores de armadura, escudo y arma desde el catálogo; arma inicial puede ser `null`. | Un valor inválido no se aplica, se marca el campo y se conserva el último valor válido. |
| T-007 | La API `window.__experiment` cambia las operaciones de objetivo a pares: `getTargets` devuelve el mapa por par, `setTarget(heroId, enemyId, value)` y `resetTarget(heroId, enemyId)`. El resto de la API se conserva. | Los tests pueden fijar objetivos por par, restablecer uno solo y leer el diagnóstico de forma determinista. |
| T-008 | El export incluye `targets` por par con clave `heroId:enemyId`, `targetsVersion: 2`, un `targetsId` determinista y un nombre de descarga que distingue objetivos personalizados. Sin timestamp. | Mismo estado → mismo JSON e identificadores; cambiar un objetivo cambia `targetsId` y el nombre, pero no `overridesId`. |
| T-009 | Tests unitarios, de integración y E2E cubren el nuevo modelo de objetivos, los filtros, el recálculo por selección, los resets, el export y el determinismo. | `pnpm run verify` y `pnpm run test:e2e` verdes; sin debilitar los tests existentes. |
| T-010 | Los objetivos se generan para todos los pares roster × bestiario, en orden fijo, sin exigir cambios de código al añadir un enemigo o un arma. Un enemigo sin guía usa 50 % como objetivo inicial editable. La guía no muta. | Un enemigo de prueba sin entrada en la guía recibe 50 % en sus pares; `resetTargets` reconstruye todos los pares; el catálogo base no cambia. |
| T-011 | Los filtros se implementan con funciones puras de normalización y coincidencia (minúsculas, sin diacríticos, subcadena) y un cálculo de filas visibles; la UI reconstruye solo las filas visibles y conserva el foco en el campo de filtro. No se mide nada. | Tests unitarios cubren tildes, mayúsculas y unidades de arma; el DOM conserva el foco del filtro y los `rowspan` coinciden con las filas visibles. |
| T-012 | El diagnóstico deja de tener un objetivo único por enemigo: el 4-de-4 y la lista de fuera se calculan con los objetivos por par. El aviso y el cálculo de dispersión se retiran del estado, el DOM y el export. | No quedan referencias a `dispersion` en el diagnóstico ni en la UI; los tests de 4-de-4 usan objetivos distintos por fila. |

# Requisitos no funcionales

- **Rendimiento:** filtrar 120 filas no relanza duelos y se percibe inmediato.
  El recálculo de enemigo (4 × 1.000 duelos) sigue en torno a 61 ms en la máquina
  de referencia; héroe (3 × 1.000) y arma (hasta 6 × 1.000) por debajo de 1 s.
- **Accesibilidad:** cada input tiene etiqueta y `scope` de cabecera; foco visible;
  estado de recálculo con `aria-live`; dentro/fuera se comunica con texto, no solo
  con color; los filtros tienen etiqueta y el mensaje de «sin resultados» es
  legible por lector de pantalla.
- **Compatibilidad:** Chromium y modo determinista `?test=1&seed=1017`.
- **Mantenibilidad:** las columnas y opciones salen del catálogo; nada de listas
  de enemigos, armas o héroes hardcodeadas en la UI. Los filtros son una capa de
  vista separada del estado del banco.
- **Reproducibilidad:** misma semilla, duelos, overrides y objetivos producen el
  mismo resultado y el mismo export. Los filtros no forman parte del estado
  reproducible.

# Fuera de alcance

- Plegar o paginar bloques de enemigo; la tabla sigue mostrando una fila por par.
- Filtrar por stats, rangos o por arma en la tabla de combates.
- Persistir los filtros en la URL o en el export.
- Importar exports antiguos con objetivos por enemigo.
- Editar MP de movimiento, hechizos, perfiles de IA o fórmulas de combate.
- Añadir defensa o absorción a las armas.
- Copias de enemigo por fila: el enemigo sigue siendo un bloque compartido.
- Resets por campo dentro de las celdas.
- Aprobar o fijar automáticamente el balance; la herramienta no optimiza.
- Grupos 2v2, posiciones 2D, terreno o línea de visión.
- Trasladar los valores ajustados al juego de producción.

# Preguntas abiertas

Ninguna bloquea la implementación. El 50 % para un enemigo sin guía es un valor
técnico editable, no una decisión de balance. La interpretación de los resultados
y la aprobación de valores quedan para la sesión posterior, cuando el usuario
vuelva con el export de las tres tablas.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-11 | Enemigo compartido entre sus cuatro filas; armas globales; margen ±5 pp y 4-de-4 como diagnóstico. | human:simon | aceptada |
| 2026-11-11 | Tres tablas inline a ancho completo: combates, armas y héroes. La tabla de 18 columnas se sustituye por la de combates; el detalle conserva las métricas y añade banda, TTK, turnos/rondas y daño. | human:simon | aceptada |
| 2026-11-11 | Acierto y Daño son stat propio (habilidad y fuerza); el arma suma aparte. Las armas solo editan acierto y daño. | human:simon | aceptada |
| 2026-11-11 | La tabla de héroes incluye PV, Acierto, Daño, Defensa, Resistencia, Acciones, Armadura, Escudo, Nivel de magia y Arma inicial (con «sin arma»). | human:simon | aceptada |
| 2026-11-11 | Recálculo: enemigo → 4 filas; héroe → 3 filas; arma → todas las filas donde se use; objetivo → solo diagnóstico. Reset por tabla y global, sin resets por campo. | human:simon | aceptada |
| 2026-11-11 | Objetivo por par héroe–enemigo, con la guía 75/85/30 heredada por enemigo; 4-de-4 contra el objetivo de cada par y retirada del aviso de dispersión. | human:simon | aceptada |
| 2026-11-11 | Filtros de texto por tabla: héroe y enemigo en Combates, nombre y unidades en Armas, nombre en Héroes; sin mayúsculas ni tildes y solo de vista. | human:simon | aceptada |
| 2026-11-11 | `targets` por par con clave `heroId:enemyId`, `targetsVersion: 2`, `targetsId` determinista en export y nombre; 50 % para enemigos sin guía. | agent:requirements-writer | aceptada |
| 2026-11-11 | Filtros con función pura de normalización y reconstrucción de filas visibles; no miden, no se exportan y no los tocan los resets. | agent:requirements-writer | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] Se puede generar un grafo de tareas.
