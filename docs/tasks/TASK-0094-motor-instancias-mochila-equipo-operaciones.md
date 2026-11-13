---
type: Task
id: TASK-0094
title: "Motor: instancias, mochila, equipo y operaciones atómicas"
description: "Convertir armas y equipo en instancias con localización única, dar a cada personaje ocho huecos y ocho de mochila, agregar stats efectivos en un solo punto y resolver equipar, desequipar, recoger y soltar como operaciones atómicas de 1 MP."
status: stable
task_status: done
task_type: feature
requirement: REQ-018
requirement_ids: [R-001, R-003, R-007, R-008, R-009, R-010, R-011, R-012, R-013, R-018, R-019, R-020, R-021, T-002, T-003, T-004, T-005, T-006]
depends_on: [TASK-0093]
unlocks: [TASK-0095, TASK-0096]
created_at: 2026-11-13T19:22:51Z
completed_at: 2026-11-13T20:22:17Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0094/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T19:22:51Z }
verified:
  - by: task-lead
    at: 2026-11-13T20:22:17Z
    note: >-
      Verificación independiente en `task/TASK-0094` (implementación `4fe4372`,
      correcciones `d827c18`, evidencia `307e7b7`) y sobre `main` fusionado
      (`a173d85`). Revisado el diff completo: modelo en
      `src/game/{inventory,stats,types,engine,combat,magic,roster,actions}.ts`,
      host mínimo y tests; sin cambios de requisitos, alcance, balance ni
      dependencias. Reejecutados los focalizados (94/94 en seis archivos) y
      `pnpm run verify` por defecto en `main` (1225/1225; docs, config, tsc,
      build y bundle), con salida en `artifacts/TASK-0094/attempt-1/verify-lead.txt`.
      Criterios comprobados uno a uno: instancias/localización única, 8 huecos y
      mochila paramétrica, equipo inicial de REQ-015, stats efectivos en un punto,
      cuatro operaciones de 1 MP/0 acciones, validación sobre el estado resultante,
      dos manos con escudo por ambos lados, suelo/contenedor, sin apilado,
      serialización y puente `G`/`1`-`3`. Corregidos en revisión el origen de
      suelo por ID, el test de serialización de stats eliminado, la validación
      del mapa growth y los IDs duplicados de fixtures. E2E/Playwright queda
      aplazado a TASK-0098 según el plan; los specs previos solo se adaptaron
      para `tsc`. La pasada por defecto en `main` dio 1225/1225 y una repetición
      posterior flaqueó solo por el timeout conocido de EXP-004;
      `VITEST_MAX_WORKERS=1` confirmó 1225/1225. Evidencia `verify-lead.txt` y
      `verify-lead-serial.txt`.
---

# Objetivo

Que cada objeto sea una instancia con una sola localización (mochila, hueco,
suelo o contenedor) y que el motor resuelva equipar, desequipar, recoger y soltar
sin duplicar ni perder nada, con stats efectivos en un único punto.

# Contexto

- Hoy la verdad son `Unit.weapons` y los campos fijos de `UnitEquipment`;
  `PickUp` y `SelectWeaponSlot` los usan.
- El catálogo data-driven llega en TASK-0093.
- [REQ-018](../requirements/REQ-018-inventario-equipo.md#requisitos-técnicos)
  T-002 a T-006; [REQ-026](../requirements/REQ-026-economia-acciones-rebalanceo.md)
  para recoger y soltar; [REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md)
  para paquetes; [REQ-015](../requirements/REQ-015-roster-arquetipos.md) para el
  equipo inicial; [ADR-021](../decisions/ADR-021-inventario-equipo.md).
- El host se adapta lo mínimo para compilar y seguir jugable.

# Criterios de aceptación

- [ ] Cada objeto es una instancia con ID único y localización exclusiva: mochila
      y hueco, hueco de equipo, suelo o contenedor. Sin duplicados ni huérfanos.
- [ ] Ocho huecos de equipo (arma, escudo, armadura, casco, botas, guantes, collar
      y un anillo) y mochila de ocho huecos, con capacidad como parámetro.
- [ ] Equipo inicial igual a la tabla de REQ-015; los cinco huecos secundarios
      arrancan vacíos.
- [ ] `weapons` y los campos fijos dejan de ser la verdad; el arma equipada sale
      del hueco de arma.
- [ ] Los stats efectivos se agregan en un único punto (inherentes + objetos +
      traits vacíos) y lo consumen combate, hechizos, IA y HUD.
- [ ] Equipar, desequipar, recoger y soltar cuestan 1 MP y ninguna acción, en
      cualquier estado; con 0 MP se rechazan.
- [ ] La validación usa el estado resultante: con la mochila llena, equipar desde
      la mochila intercambia; desde el suelo o un contenedor se rechaza sin mover
      nada.
- [ ] Recoger con la mochila llena se rechaza sin alterar suelo ni mochila; soltar
      un equipado lo desequipa y lo deja en la casilla.
- [ ] Un arma a dos manos manda el escudo a la mochila y, si no cabe, se rechaza
      entero; equipar un escudo con dos manos puesta se rechaza sin desequipar.
- [ ] Equipar desde el suelo o un contenedor abierto va directo al hueco; el
      sustituido vuelve a la mochila y si no cabe se rechaza entero. El contenedor
      se prueba con estado sintético; la UI de cofres es `REQ-020`.
- [ ] Sin apilado ni traspaso directo: dos espadas iguales son dos instancias.
- [ ] El estado es serializable: instancias, localizaciones, capacidad y mochila
      se reconstruyen sin pérdida.
- [ ] Puente hasta TASK-0095: `G` recoge y `1`-`3` equipan desde la mochila.
- [ ] `pnpm run verify` pasa; los tests de REQ-010 y REQ-026 se actualizan sin
      debilitarse; `src/game/` sigue puro.

# Plan de test

- Unitario: localización e IDs únicos, capacidad, mochila llena, intercambio,
  equipar y desequipar, soltar equipado, dos manos por ambos lados, suelo y
  contenedor, coste sin acción, sin apilado.
- Integración: agregación de stats → combate y HUD; serialización ida y vuelta.
- E2E / visual: no aplica; llega en TASK-0098.
- Manual: recoger con `G`, equipar con `1`-`3` y comprobar que el combate no
  cambia.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0094/attempt-1/report.md`
- [ ] Salida de `pnpm run verify` y de los tests focalizados
- [ ] Commit SHA en la rama `task/TASK-0094`

# Restricciones

- No crear el panel ni cambiar el input más allá del puente `G`/`1`-`3`.
- No añadir piezas de REQ-019/REQ-020 ni cofres jugables.
- No cambiar valores de balance, daño ni economía de acciones.
- Sin dependencias nuevas; `src/game/` no importa `src/host/`.

# No objetivos

- Panel, `I` y retirada de `G` y `1`-`3` (TASK-0095).
- Sprites, efectos y `F1` (TASK-0096).
- Documentación (TASK-0097) y E2E (TASK-0098).
