---
type: Task Verification
title: "TASK-0142: verificación independiente del lead"
description: Reejecución de verify y E2E, revisión del diff y criterio → evidencia.
task: TASK-0142
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T18:30:00Z }
---

# Alcance verificado

- Rama `task/TASK-0142`, commits `f3db820` (test) y `5e5160e` (evidencia).
- Diff completo: `tests/e2e/loot-qa.spec.ts` nuevo, artefactos del intento y la
  ficha (estado del lead). Sin cambios en `src/`, sin tests existentes
  modificados, borrados ni saltados.
- Dependencias TASK-0130…0136, 0138 y 0141 en `done`.

# Reejecución independiente

| Comando | Resultado |
|---|---|
| `pnpm run verify` | OK: docs/check (686 documentos), config/check (4 agentes, 3 skills), 107 archivos / 1678 tests, `tsc`, build y bundle |
| `pnpm run test:e2e` | 251/251 en 1.9 min, incluidos los 3 tests de `loot-qa.spec.ts` |

# Criterios → evidencia

1. Determinismo y carga sin retirada: `tests/unit/game/loot.test.ts`
   (RNG derivado, RNG principal intacto), `save-schema.test.ts` y E2E
   «guardar y cargar…»; `logs/guardado-cargado.json` (`rng` 0→0, contenedores
   idénticos, `lootable:false` conservado).
2. 25 %/100 % y dos objetos independientes: `loot.test.ts` (400 semillas,
   `LOOT_CHANCES.common = 25`, política `progression`, marcas divergentes).
3. Cadáver solo con saqueables y oculto en el beat: E2E sin botín (sin
   contenedor ni tarjeta), E2E con botín (`shield` solo) y comparación de píxeles
   del tile con el gemelo no saqueable: mismo frame en el beat y distinto tras
   `settle`; `renderer.test.ts` cubre `dyingUnitIds`.
4. Retirada al vaciar y cadáver de jugador persistente: E2E con «coger todo»
   (`containersAfter: []`), `corpse-loot-panel-qa.spec.ts` (jugador vacío
   persiste) e `inventory.test.ts`.
5. Mismo tile y costes: E2E (adyacente no lista; mismo tile con «sin coste»;
   MP 5→5 y acciones 1→1); `inventory.test.ts` (fantasma una acción por objeto,
   adyacente rechazado) e `inventory-panel.test.ts` (`containerOpenCost`: cofre
   1 acción).
6. Panel y render desde contenedores: `renderer.test.ts`,
   `inventory-panel.test.ts` y `corpse-containers-render-qa.spec.ts`
   (unidad muerta sin contenedor no pinta ni lista).
7. Guardar/cargar: E2E nuevo (UI de pausa, `.zip` real, `readSaveFiles`
   compara contenedores y RNG) y `save-schema.test.ts`.
8. Capturas y comandos: `screenshots/{cadaver-oculto-beat,cadaver-visible,panel-cadaver-coste,panel-tras-saquear,sin-cadaver-ataque,sin-cadaver-panel,carga-con-contenedores}.png`;
   `verify-output.txt` y `e2e-output.txt`. Revisadas por el lead.

# Observaciones

- El cofre no tiene comando de apertura en este corte: su adyacencia no es
  verificable en navegador. Se acepta la aserción de coste (1 acción) y el
  rechazo de la ruta de cadáver sobre cofres; no es defecto de esta tarea.
- El informe del runner pesa 3,8 KB: bajo el tope duro de 4 KB, por encima del
  objetivo de 2 KB. Aviso de `docs:check`, no error.
- Fricción de rutas de capturas: `deferred` a `requirements-writer`; la ruta
  canónica de `visual-qa.md` es `<spec>/screenshots/`.
- Sin defectos de comportamiento detectados; no hay relajación de criterios.
