---
type: Requirement Sheet
id: REQ-014
title: Atributos inherentes de los personajes
description: "Esquema de ocho atributos por personaje (habilidad, fuerza, defensa, resistencia, puntería, magia, PV y MP) y enmienda a la fórmula de combate de REQ-010: la resistencia entra en la capa de absorción y la armadura es su bonus."
status: draft
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-09T13:30:00Z
updated_at: 2026-11-09T13:30:00Z
related_tasks: [TASK-0053, TASK-0054]
generated: { by: deepseek/v4-pro, at: 2026-11-09T13:30:00Z }
verified:
  - by: human:simon
    at: 2026-11-09T13:30:00Z
    note: >-
      Aprueba el resumen de esquema: ocho atributos, resistencia como absorción
      con la armadura como bonus, puntería y magia como slots, magia
      multi-familia 1-4 y enemigos con el mismo esquema.
---

# Contexto

El juego arranca directo con un único personaje implícito y tres modificadores
(acierto, daño y defensa) fijos en +1/+1/+1, definidos en `REQ-010`. Para tener
varios arquetipos jugables y una pantalla de inicio donde cada jugador elija
personaje, primero hay que fijar **qué atributos tiene un personaje por sí
mismo, independientemente del equipo**, y cómo esos atributos entran en el
combate.

Esta hoja define ese esquema y enmienda la fórmula de combate de `REQ-010` para
que la resistencia (absorción de daño) entre junto a la armadura. No define los
valores de los arquetipos: eso es `REQ-015`. No define la pantalla de inicio:
eso es `REQ-016`.

# Objetivos de experiencia

- Poder explicar a un jugador qué define a un personaje antes de que lleve nada
  encima.
- Leer el combate en dos capas: evitación (defensa + escudo) y absorción
  (resistencia + armadura).
- Dejar espacio para crecer: puntería (distancia) y magia (hechizos) existen en
  el modelo aunque aún no hagan nada.
- Que héroes y enemigos se entiendan con el mismo lenguaje de stats.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Todo personaje tiene ocho atributos inherentes, independientes del equipo: habilidad, fuerza, defensa, resistencia, puntería, magia, PV y MP. | El estado de cada unidad expone los ocho; el equipo no los define. |
| R-002 | Habilidad es el modificador de acierto: se suma al acierto del arma. Sustituye el «mod. acierto» de REQ-010. | Cambiar habilidad cambia la probabilidad de impacto sin tocar la fórmula. |
| R-003 | Fuerza es el modificador de daño: se suma al daño del arma. Sustituye el «mod. daño» de REQ-010. | Cambiar fuerza cambia el daño sin tocar la fórmula. |
| R-004 | Defensa se mantiene: se suma al escudo para evitar impactos. | Igual que en REQ-010; el escudo sigue evitando, no reduciendo. |
| R-005 | Resistencia es absorción de daño: se suma a la armadura del equipo en una sola capa. La armadura se entiende como un bonus a la resistencia. | El daño se reduce por (resistencia + armadura); quitar la armadura sube el daño recibido y quitar la resistencia también. |
| R-006 | Puntería es un slot sin efecto en este corte; queda para el futuro ataque a distancia. | El atributo existe y es serializable; no cambia ningún cálculo actual. |
| R-007 | Magia es un slot sin efecto en este corte: un personaje puede tener varias familias de magia a la vez, cada una con un nivel de 1 a 4 (p. ej. `{ fuego: 3, veneno: 4 }`). | El atributo admite varias familias con nivel 1–4; no cambia ningún cálculo actual. |
| R-008 | La fórmula de impacto se renombra: `habilidad + acierto del arma + 1d6 > defensa + escudo + 1d6`; el empate sigue fallando. | Mismas probabilidades de REQ-010 con los nombres nuevos. |
| R-009 | La fórmula de daño incorpora la resistencia: `max(1, (fuerza + daño del arma + 1d6) − (resistencia + armadura + 1d6))`. | Con resistencia 0, el daño es idéntico al de REQ-010; con resistencia >0, baja. |
| R-010 | Héroes y enemigos comparten el mismo esquema de atributos; los enemigos conservan además sus campos de IA (visión, alarma, perfil). | El bestiario declara los ocho atributos por tipo además de visión/alarma/MP. |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | Los atributos son datos serializables, no código: cada unidad guarda un bloque de stats con los ocho atributos; magia es una lista de pares `{familia, nivel}` con nivel 1–4. | El snapshot expone los ocho atributos y la lista de magia; cambiar un valor cambia el combate sin tocar la fórmula. |
| T-002 | El resolvedor de combate usa los nombres nuevos y la capa de absorción (resistencia + armadura). No hay una fórmula paralela para jugador y enemigo. | Los tests de combate de REQ-010 pasan con habilidad/fuerza/defensa y resistencia 0; la IA y el jugador usan el mismo cálculo. |
| T-003 | En este corte el jugador actual conserva su comportamiento: habilidad +1, fuerza +1, defensa +1, resistencia 0, puntería 0 y magia vacía. Los enemigos actuales reciben resistencia 0, puntería 0 y magia vacía. | El balance v1 de REQ-010 (PV 6/8/5, armas 3/5/2, centinela sin armadura) no cambia: `pnpm run verify` y el E2E siguen en verde con los mismos resultados. |
| T-004 | La fuente única de valores sigue en los catálogos: el bestiario declara los ocho atributos por tipo y el roster de héroes (REQ-015) los suyos; no se duplican valores fuera de los catálogos. | Cambiar un atributo en el catálogo cambia el combate; los tests de balance leen del catálogo, no de constantes. |
| T-005 | Se actualizan `docs/design/turn-economy.md`, el glosario y la arquitectura con el esquema nuevo; se registra el ADR de atributos inherentes (ADR-015). | `pnpm run docs:check` pasa; no quedan referencias a los tres modificadores antiguos como únicos. |

# Requisitos no funcionales

- **Rendimiento:** añadir campos no cambia el coste del resolvedor; el objetivo de
  60 fps se mantiene.
- **Accesibilidad:** los nombres de atributo deben ser legibles en HUD/debug, no
  solo códigos internos.
- **Compatibilidad:** sin red ni persistencia; Chromium de escritorio como
  objetivo.
- **Seguridad:** sin datos personales.
- **Mantenibilidad:** un esquema de stats, un resolvedor y catálogos como fuente
  única; héroes y enemigos comparten el cálculo.

# Fuera de alcance

- Los valores de los 6 arquetipos (REQ-015).
- La pantalla de inicio y la selección de personaje (REQ-016).
- Implementar distancia (puntería) o hechizos (magia).
- Rebalancear el combate: esta hoja conserva el balance v1 (resistencia 0).
- Críticos, estados alterados y más piezas de equipo.
- Hotseat, red y persistencia.

# Preguntas abiertas

- Los valores de habilidad/fuerza/defensa/resistencia de los 6 arquetipos (se
  deciden en REQ-015).
- La lista de familias de magia y su efecto (REQ-015 y contenido posterior).
- Cuándo entra puntería (con la primera arma a distancia).

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-09 | Ocho atributos inherentes por personaje: habilidad, fuerza, defensa, resistencia, puntería, magia, PV y MP. | human:simon | aceptada |
| 2026-11-09 | Habilidad = acierto y fuerza = daño (renombran los modificadores de REQ-010); defensa se mantiene. | human:simon | aceptada |
| 2026-11-09 | Resistencia = absorción de daño; la armadura del equipo es un bonus que se suma en una sola capa. | human:simon | aceptada |
| 2026-11-09 | La resistencia tira 1d6, como hoy la armadura. | human:simon | aceptada |
| 2026-11-09 | Puntería y magia son slots sin efecto en este corte. | human:simon | aceptada |
| 2026-11-09 | Magia multi-familia con nivel 1–4 por familia. | human:simon | aceptada |
| 2026-11-09 | Héroes y enemigos comparten el mismo esquema de stats. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado la lista de ocho atributos y sus significados.
- [x] El usuario ha aprobado la enmienda a la fórmula (resistencia en la absorción).
- [x] El usuario ha aprobado puntería y magia como slots, y magia multi-familia 1–4.
- [x] El usuario ha aprobado mantener defensa y que los enemigos compartan el esquema.
- [x] Los requisitos son verificables.
- [x] Fuera de alcance claro (valores de arquetipos y pantalla de inicio).
- [x] Sin contradicciones abiertas con REQ-010 (el balance v1 se conserva con resistencia 0).
