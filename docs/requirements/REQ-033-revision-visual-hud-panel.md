---
type: Requirement Sheet
id: REQ-033
title: Revisión visual y simplificación de HUD y panel
description: "Pasada de densidad, escala continua y acabado vintage sobre la UI cerrada: tres zonas en el HUD izquierdo, ficha derecha sin rótulos redundantes, panel con slots cuadrados inset y cadáveres solo si existen."
status: stable
version: 6
decision_owner: human:simon
review_required: true
created_at: 2026-11-14T03:09:56Z
updated_at: 2026-11-14T11:56:14Z
related_tasks: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T03:09:56Z }
verified:
  - by: human:simon
    at: 2026-11-14T11:56:14Z
    note: >-
      Aprueba el texto de la v6: escala continua anclada a 900×700, paleta de
      ocho colores, identidad vintage de roguelike de los 80 y 90, tres zonas en
      el HUD izquierdo con Personaje en dos columnas, ficha derecha sin rótulos
      redundantes, panel con títulos Equipo/Bolsa/Suelo, figura humana, rejilla
      derecha para cadáveres y suelo, slots cuadrados inset con sprites
      centrados, distribución alternativa 1/3 + dos filas, sin Content Shift y
      cursor superpuesto con transición.
---

# Contexto

La UI de [REQ-032](REQ-032-estilo-visual-interaccion-ui.md) está implementada y
probada (TASK-0099 a TASK-0103), pero el usuario no la percibe como parte del
juego. Las capturas de referencia a 900×700 muestran el problema: el HUD explica
demasiado, la tipografía y los espaciados no acompañan al tamaño del marco, la
paleta es pobre y los marcos no separan las zonas con claridad.

Esta hoja no cambia reglas, costes, navegación ni estado de juego. Cambia la
densidad, la escala, el color, el relieve y la identidad de la UI de juego ya
existente. El aspecto debe evocar los roguelikes de los 80 y 90: paleta limitada,
biseles, pixel art, información densa y ningún vocabulario de panel web moderno.
Las capturas actuales a 900×700 son el ancla del tamaño aparente; no se rediseña
a ojo.

# Enmienda a documentos vigentes

- [REQ-032](REQ-032-estilo-visual-interaccion-ui.md) v2: se sustituyen la
  paleta (R-003), el grosor de línea y el relieve (R-004, R-005), se añade la
  identidad vintage (R-001, R-005) y se precisan la escala (R-002), las tres
  zonas (R-006), la ficha (R-011) y el panel (R-008, R-009, R-010, R-015). La
  identidad pixel, la fuente, la navegación y el submenú se conservan.
- [REQ-022](REQ-022-hud-izquierdo-jugador.md) v3: el HUD izquierdo se organiza
  en tres zonas —Personaje, Arma y Stats+Traits— y deja de mostrar fase, turno,
  PV del enemigo y estado de partida. Las teclas y la sugerencia de fin de turno
  se mantienen como texto plano al pie. El contenido de R-003 no cambia en
  sustancia.
- [REQ-023](REQ-023-hud-derecho-detalle-cursor.md) v3: la ficha elimina el tipo
  duplicado, los subtítulos y las descripciones; el objeto muestra sprite y
  stats en vertical. Con el panel abierto, los dos bloques se enmarcan y el
  segundo conserva la etiqueta «Equipado».
- [REQ-018](REQ-018-inventario-equipo.md) v7: el panel mantiene tres columnas
  con título superior (Equipo, Bolsa, Suelo), la figura humana del equipo y los
  slots cuadrados, iguales, solo icono y con borde inset; la columna derecha usa
  rejilla para cadáveres y suelo, y la sección de cadáveres se oculta si no hay
  cadáveres. «Bolsa» es la etiqueta de UI; el término de modelo y documentación
  sigue siendo «mochila».
- [REQ-005](REQ-005-viewport-impar-13.md) y
  [REQ-002](REQ-002-encuadre-16-9.md): el mapa conserva 13×13 y el marco 16:9;
  no se toca el viewport ni el render del mundo.
- [ADR-025](../decisions/ADR-025-estilo-visual-ui.md): su nota de vigencia
  apunta a esta revisión; la decisión técnica de escala continua se registra en
  el ADR correspondiente.

# Objetivos de experiencia

- Que la UI se lea de un vistazo y no haya que leer instrucciones.
- Que el tamaño de todo acompañe al marco, sin saltos al redimensionar.
- Que el color y el relieve den identidad sin competir con el mapa.
- Que cada zona se distinga por su marco y su fondo, no por un rótulo.
- Que los objetos se reconozcan por su sprite y sus stats, no por párrafos.
- Que el panel se sienta como una rejilla de inventario, no como un formulario.
- Que la UI evoque la nostalgia de los roguelikes de los 80 y 90 sin copiar una
  pantalla concreta.
- Que los slots se lean como huecos donde encajar objetos y los sprites encajen
  sin recortes ni desbordes.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | La UI no explica lo que se entiende por sí mismo. Se eliminan instrucciones, ayudas, subtítulos redundantes, notas explicativas y textos de estado vacío. Solo quedan datos, nombres, costes y acciones. | Capturas a 900×700 y 1280×720 sin frases de ayuda ni «Sin traits activos», «No hay objetos», «Seleccionado» o equivalentes. |
| R-002 | Toda la UI de juego escala de forma continua y directamente proporcional al marco 16:9: tipografía, interlineado, espacios, bordes, iconos, sprites, slots y submenú. No hay breakpoints, `clamp()` de viewport ni tamaños fijos por resolución. | Al redimensionar, la relación entre el tamaño de un token y la altura del marco se mantiene; no hay saltos discretos de fuente, hueco, borde ni sprite. |
| R-003 | El tamaño aparente a 900×700 es el de las capturas actuales de referencia. A partir de ahí, todo crece o decrece con el marco. | El cuerpo de texto mide ≈12,8 px a 900×700 y ≈18,8 px a 1280×720 (±1 px), con la relación de alturas del marco. |
| R-004 | La paleta de la UI son los ocho colores aportados, con alfa opaco: `#2f142f`, `#2a584f`, `#774448`, `#6eb8a8`, `#fcffc0`, `#ee9c5d`, `#c6505a` y `#74a33f`. Ningún componente inventa color. | Inspección de tokens y capturas: no hay literales de color fuera de la fuente de tokens ni degradados suaves. |
| R-005 | Reparto semántico: fondo y borde oscuro `#2f142f`; panel `#2a584f`; zona o sección elevada `#774448`; línea clara y texto atenuado `#6eb8a8`; texto `#fcffc0`; acento `#ee9c5d`; peligro `#c6505a`; foco y positivo `#74a33f`. | Cambiar un token cambia toda la UI; el contraste de texto y foco es suficiente a 900×700. |
| R-006 | El relieve se hace con bordes: **outset** en el marco de cada HUD, en cada zona del HUD izquierdo, en cada sección de la ficha derecha y en cada columna del panel; **inset** en los slots de item. Sin radios, sombras difusas ni degradados. | Capturas: el marco y las zonas sobresalen; los slots se hunden. No hay `border-radius` ni `box-shadow` suave en la UI de juego. |
| R-007 | El HUD izquierdo tiene tres zonas enmarcadas: **(1) Personaje** con sprite, nombre, arquetipo y condición fantasma; **(2) Arma actual** con sprite, nombre, acierto y daño; **(3) Stats+Traits** con PV, MP, acciones y atributos, más magia/maná solo si el personaje los tiene y traits solo si existen. La zona de Personaje se compone en **dos columnas**: el sprite a la izquierda y el resto de los datos (nombre, arquetipo y condición) en la columna derecha. | A 900×700 se ven las tres zonas; el sprite queda a la izquierda y el texto a la derecha, alineados por el borde superior; un personaje sin maná no muestra la fila; sin traits no hay bloque de traits; sin arma no se muestra la zona de arma. |
| R-008 | Fase, turno, PV del enemigo y estado de partida salen del HUD izquierdo y quedan solo en `F1`. Las teclas y la sugerencia de fin de turno se mantienen como texto plano al pie, fuera de las tres zonas y sin marco. | El HUD izquierdo no muestra fase, turno, PV enemigo ni «En juego»; las teclas y la sugerencia siguen presentes y legibles. |
| R-009 | La ficha del cursor elimina la duplicación de tipo: no se repite el mismo dato en eyebrow, título y subtítulo. Se conserva un único indicador cuando aporta (enemigo o aliado), y se omiten filas que repiten el título. | Enemigo y aliado se identifican sin leer dos veces «Enemigo»/«Aliado»; el terreno no muestra una fila «Terreno» que repita el título. |
| R-010 | La ficha de objeto muestra título, sprite y stats en lista vertical, cada stat en su línea (`+3 Acierto`, `+8 Daño`, `+1 Absorción`, `+1 Defensa`). Sin título «Stats». Los traits se muestran solo si existen; las descripciones desaparecen. | Con un objeto sin traits no queda hueco ni texto; con traits se leen bajo los stats; el sprite se reconoce a píxel entero escalado. |
| R-011 | Con el panel abierto, el HUD derecho muestra dos secciones enmarcadas y con fondo distinto: el objeto seleccionado y el equipado en ese hueco. La primera no lleva título «Seleccionado»; la segunda conserva una etiqueta pequeña «Equipado». Ambas muestran sprite y stats verticales. | Las dos secciones se distinguen por marco y fondo; no aparece «Seleccionado»; el bloque vacío dice «Vacío» y no inventa stats ni traits. |
| R-012 | La distribución **preferida** del panel es tres columnas con título superior —**Equipo**, **Bolsa** y **Suelo**—, cada una con marco outset y fondo propio. Los slots de item son cuadrados, del mismo tamaño en las tres columnas, con borde inset y solo icono. El nombre y los detalles se leen en el HUD derecho. | Los tres títulos se leen arriba de cada columna; los slots de equipo, bolsa y suelo miden lo mismo; no contienen nombre, estado ni texto; el foco se ve sin tapar el icono. |
| R-013 | La columna **Equipo** conserva la figura humana de ocho posiciones. La columna **Bolsa** usa una rejilla 2×4. La columna **Suelo** usa una rejilla de dos columnas para los objetos del suelo, con scroll propio cuando no caben. «Bolsa» es la etiqueta visible; el modelo y la documentación siguen usando «mochila». | La figura sigue siendo reconocible; la Bolsa muestra ocho slots; el Suelo usa el mismo tamaño de slot y solo desplaza su zona; el cambio de etiqueta no cambia el modelo. |
| R-014 | La columna **Suelo** muestra los cadáveres del tile, si existen, en una rejilla al inicio de la columna. Cada cadáver muestra su sprite y su nombre si es un personaje, o su tipo si es un enemigo (Centinela, Bruto, Cobarde, Góblin…). Sin cadáveres no queda título, hueco ni texto de cadáveres. | Con cadáveres, cada célula muestra sprite y nombre o tipo; sin cadáveres, la columna empieza por los objetos del suelo y no hay hueco vacío. Se navega por la rejilla y el suelo sigue visible. |
| R-015 | El panel no lleva línea de ayuda ni encabezado «Personaje · X / MP»; conserva un título accesible oculto y un botón «Cerrar». El contador de la columna Bolsa se mantiene como dato compacto. | No hay párrafo de instrucciones ni datos duplicados del HUD izquierdo; el diálogo conserva nombre accesible y cierre visible; el contador usa la etiqueta «Bolsa». |
| R-016 | La lista de hechizos, el submenú contextual, los banners, las marcas de daño y el cursor heredan la escala, la paleta y el relieve. El overlay de `F1` queda fuera. | Capturas con hechizos, submenú y feedback sin tamaños fijos ni colores ajenos; `F1` sigue legible aunque no escale. |
| R-017 | No cambia ninguna regla, coste, navegación ni estado. La UI sigue siendo presentación derivada del snapshot. | Abrir, navegar y cerrar no cambia el snapshot ni el MP; las acciones y sus costes son los de REQ-018. |
| R-018 | El aspecto es **vintage de roguelike de los 80 y 90**: paleta plana y limitada, tipografía pixel, marcos biselados gruesos, información densa y ausencia de vocabulario web moderno (radios, sombras suaves, degradados, blur, translucidez y tarjetas). | Capturas sin radios ni sombras suaves; el relieve sale de bordes; la pantalla se lee como un juego de la época, no como un panel web. |
| R-019 | El borde **inset significa «hueco donde colocar algo»** y el **outset, «superficie o marco»**. Es una regla del lenguaje visual, no un adorno local: se aplica a todos los slots de item del equipo, la mochila y el suelo, y a los futuros contenedores. | Todo slot de item usa inset; todo marco de zona, sección o columna usa outset; no hay un tercer tratamiento para el mismo rol. |
| R-020 | El sprite de cada item se centra en el hueco y encaja dentro del área interior del slot: no se recorta, no se desborda, no queda parcialmente oculto y no tapa el bisel. Se conserva la proporción; si el sprite es cuadrado, llena el área interior; si no, se ajusta con márgenes iguales. | Todos los sprites del catálogo, incluidos los extremos, se ven completos y centrados; el slot vacío y el lleno conservan el mismo tamaño y el mismo bisel. |
| R-021 | Si la distribución de tres columnas no encaja a 900×700 sin solapes ni recortes, se admite una **distribución alternativa**: Equipo ocupa 1/3 a la izquierda; el 2/3 restante se divide en dos filas, **Bolsa** arriba y **Suelo + cadáveres** abajo. La fila inferior puede desplazarse horizontalmente si hay más contenido del que cabe. | Con la alternativa, Equipo sigue siendo una columna de 1/3 y Bolsa/Suelo son filas; los tres títulos se ven; el desplazamiento horizontal solo afecta a la fila inferior. La elección se documenta con capturas. |
| R-022 | La UI evita el **Content Shift (CLS)**: abrir el panel, navegar, actualizar la ficha o aparecer/desaparecer cadáveres no mueve el marco, las columnas ni los slots ya colocados. Los cambios de contenido ocurren dentro de su zona o con espacio reservado. | Medición de posiciones antes/después: los bordes de columnas, títulos y slots no cambian al navegar; abrir el panel no desplaza el mapa ni el HUD. |
| R-023 | La interacción se siente suave: las transiciones son cortas, sin rebotes ni animaciones largas; con `prefers-reduced-motion` se desactivan. | Navegar y abrir/cerrar no produce saltos ni esperas perceptibles; el modo reducido es instantáneo. |
| R-024 | La selección de slots del panel es un **cursor superpuesto**: un marco que se coloca sobre el slot activo y se desplaza con una transición de 80-120 ms al cambiar de objeto, en lugar de saltar de resaltado en resaltado. El foco real sigue en el slot. En saltos grandes o con scroll se coloca al instante; con `prefers-reduced-motion`, sin transición. El marco no tapa el sprite ni el bisel. | Al navegar entre slots adyacentes el marco se desplaza; al cruzar de columna, cambiar de fila o hacer scroll se coloca sin lag; el sprite se ve completo; el foco DOM sigue al slot; el modo reducido es instantáneo. |

# Composición del panel

| ID | Regla | Aceptación |
|---|---|---|
| P-001 | Las tres columnas llevan título superior visible: **Equipo**, **Bolsa** y **Suelo**. El título va dentro del marco de la columna, alineado a la izquierda. | Los tres títulos se leen en la misma línea superior; ninguna columna queda sin título. |
| P-002 | **Equipo** conserva la figura humana de ocho posiciones. **Bolsa** es una rejilla 2×4. **Suelo** es una rejilla de dos columnas para los objetos. | La figura no se sustituye por una lista; la Bolsa mantiene ocho celdas; el Suelo comparte el tamaño de slot. |
| P-003 | En **Suelo**, los cadáveres del tile se muestran en una rejilla al inicio de la columna, antes de los objetos del suelo. Cada célula de cadáver muestra el sprite de la unidad y su nombre si es un personaje, o su tipo si es un enemigo. | Con dos cadáveres se ven dos células con sprite y texto; sin cadáveres no se reserva la zona. |
| P-004 | La columna **Suelo** es la única que se desplaza cuando el contenido no cabe; Equipo y Bolsa mantienen su altura. | El scroll no arrastra las otras columnas; el foco desplaza la rejilla derecha para dejar visible la celda activa. |
| P-005 | La **distribución alternativa** es válida cuando la de tres columnas no encaja: Equipo 1/3 a la izquierda; el 2/3 restante en dos filas, Bolsa arriba y Suelo + cadáveres abajo. La fila inferior puede tener scroll horizontal. | Los tres títulos se ven; Equipo conserva 1/3; el scroll horizontal no mueve Equipo ni Bolsa. |
| P-006 | Ningún cambio de contenido desplaza el marco del panel, los títulos, las columnas ni los slots ya colocados. La aparición de cadáveres o el cambio de ficha ocurre dentro de su zona. | Comparar `getBoundingClientRect()` antes/después de navegar, equipar, cambiar de tile o aparecer un cadáver: los bordes exteriores no se mueven. |

# Lenguaje visual de slots

El bisel no es decoración: comunica función. Un **inset** es un receptáculo; un
**outset** es una superficie. Esta regla se reutiliza en toda la UI y en los
contenedores futuros.

| ID | Regla | Aceptación |
|---|---|---|
| S-001 | Todo slot de item es un cuadrado con borde inset; el marco de la zona que lo contiene es outset. El slot conserva su bisel esté vacío u ocupado. Se aplica a equipo, bolsa (mochila) y suelo. | Se distingue el hueco del marco sin leer etiquetas; el slot lleno no pierde el bisel. |
| S-002 | El sprite se dibuja dentro del área interior del slot, centrado en ambos ejes, con la misma escala en las tres columnas. No se recorta, no se desborda y no tapa el borde. | El centro del sprite coincide con el centro del área interior (±1 px); el sprite cabe entero dentro del slot. |
| S-003 | Si el sprite es cuadrado, ocupa el área interior completa; si no, se contiene con márgenes iguales y sin deformarse. | Los sprites del catálogo se ven completos; no hay estirados ni recortes. |
| S-004 | El slot no lleva nombre, estado ni contador dentro. El foco se dibuja por fuera del bisel, sin tapar el sprite. | El icono es el único contenido; el foco rodea el slot y no lo cubre. |

# Cursor de selección

La selección del panel deja de ser un simple resaltado del slot y pasa a ser un
**cursor superpuesto**: un marco que se coloca sobre el slot activo y se desplaza
con una transición corta al cambiar de objeto, en lugar de saltar de slot en
slot.

- El cursor es una capa de presentación; el foco real sigue en el slot, de modo
  que teclado, lector de pantalla y `aria` no cambian.
- Transición de 80-120 ms, sin rebote ni easing largo.
- En saltos grandes (cruzar de columna, cambiar de fila) y con scroll, el cursor
  se coloca al instante para no ir por detrás del teclado.
- Con `prefers-reduced-motion`, el cursor salta sin transición.
- El marco no tapa el sprite ni el bisel; el centro queda transparente.
- No produce Content Shift: se mueve con `transform` y no altera el layout.

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | Una única escala de UI se deriva del marco en `layout.ts` y se publica como token; todos los tamaños de la UI de juego la consumen. No hay valores fijos de fuente, hueco, borde, icono o sprite por componente. | Cambiar el tamaño del marco recalcula la escala y todos los tokens; no quedan `rem` fijos ni `clamp()` de viewport en la UI de juego. |
| T-002 | El grosor de borde se deriva linealmente de la escala, sin cuantizarlo a píxeles enteros en el token. Se acepta el render fraccionario del navegador. | A distintas escalas el grosor cambia de forma continua; no hay saltos de 1 px por umbral. Esto sustituye el redondeo a píxel de dispositivo de REQ-032 R-004/T-002. |
| T-003 | Los ocho colores viven en un único bloque de tokens semánticos; los componentes no declaran color. El outset y el inset usan el par claro/oscuro de la paleta, no `color-mix()` ni literales. | `docs:check` y los tests de UI no encuentran colores fuera de la fuente; cambiar un token afecta a todos los componentes. |
| T-004 | Los sprites de personaje, arma e item salen de los atlases existentes y escalan con la UI; usan `image-rendering: pixelated`. No se añade arte nuevo. | Capturas a 900×700 y 1280×720 con sprites nítidos y proporcionados; `package.json` y `pnpm-lock.yaml` no cambian. |
| T-005 | El HUD izquierdo se recompone en tres zonas y un pie; los nodos de fase, turno, PV enemigo y estado se retiran o se ocultan sin dejar huecos. Las teclas y la sugerencia se conservan. | Tests de presentación por estado: vivo, fantasma, con y sin maná, con y sin traits, con y sin arma. |
| T-006 | La ficha derecha compone el sprite y las filas verticales de stats desde el catálogo; los traits y las descripciones son condicionales. El estado de dos bloques del panel se mantiene. | Tests de objeto con/sin traits, con/sin equipado y con stats múltiples; sin «Stats» ni «Seleccionado» en el DOM visible. |
| T-007 | El panel muestra los títulos Equipo, Bolsa y Suelo; usa un tamaño de slot común para las tres columnas; el suelo se compone en rejilla de dos columnas y los cadáveres se montan como celdas con sprite y nombre/tipo solo cuando hay datos. | Test de geometría: los tres títulos están presentes; los slots comparten lado; las celdas de cadáver muestran sprite y texto; sin cadáveres no existe la zona; el scroll solo afecta al suelo. |
| T-008 | Tests nuevos: escala lineal, tokens y relieve, tres zonas, ficha sin rótulos, slots cuadrados, cadáveres ocultos y capturas de 900×700 y 1280×720. No se debilitan tests existentes. | `pnpm run verify` y `pnpm run test:e2e` pasan; las capturas muestran los estados clave. |
| T-009 | Se actualizan REQ-032/022/023/018, arquitectura, glosario y notas de vigencia de ADR-025; se registra la decisión de escala continua en un ADR. | `docs:check` pasa; no queda documentación que declare tamaños fijos, paleta anterior o scroll aceptado como límite. |
| T-010 | Un único componente de slot define el área interior, el bisel inset y el encaje del sprite; no hay offsets manuales por item. El sprite usa `object-fit: contain` o equivalente, centrado y sin deformar. | Tests con todos los sprites del catálogo: el rectángulo del sprite queda dentro del área interior, centrado y completo; no hay desbordes ni recortes. |
| T-011 | Se eliminan de la UI de juego los restos de vocabulario moderno: radios, sombras suaves, degradados, blur y translucidez. Se revisan marco, overlays, lista de hechizos, submenú y ficha. | Inspección de CSS y capturas: no quedan radios ni sombras suaves en la UI de juego; el vintage se consigue con biseles, paleta, tipografía y densidad. |
| T-012 | La disposición del panel se resuelve con un layout conmutable: tres columnas por defecto y la alternativa 1/3 + dos filas cuando no encaje. La decisión se toma por medición de espacio, no por un breakpoint de viewport. | A 900×700 se elige la disposición que no produce solapes ni recortes; el test comprueba títulos, proporciones y scroll horizontal solo en la fila inferior. |
| T-013 | Se mide el CLS del panel y del marco en los cambios de estado: abrir/cerrar, navegar, equipar, recoger/soltar, cambiar de tile y aparecer un cadáver. El presupuesto es 0 para el marco y las columnas. | Test de posiciones y `PerformanceObserver` de layout-shift: sin desplazamientos del marco, títulos o columnas; los cambios ocurren dentro de las zonas. |
| T-014 | El cursor superpuesto es una capa de presentación posicionada con `transform`, sincronizada con el foco real. La transición es de 80-120 ms; los saltos grandes y el scroll lo colocan al instante; `prefers-reduced-motion` lo desactiva. | Test de teclado con pulsaciones rápidas: el cursor no se queda atrás ni se desincroniza; el foco DOM es el slot activo; el sprite y el bisel quedan visibles; el modo reducido no anima. |

# Requisitos no funcionales

- **Identidad:** la UI debe reconocerse como vintage de roguelike de los 80 y
  90; no se acepta un panel plano moderno ni un efecto de vídeo postizo.
- **Legibilidad:** a 900×700 el cuerpo no baja del tamaño aparente de referencia;
  si algo no cabe, se recorta contenido o se desplaza, no se reduce la escala.
- **Contraste:** texto, foco, peligro y acierto se distinguen con la paleta
  aprobada; el color no es el único canal de estado.
- **Estabilidad:** sin Content Shift en el marco, las columnas ni los títulos;
  los cambios de contenido se contienen en su zona y las transiciones son
  cortas y reversibles.
- **Rendimiento:** redimensionar recalcula tokens y escala una vez; no
  reconstruye el mapa ni el panel completo.
- **Mantenibilidad:** una fuente de escala y una de color; los componentes no
  llevan valores mágicos.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.

# Dependencias

- [REQ-032](REQ-032-estilo-visual-interaccion-ui.md): identidad, fuente,
  navegación y submenú que se conservan.
- [REQ-022](REQ-022-hud-izquierdo-jugador.md) y
  [REQ-023](REQ-023-hud-derecho-detalle-cursor.md): contenido de los HUD.
- [REQ-018](REQ-018-inventario-equipo.md): panel, equipo, mochila y suelo.
- [REQ-019](REQ-019-traits-objetos.md): traits que se muestran solo si existen.
- [REQ-020](REQ-020-cofres-saqueo.md) y
  [REQ-021](REQ-021-muerte-fantasma-resurreccion.md): cadáveres y contenedores;
  esta hoja solo oculta la sección vacía.
- [REQ-005](REQ-005-viewport-impar-13.md): marco y viewport que no cambian.
- [ADR-025](../decisions/ADR-025-estilo-visual-ui.md) y
  [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): estilo y arte.

# Fuera de alcance

- Reglas, combate, turnos, costes, inventario o navegación.
- Render del mapa, cámara, viewport o marco 16:9.
- Pantalla de inicio, pausa, guardado y hotseat.
- Overlay de `F1`, que puede conservar su escala fija.
- Arte final, sonido y nuevos iconos.
- Filtros CRT, scanlines, curvatura de pantalla y efectos de vídeo.
- Cambio de la fuente Pixelify Sans acordada en REQ-032.
- Contenedores y trasvase de cadáveres ([REQ-020](REQ-020-cofres-saqueo.md),
  [REQ-021](REQ-021-muerte-fantasma-resurreccion.md)).

# Preguntas abiertas

Ninguna. Quedan fijadas: las teclas y la sugerencia al pie del HUD izquierdo;
«Bolsa» como etiqueta de UI y «mochila» como término de modelo y documentación;
la identidad vintage de R-018; el lenguaje inset/outset de los slots; y el cursor
superpuesto con transición del panel. Los filtros CRT quedan fuera de alcance
salvo petición expresa.

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-14 | HUD izquierdo en tres zonas: Personaje, Arma y Stats+Traits. | human:simon | aceptada |
| 2026-11-14 | Se mantienen teclas y sugerencia al pie; salen fase, turno, PV enemigo y estado. | human:simon | aceptada |
| 2026-11-14 | Paleta de ocho colores con el reparto semántico acordado. | human:simon | aceptada |
| 2026-11-14 | Ficha derecha sin tipo duplicado, subtítulos ni descripciones; el segundo bloque conserva «Equipado». | human:simon | aceptada |
| 2026-11-14 | Panel sin ayuda ni encabezado; slots solo icono, cuadrados e iguales; suelo en dos columnas. | human:simon | aceptada |
| 2026-11-14 | Escala continua proporcional; se aceptan sprites a escalas fraccionarias. | human:simon | aceptada |
| 2026-11-14 | Marcos outset y slots de item inset. | human:simon | aceptada |
| 2026-11-14 | Identidad vintage de roguelike de los 80 y 90, sin filtros CRT por defecto. | human:simon | aceptada |
| 2026-11-14 | Inset = hueco, outset = superficie; sprites centrados, completos y encajados en el área interior. | human:simon | aceptada |
| 2026-11-14 | Zona Personaje en dos columnas: sprite a la izquierda y datos a la derecha. | human:simon | aceptada |
| 2026-11-14 | Panel con títulos Equipo, Bolsa y Suelo; «Bolsa» es solo etiqueta de UI y el modelo sigue siendo «mochila». | human:simon | aceptada |
| 2026-11-14 | La figura humana del equipo se mantiene; la rejilla es de la columna derecha, con cadáveres y suelo; cada cadáver muestra sprite y nombre o tipo. | human:simon | aceptada |
| 2026-11-14 | Tres columnas como distribución preferida; alternativa 1/3 + dos filas si no encaja, con scroll horizontal en la fila inferior. | human:simon | aceptada |
| 2026-11-14 | Evitar Content Shift: sin saltos del marco, columnas, títulos ni slots; interacción suave y transiciones cortas. | human:simon | aceptada |
| 2026-11-14 | Cursor superpuesto en el panel: marco que sigue al foco con transición de 80-120 ms, salto instantáneo en cambios grandes o scroll y sin animación con movimiento reducido. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado las decisiones creativas.
- [x] El usuario ha revisado y aprobado el texto de la hoja.
- [x] Los requisitos son verificables.
- [x] Las dependencias están claras.
- [x] El grafo de tareas es posible: escala/tokens, HUD izquierdo, ficha derecha, panel, cursor/CLS, QA visual y documentación.
