---
type: Task Brief Detail
title: "TASK-0063: anexo de detalle del brief 1"
description: Escenario, política del héroe, valores del catálogo, métricas y comandos del intento.
task: TASK-0063
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T15:40:00Z }
---

# Detalle del brief — TASK-0063

Anexo vinculante del brief. Si hay contradicción, mandan la tarea y los
requisitos; este anexo solo fija supuestos de simulación que la tarea no concreta.

## 1. Escenario de medición (supuesto, no balance)

- Pasillo 1D abstracto de 8 casillas (`0..7`), sin muros ni línea de visión
  bloqueada. Distancia = `|a - b|`; adyacencia = distancia 1.
- Héroe en `0`, enemigo en `7`. El héroe tiene la iniciativa: en cada ronda actúa
  primero el héroe y después el enemigo.
- Ronda = turno del héroe + turno del enemigo (si el enemigo sigue vivo). Turno =
  una activación de una unidad.
- Al inicio del turno de cada unidad se restauran MP, acciones y maná completos.
  Moverse cuesta 1 MP por casilla y no consume acción; atacar y lanzar hechizo
  cuestan 1 acción.
- El enemigo empieza dormido. Se evalúa detección tras cada paso del héroe y al
  recibir daño: si la distancia ≤ visión del tipo, pasa a alerta y guarda la
  posición del héroe como `lastKnown`. En 1v1 no hay onda de alarma (v2.0 sin
  grupos); el radio de alarma solo vive en el catálogo.
- Tope de seguridad: 100 rondas por duelo; si se alcanza, el duelo es tablas y se
  cuenta como `draw`.

### Política del héroe (baseline agresiva y determinista)

No modela juego óptimo ni kiteo; es una referencia reproducible. En cada turno,
mientras queden acciones y el enemigo viva:

1. Si el enemigo es adyacente y el héroe tiene arma equipada, ataca en melé.
2. Si no, y el héroe es lanzador, elige hasta dos hechizos de daño cuyo nivel sea
   ≤ nivel de magia, con maná y alcance suficientes, maximizando la suma de poder
   (desempate: menor coste y luego orden de catálogo), y los lanza (máximo 2 por
   turno).
3. Si no puede actuar y le quedan MP, avanza una casilla hacia el enemigo y
   repite; así puede acercarse y atacar/lanzar en el mismo turno.
4. Si no puede hacer nada, espera y cierra el turno.

Los héroes con arma (Guerrero, Pícaro) no lanzan hechizos porque su nivel de magia
es 0; los lanzadores (Mago, Clérigo) no tienen arma y nunca atacan en melé. La
curación y la resurrección no se usan en 1v1 (no hay aliado ni cadáver de
jugador), pero el catálogo y sus validaciones existen.

### IA enemiga (REQ-009)

- Dormido: espera; no ataca ni se mueve.
- Alerta: si es adyacente, ataca con sus acciones; si no, gasta MP acercándose a
  `lastKnown` y ataca con las acciones restantes. Repite hasta agotar acciones o
  matar al héroe. Sin ruta, espera.
- Regreso: vuelve a `home` sin atacar; al llegar, se duerme. Es elegible para
  replicar mientras regresa.
- Huida (solo perfil cobarde): se activa si un golpe quita ≥40 % del PV máximo y
  el enemigo sobrevive; se renueva con otro golpe que cruce el umbral. Huyendo,
  usa MP para maximizar la distancia al héroe; no ataca salvo que esté acorralado
  (ninguna casilla mejora la distancia). Sin héroe visible, vuelve a `home`.
- En el escenario por defecto el cobarde empieza en el extremo `7`, así que al
  huir suele quedar acorralado; la huida con recorrido se cubre con tests de
  escenario propio. El informe debe anotar esta limitación.

### Réplica (REQ-027)

- Se dispara solo tras un ataque **cuerpo a cuerpo** fallido contra un defensor
  adyacente, vivo y elegible. Un impacto no genera réplica; la magia y los
  ataques a distancia tampoco.
- Elegibilidad: arma equipada y estado distinto de dormido; si huye, solo
  acorralado; si regresa, sí; el defensor no puede estar a 0 PV. El dormido no es
  atacable en melé (el resolvedor rechaza el ataque), así que no hay réplica de
  dormido.
- Es gratis (no consume acción, maná ni MP), inmediata y atómica, con tiradas
  nuevas del mismo RNG. No hay cadena: si la réplica falla, termina la secuencia.
- Si la réplica mata al atacante, se descartan sus acciones restantes y el duelo
  termina.

## 2. Catálogo y valores (fuente: REQ-015/REQ-010/REQ-009/REQ-025)

Valores exactos que debe contener el catálogo (los tests leen del catálogo, no
duplican números):

- Roster: Guerrero (Hab +1, Fue +1, Def +1, Res +1, PV 20, MP 6, Mag 0, Acc 2;
  Espada, armadura 1, escudo 1), Pícaro (Hab +3, Fue 0, Def +1, Res 0, PV 14,
  MP 8, Mag 0, Acc 3; Daga, 0/0), Mago (Hab 0, Fue −1, Def 0, Res 0, PV 12, MP 5,
  Mag 4, Acc 2; sin arma, 0/0), Clérigo (Hab 0, Fue −1, Def +3, Res +2, PV 18,
  MP 5, Mag 3, Acc 2; sin arma, armadura 1, escudo 1). Puntería 0 en los cuatro.
- Bestiario: Centinela (Hab 0, Fue 0, Def 0, Res 0, PV 6, MP 5, Acc 2, visión 6,
  alarma 5, valiente; Espada, escudo 1, armadura 0), Bruto (Hab 0, Fue +1, Def 0,
  Res 0, PV 8, MP 4, Acc 1, visión 4, alarma 5, valiente; Hacha, armadura 2),
  Cobarde (Hab +1, Fue 0, Def +1, Res 0, PV 5, MP 6, Acc 2, visión 5, alarma 5,
  cobarde; Daga, escudo 1, armadura 0).
- Armas: Espada +3/3, Hacha +2/5, Daga +4/2, Cuchillo +4/1. Armaduras 0/1/2 y
  escudos 0/1 con id estable.
- Hechizos: Eléctrico I (eléctrico, nivel 1, coste 2, alcance 3, acierto +2,
  poder 2, enemigo), Fuego II (fuego, 2, 4, 3, +0, 5, enemigo), Eléctrico III
  (eléctrico, 3, 6, 4, +3, 4, enemigo), Fuego IV (fuego, 4, 8, 4, +1, 8,
  enemigo), Curación III (vida, 3, 6, 2–3, cura 4 PV, aliado distinto de sí
  mismo), Resurrección IV (vida, 4, 8, 1, resucita al 60 % del PV máximo
  redondeado hacia arriba, cadáver de jugador).
- Maná máximo = nivel de magia × 4; máximo 2 hechizos por turno y unidad.
- Perfiles de IA como datos: valiente (sin huida) y cobarde (umbral 0,4);
  `fleeThreshold`, `castSpells` y prioridad de hechizo son campos, no `if` por id.
- Versión de catálogo explícita, p. ej. `catalogVersion: "EXP-003-v2.0.0"`.
- Añadir un enemigo o hechizo de prueba debe ser solo datos; un test lo demuestra.

## 3. Fórmulas y equivalencia

- Físico: `habilidad + acierto del arma + 1d6 > defensa + escudo + 1d6`; daño
  `max(1, fuerza + daño del arma + 1d6 − (resistencia + armadura + 1d6))`.
  Empate falla. Orden de tiradas: ataque, escudo; si impacta, daño y armadura.
- Mágico: `nivel de magia + acierto del hechizo + 1d6 > defensa + escudo + 1d6`;
  daño `max(1, poder + 1d6 − (resistencia + armadura + 1d6))`. El nivel no suma
  al daño. Empate falla.
- Test de equivalencia: comparar el resolvedor v2 con `resolveHit` y
  `resolveDamage` de `src/game/combat.ts` en los 36 pares de impacto y en un
  barrido de daño con resistencia + armadura. El runtime de v2 no importa `src/`.
- Determinismo: misma semilla, escenario y reglas → mismo resultado; sin
  `Math.random`, `Date.now` ni relojes. RNG reutiliza `experiments/_shell/rng.ts`
  o una copia equivalente con contador serializable.

## 4. Resultados y métricas

Un único JSON determinista en
`experiments/EXP-003-mesa-combate/results/v2-seed-1017-duels-1000.json`, sin
marca de tiempo en el payload, con orden fijo de héroes (Guerrero, Pícaro, Mago,
Clérigo) y enemigos (Centinela, Bruto, Cobarde). Debe incluir: versión de
catálogo, escenario (casillas, posiciones, iniciativa, política, tope), semilla,
duelos, banda 40–60 % y tolerancia ±2 %, y por emparejamiento:

- victorias del héroe/enemigo, tablas, tasas y marca `insideBand` con la
  diferencia a la banda;
- rondas y turnos (media, mediana, mínimo, máximo y distribución), TTK medio en
  rondas de los duelos decididos;
- acciones por tipo y bando (ataque, hechizo, movimiento, espera);
- hechizos por id (lanzados, impactos, daño) y maná disponible, gastado y no
  gastado (definido como disponible − gastado);
- daño causado/recibido, curación, PV restantes del ganador y del héroe;
- réplicas disparadas, impactos, fallos, muertes y daño por bando;
- huida del cobarde (disparos y rondas huyendo), si ocurre.

El test de medición calcula los 12 × 1.000 y comprueba que una segunda ejecución
produce los mismos números. Si el JSON no existe, lo escribe; si existe, comprueba
que coincide byte a byte con lo calculado. El informe resume la tabla y marca cada
emparejamiento dentro o fuera de banda; el detalle largo va a
`report-detalle.md`.

## 5. Módulos y tests

Módulos puros sugeridos (nombres libres, sin DOM): `types.ts`, `catalog.ts`,
`rng` (shell), `resolver.ts` (físico/mágico), `actions.ts`, `ai.ts`, `duel.ts`,
`measure.ts`, `index.ts` y tests `*.test.ts` en la misma carpeta.

Cobertura mínima:

1. Catálogo: versión, ids únicos, roster/bestiario/armas/hechizos/perfiles,
   niveles de magia, maná máximo, acciones por arquetipo/tipo, arma equipada y
   alta de un enemigo de prueba solo con datos.
2. Fórmulas: 36 pares de impacto, empate falla, daño con resistencia + armadura,
   mínimo 1, orden y número de tiradas (2 fallo / 4 impacto), equivalencia con
   producción.
3. Magia: acierto con nivel + hechizo, daño con poder, nivel/maná/acción/alcance/
   objetivo/tope de 2, recarga de maná, rechazo atómico sin consumir ni tirar,
   curación (aliado, 2–3, no a sí mismo) y resurrección (nivel 4, 8 maná,
   adyacencia, 60 %).
4. Acciones: 2 por defecto, Pícaro 3, enemigos 2/1/2; coste 1 de ataque/hechizo;
   movimiento por MP sin acción; restauración al inicio del turno; tope de 2
   hechizos.
5. Réplica: impacto sin réplica; fallo elegible con réplica; sin arma; dormido no
   atacable en melé; regreso sí; huida solo acorralada; magia/distancia no; dos
   fallos → dos réplicas; sin cadena; tiradas nuevas; gratis; réplica letal
   descarta acciones; determinismo.
6. Estados: detección por paso, despertar por daño, enfriamiento y regreso,
   huida al 40 % sobreviviendo, acorralado ataca.
7. Medición: 12 emparejamientos, semilla 1017, 1.000 duelos, iniciativa del
   héroe, métricas presentes, reproducibilidad y ausencia de `Math.random`.

No se borran, saltan ni debilitan tests de la v1. No se añaden dependencias.

## 6. Comandos, timeouts y evidencia

- `pnpm exec vitest run experiments/EXP-003-mesa-combate/src/v2` — 120 s.
- `pnpm run verify` — 240 s (incluye docs, config, tests, build y bundle).
- `pnpm run docs:check` — 60 s.
- No usar `pnpm test -- <archivo>` (no filtra). Nada de npm/npx.
- Si un comando agota el timeout: parar, guardar evidencia y reportar; no repetir
  sin hipótesis nueva.
- Evidencia: `test-output.txt`, `docs-check-output.txt`, `verify-output.txt`,
  informe honesto ≤4 KB y SHA del commit en `task/TASK-0063`.
