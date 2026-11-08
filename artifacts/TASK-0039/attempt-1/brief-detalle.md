---
type: Task Brief Detail
title: "TASK-0039: detalle del brief del intento 1"
description: Escenarios E2E concretos, hook mínimo y evidencia de geometría.
task: TASK-0039
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T22:40:00Z }
---

# Por qué hace falta un hook de test

La semilla `279837264` fija la geometría y los 4 enemigos, pero hay escenarios
del criterio que no son alcanzables con comandos reales:

- **Atacar a un dormido**: el ataque es cuerpo a cuerpo; si el jugador está
  adyacente, el enemigo ya lo ve en el paso previo. No existe ataque a distancia.
- **Alarma a 8 y a 9 exactos**: las parejas de la semilla están a 10 y a 3
  tiles; no hay ninguna a 8/9.
- **Huida renovada**: el cobarde tiene 8 PV y el umbral es 4; tras un golpe de
  ≥4 le quedan ≤4 PV y otro golpe de ≥4 lo mata. La transición solo se puede
  montar con un estado de test.
- **Acorralado**: la semilla no tiene un fondo de saco donde el cobarde no
  pueda mejorar distancia; el unitario usa un mapa con muros.

Hook propuesto, mínimo y solo host (no toca `src/game/`):

- `GameDebugApi.setup?(state: GameState): GameSnapshot` en `src/host/debug.ts`.
- `GameSession.load(state)` en `src/host/session.ts`.
- En `main.ts`, un `setupState` que carga el estado, cancela animación, limpia
  feedback/avisos/"!", recoloca cursor/cámara y renderiza.
- Exponerlo **solo** si la URL trae `test=1`; sin ese flag, `Object.keys(
  window.__game)` sigue siendo `['advance','dispatch','snapshot']` (no rompas
  `perception-host-qa.spec.ts`).
- No expongas mutadores del estado vivo; el test construye un `GameState`
  serializable en Node y lo pasa una vez.

Registra el hook como desviación en el informe. No cambies reglas, valores,
tipos del bestiario ni la IA.

# Escenarios validados con probes puros

Coordenadas sobre el mapa de `279837264`; el runner debe reproducirlas en la
UI real y ajustar si la animación/cámara lo requiere.

## A. Detección por paso y enfriamiento

- Estado: jugador en `(1,2)`; `enemy-3` (bruto) en `(5,4)`; los otros tres en
  sus puestos o fuera de visión; todos `dormant`; `home` = posición.
- `MoveTo (4,2)` produce, en orden:
  `UnitMoved (2,2)`, `UnitMoved (3,2)`, `EnemySpotted enemy-3 step (3,2)`,
  `AlarmRaised enemy-3`, `UnitMoved (4,2)`.
- El jugador termina en `(4,2)`, sin LOS del bruto (`hasLineOfSight` false):
  cruzó la vista y terminó tras un muro. El bruto queda `alert`.
- Antes del `MoveTo`, un `EndTurn` no mueve a nadie: todos `dormant`, eventos
  `EnemyWaited` y mismas posiciones (R-003).
- Enfriamiento: tras la detección, `EndTurn` x4 (sin mover al jugador) deja al
  bruto `alert` 2 fases, `returning` en la 3.ª, `EnemyReturned` y `dormant` en
  su `home` en la 4.ª. El "!" desaparece al pasar a `returning`.
- Este escenario sirve también para el "!" en el paso de detección: antes de
  `settle` no hay marcador; después, sí; al enfriarse, no.

## B. Daño como despertador y alarma 8/9 sin cadena

- Estado: jugador en `(2,2)`; `enemy-3` (bruto) dormido en `(1,2)`;
  `enemy-1` (centinela) dormido en `(9,4)`; `enemy-2` (centinela) dormido en
  `(10,5)`; `enemy-4` lejos.
- `Attack player-1 -> enemy-3`: impacta (el bruto tiene 12 PV y sobrevive),
  `AlarmRaised enemy-3`, sin `EnemySpotted`.
- Resultado: `enemy-3` `alert` con `lastKnown (2,2)` y `hasShouted` true;
  `enemy-1` `alert` con `lastKnown (2,2)` (distancia 8, muro entre medias);
  `enemy-2` sigue `dormant` (distancia 9). `enemy-1` y `enemy-2` están a
  distancia 1: si hubiera cadena, `enemy-2` se alertaría; no ocurre.
- Comprueba también que el ataque guarda la posición del atacante y que los
  receptores no emiten una segunda onda.

## C. Huida del cobarde

- Estado: jugador `(2,2)`; `enemy-4` (cobarde) dormido en `(1,2)`; `rng` de
  combate con semilla 1; los demás lejos.
- `Attack` impacta para 6 (PV 2), emite `EnemyFled enemy-4`. `EndTurn`: el
  cobarde huye a `(1,6)`, `fleeing: true`, sin LOS del jugador, distancia 4.
- Valiente: centinela en `(20,18)`, jugador `(19,18)`, misma semilla de RNG;
  el golpe impacta para 5 y **no** emite `EnemyFled`.
- Renovación (estado sintético justificado): cobarde en `(20,18)` con
  `fleeing: true` y PV 8; `Attack` impacta para 6, sobrevive y vuelve a emitir
  `EnemyFled`.
- Acorralado: mapa de test 20×20 con borde de muros y muros internos
  `(5,4),(6,4),(7,4),(7,5),(7,6),(6,6),(5,6)`; jugador `(5,5)`; cobarde
  `(6,5)` `fleeing: true`; `EndTurn` produce
  `AttackPerformed enemy-4 -> player-1` y el cobarde no se mueve. Es el mismo
  mapa del unitario `ai.test.ts`; no cambies reglas.

## D. Feedback, F1 y snapshot

- En A: sin `F1` no hay `debug-perception-radius` ni líneas permanentes; con
  `F1`, 8 radios (visión 6/6/4/5 y alarma 8/8/8/8). El aviso
  `¡Alarma! Te han visto` aparece en `hud-message`, cabe en el HUD y no tapa el
  marco; el teclado sigue aceptando `E`/`F`.
- Snapshot: 4 enemigos con `awareness`, `fleeing`, `home`, `lastKnown`,
  `alertTurns`, `hasShouted`; mutar copias no cambia el estado vivo. Con
  `test=1`, las claves incluyen `setup`; sin el flag, no.

## E. Colocación y determinismo

- Semilla `279837264`: 4 enemigos `enemy-1..4` con tipos
  `sentinel,sentinel,brute,coward`; 4 salas distintas; ninguno ve al jugador al
  inicio; `enemy-2`/`enemy-4` a 3 (≤8); `enemy-3` a 22/12/12 de los demás
  (>8). Sin `Math.random`.
- Dos cargas con la misma semilla y la misma secuencia de comandos deben dar
  el mismo estado y los mismos eventos (incluida la detección y la alarma).
  `--repeat-each=3` refuerza el determinismo.

# Baseline

En `main@f97074b`, antes de este intento, `pnpm run test:e2e` da **64/64** en
26,4 s (`e2e-baseline.txt`). Cualquier fallo nuevo es de este intento.

# Evidencia y comandos

- `E2E_ARTIFACTS_DIR=artifacts/TASK-0039/attempt-1 pnpm run test:e2e`
  (timeout 180 s).
- `pnpm run test:e2e --repeat-each=3` (timeout 240 s), salida a
  `e2e-repeat-output.txt`.
- `pnpm run verify` (timeout 180 s), salida a `verify-output.txt`.
- Capturas: juego normal, `F1`, detección con "!", alarma/aviso, huida,
  acorralamiento; 1280×720; revisar que el aviso no tapa el HUD y que sin `F1`
  no hay radios.
- No uses esperas fijas: `settle`, `toBeVisible`, `toBeHidden({ timeout })` y
  condiciones de estado.

# Evidencia de los probes

Los probes puros se ejecutaron contra `createInitialState({ seed: 279837264 })`
antes de este brief y se retiraron del árbol. Resultados clave:

- A: `UnitMoved,UnitMoved,EnemySpotted:enemy-3@3,2,AlarmRaised:enemy-3,UnitMoved`.
- B: `AttackPerformed:true:1,AlarmRaised:enemy-3`; `enemy-1` alert, `enemy-2`
  dormant.
- C: semilla RNG 1, `AttackPerformed` daño 6, `EnemyFled`; tras `EndTurn`,
  cobarde en `(1,6)` sin LOS.
- Acorralado: `AttackPerformed:enemy-4->player-1`, jugador con 17 PV.
