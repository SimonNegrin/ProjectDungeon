---
type: Task Brief Detail
title: "TASK-0080: detalle técnico del intento 1"
description: Interpretación fijada, puntos de código, expectativas E2E y QA visual.
task: TASK-0080
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T21:30:00Z }
---

# Interpretación fijada (no renegociar)

- La réplica reutiliza la **animación de ataque**: embestida del defensor hacia
  el atacante original (dirección invertida respecto del primer ataque). No hay
  sistema de orientación en el renderer; no añadas giro de sprite, frames, arte
  ni texto.
- **Sin texto propio**: ni etiqueta, ni `-N`, ni banner, ni marca. El `Fallo` del
  ataque original se conserva; el daño de la réplica se lee en la barra de PV.
- Sin aviso, probabilidad ni indicador en el HUD.

# Código

- `motion.ts`: elimina el stub. `ReplicaPerformed` tiene beat propio
  (`FEEDBACK_CONFIG.beats.replica`, p. ej. 300 ms), `hasCue` deja de silenciarlo y
  `cueForEvent` rellena `attackerId` (quien replica), `targetId` (atacante
  original), `hit`, `damage`, `targetHp`, `rolls`, `attacker` y `target`. Puedes
  añadir `kind: 'replica'` (más explícito) o reutilizar `kind: 'attack'`; decide
  una y cubre los consumidores. El `eventType` debe seguir siendo
  `ReplicaPerformed`.
- `presentationState`: la vida del objetivo de la réplica debe retrasarse hasta
  su cue, igual que `AttackPerformed`; el objetivo puede ser jugador o enemigo.
  No cuentes la réplica en `withFutureActions` (es gratis).
- `world-effects.ts`: aplica la reacción de ataque al cue de réplica. La
  embestida sale de `data.attacker` (defensor) hacia `data.target` (atacante
  original); impacto con destello/retroceso, fallo con esquiva. Sin texto.
- `main.ts`: no añadas texto de daño para `ReplicaPerformed`; el caso existente
  es solo `AttackPerformed`. Si el snapshot de debug distingue `hit`, inclúyelo
  también para el cue de réplica.
- `feedback-config.ts`: el beat nuevo vive en la configuración única, no disperso.
  `feedback-events.ts` no necesita banner ni marca para la réplica.

# Expectativas E2E heredadas (105/110; actualiza solo estas cinco)

1. `combat-equipment-qa.spec.ts:626` «fallo con texto y sin destello». El fallo
   actual es en la línea 707: tras el fallo + réplica y un `EndTurn`, el segundo
   ataque impacta y mata (victoria, enemigo 0/6), pero `damage-feedback` está
   vacío y la expectativa pide `-5`. Conserva la intención: un impacto normal
   sigue mostrando `-N`; la réplica no añade texto. Añade una aserción explícita
   de que tras el fallo + réplica solo se lee `Fallo`/no hay texto de réplica.
   Investiga la causa del texto vacío; no borres la aserción.
2. `combat-equipment-qa.spec.ts:807` derrota a 80 turnos: la réplica del jugador
   mata a los enemigos y la derrota ya no llega. Acota el escenario (por ejemplo,
   jugador desarmado mediante el hook de setup, sin tocar reglas) para que la
   derrota sea alcanzable; conserva las aserciones de `TurnEnded`,
   `EnemyPhaseStarted`, turno, PV, overlay y reinicio.
3. `game-input-hud.spec.ts:54` (fallo en 427) misma derrota a 80 turnos. Aplica
   el mismo criterio de escenario acotado; conserva el resto del loop completo.
4. `feedback-reduced-motion-qa.spec.ts:117`: la lista exacta de eventos ahora
   incluye `ReplicaPerformed` tras `AttackPerformed`. Añádelo con comentario del
   motivo; mantén la igualdad animado/reducido, el texto del ataque, el banner,
   la marca, la ausencia de cues y el mismo orden.
5. `motion-qa.spec.ts:694` (fallo en 750): tras `EndTurn`, la réplica del jugador
   baja los PV del enemigo (7→3). Captura los PV **después** de ese turno y
   afirma que retirarse no cambia nada más; conserva la intención original.

# QA visual

- Nuevo spec (o ampliación de `feedback-combat-qa`) con semilla que produzca
  fallo + réplica. Congela el reloj, avanza al cue de fallo y al de réplica y
  captura ambos en 1280×720 y 900×700 (cuatro PNG).
- Ejecuta con `E2E_ARTIFACTS_DIR=tests/e2e pnpm run test:e2e <spec>` para que las
  capturas queden en `tests/e2e/<spec>/screenshots/` y commitéalas.
- Las capturas deben mostrar el giro del defensor y la secuencia fallo → réplica;
  sin texto de réplica en el mundo ni indicador en el HUD.

# Docs

- Glosario: amplía «Réplica» con elegibilidad (vivo, adyacente, arma equipada,
  alerta/regresando; huyendo solo acorralado; dormido nunca; solo melé; sin
  cadena).
- `docs/design/turn-economy.md`: retira la réplica de «referencia futura» y
  añade regla, coste 0 y fila de feedback.
- `docs/design/architecture.md`: sección de réplica (resolvedor, evento, sin
  estado pendiente, presentación).
- ADR nuevo en `docs/decisions/` (siguiente número, previsiblemente ADR-022) y
  entrada en `docs/decisions/index.md`; registra decisión, presentación, cue,
  excepción al techo de 1,3 s y consecuencias.
- Verifica las anotaciones de enmienda: `REQ-027` declara las de `REQ-009`,
  `REQ-010` y `REQ-017`; `REQ-009`/`REQ-010` tienen su nota de verificación. No
  edites `docs/requirements/**`.
- `pnpm run docs:check` debe pasar.

# Tests unitarios sugeridos

- Beat > 0 y cue con `eventType: 'ReplicaPerformed'`; orden `AttackPerformed` →
  `ReplicaPerformed`; datos de ancla y posiciones.
- PV del objetivo retrasados hasta el cue de réplica (jugador y enemigo).
- Efectos de mundo: embestida del defensor hacia el atacante, impacto/fallo.
- Reduced motion: beat 0, sin cue activo, mismo estado final.
- Sin texto de réplica en `collectAttackFeedbacks`/`main` y sin banner.
