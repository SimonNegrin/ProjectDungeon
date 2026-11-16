---
type: Verification
title: "TASK-0172: verificación del intento 1"
description: "Glosario, economía de turno, arquitectura, alcance e índice coherentes con cofres; docs:check y verify en verde."
task: TASK-0172
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T19:07:48Z }
---

# Resultado

`ok`. `pnpm run verify:task TASK-0172` pasa: ficha, estado, informe, seis
criterios firmados, alcance dentro de `docs` y `pnpm run verify` completo. La
salida mecánica está en `verify-task.txt`.

# Criterios

Los seis quedan firmados:

- El glosario añade **cofre**, **capacidad de cofre**, **poder**, **mejora** y
  **botín especial**, y actualiza contenedor, acción, panel, zona de cadáveres y
  submenú. Los términos coinciden con REQ-020 v5 y ADR-033: 4 huecos, apertura
  con 1 acción, transferencia/depósito gratis, `powerScore` y pieza garantizada.
- La economía de turno recoge apertura con 1 acción y Chebyshev 1, reapertura
  gratis, transferencia y depósito gratis, 4 huecos fijos y el coste del fantasma.
- La arquitectura gana la sección **Cofres**: `generateChests` puro con RNG
  derivado y sal propia, 50/20 con forzado, colocación sin celdas ocupadas
  (incluido BSP), contenido por umbral, pieza garantizada, `Container` con
  `opened`, snapshot, panel/HUD, guardado y cues de 300/250 ms. Contenedor,
  panel, submenú, guardado y anti-CLS quedan actualizados.
- La matriz de REQ-017 ya tiene las filas de apertura y transferencia de cofre
  desde el cierre de TASK-0170; la lectura cruzada confirma que el host produce
  esos cues y beats.
- `docs/scope.md` deja de listar los cofres como fuera de alcance, los declara
  implementados junto a los traits y retira las menciones a cofres pendientes.
- `docs/requirements/index.md`, `docs/log.md` y el glosario quedan coherentes;
  REQ-017, REQ-018, REQ-019, REQ-020, REQ-025 y REQ-026 reflejan la
  implementación. `docs:check` y `pnpm run verify` pasan.

# Diff revisado

`git diff main...HEAD`:

- `docs/glossary.md`: cinco términos nuevos y seis filas actualizadas.
- `docs/design/turn-economy.md`: apertura, transferencia, depósito y 4 huecos.
- `docs/design/architecture.md`: sección «Cofres», contenedores, panel, submenú,
  guardado y anti-CLS.
- `docs/scope.md`: cofres y traits implementados; se retiran de fuera de alcance;
  se corrigen estados arrastrados de hotseat, resurrección y QA de guardado.
- `docs/requirements/index.md`: seis entradas actualizadas.
- La ficha y los artefactos del intento.

Sin cambios en `src/`, `tests/` ni arnés. `docs:check` valida 789 documentos y
172 tareas; `verify` pasa 1890 tests, tsc, build y bundle.

# Notas

- Los estados de hotseat, resurrección y QA de guardado estaban desfasados en
  `scope.md` y se corrigieron en el mismo párrafo que se editaba; no se reescribe
  ningún requisito ni la historia.
- El código tiene 17 traits y 14 objetos frente a los 18/13 de REQ-020 y ADR-033.
  No se edita una hoja estable del usuario; queda anotado para el cierre del hito.

# Qué debe probar el usuario

Leer el glosario y la sección de cofres de la arquitectura después del playtest:
si los términos «mejora», «poder» y «botín especial» describen lo que se siente
al abrir un cofre, la documentación queda cerrada. El playtest de la maza sigue
siendo el gate del hito.
