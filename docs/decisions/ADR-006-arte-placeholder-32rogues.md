---
type: ADR
title: "ADR-006: 32rogues como arte placeholder"
description: Uso del pack 32rogues en el primer prototipo, con su licencia, crédito y tabla de celdas por arquetipo y variante.
status: stable
decision_status: accepted
decided_by: human:simon
decided_at: 2026-11-07T15:24:03Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T15:24:03Z }
---

# Contexto

El primer prototipo necesita sprites legibles sin invertir tiempo en arte
original. El usuario ha elegido el pack [32rogues](https://sethbb.itch.io/32rogues)
de Seth Boyles, un tileset y conjunto de sprites de 32×32 pensado para roguelikes.

# Decisión

- Usar los PNG de 32rogues como arte placeholder del primer prototipo.
- Copiar solo los archivos necesarios al repositorio, junto con
  `LICENSE.txt`.
- Incluir el crédito a Seth Boyles en los créditos del proyecto.
- No cargar assets desde itch.io en runtime: el juego funciona sin red.
- No modificar los sprites en este corte salvo recortes o escalado que no alteren
  el original.

# Sprites por arquetipo y variante

`rogues.png` se recorta en celdas de 32×32 sobre una rejilla de 7×7. Cada
arquetipo del roster tiene dos celdas asignadas, las variantes `1` y `2`; la
columna es `sx` y la fila es `sy`. Esta es la tabla de 18 celdas de
[REQ-016](../requirements/REQ-016-pantalla-inicio-configuracion.md#tabla-de-sprites):
su fuente en código es `ARCHETYPE_VARIANT_CELLS` en
`src/host/archetype-sheet.ts`, y `variantCellFor(archetypeId, variant)` la
resuelve para el mapa y la miniatura del HUD. La UI no muestra etiquetas de
género: las variantes son 1 y 2.

| Arquetipo | Variante 1 `(sx, sy)` | Variante 2 `(sx, sy)` |
|---|---|---|
| Guerrero | `(0, 32)` | `(64, 32)` |
| Bárbaro | `(0, 96)` | `(160, 96)` |
| Pícaro | `(96, 0)` | `(128, 0)` |
| Arquero | `(64, 0)` | `(32, 0)` |
| Mago | `(32, 128)` | `(0, 128)` |
| Clérigo | `(96, 64)` | `(32, 64)` |
| Espadachín | `(96, 96)` | `(128, 96)` |
| Cocinero | `(96, 160)` | `(128, 160)` |
| Granjero | `(0, 160)` | `(0, 192)` |

La variante elegida forma parte del estado: viaja en `GameConfig` y
`Unit.variant`, se expone en el snapshot y se conserva en `Restart` y `load`.
Mapa y HUD comparten la celda resuelta; una variante ausente o inválida cae en la
1 del mismo arquetipo, y un arquetipo nulo o desconocido no pinta sprite.

# Licencia

La licencia del pack permite el uso en proyectos comerciales y no comerciales,
excepto proyectos relacionados con NFT o blockchain. Prohíbe su uso en proyectos
de inteligencia artificial generativa o machine learning y la redistribución o
venta del pack por separado.

Este proyecto usa los sprites como arte del juego, no para entrenar modelos ni
para generar arte. El pack no se redistribuye como asset independiente.

# Consecuencias

- El repositorio incluye `LICENSE.txt` y un archivo de créditos.
- Los tests no dependen de red.
- Si se sustituye el arte, los nombres de archivo y el punto de carga deben
  quedar aislados en el módulo de assets del host.
- La decisión no fija el arte final: solo el placeholder del primer hito.

# Alternativas descartadas

- **Bloques de color generados por código:** más rápidos, pero el usuario quiere
  evaluar la legibilidad con sprites reales.
- **Assets remotos:** rompen el requisito local-first y añaden dependencia de red.
- **Arte original:** se pospone hasta validar el loop.
