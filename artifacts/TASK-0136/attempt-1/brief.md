---
type: Task Brief
title: "TASK-0136: brief del intento 1"
description: Saqueo de cadáver desde el mismo tile, coste 0 y «coger todo» en el panel.
task: TASK-0136
attempt: 1
status: stable
brief_bytes: 0
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T18:00:00Z }
---

# Objetivo

Que el panel liste los cadáveres-contenedor del tile actual y permita coger sus
objetos o «coger todo» gratis para un vivo, desde el mismo tile y reutilizando
la transferencia de contenedores. El fantasma mueve un objeto por acción y no
equipa. El cadáver de enemigo vaciado desaparece; el de jugador permanece. Los
cofres no cambian.

# No objetivos

- Cambiar botín, `lootable`, RNG, muerte, render, cofres, capacidad o catálogo.
- Una segunda ruta de extracción o listas paralelas.
- Guardado, resurrección, hotseat, arte, animación, `docs/**` o dependencias.

# Invariantes

- Solo contenedores `kind: 'corpse'` en el tile del activo; nunca unidades
  muertas ni cadáveres adyacentes.
- Mismo tile obligatorio; coste 0 para el vivo; una acción por objeto para el
  fantasma.
- `locateSource`/`withoutEmptyEnemyCorpse`/`withBackpackItem` son la ruta única;
  la contención sigue siendo la verdad.
- Panel solo para el activo vivo y público; el fantasma no lo abre.
- No borrar, saltar ni debilitar tests: los de cadáveres pasan de unidades a
  contenedores conservando su intención.

# Criterios de aceptación

En `docs/tasks/TASK-0136-host-panel-saqueo-mismo-tile-coste-cero.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/game/inventory.ts`: `Container`, `locateSource`, `withBackpackItem`,
  `withoutEmptyEnemyCorpse`.
- `src/game/engine.ts`/`types.ts`: comandos y rechazos.
- `src/host/inventory-panel.ts`, `inventory-panel-view.ts`, `input.ts`,
  `index.html`, `ui.css`: modelo, navegación, apertura y presentación.
- Contrato y escenario E2E en `brief-detalle.md`; leerlo antes de editar.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `e2e-output.txt`,
`commit.txt` y capturas con
`E2E_ARTIFACTS_DIR=artifacts/TASK-0136/attempt-1`.

# Riesgos

- No hay transferencia contenedor → mochila: se añade reutilizando
  `locateSource`, no una ruta paralela (detalle en `brief-detalle.md`).
- «Coger todo» es atómico: si no cabe entero, rechaza sin mover nada.
- Los cofres no son jugables: se conserva su coste declarado y no se abre una
  ruta de saqueo de cofre.
- Timeouts: focalizados 120 s; E2E 300 s; `verify` 240 s.
