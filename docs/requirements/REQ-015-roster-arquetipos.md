---
type: Requirement Sheet
id: REQ-015
title: Roster de arquetipos
description: "Nueve arquetipos jugables con stats inherentes (incluidas acciones y nivel de magia), arma temática, dos variantes de sprite, nombre editable y el método de balance por porcentaje de victorias esperadas."
status: stable
version: 5
decision_owner: human:simon
review_required: true
created_at: 2026-11-09T14:00:00Z
updated_at: 2026-11-11T23:10:00Z
related_tasks: [TASK-0055, TASK-0056]
generated: { by: deepseek/v4-pro, at: 2026-11-09T14:00:00Z }
verified:
  - by: human:simon
    at: 2026-11-09T14:00:00Z
    note: >-
      Aprueba el roster: nueve arquetipos con stats y arma temática, cinco con
      arma futura, Cuchillo +4/1, dos variantes de sprite sin género, nombre
      editable, clérigo tanque sin curación y el método de balance por win %
      (héroe con iniciativa, 1v1, equipo básico).
  - by: human:simon
    at: 2026-11-11T23:10:00Z
    note: >-
      Cierra la hoja como stable v5: aprueba el roster revisado y acepta
      aplazar las cuatro preguntas abiertas (objetivos de win % del bestiario,
      ajuste de magia tras playtest, tercer arquetipo con 3 acciones y arma del
      Clérigo); ninguna bloquea el cierre.
---

# Contexto

`REQ-014` fijó el esquema de nueve atributos por personaje. Esta hoja define el
**roster**: nueve arquetipos jugables con sus stats inherentes, arma temática,
variantes de sprite e identidad. Es el contenido que la pantalla de inicio
(`REQ-016`) mostrará para que cada jugador elija personaje.

No define la pantalla de inicio, los assets de sprite ni el bestiario: los
enemigos y sus objetivos de balance van en una hoja futura.

# Objetivos de experiencia

- Que cada arquetipo se sienta distinto desde el primer turno: leer sus stats y
  su arma temática.
- El Guerrero como referencia equilibrada; el resto como especialistas con
  tradeoffs claros (ganan en un atributo y pagan en otro).
- Identidad sin etiquetas de género (dos variantes de sprite) y con nombre
  personalizable.
- Dejar el balance medible para el bestiario futuro (porcentaje de victorias
  esperadas por emparejamiento).

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | El roster tiene nueve arquetipos: Guerrero, Bárbaro, Pícaro, Arquero, Mago, Clérigo, Guerrero mágico, Cocinero y Agricultor. | El catálogo lista los nueve con identidad y rol. |
| R-002 | Cada arquetipo tiene los nueve atributos de REQ-014 con los valores de la tabla de stats (balance provisional v1). El Guerrero es la referencia (+1/+1/+1); el Pícaro tiene 3 acciones y el resto 2 en el primer corte. | La tabla es la única fuente de valores; los atributos son serializables. |
| R-003 | El Guerrero es equilibrado; el resto especializa con tradeoffs (p. ej. Bárbaro +3 fuerza/−1 defensa; Mago −1 fuerza; Clérigo +3 defensa/−1 fuerza). | Nadie domina en todo; cada especialista paga su ventaja en otro atributo. |
| R-004 | Arma temática inicial por arquetipo. Cuatro atacan hoy (Guerrero, Bárbaro, Pícaro, Cocinero); cinco quedan «arma futura» (Arquero, Mago, Clérigo, Guerrero mágico, Agricultor) y no atacan hasta que exista su arma. | La tabla de equipo refleja arma o «futura»; un arquetipo sin arma no puede atacar en el combate actual. |
| R-005 | Nueva arma Cuchillo: +4 acierto / 1 daño; más fiable y menos dañina que la daga (+4/2). | El catálogo de armas incluye el Cuchillo con esos valores; la daga no cambia. |
| R-006 | Cada arquetipo ofrece dos variantes de sprite seleccionables, sin etiqueta de género. | El roster declara dos variantes por arquetipo; la selección se hace en REQ-016. |
| R-007 | Cada instancia de personaje tiene un nombre editable; por defecto, el del arquetipo. | El estado guarda el nombre; la pantalla de inicio permite editarlo. |
| R-008 | Identidad mágica por **nivel único**: Mago 4 (alto), Clérigo 3 (medio), Guerrero mágico 2 (medio-bajo) y Cocinero 1 (bajo); el resto sin magia (0). Cualquier lanzador puede usar cualquier hechizo de su nivel o inferior. | La tabla de identidad recoge un nivel numérico o «sin magia»; no hay familias con nivel propio. |

## Stats inherentes (balance provisional v1)

| Arquetipo | Hab | Fue | Def | Res | PV | MP | Pun | Mag | Acc |
|---|---|---|---|---|---|---|---|---|---|
| Guerrero | +1 | +1 | +1 | +1 | 20 | 6 | 0 | 0 | 2 |
| Bárbaro | 0 | +3 | −1 | 0 | 24 | 5 | 0 | 0 | 2 |
| Pícaro | +3 | 0 | +1 | 0 | 14 | 8 | 0 | 0 | 3 |
| Arquero | +1 | 0 | 0 | 0 | 14 | 6 | +3 | 0 | 2 |
| Mago | 0 | −1 | 0 | 0 | 12 | 5 | 0 | 4 | 2 |
| Clérigo | 0 | −1 | +3 | +2 | 18 | 5 | 0 | 3 | 2 |
| Guerrero mágico | +1 | 0 | +1 | 0 | 18 | 6 | 0 | 2 | 2 |
| Cocinero | +3 | −1 | 0 | 0 | 14 | 6 | 0 | 1 | 2 |
| Agricultor | −1 | +3 | 0 | +1 | 22 | 4 | 0 | 0 | 2 |

La escala es relativa al Guerrero (+1): `0` queda un punto por debajo, `−1` dos
por debajo y `+2/+3` por encima. Un modificador negativo se suma al total de su
lado de la fórmula (equivale a restar 1 a la tirada de 1d6); el `max(1, …)` del
daño sigue garantizando mínimo 1 en un impacto.

`Mag` es el nivel de magia (entero 0–4; 0 = sin magia) y `Acc` las acciones por
turno. El maná máximo se deriva del nivel en `REQ-025` (nivel × 4) y no se
duplica en esta tabla. 2 acciones es el valor por defecto; el Pícaro tiene 3 en
el primer corte (`REQ-026`).

## Equipo inicial

| Arquetipo | Arma | Armadura | Escudo |
|---|---|---|---|
| Guerrero | Espada +3/3 | 1 | 1 |
| Bárbaro | Hacha +2/5 | 0 | 0 |
| Pícaro | Daga +4/2 | 0 | 0 |
| Arquero | — (arco futuro) | 0 | 0 |
| Mago | — (bastón futuro) | 0 | 0 |
| Clérigo | — (maza futura) | 1 | 1 |
| Guerrero mágico | — (futura) | 1 | 0 |
| Cocinero | Cuchillo +4/1 | 0 | 0 |
| Agricultor | — (guadaña futura) | 0 | 1 |

## Identidad y magia

| Arquetipo | Rol / identidad | Nivel de magia (identidad) |
|---|---|---|
| Guerrero | Equilibrado; referencia | sin magia |
| Bárbaro | Pega fuerte y encaja | sin magia |
| Pícaro | Rápido y fiable | sin magia |
| Arquero | Distancia (futuro) | sin magia |
| Mago | Hechizos | 4 (alto) |
| Clérigo | Tanque de apoyo | 3 (medio) |
| Guerrero mágico | Guerrero algo más débil | 2 (medio-bajo) |
| Cocinero | Cuchillo y apoyo | 1 (bajo) |
| Agricultor | Fuerza bruta | sin magia |

Todos los lanzadores comparten el catálogo de hechizos: el nivel es el único
requisito de acceso (`REQ-025`). Las familias (fuego, eléctrico, veneno, vida…)
son categorías de efecto, no afinidades por arquetipo.

# Cómo ajustar el balance (método)

1. **Héroes primero** (esta hoja, cerrada); después el bestiario.
2. Por cada emparejamiento héroe-enemigo se define un **porcentaje de victorias
   esperadas**, con el **héroe atacando primero** (iniciativa). El porcentaje con
   el enemigo primero se muestra solo como referencia.
3. Escenario: **duelo 1v1**, PV completos, ambos con **equipo básico inicial**
   (definido antes de simular). No se calculan todas las combinaciones posibles.
4. Simulación determinista en `EXP-003`: **1.000 duelos** y **tolerancia ±2 %**.
   La simulación incluye acciones por turno, hechizos/maná y réplica.
5. Se ajustan los **stats del enemigo** hasta alcanzar el objetivo.
6. El porcentaje es **línea base 1v1**; la dificultad real viene de grupos y
   alarma.
7. Inicialmente solo **4 de 9 héroes atacan**; los otros 5 entran cuando tengan
   arma.

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El roster es un catálogo de datos serializable con los nueve arquetipos: stats, equipo inicial, dos variantes, nivel de magia y acciones. Fuente única; sin valores duplicados en motor, host ni tests. | Cambiar un valor en el catálogo cambia el juego; los tests leen del catálogo. |
| T-002 | El campo `nombre` es parte del estado de la instancia de personaje, serializable y por defecto el nombre del arquetipo. | El snapshot expone el nombre; editarlo no cambia stats. |
| T-003 | El Guerrero sustituye al jugador único provisional de REQ-014 como personaje por defecto; gana +1 de resistencia respecto a ese jugador (0 → 1). | El personaje por defecto usa los valores del Guerrero; el balance v1 de enemigos y armas no cambia. |
| T-004 | Los cinco arquetipos «arma futura» se representan sin arma equipada y no pueden atacar, sin romper el resolvedor. | Un ataque desde un arquetipo sin arma se rechaza; el catálogo los marca como sin arma. |
| T-005 | Se actualizan glosario (arquetipo, roster), diseño y arquitectura; no cambia la fórmula de combate (REQ-010/REQ-014). | `pnpm run docs:check` pasa; no hay fórmulas duplicadas. |
| T-006 | Sin dependencias nuevas, sin red; el motor sigue puro y el host es presentación. | `package.json` y `pnpm-lock.yaml` no cambian. |

# Requisitos no funcionales

- **Rendimiento:** un catálogo de nueve arquetipos no cambia el coste del
  resolvedor; objetivo de 60 fps.
- **Accesibilidad:** nombres de arquetipo y atributos legibles en HUD/debug.
- **Compatibilidad:** sin red ni persistencia; Chromium de escritorio.
- **Seguridad:** sin datos personales.
- **Mantenibilidad:** un catálogo de roster como fuente única; los valores se
  reajustan sin tocar la fórmula.

# Fuera de alcance

- La pantalla de inicio y la selección de personaje (REQ-016).
- Los assets de sprite (REQ-016).
- El bestiario y sus objetivos de win % (hoja futura).
- La implementación de hechizos, maná y réplica (`REQ-025` y `REQ-027`).
- Las armas futuras (arco, bastón, maza, guadaña…).
- Hotseat, red y persistencia.

# Preguntas abiertas

Ninguna bloquea el cierre de la hoja; quedan **aplazadas** a hojas futuras o al
rebalanceo:

- Los objetivos de win % del bestiario (hoja futura).
- El ajuste de los niveles de magia tras playtest (valores v1 en `REQ-025`).
- Si otro arquetipo recibirá 3 acciones tras el rebalanceo (el Pícaro ya tiene 3).
- Si el Clérigo tendrá un ataque propio además de la curación (maza futura).

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-09 | Nueve arquetipos con stats inherentes y el Guerrero como referencia +1/+1/+1. | human:simon | aceptada |
| 2026-11-09 | Arma temática por arquetipo; cinco con «arma futura» (no atacan aún). | human:simon | aceptada |
| 2026-11-09 | Nueva arma Cuchillo +4/1 (más fiable, menos dañina que la daga). | human:simon | aceptada |
| 2026-11-09 | Dos variantes de sprite por arquetipo, sin etiqueta de género. | human:simon | aceptada |
| 2026-11-09 | Nombre editable por instancia, por defecto el del arquetipo. | human:simon | aceptada |
| 2026-11-09 | Magia vacía en combate; identidad registrada (Mago, Guerrero mágico, Cocinero). Clérigo tanque sin curación. | human:simon | sustituida el 2026-11-11 |
| 2026-11-09 | Método de balance por win % esperado: héroe con iniciativa, 1v1, equipo básico, 1.000 duelos y ±2 %. | human:simon | aceptada |
| 2026-11-11 | Enmienda `REQ-025`: magia como nivel único; los niveles por arquetipo se cierran en la fila siguiente. | human:simon | aceptada |
| 2026-11-11 | Enmienda `REQ-026`: acciones por turno con 2 por defecto; valores por arquetipo pendientes. | human:simon | aceptada |
| 2026-11-11 | Niveles de magia por arquetipo: Mago 4, Clérigo 3, Guerrero mágico 2, Cocinero 1; el resto 0. | human:simon | aceptada |
| 2026-11-11 | Pícaro con 3 acciones desde el inicio; el resto 2 y el rebalanceo ajusta. | human:simon | aceptada; provisional v1 |
| 2026-11-11 | Cierre de la hoja: el roster queda `stable` y las cuatro preguntas abiertas se aplazan a hojas futuras o al rebalanceo. | human:simon | aceptada |

# Aceptación de la hoja

- [x] El usuario ha aprobado los nueve arquetipos y sus identidades.
- [x] El usuario ha aprobado la tabla de stats y el mapeo de armas/equipo.
- [x] El usuario ha aprobado el Cuchillo, las dos variantes de sprite y el nombre editable.
- [x] El usuario ha aprobado la magia como nivel único y el clérigo como apoyo.
- [x] El usuario ha aprobado el método de balance por porcentaje de victorias.
- [x] Las preguntas abiertas restantes quedan aplazadas y no bloquean el cierre.
- [x] Los requisitos son verificables y el fuera de alcance está claro.
