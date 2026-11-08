# Requisitos

* [REQ-001 — Primer prototipo jugable local](REQ-001-primer-prototipo-local.md) - Una sala, un jugador, un enemigo, teclado, cámara y turnos con la economía provisional. Cerrado tras playtest.
* [REQ-002 — Encuadre 16:9, mapa 12×12 y ajustes de sala](REQ-002-encuadre-16-9.md) - Siguiente corte: marco 16:9, mapa cuadrado de 12×12, laterales negros, sala 20×20 y MP 6/4. Aprobada; tareas TASK-0004 a TASK-0006.
* [REQ-003 — Generación procedural del mapa y colocación de muros](REQ-003-generacion-mapa.md) - Completada tras playtest: A · BSP, `MapGenerator`, configuración 9/4/11/20, 1-2 pasillos anchos de 2 tiles y muros por borde. Tareas TASK-0008 a TASK-0011.
* [REQ-003 — Anexo EXP-001](REQ-003-anexo-exp-001.md) - Informativo, no normativo: comparativa A/B/C, motivo del usuario y preguntas que incorpora la v2.
* [REQ-004 — Cursor de selección, camino y acciones por destino](REQ-004-cursor-seleccion.md) - Completada tras playtest: cursor de 4 direcciones, tres estados, camino resaltado y Moverse sobre enemigo como acercarse y atacar. Tareas TASK-0012 a TASK-0015.
* [REQ-005 — Viewport impar 13×13 con jugador centrado y tiles completos](REQ-005-viewport-impar-13.md) - Completada tras playtest: sub-viewport cuadrado de 13×13 tiles, jugador en el tile central y bordes con tiles completos. Tarea TASK-0016.
* [REQ-006 — Movimiento animado paso a paso y cámara que sigue](REQ-006-movimiento-animado.md) - Completada tras playtest: animación tile a tile de jugador y enemigos, cámara continua a píxel entero e input bloqueado. Ritmo 125 ms por paso, 70 ms de pausa y diagonal a duración constante. Tareas TASK-0017 a TASK-0019.
* [REQ-007 — Damero de suelo y decoración no bloqueante](REQ-007-damero-decoracion-suelo.md) - Completada tras playtest: damero global 1×1 con tinte sutil, decoración plana en salas (12-18 %) y pasillos (6-8 %), sin bloqueo ni cambios de muros. Tareas TASK-0021 y TASK-0022 cerradas. Histórica: su capa visual queda sustituida por REQ-008.
* [REQ-008 — Suelo programático por sala y decoración ambiental](REQ-008-suelo-programatico-decoracion-ambiental.md) - Aprobada: damero de dos colores planos con base común y segundo tono por sala, cinco paletas asignadas por contraste, 33 decals y densidades 35/16 con ambientes. Tareas TASK-0023 y TASK-0024.
* [REQ-009 — Percepción, alarma y huida enemiga](REQ-009-percepcion-alarma-huida.md) - Stable: visión 360° con línea de visión, detección por paso, alarma de una onda y huida determinista del cobarde. Bestiario Centinela/Bruto/Cobarde (visión 6/4/5, alarma 8), 4 enemigos, MP completo en alerta y huida, umbral del 40 % con la tabla A de REQ-010 y memoria de 3 fases.
* [REQ-010 — Combate con equipo: acierto, escudo y armadura](REQ-010-combate-equipo-acierto-defensa.md) - Stable: acierto de arma + 1d6 contra escudo + 1d6, daño de arma + 1d6 menos armadura + 1d6 (mínimo 1), modificadores +1/+1/+1, tres armas melee, armadura y escudo, recogida con G por 1 MP y dos armas por semilla. Tabla A de EXP-003 aceptada (semilla 1017, 1.000 duelos); tareas TASK-0026 a TASK-0030.

Las tareas deben apuntar a la hoja y a los identificadores de requisito
concretos. Cuando se cree una hoja nueva, se añadirá aquí con el identificador
`REQ-NNN`.

* [Plantilla de requisitos](../templates/requirement.md)
* [Flujo de requisitos y experimentos](../harness/workflow.md)
