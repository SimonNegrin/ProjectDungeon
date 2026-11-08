---
type: Task
id: TASK-0019
title: "E2E y QA visual del movimiento animado"
description: Cubrir con Playwright el recorrido animado, la cámara, el input bloqueado, el cursor, el MP, el ataque, la fase enemiga, el fin de partida y reduced motion, y revisar capturas.
status: stable
task_status: done
task_type: test
requirement: REQ-006
requirement_ids: [R-001, R-002, R-003, R-005, R-006, R-007, R-008, R-009, R-010, R-011, R-013, T-007, T-008]
depends_on: [TASK-0018]
unlocks: []
created_at: 2026-11-08T10:26:00Z
completed_at: 2026-11-08T11:28:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0019/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T10:26:00Z }
verified:
  - by: task-lead
    at: 2026-11-08T11:28:00Z
    note: >-
      Verificación independiente en task/TASK-0019 (commits 576562c, e2fa61d,
      ec4ebc4, f08319c; fusión 61997b7): diff limitado a
      tests/e2e/motion-qa.spec.ts (8 tests, 900 líneas) y artifacts/TASK-0019;
      src/, docs/requirements/, experiments/, package.json y pnpm-lock.yaml
      intactos; sin hooks nuevos. Re-ejecutados por el lead pnpm run test:e2e
      (40/40), pnpm run test:e2e motion-qa --repeat-each=3 (24/24) y pnpm run
      verify (104 documentos, 19 tareas, 3 experimentos; 360 tests en 29
      archivos; build de 53 módulos), con salidas en
      artifacts/TASK-0019/attempt-1/logs/lead-*.txt. Revisados los criterios y
      las capturas: paso intermedio en x=224 entre 208/240 con cursor oculto y
      2 puntos, llegada (8,8) con MP 4/6, fase enemiga con HUD Enemigo y goblin
      en tránsito, ataque real con flash, -5, 0/10 y overlay Victoria (más
      recorte de daño y aproximación previa), y reduced motion con el mismo
      estado final. Reloj congelado en el mismo keydown y dos trazas idénticas;
      sin waitForTimeout ni tests borrados, saltados o debilitados. Fricción de
      capturas E2E que reescriben artefactos históricos: deferred, dueño
      requirements-writer.
---

# Objetivo

Añadir la cobertura E2E y la QA visual del movimiento animado de `REQ-006`, de
forma determinista y sin debilitar los tests existentes. La suite debe demostrar
que el recorrido se ve, que la cámara sigue, que el input se ignora y que el
estado final es correcto.

# Contexto

- Requisito: [REQ-006](../requirements/REQ-006-movimiento-animado.md) v2.
- Implementación: `TASK-0018`.
- Debug API y reloj determinista: `src/host/debug.ts`, `main.ts`.
- Helpers: `tests/e2e/support.ts`; ejemplos de cursor y QA visual en
  `tests/e2e/cursor-qa.spec.ts` y `tests/e2e/generated-map-qa.spec.ts`.
- Guía: [QA visual](../harness/visual-qa.md).

# Criterios de aceptación

- [ ] Hay un spec nuevo `tests/e2e/motion-qa.spec.ts` con semilla fija y reloj de
      presentación determinista; dos ejecuciones producen el mismo resultado.
- [ ] Se comprueba un paso intermedio: la posición visual está entre dos centros
      de tile, no en el destino, y el sprite avanza en el siguiente muestreo.
- [ ] Se comprueba que un camino largo recorre todos los tiles y termina en el
      destino, con el MP final correcto.
- [ ] La cámara sigue al personaje: offsets enteros, centrada salvo clamp, y no
      cambia al mover el cursor.
- [ ] Durante la animación, flechas/`WASD`, `Espacio`/`Enter`, `F` y `E` no
      cambian cursor, MP, acción ni turno; después del recorrido vuelven a
      funcionar. `F1` y `R` responden durante la animación y `R` cancela.
- [ ] El cursor no se dibuja durante el recorrido, los puntos se apagan y al
      final el cursor aparece en su tile dentro del viewport.
- [ ] El MP del HUD baja paso a paso y coincide con el motor al terminar.
- [ ] Moverse sobre un enemigo muestra el recorrido, la pausa y después el
      flash/daño; el enemigo no pierde vida antes de tiempo.
- [ ] La fase enemiga anima a cada enemigo y el cursor/turno del jugador aparece
      después.
- [ ] El overlay de fin de partida no aparece con el personaje a mitad de camino.
- [ ] Con `prefers-reduced-motion: reduce` el movimiento es instantáneo y el
      estado final coincide.
- [ ] Capturas revisadas: paso intermedio, llegada, fase enemiga, ataque tras
      caminar y reduced motion en `artifacts/TASK-0019/attempt-1/screenshots/`.
- [ ] `pnpm run test:e2e` y `pnpm run verify` pasan. No se borran, saltan ni
      debilitan tests existentes; los helpers nuevos son aditivos.
- [ ] No se cambian reglas ni el comportamiento de producción salvo hooks de
      debug/test mínimos si faltan; se documentan en el informe.

# Plan de test

- **E2E:** spec nuevo con carga determinista, `dispatch` o teclado real, avance
  del reloj de presentación, aserciones sobre `window.__game`, DOM del cursor,
  HUD, feedback y overlay.
- **Visual:** capturas de los estados clave y comparación con el ritmo decidido
  (125/70, diagonal a duración constante).
- **Regresión:** ejecutar la suite completa y repetir el spec nuevo al menos 3
  veces.
- **Manual:** el usuario valida la sensación en una partida corta.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test:e2e` | 240 s | Suite completa y spec nuevo |
| `pnpm run test:e2e --repeat-each=3` | 300 s | Estabilidad del spec nuevo |
| `pnpm run verify` | 180 s | Docs, config, unitarios y build |

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0019/attempt-1/report.md`
- [ ] Salida de `test:e2e` y de la repetición en `test-output.txt`
- [ ] Capturas de paso intermedio, llegada, fase enemiga, ataque y reduced motion
- [ ] Commit SHA en la rama `task/TASK-0019`

# Restricciones

- No cambiar reglas, ritmo ni comportamiento para hacer pasar un test.
- No borrar, saltar ni debilitar tests existentes.
- Helpers nuevos aditivos; no duplicar la lógica de presentación en el spec.
- No tocar `docs/requirements/` ni decidir creatividad.
- No añadir dependencias.

# No objetivos

- Reimplementar la animación en el spec.
- Cambiar el ritmo decidido.
- Probar hotseat, red o rendimiento extremo.
- Arte final o sonido.

# Notas

- Si el reloj determinista no existe o no basta, se añade el hook mínimo en
  `TASK-0018` y se documenta; no se usan esperas por reloj real.
- La captura de un paso intermedio debe hacerse con el reloj detenido en un
  instante conocido, no con `waitForTimeout` a ciegas.
