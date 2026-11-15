---
type: Task Report Detail
title: "TASK-0128: alcance pendiente y texto propuesto"
description: Cambios de docs/scope.md que corresponden a requirements-writer.
task: TASK-0128
attempt: 1
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T10:18:00Z }
artifacts: artifacts/TASK-0128/attempt-1/
---

# Motivo del bloqueo

El criterio 3 de TASK-0128 pide que el alcance refleje el arranque. `docs/scope.md`
no está en el allowlist de `task-lead` (`docs/tasks/**`, `docs/decisions/**`,
`docs/log.md`, `docs/design/**`, `docs/glossary.md`, `artifacts/**`) y el rol
reserva el alcance a `requirements-writer`. La edición devolvió
`Permission denied`. No se usó el shell para saltar el permiso.

# Texto propuesto para docs/scope.md

Solo refleja REQ-016 v3 y TASK-0122 a TASK-0127; no cambia reglas ni añade
alcance. «Cargar» sigue sin cargar hasta TASK-0141, así que no se afirma que
funcione.

1. Primer párrafo de «Alcance vigente», sustituir la primera frase por:

   «El prototipo actual arranca con menú principal, paso 1 de 1-6 jugadores y
   semilla, configuración jugador a jugador y resumen; la partida jugable sigue
   siendo de un jugador hasta el hotseat de la fase 2. El menú principal ofrece
   «Nueva» y «Cargar», y la carga efectiva de REQ-024 sigue pendiente. La
   configuración no se guarda entre sesiones: cada entrada parte de cero y genera
   una semilla. El dungeon crawler con teclado mantiene mazmorra generada, turnos,
   combate con equipo, percepción y feedback visual.»

2. Fila de la fase 2:

   «| 2 | Multijugador local hotseat en el mismo teclado | En implementación: menú
   principal, configuración y resumen de REQ-016 ya implementados (TASK-0122 a
   TASK-0127); hotseat jugable, pausa y guardado pendientes |»

3. Punto «Hotseat» de «Estado de requisitos»: sustituir «están `stable` y sin
   tareas» por «están `stable`. El arranque de `REQ-016` está implementado
   (TASK-0122 a TASK-0127): menú principal, paso 1 con 1-6 jugadores y semilla,
   configuración, resumen y variante de sprite; el hotseat jugable, la pausa y el
   guardado siguen pendientes.»

4. En «Decisiones confirmadas», sustituir «Hasta 6 jugadores en el futuro; el
   primer prototipo es de 1.» por:

   «- El arranque tiene menú principal solo al inicio con «Nueva» y «Cargar», un
   paso 1 que fija 1-6 jugadores y semilla, configuración jugador a jugador con
   arquetipo, variante y nombre, y un resumen antes de «Empezar»; cancelar pide
   confirmación y vuelve al menú. La configuración no se guarda entre sesiones y
   la partida jugable sigue siendo de un jugador hasta el hotseat.»

5. En «Fuera de alcance ahora», sustituir el punto del hotseat y añadir la
   persistencia:

   «- Hotseat jugable: el arranque de `REQ-016` v3 ya permite configurar 1-6
   jugadores, pero los turnos, el relevo y la cámara de `REQ-031` siguen
   pendientes; sin reinicio rápido, el resultado ofrece «Nueva partida» y «Cargar
   partida».

   - Persistencia de la configuración de partida entre sesiones: cada entrada al
   paso 1 parte de cero; el guardado de una partida iniciada se define en
   `REQ-024`.»

# Criterios ya cubiertos por este intento

- ADR-006: tabla de 18 celdas y variante como estado.
- Glosario: menú principal, paso 1, resumen y variante de sprite.
- `docs/decisions/index.md` actualizado.
- `docs/requirements/**` intacto.

Quedan pendientes el alcance y la entrada de `docs/log.md`, que se añaden al
cerrar la tarea completa.
