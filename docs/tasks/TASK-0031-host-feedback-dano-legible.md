---
type: Task
id: TASK-0031
title: "Host: feedback de daño legible junto a las unidades"
description: Colocar el texto de impacto o fallo en el lado del objetivo opuesto al atacante para que no se solape con el jugador en pasillos de una casilla y quede dentro del mapa.
status: stable
task_status: done
task_type: feature
requirement: REQ-010
requirement_ids: [R-010, T-006]
depends_on: [TASK-0029]
unlocks: []
created_at: 2026-11-08T19:50:00Z
completed_at: 2026-11-08T19:52:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0031/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T19:50:00Z }
verified:
  - by: task-lead
    at: 2026-11-08T19:52:00Z
    note: >-
      Intento 1 verificado en task/TASK-0031: implementación 4257ee6 e informe
      bce01dd. Diff completo revisado; verify OK (491 tests, 149 documentos,
      config y build) y test:e2e OK (63/63), re-ejecutados por el lead.
      `damageFeedbackAnchor` es pura y está testeada en cuatro direcciones,
      diagonal, misma casilla y bordes; el `-1` del pasillo queda bajo el
      objetivo sin tocar al jugador. Capturas 1280×720 revisadas. Sin cambios en
      src/game, index.html, HUD, arte ni dependencias; sin tests borrados o
      debilitados. Fricción de E2E_ARTIFACTS_DIR: deferred a requirements-writer.
---

# Objetivo

Que el feedback de ataque de [REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md)
R-010/T-006 sea legible también en pasillos de una casilla: el texto `-N` o
`Fallo` debe quedar sobre el objetivo, hacia el lado opuesto al atacante, sin
solaparse con el sprite del jugador ni salirse del marco del mapa. Es solo
presentación: no cambia reglas, daño ni eventos.

# Contexto

- Origen: QA visual de `TASK-0030`; en `attack-hit.png` el `-1` se solapa con el
  jugador cuando ataca desde la casilla superior en un pasillo estrecho.
- Implementación actual: `src/host/feedback.ts`, `createDamageFeedbackView` en
  `src/host/main.ts` y estilos de `.damage-feedback` en `index.html`.
- Tests: `tests/unit/host/feedback.test.ts` y los specs E2E de combate.
- El evento `AttackPerformed` ya incluye atacante, objetivo, impacto, daño y
  tiradas; no se recalcula nada.

# Criterios de aceptación

- [x] La colocación se calcula con una función pura exportada a partir de la
      posición del objetivo y la del atacante; tiene tests para las cuatro
      direcciones, diagonal y bordes del mapa.
- [x] Si el atacante está arriba, el texto se coloca por debajo del centro del
      objetivo; simétrico para abajo, izquierda y derecha. En diagonal o misma
      casilla se usa una regla determinista documentada.
- [x] El texto no se solapa con el sprite del atacante ni con el HUD; sigue
      asociado al objetivo, dentro del marco del mapa y sin tapar camino ni
      cursor.
- [x] `Fallo` y `-N` conservan texto, color, `aria-live` y duración; el destello
      sigue apareciendo solo en impacto.
- [x] Impacto, daño, vida y tiradas se leen del evento; no se duplican fórmulas
      ni se toca `src/game/`.
- [x] Captura a 1280×720 del caso de pasillo de una casilla donde el `-1` ya no
      se solapa con el jugador, y otra del caso normal, revisadas sin tapar el
      mapa.
- [x] `pnpm run verify` y `pnpm run test:e2e` pasan; no se borran, saltan ni
      debilitan tests; sin dependencias nuevas.
- [x] Sin cambios en `src/game/`, reglas, HUD ni arte. `index.html` solo si el
      CSS del feedback es imprescindible, documentado en el informe.

# Plan de test

- **Unitario:** anclaje del feedback en cuatro direcciones, diagonal y bordes;
  texto de impacto y fallo; lectura de daño y tiradas desde el evento.
- **Integración:** ataque real con `DamageFeedbackView` y captura del caso de
  pasillo; el HUD y el estado no cambian.
- **Visual:** captura 1280×720 del ataque en pasillo y del ataque normal.
- **Regresión:** `pnpm test`, `pnpm run test:e2e` y `pnpm run verify`.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0031/attempt-1/report.md`.
- [x] Capturas en `attempt-1/screenshots/` y salidas de tests/`verify`.
- [x] Commit SHA en la rama `task/TASK-0031`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/feedback.test.ts` | 120 s |
| `pnpm run test:e2e` | 180 s |
| `pnpm run verify` | 180 s |

# Restricciones

- Solo presentación del feedback: no cambiar fórmulas, daño, impacto, vida,
  turnos, equipo, HUD ni economía de turno.
- No tocar `src/game/`, `package.json`, dependencias ni arte final.
- No añadir animaciones, efectos ni elementos nuevos que oculten el mapa.

# No objetivos

- Refactor del helper E2E de MP (`TASK-0032`).
- Cambiar las barras de vida, el orden de capas o el HUD.
- Ampliar cobertura E2E ya cerrada en `TASK-0030`.
