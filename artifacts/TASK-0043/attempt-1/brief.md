---
type: Task Brief
title: "TASK-0043: brief del intento 1"
description: Ampliar el modelo serializable del mapa y sus validadores sin romper BSP.
task: TASK-0043
attempt: 1
status: stable
brief_bytes: 4086
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T16:10:00Z }
---

# Objetivo

Ampliar el modelo serializable de `src/game/map.ts` (`Room` con máscara y
`area`, `Corridor`/`Door` con el contrato de producción, `Spawns` con sala y
grupo de 6, `GeneratedMap` con `entrance`/`exit`/`enemies` opcionales) y
adaptar `validateGeneratedMap`, manteniendo BSP inyectable, determinista y con
todos sus tests. Solo modelo y validadores.

# No objetivos

- `growth`, variante o generador por defecto (`TASK-0046`).
- Spawn protegido de REQ-012, salida y colocación de enemigos (`TASK-0045`).
- Host, render, debug, bundle y QA. No tocar `src/host/`, `experiments/`,
  `index.html` ni dependencias.
- El generador por defecto sigue siendo BSP.

# Invariantes

- Puro y determinista: sin `Math.random`, relojes ni estado global. El mapa
  entero sobrevive a `JSON.parse(JSON.stringify(...))`.
- BSP: `id = 'bsp'`, misma semilla/opciones → mismo mapa; conserva salas
  rectangulares, huecos, conectividad y contrato heredado.
- T-013: no borrar, saltar ni debilitar tests. Para no romper los fixtures
  literales (`Room`, `Corridor`, `Door`, `Spawns`) actuales, los campos nuevos
  pueden ser opcionales de compatibilidad; **BSP y todo mapa generado los
  rellenan siempre** y los tests nuevos lo exigen. Si tocas un fixture, es
  cambio mecánico de tipo, nunca de aserción.
- En mapas generados, `spawns.player` es alias profundo de `party[0]`;
  `enemy` y `distance` se conservan como datos heredados.
- `roomContains`/`roomAt` usan `cells` si existe (caja como fallback legacy).
  Una celda de la caja sin suelo no pertenece a ninguna sala.
- Los validadores entienden máscaras y conservan las comprobaciones de BSP; los
  negativos existentes siguen fallando con el mismo motivo.

# Criterios de aceptación

Viven en [TASK-0043 § Criterios de aceptación](../../../docs/tasks/TASK-0043-motor-modelo-mapa-produccion.md#criterios-de-aceptación).
Enlazar; no copiar.

# Contexto mínimo

- `src/game/map.ts`: tipos, consultas de pertenencia y `validateGeneratedMap`.
- `src/game/bsp.ts`: `buildMap`, `buildDoors`, `chooseSpawns`; rellena los
  campos nuevos sin cambiar geometría ni huecos.
- `src/game/engine.ts`: jugador desde `party[0]` con fallback a `player`.
- `src/game/enemy-placement.ts`: solo lectura; no cambies su colocación.
- `experiments/EXP-004-salas-irregulares/src/types.ts`: referencia; no importar.
- [REQ-011 § Requisitos técnicos](../../../docs/requirements/REQ-011-generador-densa-salas-irregulares.md#requisitos-técnicos):
  R-003, R-004, R-005, R-008, T-001, T-003, T-004, T-011..T-013.

# Pistas

- `Corridor`: `id` = índice, `roomA`/`roomB` = `fromRoomId`/`toRoomId`,
  `cells` = `path` deduplicado, `length` = longitud de ruta.
- `Door`: `id` estable, `style` determinista entre 3, `roomA` = sala del hueco,
  `roomB` = la otra sala, `corridorId` = índice, `direct` = 0 tiles entre salas.
  BSP conserva un hueco por extremo.
- `party` de BSP: 6 celdas de suelo distintas de la sala de spawn,
  deterministas, `party[0] === player`; no es el spawn protegido de REQ-012.
- `entrance`/`exit`/`enemies`: tipos y campos opcionales; BSP no los genera.

# Tests

- Nuevos: pertenencia a máscara y muesca, celda de caja sin suelo, serialización,
  alias `player`, puertas entre salas distintas, pasillos con extremos y
  validadores sin relajar BSP.
- Regresión: `map.test.ts`, `map-integration.test.ts`, `engine.test.ts` y
  `enemy-placement.test.ts`.
- `pnpm run verify` (timeout 300 s); salida completa en `attempt-1/`.

# Artefactos

`artifacts/TASK-0043/attempt-1/`: `report.md` (anexo B), `verify-output.txt`,
`test-output.txt` y commit SHA.

# Riesgos

- No hacer obligatorios campos que rompan fixtures (T-013).
- No cambiar el generador por defecto a `growth`.
- No confundir `party` con el spawn protegido de REQ-012.
