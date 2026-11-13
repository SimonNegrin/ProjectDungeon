# Tareas

Total: **98**. Generado desde el frontmatter de `docs/tasks/*.md`.

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
| [TASK-0021](TASK-0021-host-damero-decoracion.md) | Host: damero global y decoración plana determinista | `done` | REQ-007 | — | P1 |
| [TASK-0022](TASK-0022-e2e-qa-damero-decoracion.md) | E2E y QA visual del damero y la decoración | `done` | REQ-007 | TASK-0021 | P1 |
| [TASK-0023](TASK-0023-host-suelo-programatico-ambientes.md) | Host: suelo programático por sala y decoración ambiental | `done` | REQ-008 | — | P1 |
| [TASK-0024](TASK-0024-e2e-qa-suelo-ambientes.md) | E2E y QA visual del suelo por sala y la decoración ambiental | `done` | REQ-008 | TASK-0023 | P1 |
| [TASK-0025](TASK-0025-mesa-combate-exp-003.md) | EXP-003: mesa de combate configurable | `done` | REQ-010 | — | P1 |
| [TASK-0026](TASK-0026-motor-combate-equipo-modificadores.md) | Motor: combate con equipo, modificadores y RNG sembrado | `done` | REQ-010 | — | P1 |
| [TASK-0027](TASK-0027-equipo-armas-mapa-recogida.md) | Motor y host: equipo, armas del mapa y recogida | `done` | REQ-010 | TASK-0026 | P1 |
| [TASK-0028](TASK-0028-bestiario-combate-ataque-enemigo.md) | Motor: bestiario de combate y ataque enemigo | `done` | REQ-010 | TASK-0026 | P1 |
| [TASK-0029](TASK-0029-host-hud-equipo-feedback.md) | Host: HUD de equipo, armas en el mapa y feedback de combate | `done` | REQ-010 | TASK-0027, TASK-0028 | P1 |
| [TASK-0030](TASK-0030-e2e-qa-combate-equipo.md) | E2E y QA visual del combate con equipo | `done` | REQ-010 | TASK-0029 | P1 |
| [TASK-0034](TASK-0034-motor-percepcion-linea-vision-memoria.md) | Motor: percepción, línea de visión, detección por paso y memoria | `done` | REQ-009 | — | P1 |
| [TASK-0035](TASK-0035-motor-alarma-onda-enfriamiento.md) | Motor: alarma de una onda, enfriamiento y daño como despertador | `done` | REQ-009 | TASK-0034 | P1 |
| [TASK-0036](TASK-0036-motor-colocacion-cuatro-enemigos.md) | Motor: colocación determinista de cuatro enemigos | `done` | REQ-009 | TASK-0034 | P1 |
| [TASK-0037](TASK-0037-motor-ia-alerta-mp-huida-cobarde.md) | Motor: IA de alerta con MP y huida del cobarde | `done` | REQ-009 | TASK-0035, TASK-0036 | P1 |
| [TASK-0038](TASK-0038-host-feedback-percepcion-alarma.md) | Host: feedback de percepción, alarma y debug | `done` | REQ-009 | TASK-0037 | P1 |
| [TASK-0039](TASK-0039-e2e-qa-percepcion-alarma-huida.md) | E2E y QA visual de percepción, alarma y huida | `done` | REQ-009 | TASK-0037, TASK-0038 | P1 |
| [TASK-0040](TASK-0040-exp-004-salas-irregulares.md) | EXP-004: comparador de generadores de salas irregulares | `done` | REQ-011 | — | P1 |
| [TASK-0041](TASK-0041-exp-004-puertas-spawn-enemigos.md) | EXP-004: puertas, acceso de spawn y presupuesto de enemigos | `done` | REQ-011 | — | P1 |
| [TASK-0050](TASK-0050-motor-balance-provisional-v1.md) | Motor: balance provisional v1 (bestiario y armas) | `done` | REQ-010 | — | P1 |
| [TASK-0051](TASK-0051-host-e2e-qa-balance-v1.md) | Host, E2E y QA visual del balance provisional v1 | `done` | REQ-010 | TASK-0050 | P1 |
| [TASK-0042](TASK-0042-exp-004-distribucion-emboscadas-salida.md) | EXP-004: distribución orgánica, emboscadas y salida de nivel | `done` | REQ-012 | — | P1 |
| [TASK-0043](TASK-0043-motor-modelo-mapa-produccion.md) | Motor: modelo de mapa de producción con máscaras y spawn de grupo | `done` | REQ-011 | — | P1 |
| [TASK-0044](TASK-0044-motor-nucleo-salas-pasillos-puertas.md) | Motor: núcleo compartido de salas, pasillos y puertas | `done` | REQ-011 | TASK-0043 | P1 |
| [TASK-0045](TASK-0045-motor-spawn-enemigos-salida.md) | Motor: spawn de grupo, enemigos y salida compartidos | `done` | REQ-012 | TASK-0044 | P1 |
| [TASK-0046](TASK-0046-motor-variante-growth-defecto.md) | Motor: variante growth y generador por defecto | `done` | REQ-011 | TASK-0045 | P1 |
| [TASK-0047](TASK-0047-arnes-build-produccion-guarda-bundle.md) | Arnés: build de producción separado y guarda de bundle | `done` | REQ-011 | TASK-0046 | P1 |
| [TASK-0048](TASK-0048-host-render-spawn-puertas-salida.md) | Host: render de máscaras, puertas, spawn, entrada/salida y enemigos | `done` | REQ-011 | TASK-0046 | P1 |
| [TASK-0049](TASK-0049-e2e-qa-playtest-growth.md) | E2E, QA visual y playtest de growth por defecto | `done` | REQ-011 | TASK-0047, TASK-0048 | P1 |
| [TASK-0053](TASK-0053-motor-esquema-atributos-resistencia.md) | Motor: esquema de ocho atributos y resistencia en la absorción | `done` | REQ-014 | — | P1 |
| [TASK-0054](TASK-0054-host-docs-esquema-adr-015.md) | Host y docs: nombres nuevos del esquema y ADR-015 | `done` | REQ-014 | TASK-0053 | P1 |
| [TASK-0055](TASK-0055-motor-roster-cuchillo-nombre.md) | Motor: catálogo de roster, Cuchillo y nombre de personaje | `done` | REQ-015 | TASK-0053 | P1 |
| [TASK-0056](TASK-0056-guerrero-defecto-host-docs.md) | Guerrero por defecto, host, tests y docs del roster | `done` | REQ-015 | TASK-0054, TASK-0055 | P1 |
| [TASK-0057](TASK-0057-nucleo-feedback-timeline-estado.md) | Núcleo del feedback visual: configuración, timeline y estado intermedio | `done` | REQ-017 | — | P1 |
| [TASK-0058](TASK-0058-feedback-combate-muerte.md) | Feedback de combate y muerte: impacto, fallo, daño y cadáver | `done` | REQ-017 | TASK-0057 | P1 |
| [TASK-0059](TASK-0059-feedback-inventario-percepcion-turno.md) | Feedback de inventario, percepción y turno | `done` | REQ-017 | TASK-0057 | P1 |
| [TASK-0063](TASK-0063-exp-003-v2-motor-medicion.md) | EXP-003 v2.0: motor data-driven, escenarios 1v1 y medición | `done` | REQ-027 | — | P1 |
| [TASK-0064](TASK-0064-exp-003-v2-pagina-api-export.md) | EXP-003 v2.0: página, API y export de la mesa | `done` | REQ-027 | TASK-0063 | P1 |
| [TASK-0066](TASK-0066-exp-003-banco-ajuste-motor.md) | EXP-003: motor y datos del banco de ajuste | `done` | REQ-028 | — | P1 |
| [TASK-0067](TASK-0067-exp-003-banco-ajuste-ui.md) | EXP-003: UI del banco de ajuste | `done` | REQ-028 | TASK-0066 | P1 |
| [TASK-0068](TASK-0068-exp-003-banco-ajuste-e2e.md) | EXP-003: E2E y QA visual del banco de ajuste | `done` | REQ-028 | TASK-0067 | P1 |
| [TASK-0069](TASK-0069-exp-003-tres-tablas-motor.md) | EXP-003: motor y datos de las tres tablas | `done` | REQ-028 | — | P1 |
| [TASK-0070](TASK-0070-exp-003-tres-tablas-ui.md) | EXP-003: tres tablas inline a ancho completo | `done` | REQ-028 | TASK-0069 | P1 |
| [TASK-0071](TASK-0071-exp-003-tres-tablas-e2e.md) | EXP-003: E2E y QA visual de las tres tablas | `done` | REQ-028 | TASK-0070 | P1 |
| [TASK-0072](TASK-0072-exp-003-objetivos-por-par.md) | EXP-003: objetivos por par, diagnóstico y export | `done` | REQ-028 | — | P1 |
| [TASK-0073](TASK-0073-exp-003-filtros-tablas.md) | EXP-003: filtros de las tres tablas | `done` | REQ-028 | TASK-0072 | P1 |
| [TASK-0074](TASK-0074-exp-003-objetivos-filtros-e2e.md) | EXP-003: E2E y QA visual de objetivos por par y filtros | `done` | REQ-028 | TASK-0073 | P1 |
| [TASK-0076](TASK-0076-motor-contador-acciones-costes.md) | Motor: contador de acciones y costes por comando | `done` | REQ-026 | — | P1 |
| [TASK-0077](TASK-0077-motor-ia-acciones-encadenadas.md) | Motor: IA enemiga con acciones encadenadas | `done` | REQ-026 | TASK-0076 | P1 |
| [TASK-0078](TASK-0078-host-contador-acciones-fin-turno.md) | Host: contador de acciones, fin de turno y beats | `done` | REQ-026 | TASK-0077 | P1 |
| [TASK-0079](TASK-0079-motor-replica-cuerpo-a-cuerpo.md) | Motor: réplica tras fallo cuerpo a cuerpo | `done` | REQ-027 | TASK-0078 | P1 |
| [TASK-0080](TASK-0080-host-docs-replica-visible.md) | Host y docs: réplica visible y ADR | `done` | REQ-027 | TASK-0079 | P1 |
| [TASK-0081](TASK-0081-motor-nivel-magia-mana.md) | Motor: nivel de magia y maná por turno | `done` | REQ-025 | TASK-0080 | P1 |
| [TASK-0082](TASK-0082-motor-catalogo-hechizos.md) | Motor: catálogo y resolución de hechizos | `done` | REQ-025 | TASK-0081 | P1 |
| [TASK-0083](TASK-0083-host-lanzamiento-hechizos-hud.md) | Host: lanzamiento de hechizos, HUD y feedback | `done` | REQ-025 | TASK-0082 | P1 |
| [TASK-0084](TASK-0084-balance-acciones-magia-replica.md) | Balance: propuesta con acciones, magia y réplica | `blocked` | REQ-026 | TASK-0083 | P1 |
| [TASK-0085](TASK-0085-motor-tipos-dano-paquetes-resolvedor.md) | Motor: tipos de daño, paquetes y resolvedor con bandas | `done` | REQ-029 | — | P1 |
| [TASK-0086](TASK-0086-motor-perfiles-resistencia-roster-bestiario.md) | Motor: perfiles de resistencia v1 de roster, bestiario y familias | `done` | REQ-029 | TASK-0085 | P1 |
| [TASK-0087](TASK-0087-motor-armas-nuevas-colocacion.md) | Motor: martillo, espada electrizada, daga arcana y colocación determinista | `done` | REQ-029 | TASK-0085 | P1 |
| [TASK-0088](TASK-0088-motor-eventos-desglose-dano.md) | Motor: desglose por paquete en eventos de ataque, réplica y hechizo | `done` | REQ-029 | TASK-0085, TASK-0086 | P1 |
| [TASK-0089](TASK-0089-host-cursor-bandas-feedback-dano.md) | Host: bandas en el detalle del cursor y desglose de daño | `done` | REQ-029 | TASK-0086, TASK-0088 | P1 |
| [TASK-0090](TASK-0090-verificacion-matriz-tipos-regresion-coste.md) | Verificación: matriz de tipos, regresión y coste por ataque | `done` | REQ-029 | TASK-0086, TASK-0087, TASK-0088 | P1 |
| [TASK-0091](TASK-0091-docs-formulas-bandas-vigencia.md) | Docs: fórmulas por paquete, bandas y vigencia de REQ-010/014/015/025 | `done` | REQ-029 | TASK-0089, TASK-0090 | P1 |
| [TASK-0092](TASK-0092-e2e-qa-tipos-dano-bandas.md) | E2E y QA visual de tipos de daño, bandas y desglose | `done` | REQ-029 | TASK-0087, TASK-0089 | P1 |
| [TASK-0093](TASK-0093-motor-catalogo-objetos-definiciones.md) | Motor: catálogo de objetos y definiciones de equipo | `ready` | REQ-018 | — | P1 |
| [TASK-0094](TASK-0094-motor-instancias-mochila-equipo-operaciones.md) | Motor: instancias, mochila, equipo y operaciones atómicas | `backlog` | REQ-018 | TASK-0093 | P1 |
| [TASK-0095](TASK-0095-host-panel-inventario-equipo.md) | Host: panel modal de inventario y equipo con `I` | `backlog` | REQ-018 | TASK-0094 | P1 |
| [TASK-0098](TASK-0098-e2e-qa-inventario-equipo.md) | E2E y QA visual del inventario y el equipo | `backlog` | REQ-018 | TASK-0095, TASK-0096 | P1 |
| [TASK-0020](TASK-0020-artefactos-e2e.md) | Arnés: artefactos E2E sin reescribir evidencia histórica | `done` | HARNESS | — | P2 |
| [TASK-0031](TASK-0031-host-feedback-dano-legible.md) | Host: feedback de daño legible junto a las unidades | `done` | REQ-010 | TASK-0029 | P2 |
| [TASK-0032](TASK-0032-e2e-helper-mp.md) | E2E: espera de MP compartida antes de recoger o actuar | `done` | HARNESS | TASK-0020 | P2 |
| [TASK-0033](TASK-0033-host-snapshot-profundo-rng.md) | Host: snapshot profundo y RNG de solo lectura | `done` | REQ-010 | TASK-0026, TASK-0027 | P2 |
| [TASK-0052](TASK-0052-exp-003-preset-balance-v1.md) | EXP-003: preset de balance provisional v1 | `blocked` | REQ-010 | TASK-0050 | P2 |
| [TASK-0060](TASK-0060-fase-enemiga-fuera-pantalla-reduced-motion.md) | Fase enemiga fuera de pantalla y movimiento reducido | `done` | REQ-017 | TASK-0057, TASK-0058, TASK-0059 | P2 |
| [TASK-0061](TASK-0061-e2e-qa-visual-feedback.md) | E2E y QA visual del feedback | `done` | REQ-017 | TASK-0058, TASK-0059, TASK-0060 | P2 |
| [TASK-0062](TASK-0062-arnes-sufijo-repeticion-capturas.md) | Arnés: sufijo de repetición en capturas E2E | `done` | HARNESS | — | P2 |
| [TASK-0065](TASK-0065-exp-003-v2-manifest.md) | EXP-003 v2.0: manifest del índice | `done` | REQ-027 | TASK-0064 | P2 |
| [TASK-0075](TASK-0075-arnes-validacion-log.md) | Arnés: validar el formato del log en docs:check | `done` | HARNESS | — | P2 |
| [TASK-0096](TASK-0096-host-objetos-suelo-sprite-debug.md) | Host: objetos del suelo con sprite, efectos y debug | `backlog` | REQ-018 | TASK-0094 | P2 |
| [TASK-0097](TASK-0097-docs-inventario-equipo-controles.md) | Docs: inventario, equipo, controles y vigencia | `backlog` | REQ-018 | TASK-0095, TASK-0096 | P2 |

# ready

* [TASK-0093 — Motor: catálogo de objetos y definiciones de equipo](TASK-0093-motor-catalogo-objetos-definiciones.md)

# blocked

* [TASK-0084 — Balance: propuesta con acciones, magia y réplica](TASK-0084-balance-acciones-magia-replica.md)
* [TASK-0052 — EXP-003: preset de balance provisional v1](TASK-0052-exp-003-preset-balance-v1.md)

# backlog

* [TASK-0094 — Motor: instancias, mochila, equipo y operaciones atómicas](TASK-0094-motor-instancias-mochila-equipo-operaciones.md)
* [TASK-0095 — Host: panel modal de inventario y equipo con `I`](TASK-0095-host-panel-inventario-equipo.md)
* [TASK-0098 — E2E y QA visual del inventario y el equipo](TASK-0098-e2e-qa-inventario-equipo.md)
* [TASK-0096 — Host: objetos del suelo con sprite, efectos y debug](TASK-0096-host-objetos-suelo-sprite-debug.md)
* [TASK-0097 — Docs: inventario, equipo, controles y vigencia](TASK-0097-docs-inventario-equipo-controles.md)

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
* [TASK-0021 — Host: damero global y decoración plana determinista](TASK-0021-host-damero-decoracion.md)
* [TASK-0022 — E2E y QA visual del damero y la decoración](TASK-0022-e2e-qa-damero-decoracion.md)
* [TASK-0023 — Host: suelo programático por sala y decoración ambiental](TASK-0023-host-suelo-programatico-ambientes.md)
* [TASK-0024 — E2E y QA visual del suelo por sala y la decoración ambiental](TASK-0024-e2e-qa-suelo-ambientes.md)
* [TASK-0025 — EXP-003: mesa de combate configurable](TASK-0025-mesa-combate-exp-003.md)
* [TASK-0026 — Motor: combate con equipo, modificadores y RNG sembrado](TASK-0026-motor-combate-equipo-modificadores.md)
* [TASK-0027 — Motor y host: equipo, armas del mapa y recogida](TASK-0027-equipo-armas-mapa-recogida.md)
* [TASK-0028 — Motor: bestiario de combate y ataque enemigo](TASK-0028-bestiario-combate-ataque-enemigo.md)
* [TASK-0029 — Host: HUD de equipo, armas en el mapa y feedback de combate](TASK-0029-host-hud-equipo-feedback.md)
* [TASK-0030 — E2E y QA visual del combate con equipo](TASK-0030-e2e-qa-combate-equipo.md)
* [TASK-0034 — Motor: percepción, línea de visión, detección por paso y memoria](TASK-0034-motor-percepcion-linea-vision-memoria.md)
* [TASK-0035 — Motor: alarma de una onda, enfriamiento y daño como despertador](TASK-0035-motor-alarma-onda-enfriamiento.md)
* [TASK-0036 — Motor: colocación determinista de cuatro enemigos](TASK-0036-motor-colocacion-cuatro-enemigos.md)
* [TASK-0037 — Motor: IA de alerta con MP y huida del cobarde](TASK-0037-motor-ia-alerta-mp-huida-cobarde.md)
* [TASK-0038 — Host: feedback de percepción, alarma y debug](TASK-0038-host-feedback-percepcion-alarma.md)
* [TASK-0039 — E2E y QA visual de percepción, alarma y huida](TASK-0039-e2e-qa-percepcion-alarma-huida.md)
* [TASK-0040 — EXP-004: comparador de generadores de salas irregulares](TASK-0040-exp-004-salas-irregulares.md)
* [TASK-0041 — EXP-004: puertas, acceso de spawn y presupuesto de enemigos](TASK-0041-exp-004-puertas-spawn-enemigos.md)
* [TASK-0050 — Motor: balance provisional v1 (bestiario y armas)](TASK-0050-motor-balance-provisional-v1.md)
* [TASK-0051 — Host, E2E y QA visual del balance provisional v1](TASK-0051-host-e2e-qa-balance-v1.md)
* [TASK-0042 — EXP-004: distribución orgánica, emboscadas y salida de nivel](TASK-0042-exp-004-distribucion-emboscadas-salida.md)
* [TASK-0043 — Motor: modelo de mapa de producción con máscaras y spawn de grupo](TASK-0043-motor-modelo-mapa-produccion.md)
* [TASK-0044 — Motor: núcleo compartido de salas, pasillos y puertas](TASK-0044-motor-nucleo-salas-pasillos-puertas.md)
* [TASK-0045 — Motor: spawn de grupo, enemigos y salida compartidos](TASK-0045-motor-spawn-enemigos-salida.md)
* [TASK-0046 — Motor: variante growth y generador por defecto](TASK-0046-motor-variante-growth-defecto.md)
* [TASK-0047 — Arnés: build de producción separado y guarda de bundle](TASK-0047-arnes-build-produccion-guarda-bundle.md)
* [TASK-0048 — Host: render de máscaras, puertas, spawn, entrada/salida y enemigos](TASK-0048-host-render-spawn-puertas-salida.md)
* [TASK-0049 — E2E, QA visual y playtest de growth por defecto](TASK-0049-e2e-qa-playtest-growth.md)
* [TASK-0053 — Motor: esquema de ocho atributos y resistencia en la absorción](TASK-0053-motor-esquema-atributos-resistencia.md)
* [TASK-0054 — Host y docs: nombres nuevos del esquema y ADR-015](TASK-0054-host-docs-esquema-adr-015.md)
* [TASK-0055 — Motor: catálogo de roster, Cuchillo y nombre de personaje](TASK-0055-motor-roster-cuchillo-nombre.md)
* [TASK-0056 — Guerrero por defecto, host, tests y docs del roster](TASK-0056-guerrero-defecto-host-docs.md)
* [TASK-0057 — Núcleo del feedback visual: configuración, timeline y estado intermedio](TASK-0057-nucleo-feedback-timeline-estado.md)
* [TASK-0058 — Feedback de combate y muerte: impacto, fallo, daño y cadáver](TASK-0058-feedback-combate-muerte.md)
* [TASK-0059 — Feedback de inventario, percepción y turno](TASK-0059-feedback-inventario-percepcion-turno.md)
* [TASK-0063 — EXP-003 v2.0: motor data-driven, escenarios 1v1 y medición](TASK-0063-exp-003-v2-motor-medicion.md)
* [TASK-0064 — EXP-003 v2.0: página, API y export de la mesa](TASK-0064-exp-003-v2-pagina-api-export.md)
* [TASK-0066 — EXP-003: motor y datos del banco de ajuste](TASK-0066-exp-003-banco-ajuste-motor.md)
* [TASK-0067 — EXP-003: UI del banco de ajuste](TASK-0067-exp-003-banco-ajuste-ui.md)
* [TASK-0068 — EXP-003: E2E y QA visual del banco de ajuste](TASK-0068-exp-003-banco-ajuste-e2e.md)
* [TASK-0069 — EXP-003: motor y datos de las tres tablas](TASK-0069-exp-003-tres-tablas-motor.md)
* [TASK-0070 — EXP-003: tres tablas inline a ancho completo](TASK-0070-exp-003-tres-tablas-ui.md)
* [TASK-0071 — EXP-003: E2E y QA visual de las tres tablas](TASK-0071-exp-003-tres-tablas-e2e.md)
* [TASK-0072 — EXP-003: objetivos por par, diagnóstico y export](TASK-0072-exp-003-objetivos-por-par.md)
* [TASK-0073 — EXP-003: filtros de las tres tablas](TASK-0073-exp-003-filtros-tablas.md)
* [TASK-0074 — EXP-003: E2E y QA visual de objetivos por par y filtros](TASK-0074-exp-003-objetivos-filtros-e2e.md)
* [TASK-0076 — Motor: contador de acciones y costes por comando](TASK-0076-motor-contador-acciones-costes.md)
* [TASK-0077 — Motor: IA enemiga con acciones encadenadas](TASK-0077-motor-ia-acciones-encadenadas.md)
* [TASK-0078 — Host: contador de acciones, fin de turno y beats](TASK-0078-host-contador-acciones-fin-turno.md)
* [TASK-0079 — Motor: réplica tras fallo cuerpo a cuerpo](TASK-0079-motor-replica-cuerpo-a-cuerpo.md)
* [TASK-0080 — Host y docs: réplica visible y ADR](TASK-0080-host-docs-replica-visible.md)
* [TASK-0081 — Motor: nivel de magia y maná por turno](TASK-0081-motor-nivel-magia-mana.md)
* [TASK-0082 — Motor: catálogo y resolución de hechizos](TASK-0082-motor-catalogo-hechizos.md)
* [TASK-0083 — Host: lanzamiento de hechizos, HUD y feedback](TASK-0083-host-lanzamiento-hechizos-hud.md)
* [TASK-0085 — Motor: tipos de daño, paquetes y resolvedor con bandas](TASK-0085-motor-tipos-dano-paquetes-resolvedor.md)
* [TASK-0086 — Motor: perfiles de resistencia v1 de roster, bestiario y familias](TASK-0086-motor-perfiles-resistencia-roster-bestiario.md)
* [TASK-0087 — Motor: martillo, espada electrizada, daga arcana y colocación determinista](TASK-0087-motor-armas-nuevas-colocacion.md)
* [TASK-0088 — Motor: desglose por paquete en eventos de ataque, réplica y hechizo](TASK-0088-motor-eventos-desglose-dano.md)
* [TASK-0089 — Host: bandas en el detalle del cursor y desglose de daño](TASK-0089-host-cursor-bandas-feedback-dano.md)
* [TASK-0090 — Verificación: matriz de tipos, regresión y coste por ataque](TASK-0090-verificacion-matriz-tipos-regresion-coste.md)
* [TASK-0091 — Docs: fórmulas por paquete, bandas y vigencia de REQ-010/014/015/025](TASK-0091-docs-formulas-bandas-vigencia.md)
* [TASK-0092 — E2E y QA visual de tipos de daño, bandas y desglose](TASK-0092-e2e-qa-tipos-dano-bandas.md)
* [TASK-0020 — Arnés: artefactos E2E sin reescribir evidencia histórica](TASK-0020-artefactos-e2e.md)
* [TASK-0031 — Host: feedback de daño legible junto a las unidades](TASK-0031-host-feedback-dano-legible.md)
* [TASK-0032 — E2E: espera de MP compartida antes de recoger o actuar](TASK-0032-e2e-helper-mp.md)
* [TASK-0033 — Host: snapshot profundo y RNG de solo lectura](TASK-0033-host-snapshot-profundo-rng.md)
* [TASK-0060 — Fase enemiga fuera de pantalla y movimiento reducido](TASK-0060-fase-enemiga-fuera-pantalla-reduced-motion.md)
* [TASK-0061 — E2E y QA visual del feedback](TASK-0061-e2e-qa-visual-feedback.md)
* [TASK-0062 — Arnés: sufijo de repetición en capturas E2E](TASK-0062-arnes-sufijo-repeticion-capturas.md)
* [TASK-0065 — EXP-003 v2.0: manifest del índice](TASK-0065-exp-003-v2-manifest.md)
* [TASK-0075 — Arnés: validar el formato del log en docs:check](TASK-0075-arnes-validacion-log.md)

