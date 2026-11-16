---
type: Verification
title: "TASK-0162: verificación del intento 2"
description: Resultado de verify:task, criterios firmados y diff revisado de traits visibles y desglose.
task: TASK-0162
attempt: 2
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T09:56:00Z }
---

# Resultado

`ok`. `verify:task TASK-0162 --base harness/2agentes` en verde: estado, 6
criterios firmados, informe `success`, alcance `feature` y `pnpm run verify`
completo. Salida en `verify-task.txt`.

El intento 1 quedó sin firmar porque el desglose por atributo solo era visible en
`F1` (debug) y `PanelStats.rows` no se renderizaba. El intento 2 lo lleva a la
ficha derecha, visible con el panel abierto, y cubre el criterio con E2E.

# Criterios

Los seis firmados. Evidencia:

- Criterio 1: E2E `inventory.spec.ts` lee nombre, descripción, «radio 1» y
  «1 acción» de la maza en la ficha antes de equipar.
- Criterio 2: nueve filas con inherente, equipo, traits y `= total`; el E2E
  compara cada total con `effectiveStats` del snapshot y comprueba que cabe a
  900×700 y 1280×720.
- Criterio 3: el HUD izquierdo lista los traits con su hueco y `F1` los amplía con
  objeto y hueco.
- Criterio 4: tres `TraitImpact` y tres `TraitDamage` con banner, texto flotante
  y beat propio; el E2E avanza hasta cada cue.
- Criterio 5: maza equipada desplaza el escudo; equipar el escudo se rechaza sin
  cambiar equipo, mochila, MP ni acciones.
- Criterio 6: `pnpm run verify` con 1796 tests y `pnpm run test:e2e` con 276; los
  specs existentes no se modifican y `inventory.spec.ts` es nuevo.

# Diff revisado

`attempt-1` (`68a5b4e`): `trait-labels.ts`, `stat-breakdown.ts`, panel, ficha,
`F1`, cues y beats de trait, `main.ts` y `motion.ts`.
`attempt-2` (`fb31d8a`): `hud-detail.ts` adjunta el desglose al detalle del panel,
`hud.ts` pinta las nueve filas, `index.html` y `ui.css` con el bloque bajo las dos
secciones y scroll de la ficha.
Sin cambios en `src/game/**`; sin dependencias nuevas.

Riesgos: el scroll interno de la ficha con dos traits largos (cubierto por E2E) y
los 657 archivos de evidencia del intento 2, casi todos capturas de specs
ajenos. El desglose de resistencia se lee como niveles y perfil de bandas.

# Fricción

- Presupuesto vertical del panel: las piernas decorativas fijan el alto mínimo y
  `qa-visual-correccion-ui-v7` prohíbe recortarlas, así que el panel no admite
  nueve filas a 900×700. Disposición: `pending`, propuesta de documentar el
  presupuesto en la tarea `docs` de traits.
- El intento 1 no commiteó sus artefactos; se corrigió en el intento 2. Sin
  impacto en la verificación, que lee del árbol.

# Qué debe probar el usuario

- Abrir `I` y leer en la ficha derecha el desglose de los nueve atributos.
- Equipar y desequipar el collar con el panel abierto: MP máximos `+2/8` → `+0/6`.
- Atacar con la maza circulando: tres impactos con texto y tres curas con el
  anillo, sin que la ficha desborde a 900×700.
- Intentar el escudo con la maza: rechazo y ningún cambio parcial.
