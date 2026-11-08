---
type: ADR
title: "ADR-008: presentación animada sobre un motor atómico"
description: El movimiento se anima en el host a partir de los eventos del motor; el estado del motor sigue siendo la verdad.
status: stable
decision_status: accepted
decided_by: [human:simon, deepseek/v4.1-flash]
decided_at: 2026-11-08T11:20:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:20:00Z }
---

# Contexto

`REQ-006` v2 pide que el movimiento de jugador y enemigos se lea tile a tile,
con una pausa por tile, cámara que sigue, input bloqueado y MP progresivo. El
motor ya resuelve `MoveTo`, `Move` y la fase enemiga de forma atómica y
determinista, y sus eventos `UnitMoved` incluyen `from`, `to` y `mpLeft`.

El ritmo se decidió en `EXP-002`: 125 ms por paso recto, 70 ms de pausa por tile
(inicio, intermedios y destino) y diagonal a duración constante. La decisión
creativa es del usuario; la forma de implementarla es una decisión técnica.

# Decisión

- **Fuente de verdad**: el estado del motor no cambia. La animación es una capa
  de presentación del host construida a partir de los eventos ordenados de la
  acción. No se simula el movimiento por segunda vez ni se muta la entrada.
- **Timeline pura**: `src/host/motion.ts` deriva fases de pausa y transición,
  posiciones visuales enteras, cámara, estado derivado para HUD y puntos de
  presentación. No conoce DOM, Canvas, `performance.now` ni
  `requestAnimationFrame`.
- **Overrides de render**: el renderer recibe posiciones visuales por unidad y
  la cámara de presentación. Las unidades sin override usan su tile del estado.
  El sprite se dibuja centrado en píxeles enteros, sin suavizado, dentro del
  recorte del viewport.
- **Reloj de presentación**: `requestAnimationFrame` con delta acotado a 50 ms
  por frame y avance interno en subtramos de 50 ms. Una pestaña en segundo plano
  no adelanta varios pasos. Las duraciones viven en una única
  `MOTION_CONFIG`: 125/70/`constant-duration`.
- **HUD y overlay**: se derivan del estado de presentación, no del estado final.
  El MP baja con cada `mpLeft`, el daño aparece al cruzar su evento y el overlay
  de victoria o derrota espera al último evento de la animación.
- **Input**: mientras hay animación, las intenciones de juego se descartan (no se
  encolan). `F1` y `R` siguen activos; `R` y el botón de reinicio cancelan.
- **Modo instantáneo**: con `prefers-reduced-motion: reduce` se aplica el estado
  final sin tween ni pausa, conservando el mismo estado y orden de eventos.
- **API de test**: `window.__game` expone `animation` y `advance(ms)` para avanzar
  el reloj de forma determinista. No expone mutadores del estado vivo.
- **Sin dependencias nuevas** y sin importar código de `experiments/` desde
  producción.

# Consecuencias

- El motor, sus tests y su determinismo quedan intactos; el snapshot sigue siendo
  el estado final serializable.
- El host puede mostrar HUD, cámara y cursor por detrás del estado durante la
  animación sin alterar las reglas.
- La timeline es testeable en unitarios sin DOM ni reloj real, y los E2E pueden
  asentarla con `advance`.
- El coste por frame depende de las unidades visibles y de la interpolación, no
  del tamaño del mapa.
- Cambiar el ritmo exige tocar solo `MOTION_CONFIG` y la decisión registrada; no
  toca reglas ni tests de motor.
- La pausa antes del ataque tras acercarse sigue siendo un ajuste de playtest,
  pero el orden caminar → pausa → ataque es parte del contrato.

# Alternativas descartadas

- **Animar dentro del motor**: cambiaría las reglas, el determinismo y los tests
  de motor; el motor seguiría conociendo tiempo real.
- **Simular el movimiento en el host**: duplicaría la verdad y podría divergir
  del camino, del coste o del combate.
- **Transiciones CSS por unidad**: no encajan con el Canvas 2D, el recorte del
  viewport ni la cámara continua.
- **Delta sin acotar**: una pestaña en segundo plano saltaría pasos y eventos.
- **Encolar input durante la animación**: añade estados y contradice `REQ-006`.

# Enlaces

- [REQ-006](../requirements/REQ-006-movimiento-animado.md)
- [Economía de turno](../design/turn-economy.md)
- [Arquitectura](../design/architecture.md)
- [EXP-002](../../experiments/EXP-002-ritmo-movimiento/experiment.md)
