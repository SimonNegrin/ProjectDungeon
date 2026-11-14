---
type: ADR
title: "ADR-025: estilo visual e interacción de la UI"
description: Identidad pixel con Pixelify Sans, tokens semánticos, línea derivada del píxel escalado, pantalla en tres zonas, panel de tres columnas con figura de equipo, detalle en el HUD derecho y submenú contextual.
status: stable
decision_status: accepted
decided_by: [human:simon, deepseek/v4.1-flash]
decided_at: 2026-11-13T23:44:14Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T23:44:14Z }
---

> **Cierre de implementación (2026-11-14).** Lo decidido aquí está implementado en
> TASK-0099 a TASK-0102: fuente y tokens, pantalla en tres zonas, panel de tres
> columnas con figura y navegación por proximidad, ficha de dos bloques y submenú
> contextual. Los contenedores y el inventario de cadáveres siguen pendientes de
> [REQ-020](../requirements/REQ-020-cofres-saqueo.md) y
> [REQ-021](../requirements/REQ-021-muerte-fantasma-resurreccion.md); la zona de
> cadáveres existe vacía y con scroll propio. `G` y `1`-`3` no son caminos
> vigentes.

# Contexto

La UI del juego se construyó por acumulación: tipografía de sistema, paneles con
radio de 8 px y sombras difusas, y un HUD en una barra superior fuera del marco.
El panel de inventario de [REQ-018](../requirements/REQ-018-inventario-equipo.md)
funciona y está probado (TASK-0095 a TASK-0098) pero se percibe como un
formulario ajeno al juego. Nunca se había decidido un estilo.

[REQ-022](../requirements/REQ-022-hud-izquierdo-jugador.md) y
[REQ-023](../requirements/REQ-023-hud-derecho-detalle-cursor.md) ya definían los
laterales del marco como HUD, sin implementar. El arte del juego es el pack
32rogues ([ADR-006](ADR-006-arte-placeholder-32rogues.md)), de píxel duro y 32
px de tile.

# Decisión

1. **Identidad.** La UI deriva del pack: color plano, bordes duros y rejilla de
   píxel visible. No se introduce arte nuevo.
2. **Tipografía.** Pixelify Sans (SIL OFL 1.1) incluida en `public/`: la fuente
   variable y el texto de licencia, con el crédito del proyecto. Se descartan las
   estáticas descargadas (≈51 KB cada una) porque la variable cubre 400–700 y
   todos los navegadores objetivo la soportan. Escalas fijas por rol; se validan
   acentos, diéresis y signos de apertura en cada escala.
3. **Tokens semánticos.** Un único bloque de variables (`--ui-bg`,
   `--ui-panel`, `--ui-line-color`, `--ui-text`, `--ui-muted`, `--ui-accent`,
   `--ui-danger`, `--ui-focus`) del que salen todos los componentes, más
   `--ui-line` para el grosor calculado. Paleta muestreada del pack en la
   implementación; ningún componente define color, grosor ni escala.
4. **Línea.** El grosor se calcula desde el tamaño de tile y la escala del marco
   (`layout.ts`), redondeado a píxel de dispositivo, para que se lea como un
   píxel del mapa a cualquier resolución. Los bordes inset y outset son el
   recurso de relieve; no hay radios ni sombras difusas.
5. **Composición de pantalla.** Tres zonas: HUD izquierdo con la ficha del
   personaje activo, mapa cuadrado de 13×13 y HUD derecho con la información
   bajo el cursor. El mapa conserva su tamaño; los HUD usan las franjas laterales
   que hoy están vacías.
6. **Panel de inventario.** Modal solo sobre el mapa, con los HUD visibles y tres
   columnas de un tercio: equipamiento en figura humana de ocho posiciones
   absolutas, mochila de ocho casillas y columna de cadáveres y suelo. La rejilla
   no muestra stats.
7. **Detalle y acción.** El HUD derecho muestra el objeto seleccionado y el
   equipado en ese hueco, en dos bloques sin delta. `Enter` abre un submenú
   contextual con las acciones válidas; el coste de 1 MP se anuncia antes y se
   cobra al ejecutar.
8. **Navegación.** Flechas con recorrido espacial en la figura y la mochila,
   vertical en las listas; `Tab` cambia de zona; foco siempre visible.
9. **Cadáveres.** La zona existe desde ya con scroll (cadáveres con nombre
   arriba, suelo siempre abajo), pero el trasvase de inventario espera a
   [REQ-021](../requirements/REQ-021-muerte-fantasma-resurreccion.md).

# Consecuencias

- La UI queda acoplada a una fuente concreta: cambiarla exige revisar escalas y
  legibilidad, no solo el `font-family`.
- El grosor calculado obliga a probar al menos dos resoluciones; un valor fijo en
  píxeles de CSS deja de ser aceptable.
- El panel gana sitio al mover el detalle al HUD derecho, pero depende de él: sin
  HUD derecho no hay comparación.
- La figura humana exige posiciones y foco espacial; es más código que una lista,
  pero se lee sin etiquetas.
- El submenú añade una pulsación frente a la acción directa; a cambio, hace
  explícitas las acciones válidas y elimina ejecuciones accidentales.
- La zona de cadáveres se implementa sin datos hasta REQ-021: es deuda visible,
  no funcionalidad falsa.
- Sigue sin haber reglas nuevas: el motor no cambia y los costes siguen siendo
  los de REQ-018.

# Alternativas descartadas

- **Monoespaciada del sistema.** Cero assets y buena legibilidad, pero no
  comparte identidad con el pack y deja el juego con dos lenguajes visuales.
- **Pixel font sin verificar acentos.** Barata de integrar, arriesgada en español:
  tildes y `ñ` son frecuentes en la interfaz.
- **Ficha flotante sobre el panel.** No reserva espacio, pero tapa casillas y
  desaparece al mover el foco; el HUD derecho es estable y reutilizable por el
  hotseat.
- **Delta numérico en la ficha.** Más compacto, pero exige leer números y pierde
  el valor absoluto del equipado.
- **Acción directa con `Enter`.** Menos pulsaciones, pero mezcla «seleccionar» y
  «ejecutar» y provoca operaciones accidentales con coste.
- **Cuatro zonas dentro del panel.** Rompe el tercio por columna y estrecha la
  rejilla.
- **Ampliar el marco para los HUD.** Habría reducido el mapa o roto el 16:9 de
  [REQ-002](../requirements/REQ-002-encuadre-16-9.md).
