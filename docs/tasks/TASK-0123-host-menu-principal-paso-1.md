---
type: Task
id: TASK-0123
title: "Host: menú principal y paso 1"
description: "Añadir la primera pantalla con «Nueva» y «Cargar» y el paso 1 con 1-6 jugadores y semilla editable, incluyendo `?seed=`, validación y cancelación."
status: stable
task_status: in_progress
task_type: feature
requirement: REQ-016
requirement_ids: [R-001, R-002, R-003, R-004, R-012, T-004, T-005, T-007]
depends_on: [TASK-0122]
unlocks: [TASK-0124, TASK-0125, TASK-0129, TASK-0139, TASK-0141]
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0123/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que al arrancar aparezca un menú principal con «Nueva» y «Cargar» y que «Nueva»
abra el paso 1, donde se fijan el número de jugadores (1-6) y la semilla antes de
configurar a nadie.

# Contexto

La partida arranca hoy sin pantalla previa. REQ-016 v3 fija el
[flujo](../requirements/REQ-016-pantalla-inicio-configuracion.md#flujo) y la
semilla en [T-004](../requirements/REQ-016-pantalla-inicio-configuracion.md#requisitos-técnicos).
El parser actual de semilla vive en `src/host/seed.ts`. La carga funcional del
botón «Cargar» se completa en TASK-0141; aquí se deja el punto de entrada y el
selector no debe romper el flujo.

# Criterios de aceptación

- [ ] El menú principal es la primera pantalla; contiene «Nueva» y «Cargar» y
      `Esc` no lo abandona. «Nueva» abre el paso 1.
- [ ] El paso 1 permite elegir N entre 1 y 6 y editar la semilla; es el único
      punto donde se cambian ambos datos.
- [ ] Al entrar se genera una semilla aleatoria; un campo vacío genera otra al
      continuar; un valor inválido bloquea el avance con mensaje visible y
      anunciado.
- [ ] `?seed=` válido precarga el campo una sola vez en la carga de página y
      sigue siendo editable; `?seed=` inválido se ignora con aviso.
- [ ] Los valores por defecto son N=1 y semilla generada; no se recupera una
      configuración anterior al recargar.
- [ ] `Esc` o «Cancelar» en el paso 1 piden confirmación y, al confirmar, vuelven
      al menú principal sin empezar la partida.
- [ ] Navegación completa por teclado, foco visible y avisos con `aria-live`.
- [ ] Tests de primera pantalla, N=1 y N=6, semilla válida/vacía/inválida,
      `?seed=` y cancelación; `pnpm run verify` pasa.

# Plan de test

- Unitario: parser de semilla, defaults y validación de N.
- Integración: navegación menú → paso 1 → cancelar; el botón «Cargar» queda
  conectado al punto de extensión sin cargar todavía.
- E2E: arranque y cancelación; la cobertura completa va en TASK-0129.
- Manual: comprobar foco y anuncios con teclado.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0123/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/seed.test.ts tests/unit/host/input.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar el flujo de jugadores, el resumen ni el arranque de partida.
- No implementar la carga de archivos; el botón «Cargar» solo abre el punto de
  entrada que completa TASK-0141.
- No tocar `src/game/` salvo consumir el contrato de TASK-0122.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- Pantalla de jugador, ficha de arquetipo y miniaturas.
- Resumen, «Empezar» y creación del estado de partida.
- Guardado, carga, pausa y resultado.
- Persistencia de la configuración entre sesiones.
