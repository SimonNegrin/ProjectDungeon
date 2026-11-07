---
name: Task Decomposition
description: Convertir requisitos aprobados en tareas atómicas con dependencias, criterios de aceptación y evidencia.
---

# Cuándo usarla

Después de aprobar una hoja de requisitos, o al replanificar un milestone.

# Atomicidad

Una tarea debe tener:

- un resultado observable;
- un diff revisable;
- un comando de test;
- una ruta de artefactos;
- una sola razón para fallar.

Si necesita una decisión creativa, no está lista. Si no cabe en una sesión de
agente, se divide. Si es una incertidumbre, es un experimento o un spike.

# Tipos

`feature`, `test`, `experiment`, `spike`, `docs`, `art`, `refactor`.

# Cabecera

Usa la plantilla `docs/templates/task.md`:

- `id`: `TASK-NNNN`.
- `requirement`: hoja de origen.
- `requirement_ids`: requisitos concretos.
- `depends_on`: IDs de tareas.
- `unlocks`: IDs de tareas.
- `created_at` / `completed_at`.
- `task_status`.
- `task_type`.
- `assignee`.
- `attempts`.
- `artifacts`.
- `priority` y `risk`.

# Grafo

- `depends_on` y `unlocks` usan IDs.
- Si A depende de B, B debe desbloquear A.
- No hay ciclos.
- No hay tareas huérfanas.
- Una tarea `ready` no puede tener dependencias sin terminar.

# Just-in-time

Genera solo las tareas del milestone actual. No planifiques todo el juego. Las
tareas caducan cuando cambian los requisitos.

# Buenas tareas

- “Validar movimiento diagonal con coste 1 y sin corte de esquina.”
- “Añadir cámara que sigue al jugador y se limita al mapa.”
- “Implementar cambio de fase jugadores -> enemigos.”

# Malas tareas

- “Implementar el combate.”
- “Hacer el multijugador.”
- “Diseñar el juego.”
- “Mejorar el rendimiento.”

# Checklist

- [ ] Deriva de un requisito aceptado.
- [ ] Tiene criterios de aceptación.
- [ ] Tiene plan de test.
- [ ] Tiene dependencias y unlocks coherentes.
- [ ] Tiene evidencia esperada.
- [ ] Cabe en una sesión.
- [ ] No contiene una decisión creativa abierta.
- [ ] `npm run docs:check` pasa.
