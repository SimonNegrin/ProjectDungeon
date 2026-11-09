# Propuesta de observaciones v3 para `experiments/EXP-004-salas-irregulares/experiment.md`

> No aplicado por `task-runner`: la edición de `experiment.md` está reservada al
> lead/requirements-writer. Este archivo contiene el texto listo para pegar en la
> sección **Observaciones**, sustituyendo el párrafo que decía que la v3 «todavía
> no está implementada».

La **v3** se implementó en `TASK-0042` (intento 1, 2026-11-09). Sustituye la
separación ≥2 por **componentes adyacentes ≤2 en 8 direcciones**, permite parejas
de jugadores y enemigos, prefiere celdas interiores, añade emboscadas en puntos
calientes con `hiddenEnemyChance` (0,5 por defecto), evita la sala mayor en el
desempate de spawn, fija el mínimo de 3 salas y añade la salida con `exitMode`.
La reserva del tile y del acceso de salida se aplica antes de colocar enemigos.

Barrido A/B/C × 60 semillas con los parámetros por defecto (`TASK-0042`):

| Variante | Salas 3/4/5/6 | Caverna | Pasillo ancho | Spawn = mayor | Huecos de spawn | Salidas door/down/up | Distancia 2/3/4 | Fallback door |
|---|---|---|---|---|---|---|---|---|
| A · crecimiento | 10/4/46/0 | 10 | 15 | 1 | 6 en 60/60 | 17/22/21 | 34/20/6 | 6 |
| B · BSP | 7/0/53/0 | 7 | 12 | 5 | 6 en 60/60 | 10/29/21 | 47/7/6 | 13 |
| C · plantillas | 10/3/47/0 | 10 | 12 | 0 | 6 en 60/60 | 21/18/21 | 35/20/5 | 2 |

Los 180 mapas validan conectividad, cierre de borde, 3 salas mínimas y reserva de
salida sin incidencias. La caverna tiene siempre exactamente 3 salas (caverna +
2 anexas de 4-5 tiles); los anexos se ampliaron a ≥4×4 para que cualquiera pueda
admitir los 6 huecos y el spawn pueda quedar en un extremo de la cadena. En
mapas de 3 salas no se añaden bucles ni pasillos anchos extra: un triángulo
dejaría la salida a distancia 1, y el experimento avisa si no cabe el ancho.
Con 3 salas no se detectó ninguna salida a distancia 1 en el barrido.

Con `hiddenEnemyChance` 0 no hay emboscados; con 1 se ocupan puntos calientes
hasta agotar el presupuesto de cada sala (la componente ≤2 puede impedir ocupar
todos si se agrupan). Con 0,5 el barrido deja 269/833, 206/619 y 249/803 puntos
elegibles ocupados (32-34 %), nunca 0 % ni 100 % por mapa. Los no emboscados
prefieren interior: el borde solo aparece cuando no hay interior compatible o
la ficha es una emboscada. El spawn nunca queda en la sala mayor en A (1/60) y
C (0/60); en B ocurre 5/60 cuando la caverna es la única más protegida.

**Escaleras (desviación documentada):** el tileset real incluye `staircase down`
y `staircase up` en `tiles.txt` 17.h/17.i, pero `src/host/assets.ts` no expone su
recorte y producción no se toca. El experimento define el recorte local
`STAIR_RECTS` en `src/render.ts` (`sx` 224/256, `sy` 512, 32×32) y superpone
huellas doradas y una flecha para que la escalera se lea a 32 px y en 13×13. El
render de `door` dibuja un marco dorado sobre el muro del borde; no abre paso.

Evidencia del intento:
[informe](report.md), [capturas](screenshots/),
[capture-log](capture-log.txt) y [decision-example.json](decision-example.json).

Queda pendiente el playtest para elegir variante y representación de salida; la
decisión no se cierra aquí.
