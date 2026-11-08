# Tareas

Total: **20**. Generado desde el frontmatter de `docs/tasks/*.md`.

| ID | Título | Estado | Requisito | Depende de | Prioridad |
|---|---|---|---|---|---|
| [TASK-0001](TASK-0001-motor-rejilla-turnos.md) | Motor de partida con rejilla, turnos, combate e IA | `done` | REQ-001 | — | P1 |
| [TASK-0002](TASK-0002-host-canvas-camara.md) | Host Canvas con sala, sprites y cámara | `done` | REQ-001 | TASK-0001 | P1 |
| [TASK-0003](TASK-0003-input-hud-e2e.md) | Teclado, HUD, overlays y E2E del loop completo | `done` | REQ-001 | TASK-0002 | P1 |
| [TASK-0004](TASK-0004-motor-sala-20-mp.md) | Motor: sala 20×20, MP 6/4 y posiciones iniciales | `done` | REQ-002 | TASK-0003 | P1 |
| [TASK-0005](TASK-0005-host-encuadre-16-9.md) | Host: encuadre 16:9, render interno 3× y mapa 12×12 | `done` | REQ-002 | TASK-0004 | P1 |
| [TASK-0006](TASK-0006-e2e-qa-visual-encuadre.md) | E2E y QA visual del encuadre 16:9 | `done` | REQ-002 | TASK-0005 | P1 |
| [TASK-0007](TASK-0007-experimento-generador-mazmorra.md) | Experimento comparativo de generadores de mazmorra | `done` | REQ-003 | TASK-0006 | P1 |
| [TASK-0008](TASK-0008-motor-generador-bsp.md) | Motor: interfaz MapGenerator, BSP, salas y pasillos estrechos | `done` | REQ-003 | TASK-0006 | P1 |
| [TASK-0009](TASK-0009-motor-puertas-pasillos-anchos.md) | Motor: huecos de puerta y pasillos anchos de 2 tiles | `done` | REQ-003 | TASK-0008 | P1 |
| [TASK-0010](TASK-0010-host-mapa-generado-muros-debug.md) | Host: mapa generado, semilla, muros y debug | `done` | REQ-003 | TASK-0009 | P1 |
| [TASK-0011](TASK-0011-e2e-qa-mapa-generado.md) | E2E y QA visual del mapa generado | `done` | REQ-003 | TASK-0010 | P1 |
| [TASK-0012](TASK-0012-motor-camino-destino.md) | Motor: planificación de camino y clasificación de destino | `done` | REQ-004 | TASK-0011 | P1 |
| [TASK-0013](TASK-0013-motor-moverse-atacar.md) | Motor: Moverse por destino y acercarse + atacar | `done` | REQ-004 | TASK-0012 | P1 |
| [TASK-0014](TASK-0014-host-cursor-camino.md) | Host: cursor, input, camino y feedback | `done` | REQ-004 | TASK-0013 | P1 |
| [TASK-0015](TASK-0015-e2e-qa-cursor.md) | E2E y QA visual del cursor y el camino | `done` | REQ-004 | TASK-0014 | P1 |
| [TASK-0016](TASK-0016-viewport-13x13.md) | Host, render y tests: viewport 13×13 centrado con tiles completos | `done` | REQ-005 | TASK-0015 | P1 |
| [TASK-0017](TASK-0017-ritmo-movimiento.md) | EXP-002: ritmo del movimiento animado | `done` | REQ-006 | TASK-0016 | P1 |
| [TASK-0018](TASK-0018-movimiento-animado-host.md) | Host: animación de movimiento, cámara e input bloqueado | `done` | REQ-006 | TASK-0017 | P1 |
| [TASK-0019](TASK-0019-e2e-movimiento-animado.md) | E2E y QA visual del movimiento animado | `done` | REQ-006 | TASK-0018 | P1 |
| [TASK-0020](TASK-0020-artefactos-e2e.md) | Arnés: artefactos E2E sin reescribir evidencia histórica | `ready` | HARNESS | — | P2 |

# ready

* [TASK-0020 — Arnés: artefactos E2E sin reescribir evidencia histórica](TASK-0020-artefactos-e2e.md)

# done

* [TASK-0001 — Motor de partida con rejilla, turnos, combate e IA](TASK-0001-motor-rejilla-turnos.md)
* [TASK-0002 — Host Canvas con sala, sprites y cámara](TASK-0002-host-canvas-camara.md)
* [TASK-0003 — Teclado, HUD, overlays y E2E del loop completo](TASK-0003-input-hud-e2e.md)
* [TASK-0004 — Motor: sala 20×20, MP 6/4 y posiciones iniciales](TASK-0004-motor-sala-20-mp.md)
* [TASK-0005 — Host: encuadre 16:9, render interno 3× y mapa 12×12](TASK-0005-host-encuadre-16-9.md)
* [TASK-0006 — E2E y QA visual del encuadre 16:9](TASK-0006-e2e-qa-visual-encuadre.md)
* [TASK-0007 — Experimento comparativo de generadores de mazmorra](TASK-0007-experimento-generador-mazmorra.md)
* [TASK-0008 — Motor: interfaz MapGenerator, BSP, salas y pasillos estrechos](TASK-0008-motor-generador-bsp.md)
* [TASK-0009 — Motor: huecos de puerta y pasillos anchos de 2 tiles](TASK-0009-motor-puertas-pasillos-anchos.md)
* [TASK-0010 — Host: mapa generado, semilla, muros y debug](TASK-0010-host-mapa-generado-muros-debug.md)
* [TASK-0011 — E2E y QA visual del mapa generado](TASK-0011-e2e-qa-mapa-generado.md)
* [TASK-0012 — Motor: planificación de camino y clasificación de destino](TASK-0012-motor-camino-destino.md)
* [TASK-0013 — Motor: Moverse por destino y acercarse + atacar](TASK-0013-motor-moverse-atacar.md)
* [TASK-0014 — Host: cursor, input, camino y feedback](TASK-0014-host-cursor-camino.md)
* [TASK-0015 — E2E y QA visual del cursor y el camino](TASK-0015-e2e-qa-cursor.md)
* [TASK-0016 — Host, render y tests: viewport 13×13 centrado con tiles completos](TASK-0016-viewport-13x13.md)
* [TASK-0017 — EXP-002: ritmo del movimiento animado](TASK-0017-ritmo-movimiento.md)
* [TASK-0018 — Host: animación de movimiento, cámara e input bloqueado](TASK-0018-movimiento-animado-host.md)
* [TASK-0019 — E2E y QA visual del movimiento animado](TASK-0019-e2e-movimiento-animado.md)

