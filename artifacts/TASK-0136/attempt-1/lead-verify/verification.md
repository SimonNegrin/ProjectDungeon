---
type: Verification Report
title: "TASK-0136: verificación independiente"
description: Revisión del diff, criterios, verify, E2E y evidencia del intento 1.
task: TASK-0136
attempt: 1
status: stable
verified_by: task-lead
verified_at: 2026-11-15T12:52:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:52:00Z }
---

# Alcance revisado

Diff completo de `main` contra el estado previo a la tarea: motor
(`src/game/{inventory,engine,types}.ts`), panel y vista
(`src/host/{inventory-panel,inventory-panel-view,input}.ts`), `index.html`,
`ui.css`, tests unitarios/integración/E2E, la ficha y artefactos. No se tocaron
`docs/requirements/**`, `docs/harness/**`, `docs/templates/**`, `package.json`
ni `pnpm-lock.yaml`. No se cambiaron botín, RNG, muerte, render de cadáveres,
cofres, capacidad ni catálogo.

# Comandos reejecutados

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | 102 archivos / 1568 tests, docs:check, config:check, tsc, build y bundle OK | `verify-final.txt` |
| E2E acotado (`corpse-loot-panel-qa`, `panel-three-columns-qa`, `panel-cursor-cls-qa`) | 11/11 | `e2e-output.txt` |
| E2E visual (`qa-visual-revision-ui`, `qa-visual-correccion-ui-v7`) | 25/25 | `e2e-visual-output.txt` |

# Criterios

| # | Criterio | Evidencia |
|---|---|---|
| 1 | Cadáveres de la casilla actual, no adyacentes | `buildCorpses` lee `state.containers`; E2E: 2 tarjetas del tile y ninguna del adyacente |
| 2 | Transferencia única de contenedores | `takeContainerItem`/`takeAllContainerItems` usan `locateSource`; no hay extracción paralela |
| 3 | Vivo con 0 acción y 0 MP y «coger todo» | Tests de inventario/engine y E2E con MP/acciones intactos |
| 4 | Fantasma: un objeto por acción, no equipa | Tests de engine: segunda toma `no-action`; `EquipItem` `dead-unit` |
| 5 | Cofre con 1 acción; UI «sin coste»/«1 acción» | Tarjeta y submenú muestran «sin coste»; `containerOpenCost` prueba cadáver 0 y cofre 1 acción |
| 6 | Último objeto de enemigo retira el contenedor; jugador permanece | Tests de inventario/engine y E2E tras «coger todo» |
| 7 | Panel solo del activo vivo y público | `canOpenCharacterPanel`/`translateKey` usan `activePlayer`; tests de input y modelo |
| 8 | Tests y `verify` | 1568 tests, E2E acotado y visual; sin tests borrados, saltados ni debilitados |

# Observaciones

- No hay UI de cofre porque no hay cofres jugables en este corte. El coste
  «1 acción» queda como regla pura probada (`containerOpenCost`); la etiqueta
  visible de cofre llegará con su UI de REQ-020.
- «Coger todo» es atómico: si el contenido no cabe entero, rechaza sin mover
  nada. Es la lectura conservadora de REQ-020 T-003; REQ-020 sigue en borrador y
  su pregunta abierta sobre mochila llena debe confirmarlo.
- No se ejecutó la suite E2E completa; queda para TASK-0142.

# Cierre

- Código: `0214731`; evidencia: `5d33651`/`a3b838b`; verificación: `182d69c`.
- Fusión: `756e92a`. Documentación de cierre: `ce3d1cc`.
- `main` queda 42 commits por delante de `origin/main`; push pendiente.
