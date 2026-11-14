---
type: ADR
title: "ADR-027: corrección visual v7 de la UI"
description: Bisel de 2× con crecimiento exterior, listas verticales, panel arriba sin cabeza, siluetas de slots vacíos y cursor de 4× con 150 ms.
status: stable
decision_status: accepted
decided_by: [human:simon, deepseek/v4.1-flash]
decided_at: 2026-11-14T15:30:34Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T17:45:00Z }
---

# Contexto

[ADR-026](ADR-026-escala-continua-relieve-vintage.md) registró la escala continua,
la paleta de ocho colores, el relieve inset/outset y el cursor superpuesto de
[REQ-033](../requirements/REQ-033-revision-visual-hud-panel.md) v6. Tras el
playtest, el usuario aprobó la v7 con cinco correcciones de percepción: biseles
demasiado finos, listas de stats y traits partidas, columna Equipo centrada con
un bloque verde sobre el casco, slots vacíos sin pista de qué objeto va en cada
uno y cursor del panel indistinguible del foco. TASK-0112 a TASK-0116 lo
implementan y TASK-0117 lo verifica en navegador.

# Decisión

1. **Bisel de 2× con crecimiento exterior.** `--ui-bevel = 2 × --ui-line`
   alimenta todos los outset e inset. El grosor extra se pinta con contornos
   exteriores en L (pseudo-elementos absolutos) para que el borde base, el área
   interior y el flujo conserven tamaño y posición (δ interior ≤0,82 px). No hay
   offsets mágicos por componente.
2. **Cuantización aceptada.** Chromium pinta borde y outline cuantizados a píxel
   entero: a 900×700 y 1280×720 el token mide 2,35/3,20 px y el pintado real
   2/3 px. El token sigue siendo continuo (REQ-033 T-002) y la QA valida la
   geometría con `getBoundingClientRect`, no con el ancho computado del borde.
   Es una limitación conocida, no un bloqueo.
3. **Listas verticales.** Stats y traits del HUD izquierdo y de la ficha derecha
   son listas DOM (`ul`/`li`), una entrada por línea, sin separador `·` y con la
   misma estructura en ambos HUD. PV, MP y acciones conservan su formato; una
   lista vacía se oculta sin dejar hueco.
4. **Panel arriba, sin cabeza y con piernas visibles.** Las tres columnas alinean
   su contenido arriba; el casco ocupa la fila superior central de Equipo. La
   figura conserva torso, brazos y piernas, sin bloque de cabeza. Su caja mide las
   cinco filas de la rejilla y las piernas desbordan por abajo de forma
   intencionada para leerse bajo los pies; los bloques son decorativos
   (`aria-hidden`, sin foco ni clics) y no alteran las cajas de los slots.
5. **Siluetas de slots vacíos.** La tabla única `EQUIPMENT_SILHOUETTES` fija los
   recortes de `items.png`: arma `1.d`, escudo `12.a`, armadura `13.e`, casco
   `16.e`, guantes `14.b`, botas `15.b`, cuello `17.b` y anillo `18.b`. La
   silueta es una máscara CSS con `--ui-line-color` (#6eb8a8), decorativa
   (`aria-hidden`, sin puntero), aparece solo en Equipo vacío y desaparece con
   objeto equipado; Bolsa y Suelo no crean la capa. No hay arte nuevo ni cambian
   el tamaño o el bisel del slot.
6. **Cursor del panel.** Usa `--ui-text` (#fcffc0), borde `4 × --ui-line` y
   `z-index` 10: por encima de columnas, slots, títulos y figura, y por debajo del
   submenú (30). Se mueve con `transform`, anima cualquier cambio de slot —fila,
   columna o zona— en 150 ms lineales y salta al instante al abrir, con scroll, al
   redimensionar, al actualizar el modelo y con `prefers-reduced-motion`. El foco
   DOM sigue en el slot y el cursor no produce Content Shift. El cursor del mapa
   conserva su color y su ancho.
7. **Evidencia repetible.** `tests/e2e/qa-visual-correccion-ui-v7.spec.ts` cubre
   las cinco áreas a 900×700 y 1280×720 con 12 tests; al cierre,
   `pnpm run verify` da 1330/1330 y `pnpm run test:e2e` 208/208.

# Consecuencias

- El bisel grueso se lee como relieve vintage y no mueve el contenido; los
  contenedores anidados necesitan huecos de una línea y `overflow` visible donde
  corresponda.
- La cuantización de Chromium deja el pintado en 2/3 px; se registra tal cual y no
  se persigue el píxel entero del token.
- La tabla de siluetas centraliza los recortes: añadir un hueco exige una entrada
  nueva, no offsets en la vista.
- El desborde de las piernas es intencionado; recortar un ancestro las ocultaría.
- El cursor comparte lenguaje con el mapa, pero añade una capa que debe quedar
  siempre bajo el submenú.
- No cambian reglas, costes, navegación ni estado; la UI sigue derivada del
  snapshot.

# Alternativas descartadas

- **Mantener el bisel de 1×.** Se lee como línea fina y no da el peso vintage
  pedido.
- **Aplicar bordes reales de 2×.** Chromium redondea y desplaza interiores
  anidados hasta ~1,6 px.
- **Listas con `·` o una línea por fila.** Obligan a buscar el corte y contradicen
  la lectura por línea.
- **Conservar el bloque de cabeza o centrar el contenido.** Contradice R-027 y
  R-028.
- **Siluetas con arte nuevo o el sprite completo.** Añade coste y compite con el
  objeto equipado; se reutiliza `items.png` como máscara.
- **Cursor de 100 ms solo horizontal y `--ui-focus`.** No se percibe al moverse y
  no comparte lenguaje con el cursor del mapa.
- **Forzar el token a píxel entero.** Rompe la escala continua y reintroduce
  saltos por umbral.

# Referencias

[REQ-033](../requirements/REQ-033-revision-visual-hud-panel.md),
[ADR-026](ADR-026-escala-continua-relieve-vintage.md),
[ADR-025](ADR-025-estilo-visual-ui.md), TASK-0112 a TASK-0117 y
`tests/e2e/qa-visual-correccion-ui-v7.spec.ts`.
