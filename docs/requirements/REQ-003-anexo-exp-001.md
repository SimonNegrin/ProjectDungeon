---
type: Requirement Sheet
id: REQ-003-A
title: "REQ-003 — Anexo: resultados de EXP-001"
description: Comparativa A/B/C, motivo de la decisión y preguntas que incorpora la v2. Informativo, no normativo.
status: stable
parent: REQ-003
created_at: 2026-11-07T23:50:11Z
updated_at: 2026-11-07T23:50:11Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T23:50:11Z }
---

# Resultado de EXP-001

Este anexo es **informativo, no normativo**: no añade requisitos, criterios ni
identificadores. La parte normativa es [REQ-003](REQ-003-generacion-mapa.md).

**Decisión:** A · BSP (`variant-a`). Semilla `279837264`; `roomTarget 9`,
`roomMin 4`, `roomMax 11`, `loopRatio 20 %`, `showDoors true`.

**Motivo del usuario:** BSP genera mapas generalmente más interesantes para el
juego.

| Métrica de referencia (semilla 20261107) | A · BSP | B · Salas+pasillos | C · Híbrido |
|---|---:|---:|---:|
| Salas | 10 | 10 | 10 |
| Grandes (7×7+) | 3 | 2 | 3 |
| Pequeñas (3×3–5×5) | 3 | 3 | 3 |
| Suelo | 47,7 % | 33,5 % | 59,8 % |
| Pasillos | 102 | 38 | 231 |
| Esquinas | 14 | 4 | 11 |
| Callejones | 0 | 0 | 73 |
| Bucles | 2 | 2 | 2 |
| Tiempo de generación | 250,9 ms | 169,5 ms | 79,7 ms |

A fue la más equilibrada y la que produjo mapas más interesantes. B quedó
demasiado compacta y usó una colocación de respaldo en la semilla de referencia.
C resultó demasiado densa y laberíntica.

# Preguntas del usuario que incorpora la v2

- El algoritmo debe poder reemplazarse en el futuro. Se resuelve con
  `MapGenerator` y `BspMapGenerator` (T-011).
- Se quieren pasillos de 2 tiles sin puertas para combate táctico. Se resuelve
  con R-003, R-013, T-012 y T-013: 1-2 por mapa según la semilla, al menos 4
  tiles de longitud y cada sala conserva un acceso estrecho con hueco. El ancho
  3 queda para una dificultad futura.
