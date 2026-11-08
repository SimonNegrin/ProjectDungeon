---
type: Task
id: TASK-0040
title: "EXP-004: comparador de generadores de salas irregulares"
description: Construir el experimento interactivo que compara tres algoritmos de mazmorra densa con el tileset real, métricas, spawn, enemigos y export de decisión.
status: stable
task_status: ready
task_type: experiment
requirement: REQ-011
requirement_ids: [R-002, R-003, R-005, R-006, R-007, T-001, T-005, T-008]
depends_on: []
unlocks: []
created_at: 2026-11-08T23:55:54Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0040/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T23:55:54Z }
verified:
---

# Objetivo

Construir `EXP-004` en `experiments/EXP-004-salas-irregulares/`: una página
interactiva que compare A · crecimiento sobre roca, B · BSP con máscaras y
C · plantillas empaquetadas con la misma semilla y parámetros. Debe usar el
tileset real, mostrar salas, muros, puertas, spawn y enemigos, y exportar la
decisión. No se modifica producción.

# Contexto

- Requisito: [REQ-011](../requirements/REQ-011-generador-densa-salas-irregulares.md).
- Spawn y reparto: [REQ-012](../requirements/REQ-012-spawn-sala-protegida.md).
- Definición: [EXP-004](../../experiments/EXP-004-salas-irregulares/experiment.md).
- Referencias: [EXP-001](../../experiments/EXP-001-generador-mazmorra/experiment.md),
  shell en `experiments/_shell/`, assets en `public/assets/32rogues/`.
- Autocontenido: no importa código de producción que se vaya a cambiar.
# Criterios de aceptación

- [ ] La página existe en `/experiments/EXP-004-salas-irregulares/` y está
      registrada en `experiments/manifest.ts`.
- [ ] A, B y C generan el mismo tipo de contrato: salas con máscara irregular,
      muros de 1-2 tiles, conexiones de 0-3 tiles, puertas, pasillo ancho
      ocasional, caverna ocasional, sala de spawn y enemigos.
- [ ] Las tres variantes son deterministas: misma semilla y parámetros producen
      el mismo mapa; no se usa `Math.random`.
- [ ] El render usa el tileset real de 32rogues, la regla de muro por borde, las
      paletas de `REQ-008`, las puertas decorativas por zona y una vista de
      juego 13×13 además del mapa completo.
- [ ] Controles: semilla, ancho, alto, salas, tamaño mínimo/máximo, pasillo
      máximo, probabilidad de ancho, grosor de muro, probabilidad de caverna,
      variante, debug, puertas y spawn/enemigos.
- [ ] Panel de métricas: salas, roles, área/caja, muescas, hornacinas, paredes
      compartidas, longitudes de pasillo, bucles, anchos, caverna, accesos y
      huecos de spawn, enemigos por sala y tiempo de generación.
- [ ] Botón de exportación con semilla, variante, parámetros y métricas en JSON.
- [ ] Tests unitarios de las tres variantes: determinismo, conectividad, formas,
      longitudes, puertas, spawn con ≥6 huecos y reparto de enemigos.
- [ ] Capturas de A/B/C con al menos 4 semillas, incluidas una caverna y un
      pasillo ancho; revisadas a 1280×720.
- [ ] `pnpm run docs:check`, `pnpm run test` y `pnpm run build` pasan; sin
      dependencias nuevas.
- [ ] `src/`, `tests/`, `index.html` y `public/` no cambian.

# Plan de test

- **Unitario:** `experiments/EXP-004-salas-irregulares/src/*.test.ts` para las
  tres variantes y los validadores del contrato.
- **Integración:** la página importa el manifest y renderiza cada variante sin
  errores de consola.
- **E2E / visual:** abrir la página, cambiar semilla y variante, capturar mapa
  completo, debug, puertas, spawn y vista 13×13.
- **Manual:** probar 8 semillas; comprobar que la caverna aparece ~1/6 y el
  pasillo ancho ~1/3; comparar con las tres capturas de referencia.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0040/attempt-1/report.md`.
- [ ] Salidas de `test`, `docs:check` y `build` en `attempt-1/`.
- [ ] Capturas en `attempt-1/screenshots/` y JSON de decisión de ejemplo.
- [ ] Commit SHA en la rama `task/TASK-0040`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run test` | 120 s |
| `pnpm run docs:check` | 30 s |
| `pnpm run build` | 120 s |
| `pnpm run dev` (manual, puerto fijo) | 60 s |

# Restricciones

- No modificar `src/`, `tests/`, el `index.html` raíz ni `public/`.
- No añadir dependencias ni arte final.
- No usar `Math.random`, relojes ni estado global para generar.
- El experimento no decide por el usuario: exporta datos y deja la decisión
  abierta.
- No promover nada a producción en esta tarea.

# No objetivos

- Implementar el generador de producción, el modelo de sala o la selección de
  spawn en el juego.
- Cambiar BSP, el motor, el HUD, el combate o la IA.
- Puertas funcionales, escaleras, multinivel o materiales de muro por zona.
- Cerrar `REQ-011` o `REQ-012`: solo se validan con el experimento.
