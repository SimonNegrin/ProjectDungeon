---
type: Task Report Detail
title: "TASK-0063: detalle del informe 1"
description: Metodología, tablas completas, supuestos y recomendaciones de la medición v2.0.
task: TASK-0063
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T15:46:00Z }
---

# Detalle del informe — TASK-0063

Anexo del [informe](report.md). No sustituye al JSON de resultados ni a la tarea.

## Método

- Escenario: pasillo 1D de 8 casillas, héroe en 0, enemigo en 7, héroe con
  iniciativa, tope de 100 rondas; tablas por `draw` si se alcanza.
- Semilla 1017; semilla de cada duelo
  `seedForVariant(1017, "v2:<héroe>:<enemigo>:<índice>")`.
- 1.000 duelos por emparejamiento, 12 emparejamientos en orden fijo.
- Política del héroe: ataca en melé si es adyacente y tiene arma; si no, lanza
  hechizos de daño maximizando la suma de poder (desempate por coste y orden de
  catálogo); si no, avanza 1 casilla con MP; si no, espera.
- Réplica: tras fallo cuerpo a cuerpo adyacente, gratis, inmediata, con tiradas
  nuevas y sin cadena; no hay réplica de magia ni de dormido.
- El JSON no lleva marca de tiempo. El test escribe el archivo si falta y, si
  existe, exige coincidencia byte a byte.

## Resultados por emparejamiento

W-D-L = victorias del héroe, tablas y victorias del enemigo.

| Héroe | Enemigo | W-D-L | Win % | Δ banda | Rondas μ/med | Turnos μ |
|---|---|---:|---:|---:|---:|---:|
| Guerrero | Centinela | 1000-0-0 | 100,0 | +40,0 | 1,218/1 | 1,607 |
| Guerrero | Bruto | 996-0-4 | 99,6 | +39,6 | 1,876/2 | 2,992 |
| Guerrero | Cobarde | 1000-0-0 | 100,0 | +40,0 | 1,384/1 | 1,852 |
| Pícaro | Centinela | 997-0-3 | 99,7 | +39,7 | 1,177/1 | 1,440 |
| Pícaro | Bruto | 963-0-37 | 96,3 | +36,3 | 1,932/2 | 3,041 |
| Pícaro | Cobarde | 997-0-3 | 99,7 | +39,7 | 1,160/1 | 1,344 |
| Mago | Centinela | 998-0-2 | 99,8 | +39,8 | 1,027/1 | 1,056 |
| Mago | Bruto | 999-0-1 | 99,9 | +39,9 | 1,154/1 | 1,309 |
| Mago | Cobarde | 1000-0-0 | 100,0 | +40,0 | 1,043/1 | 1,086 |
| Clérigo | Centinela | 1000-0-0 | 100,0 | +40,0 | 1,267/1 | 1,534 |
| Clérigo | Bruto | 1000-0-0 | 100,0 | +40,0 | 2,135/2 | 3,270 |
| Clérigo | Cobarde | 1000-0-0 | 100,0 | +40,0 | 1,226/1 | 1,452 |

## Acciones, réplicas, huida y maná

Acciones H/E = ataque/hechizo/movimiento/espera. Réplicas H/E =
disparadas/impactos/muertes. Maná H = disponible/gastado/no gastado.

| Héroe | Enemigo | Acciones H | Acciones E | Réplicas H | Réplicas E | Huida (disp/rondas) | Maná H |
|---|---|---|---|---|---:|---:|---:|
| Guerrero | Centinela | 2062/0/6000/0 | 683/0/0/0 | 284/238/171 | 346/195/0 | 0/0 | 0/0/0 |
| Guerrero | Bruto | 3397/0/6000/0 | 1116/0/0/0 | 695/630/237 | 309/112/1 | 0/0 | 0/0/0 |
| Guerrero | Cobarde | 2273/0/6000/0 | 890/0/0/0 | 159/120/84 | 628/519/0 | 492/279 | 0/0/0 |
| Pícaro | Centinela | 2715/0/6000/0 | 476/0/0/0 | 119/119/83 | 0/0/0 | 0/0 | 0/0/0 |
| Pícaro | Bruto | 4946/0/6000/0 | 1109/0/0/0 | 473/473/140 | 0/0/0 | 0/0 | 0/0/0 |
| Pícaro | Cobarde | 2526/0/6000/0 | 357/0/0/0 | 31/31/22 | 70/60/1 | 601/95 | 0/0/0 |
| Mago | Centinela | 0/1244/3000/0 | 58/0/87/0 | 0/0/0 | 0/0/0 | 0/0 | 16432/9952/6480 |
| Mago | Bruto | 0/1941/3000/0 | 155/0/462/0 | 0/0/0 | 0/0/0 | 0/0 | 18464/15528/2936 |
| Mago | Cobarde | 0/1294/3000/0 | 46/0/69/20 | 0/0/0 | 0/0/0 | 91/20 | 16688/10352/6336 |
| Clérigo | Centinela | 0/2100/3000/0 | 534/0/714/0 | 0/0/0 | 0/0/0 | 0/0 | 15204/11878/3326 |
| Clérigo | Bruto | 0/3768/3000/0 | 1135/0/2505/0 | 0/0/0 | 0/0/0 | 0/0 | 25620/19072/6548 |
| Clérigo | Cobarde | 0/1915/3000/0 | 132/0/174/155 | 0/0/0 | 0/0/0 | 486/160 | 14712/11288/3424 |

## Hechizos lanzados / impactos / daño

- Mago/Centinela: Fuego IV 1244/1150/5995.
- Mago/Bruto: Fuego IV 1941/1873/7999.
- Mago/Cobarde: Fuego IV 1294/1091/5000.
- Clérigo/Centinela: Eléctrico III 1739/1691/5463; Fuego II 361/264/537.
- Clérigo/Bruto: Eléctrico III 2000/2000/4814; Fuego II 1768/1457/3186.
- Clérigo/Cobarde: Eléctrico III 1814/1660/4813; Fuego II 101/58/187.

Guerrero y Pícaro no lanzan hechizos (nivel de magia 0). Mago y Clérigo no
replican ni atacan en melé (sin arma). La curación y la resurrección no se usan
en 1v1; sus validaciones están cubiertas por tests.

## Supuestos y limitaciones

1. La política del héroe es agresiva y determinista; no mide kiteo ni juego
   óptimo. El héroe puede gastar todo el MP en acercarse y atacar en la misma
   ronda.
2. Se permite repetir el mismo hechizo en el turno: el acceso es por nivel, no
   por grimorio. No se midió la variante de hechizos distintos.
3. v2.0 solo 1v1 en pasillo; no hay línea de visión bloqueada, muros, grupos ni
   ataque físico a distancia.
4. No se modela investigación/enfriamiento de alerta de REQ-009: el regreso solo
   aparece tras huir sin visión. El héroe siempre está visible en el pasillo, así
   que no cambia esta medición.
5. El escenario por defecto acorrala al Cobarde en el extremo 7; la huida con
   recorrido se cubre con tests de escenario propio.
6. La banda se evalúa sobre el win rate del héroe; 96,3–100 % queda fuera por
   arriba en los 12 casos. No se aplicó ningún reajuste.

## Recomendaciones (para el lead, no aplicadas)

1. Subir PV/defensa/acciones enemigas o bajar el output del héroe antes de
   aceptar los valores de REQ-026: TTK de 1,03–2,14 rondas.
2. Revisar el Pícaro: daga +4 con diffs 6–7 acierta 36/36 contra Centinela y
   Bruto; solo el Bruto le gana 3,7 % de duelos.
3. Revisar magia: Mago y Clérigo ganan 99,8–100 %; Fuego IV repetido y maná
   16/12 son los sospechosos. Medir hechizos distintos y bajar poder o maná.
4. Repetir la medición después de alargar los combates: con 1–2 rondas la
   réplica apenas participa y su efecto queda subestimado.
5. Revisar el Cobarde (5 PV, umbral 40 %): huye en 91–601 de 1.000 duelos, pero
   casi nunca cambia el resultado.

## Reproducción

```sh
pnpm exec vitest run experiments/EXP-003-mesa-combate/src/v2
```

El test de medición escribe `results/v2-seed-1017-duels-1000.json` si falta y lo
compara byte a byte si existe. No usa `Math.random`, `Date.now` ni relojes.
