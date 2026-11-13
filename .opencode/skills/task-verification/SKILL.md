---
name: Task Verification
description: Verificar de forma independiente el trabajo de task-runner antes de cerrar una tarea.
---

# Cuándo usarla

Después de recibir el informe de `task-runner`, antes de fusionar o cerrar.

# Principio

El runner no se autoevalúa. El lead re-ejecuta y revisa. No se acepta “los tests
pasan” sin verlo.

# Checklist

## Alcance

- [ ] El diff corresponde a la tarea.
- [ ] No hay cambios no relacionados.
- [ ] No se han tocado requisitos ni criterios.
- [ ] No se ha cambiado el alcance.

## Tests

- [ ] `pnpm run verify` pasa con timeout de 120 s.
- [ ] E2E/visual pasa si aplica con timeout de 180 s.
- [ ] Los comandos se ejecutaron con el parámetro `timeout`.
- [ ] No quedan procesos en background ni comandos colgados.
- [ ] Los tests nuevos comprueban comportamiento, no implementación.
- [ ] No se han borrado, saltado o debilitado tests.
- [ ] No hay tests frágiles por tiempo real.

## Aceptación

- [ ] Cada criterio de aceptación se cumple.
- [ ] La evidencia demuestra el resultado.
- [ ] Las capturas son claras.
- [ ] El informe incluye commit SHA y comandos.

## Documentación

- [ ] La tarea está actualizada.
- [ ] El log está actualizado.
- [ ] Las ADR necesarias existen.
- [ ] El tablero se ha regenerado.

# Reintentos

Si falla:

1. Devuelve al runner con una hipótesis nueva.
2. Adjunta evidencia.
3. Máximo dos relanzamientos.
4. Después, escala según
   [docs/harness/workflow.md](../../docs/harness/workflow.md#reintentos-y-escalado).

# Cierre

- Fusionar.
- Actualizar `task_status`, `completed_at`, `attempts`, `verified`.
- Ejecutar `pnpm run tasks:board`.
- Resumir al usuario qué puede probar y qué debe mirar.
