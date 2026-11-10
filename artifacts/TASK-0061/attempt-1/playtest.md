---
type: Playtest Notes
title: "TASK-0061: notas de playtest"
description: Qué mirar, qué ajustar y qué no cambia en el feedback de REQ-017.
status: stable
task: TASK-0061
attempt: 1
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T20:20:00Z }
---

# Playtest de TASK-0061

## Cómo mirar

Abre el juego (`pnpm dev`) o la build servida. La evidencia visual está en
`artifacts/TASK-0061/attempt-1/screenshots/` (1280×720), con el pico de cada
familia y las variantes en grises y movimiento reducido.

## Qué comprobar

1. **Impacto vs fallo**: `-N` y `Fallo` se distinguen sin color; el impacto
   muestra destello y el fallo no. Mira `impacto*.png` y `fallo*.png`.
2. **Muerte y cadáver**: el enemigo no desaparece en el golpe; al final queda un
   cadáver sobre el que se puede caminar.
3. **Recogida y cambio de arma**: el arma del suelo y el HUD cambian al final
   del beat, no al principio.
4. **Percepción**: `!` estable, alarma con onda/borde/banner en su cue, huida con
   `!!` y dirección, regreso con `zzz` y espera con `...`.
5. **Turno**: `FASE ENEMIGA` y `TU TURNO` no se pisan; el cursor reaparece al
   final del turno. Un enemigo fuera de pantalla usa un beat corto y no mueve la
   cámara.
6. **Cierre**: el overlay de fin espera su beat; el reinicio funde y cancela
   cues; el rechazo avisa sin bloquear.
7. **Reducido**: activa `prefers-reduced-motion: reduce` en el sistema. No debe
   haber tween, sacudida ni parpadeo, pero sí el mismo texto, banner y marca.

## Qué ajustar (solo sensación, no reglas)

- El beat exacto dentro de los rangos de REQ-017 (por ejemplo 300 vs 320 ms en
  impacto).
- El peso de la disolución/sacudida de muerte y el desplazamiento del texto.
- La duración del atajo fuera de pantalla (150 ms) y la densidad de textos
  simultáneos.

Cualquier ajuste debe hacerse en `FEEDBACK_CONFIG` y pasar de nuevo la suite; no
cambia reglas, motor ni tests.

## Qué no cambia

- No hay audio, arte nuevo ni partículas.
- El cadáver es solo presentación: no bloquea, no se interactúa y no se escribe
  en la rejilla.
- No hay saqueo de cadáveres ni nuevas reglas de combate, IA o pathfinding.

## Detalle observado

En el flujo normal, tras `EnemyReturned` el mismo enemigo suele resolver una
espera en la misma fase, así que `zzz` puede ser sustituido por `...` antes de
agotar su persistencia. Es el orden real de eventos, no un fallo de la prueba.
