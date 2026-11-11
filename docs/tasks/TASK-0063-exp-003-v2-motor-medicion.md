---
type: Task
id: TASK-0063
title: "EXP-003 v2.0: motor data-driven, escenarios 1v1 y medición"
description: Construir el núcleo de la mesa de combate v2.0 con catálogos, pasillo 1D, acciones, magia, réplica, RNG sembrado y 1.000 duelos por emparejamiento con resultados reproducibles.
status: stable
task_status: done
task_type: experiment
requirement: REQ-027
requirement_ids: [REQ-025, REQ-026, REQ-027]
depends_on: []
unlocks: [TASK-0064]
created_at: 2026-11-11T15:20:00Z
completed_at: 2026-11-11T15:48:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0063/
priority: P1
risk: medium
review_required: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T15:20:00Z }
verified:
  - by: task-lead
    at: 2026-11-11T15:48:00Z
    note: >-
      Verificación independiente en task/TASK-0063, fusionada en main con
      fast-forward hasta 3ac1df5. Diff limitado a experiments/EXP-003-mesa-combate/src/v2/,
      experiments/EXP-003-mesa-combate/results/, artifacts/TASK-0063/ y esta
      ficha; src/, tests/, la v1, index.html, public/, package.json,
      pnpm-lock.yaml y docs/ ajenos intactos. Re-ejecutado por el lead: 62/62
      tests de v2 (6 archivos) y pnpm run verify (docs 328, config OK, 887/887,
      build 59 módulos, bundle OK), con git status limpio. Resultados byte a
      byte estables; 12 emparejamientos × 1.000 duelos con semilla 1017 y héroe
      con iniciativa. Los 12 quedan fuera de la banda 40–60 % por arriba
      (96,3–100 %); no se aplicó ningún ajuste de balance y las recomendaciones
      quedan en el informe. Los 9 criterios de aceptación están cubiertos.
      Limitaciones declaradas: sin enfriamiento/investigación de alerta, el
      cobarde queda acorralado en el escenario por defecto, se permite repetir
      hechizo, no hay ataque a distancia y la política del héroe es agresiva;
      la detección inicial solo se evalúa tras un paso (no afecta al escenario
      0/7). Fricción de OKF en *-detalle.md: disposición deferred, elevada a
      requirements-writer y candidata a harness-keeper.
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

- [x] El catálogo declara versión explícita y contiene roster (Guerrero, Pícaro,
      Mago, Clérigo), bestiario (Centinela, Bruto, Cobarde), armas, hechizos
      (los seis de REQ-025) y perfiles de IA. Añadir un enemigo de prueba por
      datos no exige tocar el resolvedor y un test lo demuestra.
- [x] La fórmula física usa habilidad + acierto del arma + 1d6 contra defensa +
      escudo + 1d6, y daño `max(1, fuerza + daño del arma + 1d6 − (resistencia +
      armadura + 1d6))`. La mágica usa nivel de magia + acierto del hechizo y
      poder + 1d6 − (resistencia + armadura + 1d6). El empate falla.
- [x] Acciones: 2 por defecto, Pícaro 3, enemigos 2/1/2. Atacar y lanzar hechizo
      cuestan 1 acción; moverse cuesta MP; acciones y maná se restauran al
      inicio del turno; máximo 2 hechizos por turno.
- [x] Réplica: solo tras un ataque cuerpo a cuerpo fallido, solo con arma
      equipada y adyacencia; gratis, inmediata, sin cadena y sin tope; usa
      tiradas nuevas; el dormido no es atacable en melé y no replica; el que
      regresa replica; el que huye solo replica acorralado; una réplica letal
      descarta las acciones restantes del atacante.
- [x] RNG sembrado y determinista: misma semilla, mismo escenario y mismas
      reglas producen el mismo resultado; no se usa `Math.random`.
- [x] La medición cubre los 12 emparejamientos (4 héroes × 3 enemigos) con
      semilla 1017 y 1.000 duelos, héroe con iniciativa, y registra victorias,
      turnos/rondas, acciones por tipo, hechizos, maná gastado/no gastado, daño,
      curación, TTK, PV restantes y réplicas disparadas/impactos/muertes.
- [x] Los resultados quedan en `experiments/EXP-003-mesa-combate/results/` en
      JSON reproducible con versión de catálogo, escenario, semilla y métricas;
      una segunda ejecución produce los mismos números.
- [x] Tests del experimento en verde y `pnpm run docs:check` pasa. No se toca
      `src/` de producción ni se añaden dependencias.
- [x] La banda de aceptación es 40–60 % de victorias del héroe con ±2 % de
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

- [x] Informe en `artifacts/TASK-0063/attempt-1/report.md`
- [x] `test-output.txt` y `docs-check-output.txt`
- [x] Resultados en `experiments/EXP-003-mesa-combate/results/`
- [x] Commit SHA

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
