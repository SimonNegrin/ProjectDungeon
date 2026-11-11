---
type: Task
id: TASK-0063
title: "EXP-003 v2.0: motor data-driven, escenarios 1v1 y medición"
description: Construir el núcleo de la mesa de combate v2.0 con catálogos, pasillo 1D, acciones, magia, réplica, RNG sembrado y 1.000 duelos por emparejamiento con resultados reproducibles.
status: stable
task_status: ready
task_type: experiment
requirement: REQ-027
requirement_ids: [REQ-025, REQ-026, REQ-027]
depends_on: []
unlocks: [TASK-0064]
created_at: 2026-11-11T18:45:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0063/
priority: P1
risk: medium
review_required: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T18:45:00Z }
verified:
---

# Objetivo

Construir en `experiments/EXP-003-mesa-combate/src/v2/` el motor puro y
determinista de la mesa de combate v2.0: catálogos data-driven de roster,
bestiario, equipo, hechizos y perfiles de IA; escenarios 1v1 sobre un pasillo
abstracto de 8 casillas; acciones por turno, magia/maná y réplica; y la medición
de 1.000 duelos por emparejamiento con resultados en `results/`.

El brief y sus decisiones cerradas viven en
[exp-003-v2-brief.md](../../docs/design/exp-003-v2-brief.md). Las reglas están en
[REQ-025](../../docs/requirements/REQ-025-magia-hechizos-mana.md),
[REQ-026](../../docs/requirements/REQ-026-economia-acciones-rebalanceo.md) y
[REQ-027](../../docs/requirements/REQ-027-replica-combate-cuerpo-a-cuerpo.md).

# Criterios de aceptación

- [ ] El catálogo declara versión explícita y contiene roster (Guerrero, Pícaro,
      Mago, Clérigo), bestiario (Centinela, Bruto, Cobarde), armas, hechizos
      (los seis de REQ-025) y perfiles de IA. Añadir un enemigo de prueba por
      datos no exige tocar el resolvedor y un test lo demuestra.
- [ ] La fórmula física usa habilidad + acierto del arma + 1d6 contra defensa +
      escudo + 1d6, y daño `max(1, fuerza + daño del arma + 1d6 − (resistencia +
      armadura + 1d6))`. La mágica usa nivel de magia + acierto del hechizo y
      poder + 1d6 − (resistencia + armadura + 1d6). El empate falla.
- [ ] Acciones: 2 por defecto, Pícaro 3, enemigos 2/1/2. Atacar y lanzar hechizo
      cuestan 1 acción; moverse cuesta MP; acciones y maná se restauran al
      inicio del turno; máximo 2 hechizos por turno.
- [ ] Réplica: solo tras un ataque cuerpo a cuerpo fallido, solo con arma
      equipada y adyacencia; gratis, inmediata, sin cadena y sin tope; usa
      tiradas nuevas; el dormido no es atacable en melé y no replica; el que
      regresa replica; el que huye solo replica acorralado; una réplica letal
      descarta las acciones restantes del atacante.
- [ ] RNG sembrado y determinista: misma semilla, mismo escenario y mismas
      reglas producen el mismo resultado; no se usa `Math.random`.
- [ ] La medición cubre los 12 emparejamientos (4 héroes × 3 enemigos) con
      semilla 1017 y 1.000 duelos, héroe con iniciativa, y registra victorias,
      turnos/rondas, acciones por tipo, hechizos, maná gastado/no gastado, daño,
      curación, TTK, PV restantes y réplicas disparadas/impactos/muertes.
- [ ] Los resultados quedan en `experiments/EXP-003-mesa-combate/results/` en
      JSON reproducible con versión de catálogo, escenario, semilla y métricas;
      una segunda ejecución produce los mismos números.
- [ ] Tests del experimento en verde y `pnpm run docs:check` pasa. No se toca
      `src/` de producción ni se añaden dependencias.
- [ ] La banda de aceptación es 40–60 % de victorias del héroe con ±2 % de
      tolerancia; el informe marca cada emparejamiento dentro o fuera.

# Plan de test

- Unitario: fórmulas física y mágica, 36 pares de impacto, resistencia +
  armadura, acciones, maná, tope de hechizos, réplica y elegibilidad, sin cadena,
  réplica letal, dormido/regreso/huida acorralada, determinismo del RNG.
- Catálogo: versión, ids únicos, hechizos por nivel, arma equipada, y alta de un
  enemigo de prueba solo con datos.
- Integración: 12 escenarios 1v1 × 1.000 duelos; agregados y reproducibilidad.
- Manual: revisar el JSON de resultados y que las tablas de `experiment.md` se
  puedan reconstruir con él.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0063/attempt-1/report.md`
- [ ] `test-output.txt` y `docs-check-output.txt`
- [ ] Resultados en `experiments/EXP-003-mesa-combate/results/`
- [ ] Commit SHA

# Restricciones

- No editar `src/`, `tests/` de producción, `docs/harness/**` ni plantillas.
- No añadir dependencias, red ni arte.
- No editar `experiments/EXP-003-mesa-combate/experiment.md`; lo actualiza
  `requirements-writer` con los resultados.
- Mantener la v1 y sus tests; la v2 vive en `src/v2/`.
- No decidir balance: medir y recomendar.

# No objetivos

- Página, API y export de la v2 (TASK-0064).
- Escenarios de grupo 2v2 y posiciones 2D (v2.1).
- Estados alterados, resistencias por familia y arte.
