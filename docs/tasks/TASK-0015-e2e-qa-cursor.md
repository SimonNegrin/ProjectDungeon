---
type: Task
id: TASK-0015
title: "E2E y QA visual del cursor y el camino"
description: Cubre con Playwright y capturas el cursor, los estados, el camino, el movimiento parcial, el ataque directo y la acción combinada sobre enemigos.
status: stable
task_status: done
task_type: test
requirement: REQ-004
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-008, R-009, R-010, R-011, R-012, R-013, R-014, R-015, R-016, R-017, R-018, T-006, T-007, T-008, T-009, T-011]
depends_on: [TASK-0014]
unlocks: [TASK-0016]
created_at: 2026-11-08T01:27:27Z
completed_at: 2026-11-08T02:16:28Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0015/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T01:27:27Z }
verified:
  - by: task-lead
    at: 2026-11-08T02:16:28Z
    note: "Verificación independiente: diff completo (solo `tests/e2e/cursor-qa.spec.ts` y helpers aditivos en `support.ts`, sin `src/**`); `pnpm run test:e2e` 29/29 y `pnpm run test:e2e --repeat-each=3` 87/87 (3×29), `pnpm run verify` con 305 unitarios y build OK. Revisados los 21 criterios y las capturas (jugador, caminos verde/ámbar, enemigo, parcial, ataque, debug, aviso HUD). Sin tests borrados o debilitados ni cambios de producción. El comando literal con `--` no aplica `--repeat-each`; se validó la repetición real con `pnpm run test:e2e --repeat-each=3` y se elevó la corrección documental a `requirements-writer`. Commit de implementación `686c646`, informe `2b6fa14`, evidencia del lead `47167a2`, fusión `63ef8ae`."
---

# Objetivo

Demostrar con tests deterministas y capturas que `REQ-004` funciona de extremo a
extremo: el cursor aparece sobre el jugador, se mueve sin gastar recursos ni
mover la cámara, muestra los estados y el camino, ejecuta **Moverse** en verde,
ámbar y rojo, resuelve **Atacar** y **Moverse sobre un enemigo** en todos sus
casos, y se reinicia u oculta cuando toca.

# Contexto

- Requisito: [REQ-004](../requirements/REQ-004-cursor-seleccion.md).
- Planificación: TASK-0012.
- Comando de movimiento por destino: TASK-0013.
- Host, input, render y HUD: TASK-0014.
- E2E existentes: `tests/e2e/frame-qa.spec.ts`, `game-input-hud.spec.ts`,
  `game-map.spec.ts`, `generated-map-qa.spec.ts` y `support.ts`.
- Semilla de referencia: `279837264`; spawn del jugador `(6,8)` y enemigo
  `(23,28)`.
- El ataque directo usa `F`; `Espacio`/`Enter` es **Moverse**.

# Alcance

- Crear `tests/e2e/cursor-qa.spec.ts` (nombre orientativo) con la cobertura de
  `REQ-004`.
- Usar `?seed=279837264` para estados deterministas.
- Leer el estado desde `window.__game.snapshot()` y la presentación desde
  `[data-testid="cursor"]`, `[data-testid="cursor-path"]` y el HUD.
- Usar teclado real de Playwright para el cursor y las acciones. Para aproximarse
  al enemigo se pueden usar comandos `Move`/`EndTurn` reales, como en
  `tests/e2e/support.ts`; no inyectar estados ni teletransportar.
- Si hace falta, añadir helpers en `tests/e2e/support.ts` para mover el cursor a
  un tile, aproximarse a una distancia concreta del enemigo o leer el camino.
  Los helpers no deben duplicar reglas de producción más de lo necesario.
- Actualizar los E2E existentes que atacaban con `Espacio` para usar `F` o
  **Moverse** sobre un enemigo adyacente.

# Criterios de aceptación

- [ ] El cursor aparece sobre el jugador al arrancar, en estado `player`, sin
      camino y con el jugador en `(6,8)` con la semilla de referencia.
- [ ] Flechas y `WASD` mueven el cursor un tile en 4 direcciones; MP, acción,
      turno y cámara no cambian; en el borde del viewport no se mueve.
- [ ] El cursor puede cruzar muros y unidades; sobre un muro el estado es
      `invalid` y no hay camino.
- [ ] Los estados `player`, `reachable`, `too-far`, `invalid` y `enemy` se
      muestran con color y patrón de borde; el enemigo muestra marca de objetivo.
- [ ] El camino de un destino verde se ve completo en tono fuerte; el de un
      destino ámbar se ve completo con tramo fuerte y tramo atenuado; no hay
      puntos en rojo/jugador; el camino de un enemigo termina en el tile de
      ataque adyacente y nunca en el tile del enemigo.
- [ ] El camino se actualiza al mover el cursor, al mover al jugador, al cambiar
      el MP y después de atacar.
- [ ] **Moverse** en verde: el jugador llega al cursor y gasta el coste exacto de
      MP; la acción y el turno no cambian.
- [ ] **Moverse** en ámbar: el jugador avanza `min(coste, MP)` pasos, queda con
      0 MP, no ataca y el cursor sigue en el objetivo.
- [ ] **Moverse** en rojo: el jugador, MP, acción y turno no cambian; el HUD
      muestra un aviso.
- [ ] Enemigo adyacente con acción: `Espacio` mueve-y-ataca solo si hay
      movimiento; si ya es adyacente, ataca sin moverse ni gastar MP. El enemigo
      pierde 5 de vida y la acción queda usada.
- [ ] Enemigo alcanzable sin acción: `Espacio` solo acerca al jugador al tile de
      ataque; no hay daño.
- [ ] Enemigo demasiado lejano: `Espacio` avanza hasta agotar MP, no ataca y deja
      el cursor en el enemigo.
- [ ] Enemigo adyacente sin acción: `Espacio` no mueve ni ataca y avisa.
- [ ] `F` ataca solo en adyacencia; fuera de rango no mueve, no gasta acción y
      avisa.
- [ ] El cursor permanece tras moverse o atacar; tras `E` y la fase enemiga
      vuelve al jugador; tras `R` y `F2` también.
- [ ] Con la partida terminada el cursor no se muestra; en una fase enemiga
      construida en test unitario tampoco.
- [ ] El HUD muestra la nueva ayuda de teclas, los avisos de rechazo y no añade
      botones clicables de Moverse/Atacar/Terminar.
- [ ] `window.__game.snapshot()` incluye cursor, estado, camino y tile de ataque;
      `F1` muestra la información de cursor en debug.
- [ ] Capturas: cursor sobre el jugador, camino verde, camino ámbar en dos tonos,
      cursor sobre enemigo, movimiento parcial, ataque y debug.
- [ ] `pnpm run test:e2e` y `pnpm run verify` pasan; el spec nuevo se repite al
      menos 3 veces sin fallos intermitentes; no se debilitan tests existentes.

# Plan de test

- **Unitario:** lo cubren TASK-0012, TASK-0013 y TASK-0014; esta tarea puede
  añadir asserts de presentación si faltan.
- **Integración:** teclado real -> cursor/MoveTo/Attack -> motor -> snapshot/HUD.
- **E2E / visual:** el spec nuevo y las capturas descritas. Comprobar estilos de
  borde/color de forma semántica (clases o atributos), no con diff de píxeles a
  pantalla completa.
- **Manual:** playtest del usuario tras la implementación; la tarea queda en
  `review` hasta que lo apruebe.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test:e2e` | 300 s | Cursor, camino, teclado, HUD y flujo jugable |
| `pnpm run test:e2e --repeat-each=3` | 300 s | Estabilidad del spec nuevo |
| `pnpm run verify` | 180 s | Docs, config, unitarios y build |
| `pnpm run build` | 120 s | Build final |

Nota: la forma `pnpm run test:e2e -- --repeat-each=3` pasa el `--` literal a
Playwright y **no** repite. La repetición real se ejecuta con
`pnpm run test:e2e --repeat-each=3`.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0015/attempt-1/report.md`
- [ ] Salida E2E en `artifacts/TASK-0015/attempt-1/e2e-output.txt`
- [ ] Capturas en `artifacts/TASK-0015/attempt-1/screenshots/`
- [ ] Commit SHA en la rama `task/TASK-0015`

# Restricciones

- No cambiar reglas, economía, combate, mapa ni IA para que pase el E2E.
- No teletransportar al jugador ni inyectar estados; usar comandos y teclado
  reales.
- No debilitar ni saltar tests existentes; actualizar solo las expectativas de
  teclas y presentación que `REQ-004` cambia.
- No usar diff de píxeles a pantalla completa para escenas con animaciones.
- Si aparece un fallo de producción, documentarlo y escalar; no ocultarlo.

# No objetivos

- Implementar cursor, camino o comandos; eso es TASK-0012/TASK-0013/TASK-0014.
- Arte final, animaciones, audio, ratón/táctil o botones clicables.
- Ataque a distancia, línea de visión, objetos nuevos, hotseat o multijugador.
- Rendimiento profundo más allá de comprobar que el cursor no provoca tirones.

# Notas

- El cursor ignora colisiones, así que se puede llevar a cualquier tile del
  viewport con una secuencia de flechas; es útil para preparar estados de test.
- Para el enemigo, usar `approachEnemy` para adyacencia y un helper de
  aproximación a distancia 2-3 o 8 para los casos de alcance/lejanía.
- Tras atacar, el jugador puede moverse; sirve para preparar el caso de enemigo
  alcanzable sin acción.
- El estado del cursor y el camino están en el snapshot; el DOM solo se usa para
  comprobar presentación y patrones.
- Guardar capturas de estados estables; no comparar la escena completa píxel a
  píxel.
