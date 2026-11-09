---
type: Task
id: TASK-0044
title: "Motor: núcleo compartido de salas, pasillos y puertas"
description: Promocionar a src/game/chambers/core/ la resolución de opciones, las formas irregulares, la caverna, los pasillos y la validación de puertas de EXP-004, con tests puros.
status: stable
task_status: done
task_type: feature
requirement: REQ-011
requirement_ids: [R-002, R-003, R-004, R-005, R-006, R-007, R-009, R-010, T-005, T-006, T-014]
depends_on: [TASK-0043]
unlocks: [TASK-0045]
created_at: 2026-11-09T15:30:00Z
completed_at: 2026-11-09T16:12:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0044/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T15:30:00Z }
verified:
  - by: task-lead
    at: 2026-11-09T16:12:00Z
    note: >-
      Intento 1 verificado en task/TASK-0044 (commits c297699 y dfc2ffa; fusión
      a8ff8c5). Diff completo revisado: solo src/game/chambers/core/, dos tests
      nuevos y artefactos; sin tocar src/host/, experiments/, index.html,
      dependencias, BSP ni src/game/index.ts. Lead re-ejecutó `pnpm run verify`
      (657/657 tests, docs/config y build OK), las suites dirigidas (22/22) y un
      barrido independiente de 200 semillas (100 % conectividad, 1 componente,
      4-6 salas normales/3 caverna, 39 cavernas ~19,5 %, 50 pasillos anchos
      ~25 %, todos los mapas con ≥1 puerta válida y separación ≥3). Core sin
      Math.random, relojes, DOM, estado global ni imports de
      experiments/variants/bsp/templates/host. La incompatibilidad documentada
      con validateGeneratedMap (paths de enlace directo y 1-3 huecos) queda
      diferida a TASK-0045/0046 sin debilitar BSP.
---

# Objetivo

Que `src/game/chambers/core/` contenga la geometría compartida del generador
denso de [REQ-011 v4](../requirements/REQ-011-generador-densa-salas-irregulares.md#requisitos-creativos):
opciones, salas con muescas, caverna, pasillos cortos, pasillos anchos y puertas.

# Contexto

- Referencia: `experiments/EXP-004-salas-irregulares/src/generate.ts` (formas y
  opciones), `doors.ts` y `types.ts`.
- Modelo de producción: `TASK-0043`.
- El núcleo no conoce variantes: no importa `variants/`, BSP ni plantillas.

# Criterios de aceptación

- [ ] `resolveOptions` vive en el core y resuelve los valores por defecto de
      REQ-011 v4: 22×18, 5 salas, salas de 3-8 tiles, pasillo máximo 3, ancho
      33 %, muro 1 (admite 1-2), caverna 15 % y spawn mínimo 6. Los valores
      imposibles se corrigen con `warnings`, sin lanzar.
- [ ] Las salas se generan con máscaras poligonales, conectadas en ortogonal, sin
      islas, con al menos una no rectangular y hornacinas de 1-2 tiles.
- [ ] La caverna aparece en ~15 % de las semillas y tiene exactamente 3 salas
      (caverna + 2 anexas); los mapas normales tienen 4-6 y nunca menos de 3.
- [ ] Los pasillos miden 0-3 tiles, el grafo es conexo, hay 0-3 bucles y el
      pasillo ancho de 2 tiles aparece ~33 % sin puertas.
- [ ] Las puertas validan soporte de dos muros, suelo a ambos lados, dos salas
      distintas, separación Chebyshev ≥3, máximo una por pasillo y ninguna en
      pasillo ancho; el resto son bocas abiertas con motivo.
- [ ] Los estilos `wood`, `metal` y `grated` son estables por semilla; las
      paletas y ambientes de `REQ-008` se asignan por sala completa.
- [ ] No hay `switch (variant)`, imports de `experiments/` ni de `variants/`.
- [ ] Tests puros de cada regla, determinismo y opciones extremas; `pnpm run
      verify` pasa sin debilitar tests.

# Plan de test

- **Unitario:** formas, muescas, caverna, longitudes, bucles, pasillos anchos,
  soporte de puerta, separación, una por pasillo y estilos.
- **Barrido:** al menos 200 semillas de `growth` con conectividad 100 %, sin
  islas y con los recuentos de salas.
- **Regresión:** tests de BSP y del modelo intactos.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0044/attempt-1/report.md`.
- [ ] Salida de tests y `pnpm run verify` en `attempt-1/`.
- [ ] Barrido de semillas en `attempt-1/`.
- [ ] Commit SHA en `task/TASK-0044`.

# Restricciones

- No crear todavía `variants/growth.ts` ni cambiar el generador por defecto.
- No implementar spawn, enemigos ni salida; van en `TASK-0045`.
- No tocar `src/host/`, `experiments/` ni dependencias.
- No copiar el `generate.ts` monolítico: separar módulos del core.

# No objetivos

- `GrowthMapGenerator`, import estático y default (`TASK-0046`).
- Host, render, debug (`TASK-0048`), bundle (`TASK-0047`) y QA (`TASK-0049`).
- Cámara secreta.
