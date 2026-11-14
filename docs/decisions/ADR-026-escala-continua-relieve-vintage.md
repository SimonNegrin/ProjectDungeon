---
type: ADR
title: "ADR-026: escala continua y relieve vintage de la UI"
description: Escala única derivada del marco, línea lineal, paleta de ocho colores, biseles outset/inset, slots inset, cursor superpuesto y anti-CLS en la UI de juego.
status: stable
decision_status: accepted
decided_by: [human:simon, deepseek/v4.1-flash]
decided_at: 2026-11-14T14:15:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T14:15:00Z }
---

# Contexto

[ADR-025](ADR-025-estilo-visual-ui.md) fijó la identidad pixel, la tipografía, los
tokens y la composición en tres zonas, pero mantenía escalas fijas por rol, un
grosor redondeado a píxel de dispositivo y una paleta muestreada del pack.
[REQ-033](../requirements/REQ-033-revision-visual-hud-panel.md) v6 aprueba una
revisión de densidad, escala, color y relieve: la UI debe acompañar al marco sin
saltos y leerse como un roguelike de los 80 y 90, no como un panel web.

# Decisión

1. **Escala única.** `computeFrameLayout` deriva `scale` del marco 16:9 y el host
   la publica como `--ui-scale` y `--ui-unit`. Tipografía, interlineado, huecos,
   bordes, iconos, sprites, slots y submenú se calculan desde esa escala. No hay
   breakpoints, `clamp()` de viewport ni tamaños fijos por componente.
2. **Línea lineal.** `computeUiLine` publica `--ui-line = scale × tile / 32`, sin
   redondeo a píxel de dispositivo ni a entero; se acepta el render fraccionario.
   Esto sustituye el redondeo de ADR-025 y de REQ-032 T-002.
3. **Paleta de ocho colores.** Ocho tokens opacos y semánticos: `--ui-bg`
   `#2f142f`, `--ui-panel` `#2a584f`, `--ui-raised` `#774448`,
   `--ui-line-color` `#6eb8a8`, `--ui-text` `#fcffc0`, `--ui-accent` `#ee9c5d`,
   `--ui-danger` `#c6505a` y `--ui-focus` `#74a33f`. Los componentes no declaran
   color; `--ui-muted` y `--ui-positive` son alias de rol.
4. **Relieve de biseles.** El **outset** (claro al noroeste, oscuro al sureste)
   marca superficies: marco, zonas del HUD, secciones de la ficha y columnas del
   panel. El **inset** invierte el par y marca receptáculos: slots de item y
   ventanas de sprite. Sin radios, sombras difusas, degradados, blur ni
   translucidez.
5. **Slots.** Un único componente de slot cuadrado, inset, solo icono y del mismo
   tamaño en las tres columnas. El sprite se centra y cabe entero en el área
   interior, sin recortes, desbordes ni deformación; el slot vacío y el lleno
   conservan bisel y tamaño.
6. **Panel.** Tres columnas tituladas Equipo, Bolsa y Suelo: figura humana de
   ocho huecos, rejilla 2×4 y cadáveres del tile seguidos de los objetos del
   suelo en rejilla, con scroll solo en la columna derecha. La disposición
   preferida es la de tres columnas; la alternativa 1/3 + dos filas solo se
   activa por medición de espacio, no por breakpoint. A 900×700 las tres columnas
   encajan (columnas de 137,06 px y slots de 39,89 px).
7. **Cursor superpuesto.** `.inventory-cursor` es una capa de presentación ligada
   al foco DOM: borde de `--ui-focus` por fuera del bisel, centro transparente y
   movimiento con `transform`. Anima 100 ms lineales solo entre vecinos
   horizontales de la misma fila; salta al instante al cambiar de fila o zona,
   con scroll, al reabrir, al actualizar el modelo y con
   `prefers-reduced-motion`. No tapa el sprite ni el bisel.
8. **Anti-CLS.** Abrir o cerrar el panel, navegar, equipar, recoger o soltar,
   cambiar de tile y aparecer o desaparecer cadáveres no mueven el marco, las
   columnas, los títulos ni los slots ya colocados; los cambios ocurren dentro de
   su zona. El presupuesto es 0 para el marco y las columnas.
9. **Etiqueta y modelo.** «Bolsa» es la etiqueta visible de la columna y el
   contador; el modelo y la documentación siguen usando «mochila».
10. **Alcance.** Solo UI de juego. El overlay de `F1` queda fuera; no hay arte
    nuevo, reglas, costes ni navegación nuevos.

# Consecuencias

- Redimensionar recalcula una vez la escala y los tokens; no reconstruye el mapa
  ni el panel.
- El render fraccionario de bordes y sprites es aceptable; no se persigue el
  píxel entero.
- Una sola fuente de escala y otra de color: cambiar un token afecta a toda la UI.
- El panel depende de la medición de espacio para elegir layout y de la
  sincronización del cursor con el foco.
- La UI gana identidad vintage y estabilidad, pero pierde los ajustes finos por
  rol que permitía ADR-025.
- No cambian las reglas: la UI sigue siendo presentación derivada del snapshot.

# Alternativas descartadas

- **Breakpoints o `clamp()` de viewport.** Producen saltos discretos y no atan el
  tamaño al marco.
- **Mantener escalas fijas por rol.** No acompañan al marco y obligan a retocar
  cada tamaño por resolución.
- **Conservar la paleta muestreada.** No da el contraste ni la identidad de ocho
  colores aprobada por el usuario.
- **Redondear el grosor a píxel de dispositivo.** Introduce saltos de 1 px por
  umbral y contradice la escala continua.
- **Resaltar el slot en lugar de un cursor superpuesto.** Salta de celda en celda
  y tapa el icono con el relleno.
- **Activar siempre la distribución alternativa.** Rompe la preferencia de tres
  columnas cuando esta ya encaja.
- **Radios y sombras suaves.** Aproximan la UI a un panel web y rompen la
  identidad vintage.

# Referencias

[REQ-033](../requirements/REQ-033-revision-visual-hud-panel.md),
[ADR-025](ADR-025-estilo-visual-ui.md),
[ADR-021](ADR-021-inventario-equipo.md), TASK-0104 a TASK-0109.
