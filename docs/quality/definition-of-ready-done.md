---
type: Quality Gate
title: Definition of Ready y Definition of Done
description: Criterios operativos para requisitos, tareas, experimentos e hitos.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Requisito listo para generar tareas

- El usuario ha aceptado las decisiones creativas.
- Las decisiones técnicas necesarias están tomadas o delegadas.
- Los requisitos son concretos y verificables.
- Hay ejemplos de aceptación o un playtest definido.
- Está claro qué queda fuera de alcance.
- No hay contradicciones abiertas.
- La hoja tiene versión y fecha.

# Tarea lista para ejecutar

- Deriva de un requisito aceptado.
- Tiene un resultado observable.
- Tiene criterios de aceptación.
- Tiene un plan de test.
- Las dependencias están terminadas.
- No hay una decisión creativa abierta.
- Se conocen los archivos o módulos afectados.
- La ruta de artefactos está definida.
- Cabe en una sesión de agente; si no, se divide.

# Tarea terminada

- Implementación completa.
- Tests añadidos o actualizados desde los criterios.
- `npm run verify` pasa.
- E2E/visual pasa si aplica.
- No hay regresiones.
- No se han debilitado tests.
- Documentación afectada actualizada.
- Cabecera de tarea actualizada: estado, `completed_at`, intentos y artefactos.
- `task-lead` ha verificado de forma independiente.
- El usuario ha aprobado si la tarea tiene resultado creativo.

# Experimento terminado

- Responde a una única pregunta.
- Los controles funcionan y son claros.
- Se puede exportar la configuración.
- Hay métricas o criterios de comparación.
- Hay capturas de los estados relevantes.
- El usuario ha probado el experimento.
- La decisión está registrada con `decision`, `decided_by` y `decided_at`.
- El requisito afectado se ha actualizado o se ha creado.
- El código validado se ha promocionado o el experimento queda archivado.

# Hito terminado

- Build jugable o experimento demostrable.
- Tests y documentación al día.
- El usuario ha hecho un playtest.
- Las decisiones creativas están aceptadas.
- Las deudas técnicas conocidas están registradas como tareas.
- Hay una demo reproducible con instrucciones de arranque.

# Regla de oro

El `task-runner` no declara una tarea terminada. El `task-lead` verifica y cierra.
El usuario aprueba lo creativo.
