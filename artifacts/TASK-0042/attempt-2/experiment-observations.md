---
type: Task Report Detail
title: "TASK-0042: observaciones v3 propuestas para EXP-004 (intento 2)"
description: Cifras actualizadas del barrido de 200 semillas tras corregir la componente global y hotspotRolls.
task: TASK-0042
attempt: 2
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T13:20:00Z }
---

# Propuesta de observaciones v3 para `experiments/EXP-004-salas-irregulares/experiment.md`

> No aplicado por `task-runner`: la edición de `experiment.md` está reservada al
> lead/requirements-writer. Este texto sustituye a las observaciones del intento 1
> y está listo para pegar en la sección **Observaciones**.

La **v3** se implementó en `TASK-0042` (intento 1) y se corrigió en el intento 2.
Sustituye la separación ≥2 por **componentes adyacentes ≤2 en 8 direcciones**,
permite parejas de jugadores y enemigos, prefiere celdas interiores, añade
emboscadas en puntos calientes con `hiddenEnemyChance` (0,5 por defecto), evita la
sala mayor en el desempate de spawn, fija el mínimo de 3 salas y añade la salida
con `exitMode`. La reserva del tile y del acceso de salida se aplica antes de
colocar enemigos.

El intento 2 valida la componente **global** al colocar cada sala (no solo dentro
de cada una), con un post-pase determinista de reubicación si una sala se queda
corta. `stats.hotspotRolls` y `enemy.hotspotRolls` cuentan ahora **todos** los
puntos calientes (`hotspotsTotal`), no solo los elegibles.

Barrido A/B/C × **200 semillas** con los parámetros por defecto (`TASK-0042`,
intento 2): **600 mapas**, 0 incidencias de `validateMap`, 0 componentes >2, 0
salas no-spawn vacías y 0 mapas por debajo de `T`. Las 600 semillas colocan `T`
completo y `hotspotRolls === hotspotsTotal`.

| Variante | Salas 3/4/5/6 | Caverna | Pasillo ancho | Spawn = mayor | Huecos de spawn | Salidas door/down/up | Distancia 1/2/3/4 | Fallback door |
|---|---|---|---|---|---|---|---|---|
| A · crecimiento | 46/19/135/0 | 46 | 39 | 5 | 6 en 200/200 | 48/85/67 | 0/127/51/22 | 18 |
| B · BSP | 39/0/161/0 | 39 | 26 | 20 | 6 en 200/200 | 28/105/67 | 0/160/22/18 | 38 |
| C · plantillas | 36/15/148/1 | 36 | 40 | 1 | 6 en 200/200 | 56/77/67 | 2/114/70/14 | 10 |

La caverna tiene siempre exactamente 3 salas (caverna + 2 anexas de 4-5 tiles);
los anexos se ampliaron a ≥4×4 para que cualquiera pueda admitir los 6 huecos y
el spawn pueda quedar en un extremo de la cadena. En mapas de 3 salas no se añaden
bucles ni pasillos anchos extra. Las 2 salidas a distancia 1 de C llevan el aviso
«No hay una sala no-spawn a distancia ≥2» y se aceptan por el fallback
documentado; `validateMap` no las marca.

Con `hiddenEnemyChance` 0 no hay emboscados; con 1 se ocupan puntos calientes
hasta agotar el presupuesto de cada sala (la componente ≤2 puede impedir ocupar
todos si se agrupan). Con 0,5 el barrido deja 828/2589, 770/2536 y 831/2884 puntos
elegibles ocupados (29-32 %), nunca 0 % ni 100 % por mapa. Los no emboscados
prefieren interior: el borde solo aparece cuando no hay interior compatible o la
ficha es una emboscada. El spawn nunca queda en la sala mayor en A (5/200) y C
(1/200); en B ocurre 20/200 cuando la caverna es la única más protegida.

**Cajas a gap 0 (decisión documentada):** 33/200 mapas de BSP tienen cajas de sala
que se tocan sin muro. No se cambió la generación ni la aceptación; se añadió un
aviso no fatal en `map.warnings` («… cajas a gap 0; comparten borde sin muro») y
la componente global ≤2 resuelve el cruce de fichas entre salas.

**Escaleras (desviación documentada):** el tileset real incluye `staircase down`
y `staircase up` en `tiles.txt` 17.h/17.i, pero `src/host/assets.ts` no expone su
recorte y producción no se toca. El experimento define el recorte local
`STAIR_RECTS` en `src/render.ts` (`sx` 224/256, `sy` 512, 32×32) y superpone
huellas doradas y una flecha para que la escalera se lea a 32 px y en 13×13. El
render de `door` dibuja un marco dorado sobre el muro del borde; no abre paso.

Evidencia del intento 2:
[informe](report.md), [capturas](screenshots/),
[capture-log](capture-log.txt) y [decision-example.json](decision-example.json).

Queda pendiente el playtest para elegir variante y representación de salida; la
decisión no se cierra aquí.
