---
type: ADR
title: "ADR-022: réplica cuerpo a cuerpo"
description: Reacción gratuita e inmediata tras un fallo de melé, con tirada nueva, elegibilidad acotada, sin cadena, cue propio y animación de ataque girada sin texto.
status: stable
decision_status: accepted
decided_by: [human:simon]
decided_at: 2026-11-11T16:20:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T21:45:00Z }
---

# Contexto

Fallar un ataque cuerpo a cuerpo era un turno perdido sin consecuencia. `REQ-027`
decide que el defensor pueda responder en el acto, gratis y sin cadena, y
`TASK-0079` implementó la regla. Faltaba fijar la presentación y el ritmo: la
reacción debe leerse sin texto y sin añadir un estado pendiente.

# Decisión

- **Disparo**: solo un ataque cuerpo a cuerpo fallido abre réplica. Un impacto no.
- **Elegibilidad**: defensor vivo, adyacente, con arma equipada y alerta,
  regresando o huyendo acorralado; un dormido nunca replica. Sin arma, a
  distancia o con ataque mágico no hay réplica.
- **Tirada nueva**: misma fórmula y RNG, sin reutilizar la tirada fallida; puede
  impactar, fallar o matar. No hay cadena.
- **Coste 0**: no gasta acción, MP ni maná y no comparte el tope de 4 acciones.
- **Atomicidad**: `resolveAttack` resuelve y emite `ReplicaPerformed` antes de la
  siguiente acción; no hay estado pendiente que guardar o reanudar.
- **Presentación**: la animación de ataque se reutiliza girada desde el defensor
  hacia el atacante original, sin etiqueta, número ni banner propios. El `Fallo`
  del ataque original se conserva y el daño se lee en la barra de PV.
- **Cue y ritmo**: `ReplicaPerformed` tiene cue propio y beat de 300 ms
  (`FEEDBACK_CONFIG.beats.replica`). Fallo (300) + réplica (300) = 600 ms. Se
  declara la excepción al techo de 1,3 s: la reacción no se mide como una acción
  independiente; si encadena muerte, se aplica la excepción terminal.
- **Accesibilidad**: con `prefers-reduced-motion` el estado final se aplica sin
  tween, el orden de eventos no cambia y no queda cue activo.

# Consecuencias

- El jugador aprende el riesgo de atacar a un enemigo con buena defensa sin un
  indicador en el HUD.
- La fase enemiga puede alargarse 300 ms por cada fallo con réplica; el balance
  lo mide `EXP-003` v2.
- El HUD y el guardado no necesitan campos nuevos: la réplica es un evento.
- El test de tiradas de `REQ-010` se acota a ataques sin réplica.
- Las réplicas letales consumen las acciones restantes del atacante muerto y, si
  es el jugador, terminan la partida.

# Alternativas descartadas

- **Texto o banner propio**: duplicaría la lectura del fallo y añadiría ruido.
- **Sprite o frames nuevos**: el lenguaje visual reutiliza la animación de ataque.
- **Réplica como acción o estado pendiente**: rompe la inmediatez y el guardado.
- **Cadena de réplicas**: puede crear bucles y no aporta legibilidad.
- **Aviso o probabilidad en el HUD**: convierte el riesgo en una decisión
  explícita que el usuario no quiere mostrar.

# Enlaces

- [REQ-027](../requirements/REQ-027-replica-combate-cuerpo-a-cuerpo.md)
- [REQ-017](../requirements/REQ-017-feedback-visual-eventos.md)
- [REQ-009](../requirements/REQ-009-percepcion-alarma-huida.md)
- [REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md)
- [ADR-012](ADR-012-combate-equipo-rng.md)
- [ADR-017](ADR-017-feedback-visual-eventos.md)
- [Arquitectura](../design/architecture.md)
- [Economía de turno](../design/turn-economy.md)
