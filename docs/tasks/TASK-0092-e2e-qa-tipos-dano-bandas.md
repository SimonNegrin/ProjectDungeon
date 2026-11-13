---
type: Task
id: TASK-0092
title: "E2E y QA visual de tipos de daño, bandas y desglose"
description: "Verificar en navegador el ciclo completo: conseguir un arma nueva, atacar enemigos con bandas distintas, leer el total y el desglose, consultar bandas con y sin línea de visión y comprobar el mínimo 1."
status: stable
task_status: in_progress
task_type: qa
requirement: REQ-029
requirement_ids: [R-010, T-008, T-009]
depends_on: [TASK-0087, TASK-0089]
unlocks: []
created_at: 2026-11-13T12:30:00Z
completed_at:
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0092/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T12:30:00Z }
verified:
---

# Objetivo

Que el E2E y el QA visual demuestren en Chromium que el jugador puede probar los
cinco tipos de daño, leer las bandas del enemigo y ver el total con su desglose,
sin inmunidades absolutas y sin cambiar el resto del loop.

# Contexto

- Armas nuevas y colocación determinista en TASK-0087; HUD y feedback en
  TASK-0089.
- E2E existente: `tests/e2e/combat-equipment-qa.spec.ts`,
  `equipment-hud-qa.spec.ts`, `cursor-qa.spec.ts`, `replica-qa.spec.ts` y
  `feedback-*-qa.spec.ts`; helpers en `tests/e2e/support.ts` y
  `tests/e2e/artifacts.ts`.
- [REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md#requisitos-técnicos)
  T-008 y T-009; [REQ-017](../requirements/REQ-017-feedback-visual-eventos.md)
  para los beats; [REQ-023](../requirements/REQ-023-hud-derecho-detalle-cursor.md)
  para el detalle del cursor.
- Usar `E2E_ARTIFACTS_DIR` y las capturas bajo `<spec>/screenshots/`.

# Criterios de aceptación

- [ ] Un escenario determinista consigue al menos un arma nueva y ataca con ella
      a enemigos con bandas distintas; se comprueba el total y el desglose por
      tipo en el feedback.
- [ ] Contra un muy resistente el ataque sigue haciendo al menos 1; no existe
      ningún estado ni texto de inmunidad.
- [ ] La armadura no cambia el daño mágico o eléctrico y sí el físico; el escudo
      sigue afectando al impacto de cualquier tipo.
- [ ] El cursor muestra las cinco bandas solo con línea de visión y las oculta
      sin ella; `F1` muestra el perfil completo.
- [ ] Un hechizo eléctrico aplica la banda eléctrica y uno de fuego la mágica;
      curación y resurrección no muestran desglose.
- [ ] Se revisan capturas a 1280×720 y 900×700; la información se entiende sin
      depender del color.
- [ ] `pnpm run test:e2e` y `pnpm run verify` pasan; no se debilitan expectativas
      existentes y cualquier ajuste de fixture se justifica en el informe.

# Plan de test

- Unitario: no aplica; cubierto en TASK-0090.
- Integración: no aplica.
- E2E / visual: escenario de combate con paquete mixto, bandas, LOS, `F1`,
  hechizos y mínimo 1; capturas en dos tamaños.
- Manual: playtest breve con el usuario para confirmar que la lectura es rápida.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0092/attempt-1/report.md`
- [ ] Salida de `pnpm run test:e2e` y de `pnpm run verify`
- [ ] Capturas 1280×720 y 900×700 en `<spec>/screenshots/`
- [ ] Commit SHA en la rama `task/TASK-0092`

# Restricciones

- No cambiar reglas, perfiles, armas ni eventos para hacer pasar el E2E.
- No añadir dependencias ni arte final.
- No duplicar la lógica del motor en el test; se lee estado y eventos.
- Sin tests saltados ni expectativas relajadas.

# No objetivos

- Matriz unitaria y medición de coste (TASK-0090).
- Documentación de diseño (TASK-0091).
- Rebalanceo o ajuste de valores estimados.
