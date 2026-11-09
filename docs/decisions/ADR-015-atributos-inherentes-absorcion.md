---
type: ADR
title: "ADR-015: atributos inherentes y resistencia en la absorción"
description: Ocho atributos por personaje, habilidad y fuerza como modificadores, y resistencia como capa de absorción con la armadura como bonus.
status: stable
decision_status: accepted
decided_by: [human:simon]
decided_at: 2026-11-09T13:30:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T23:50:00Z }
---

# Contexto

El combate de [ADR-012](ADR-012-combate-equipo-rng.md) usa tres modificadores por
personaje: acierto, daño y defensa. Ese esquema no distingue los atributos
inherentes del personaje del equipo, no deja sitio para la distancia ni la magia
y mezcla la absorción del daño con una única pieza de equipo.

[REQ-014](../requirements/REQ-014-atributos-inherentes-personajes.md) fija un
esquema de ocho atributos por personaje y enmienda la fórmula de combate sin
cambiar el balance v1. Este ADR registra esa decisión; no sustituye a
[ADR-012](ADR-012-combate-equipo-rng.md) como historia del combate con equipo y
RNG.

# Decisión

- **Ocho atributos inherentes por personaje**, independientes del equipo:
  habilidad, fuerza, defensa, resistencia, puntería, magia, PV y MP. Héroes y
  enemigos comparten el esquema; los enemigos conservan además visión, alarma,
  MP y perfil de IA.
- **Habilidad y fuerza renombran los modificadores**: habilidad se suma al
  acierto del arma; fuerza se suma al daño del arma. Defensa se mantiene y se
  suma al escudo.
- **Resistencia es absorción**: se suma a la armadura del equipo en una sola
  capa. La armadura pasa a ser un bonus a la resistencia. Impacto y daño quedan:
  - `habilidad + acierto del arma + 1d6 > defensa + escudo + 1d6`; el empate falla.
  - `max(1, (fuerza + daño del arma + 1d6) − (resistencia + armadura + 1d6))`.
- **Puntería y magia son slots sin efecto** en este corte. Puntería queda para
  el ataque a distancia; magia admite varias familias con nivel 1–4.
- **Fuente única**: los valores viven en el bestiario y en el roster de héroes;
  el motor y el host no duplican stats. El balance v1 se conserva con
  resistencia 0 y puntería 0.
- **Host legible**: el HUD y `F1` muestran los nombres de atributo, no alias
  internos de las fórmulas antiguas.

# Consecuencias

- El combate se lee en dos capas: evitación (defensa + escudo) y absorción
  (resistencia + armadura).
- Cambiar un atributo en el catálogo cambia el combate sin tocar el resolvedor.
- Los tests y textos que hablaban de tres modificadores únicos migran a los
  nombres nuevos; `damage` y `armor` de las tiradas siguen siendo claves internas
  del motor y no se renombran.
- Añadir arquetipos o enemigos es añadir datos, no lógica.

# Alternativas descartadas

- **Mantener acierto, daño y defensa como únicos modificadores**: no deja sitio a
  resistencia, puntería ni magia y obliga a duplicar conceptos al añadir
  arquetipos.
- **Tratar la armadura como una capa separada de la resistencia**: rompe la
  lectura de una sola absorción y complica el orden de tiradas.
- **Duplicar valores en motor, host o tests**: contradice la fuente única de
  [ADR-014](ADR-014-balance-provisional-fuente-unica.md) y encarece cada ajuste.
- **Renombrar claves internas de tiradas (`damage`/`armor`)**: no aporta nada al
  jugador y rompe snapshots y tests sin cambiar reglas.

Ver [REQ-014](../requirements/REQ-014-atributos-inherentes-personajes.md) y
[REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md).
