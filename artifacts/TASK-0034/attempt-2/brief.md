---
type: Task Brief
title: "TASK-0034: brief del intento 2"
description: Cerrar los huecos de aceptación del intento 1 sin ampliar alcance.
task: TASK-0034
attempt: 2
status: stable
brief_bytes: 2865
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T21:20:00Z }
---

# Objetivo

Completar el intento 1 (`0838e8c`) corrigiendo dos huecos verificados de los
criterios: el evento de detección debe llevar la posición del paso, y debe
existir una transición pura de daño que devuelva al enemigo a alerta y reinicie
su memoria. Añade cobertura del regreso real a `home`.

# No objetivos

- Rehacer la percepción, la línea de visión, los radios ni los estados ya
  verificados.
- Implementar la onda de alarma, `hasShouted` operativo, la huida, la IA de
  alerta con MP ni la colocación de 4 enemigos.
- Cambiar el `default` ya añadido en `src/host/hud.ts` (desviación aceptada).
- Tocar más `src/host/`, `index.html`, `public/`, `experiments/`,
  `docs/design/`, glosario ni dependencias.

# Invariantes

- `EnemySpotted` añade `step: Position`: posición del jugador tras el paso que
  provoca la detección. Se emite después del `UnitMoved` de ese paso.
- Nueva función pura exportada (p. ej. `noteDamage`) en `perception.ts`:
  recibe estado, `enemyId` y posición del atacante; si el enemigo vive, pasa a
  `alert`, guarda `lastKnown` del atacante y reinicia `alertTurns` (y deja el
  episodio listo para que TASK-0035 decida alarma). No resuelve daño ni alarma
  ni toca combate.
- El regreso debe probarse en movimiento real: desde lejos de `home`, sin
  jugador visible, avanza hacia `home`, no ataca y al llegar queda `dormant`.
- No se borran, saltan ni debilitan tests; el fixture legacy sigue `alert`.
- Se mantiene la pureza de `src/game/` y el determinismo.

# Criterios de aceptación

En `docs/tasks/TASK-0034-motor-percepcion-linea-vision-memoria.md`, sección
«Criterios de aceptación»; en especial los puntos de detección por paso, memoria
y daño. Enlazar; no copiar.

# Contexto mínimo

- Intento 1: `artifacts/TASK-0034/attempt-1/report.md` y commit `0838e8c`.
- `src/game/perception.ts` (`detectEnemiesAfterStep`,
  `refreshEnemyAwareness`), `src/game/types.ts` (`EnemySpotted`).
- `tests/unit/game/perception.test.ts` (nuevo en intento 1).
- `docs/requirements/REQ-009-percepcion-alarma-huida.md#requisitos-creativos`
  R-004, R-005 y `#requisitos-técnicos` T-002.

# Artefactos

- `artifacts/TASK-0034/attempt-2/report.md`, `test-output.txt`,
  `verify-output.txt`, `diff-stat.txt`.
- Commit SHA en `task/TASK-0034`.

# Riesgos y decisiones abiertas

- El daño se prueba como transición pura; la integración en combate y la onda
  son de `TASK-0035`. No la adelantes.
- No añadas eventos nuevos: usa `EnemySpotted` con `step`.
- Si algo exige tocar `src/host/`, no lo hagas; documenta la fricción.
