---
type: Task
id: TASK-0089
title: "Host: bandas en el detalle del cursor y desglose de daño"
description: "Mostrar las cinco bandas del enemigo bajo el cursor solo con línea de visión, el perfil completo en F1 y el total más el desglose por tipo en el feedback de ataque."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-029
requirement_ids: [R-010, T-008]
depends_on: [TASK-0086, TASK-0088]
unlocks: [TASK-0091, TASK-0092]
created_at: 2026-11-13T12:30:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0089/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T12:30:00Z }
verified:
---

# Objetivo

Que el jugador lea las bandas del enemigo bajo el cursor cuando hay línea de
visión, vea el perfil completo en `F1` y reciba el daño como total más desglose
por tipo, con texto e icono y sin depender solo del color.

# Contexto

- Perfiles de resistencia en TASK-0086; desglose en eventos en TASK-0088.
- `src/host/hud.ts` construye el modelo del HUD, incluido el enemigo bajo el
  cursor; `index.html` declara sus nodos.
- `src/host/main.ts` presenta el ataque y `src/host/feedback.ts` y
  `feedback-config.ts` definen los beats; `src/host/visibility.ts` expone la
  línea de visión.
- [REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md#requisitos-técnicos)
  T-008 y R-010; [REQ-017](../requirements/REQ-017-feedback-visual-eventos.md)
  para los beats; [REQ-023](../requirements/REQ-023-hud-derecho-detalle-cursor.md)
  para el detalle del cursor.
- El host es presentación: lee estado y eventos, no recalcula bandas ni daño.

# Criterios de aceptación

- [ ] Con línea de visión, el detalle del cursor muestra las cinco bandas del
      enemigo con texto e icono; sin línea de visión no se muestran.
- [ ] `F1` muestra el perfil completo del enemigo bajo el cursor, incluidas las
      bandas normales, y sigue mostrando el resto del debug actual.
- [ ] El feedback de ataque muestra el total como número principal y el desglose
      por tipo, por ejemplo «−5» y «filo 3 + eléctrico 2», leído del evento.
- [ ] Cada paquete con daño recibe su beat si el ataque lo requiere; un paquete
      recortado a 0 no inventa un beat ni un texto de daño.
- [ ] Curación y resurrección no muestran desglose de paquetes.
- [ ] La información no depende solo del color: hay texto y, si hay icono, se
      entiende sin él.
- [ ] El total del ataque y los PV resultantes no cambian respecto al motor; el
      host no duplica la fórmula.
- [ ] Tests unitarios y de integración del HUD y del feedback pasan;
      `pnpm run verify` pasa y el E2E existente se conserva.

# Plan de test

- Unitario: modelo del HUD con y sin LOS; perfil completo en `F1`; formato del
  total y del desglose; paquete a 0; curación sin desglose.
- Integración: evento real de ataque mixto → modelo de feedback; cambio de banda
  en el estado → texto distinto sin tocar el host.
- E2E / visual: no aplica aquí; la cobertura de navegador llega en TASK-0092.
- Manual: comprobar con un resistente y un vulnerable que el texto se lee sin
  mirar el color.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0089/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y de los tests focalizados
- [ ] Captura de referencia si cambia el HUD (sin sustituir al QA de TASK-0092)
- [ ] Commit SHA en la rama `task/TASK-0089`

# Restricciones

- No cambiar reglas, perfiles, armas ni eventos del motor.
- No rediseñar el HUD ni añadir arte final; se usan los nodos y el estilo
  existentes.
- No mostrar bandas sin línea de visión ni filtrar información fuera de la vista.
- Sin dependencias nuevas.

# No objetivos

- E2E y QA visual completos (TASK-0092).
- Matriz de tests del motor y medición de coste (TASK-0090).
- Documentación de diseño (TASK-0091).
