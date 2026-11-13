---
type: ADR
title: "ADR-023: tipos de daño, paquetes y resistencias por bandas"
description: Cinco tipos de daño, ataques con paquetes separados, fuerza y armadura solo físicas, resistencia por bandas con multiplicador y mágico/eléctrico independientes del nivel de magia.
status: stable
decision_status: accepted
decided_by: [human:simon]
decided_at: 2026-11-12T12:00:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T12:00:00Z }
---

# Contexto

El combate de [ADR-012](ADR-012-combate-equipo-rng.md) y
[ADR-015](ADR-015-atributos-inherentes-absorcion.md) reduce todo el daño a un
número y la resistencia a un valor plano. Con nueve arquetipos y un bestiario que
aspira a usar las 64 entradas de `monsters.png`, el modelo no permite que un
gólem, un zombi y un bruto se distingan por aquello a lo que temen.

[REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md) define el reemplazo:
tipos de daño, paquetes y perfiles de resistencia. Este ADR registra la decisión
técnica y sus consecuencias; el contenido y los valores estimados viven en la
hoja. El ajuste fino se aplaza a la definición completa de roster y bestiario;
`EXP-005` queda cancelado por el momento.

# Decisión

- **Cinco tipos:** filo, contundente, punzante, mágico y eléctrico. Fuego y hielo
  no son tipos; quedan como traits de estado futuros (quemar/congelar).
- **Mágico y eléctrico son para cualquiera.** No dependen del maná ni del nivel de
  magia; una espada puede llevar filo +3 y eléctrico +1. El nivel de magia solo
  afecta a acceso, maná e impacto de hechizos.
- **Paquetes separados.** Un ataque es una lista de paquetes `{ type, amount }`.
  En este corte, un arma puede llevar como máximo un paquete físico y uno
  elemental, y ningún ataque supera dos paquetes. Cada paquete tira su daño y su
  resistencia.
- **Fuerza solo al paquete físico.** La fuerza refuerza el golpe del arma; los
  paquetes mágico y eléctrico no escalan con fuerza.
- **Armadura solo física.** La armadura reduce filo, contundente y punzante;
  mágico y eléctrico la ignoran. El escudo sigue sumando a la defensa contra todos
  los ataques.
- **Bandas después de la absorción.** Vulnerable ×1,5; normal ×1; resistente
  ×0,5; muy resistente ×0,25. Redondeo hacia abajo y mínimo 1 global; no hay
  inmunidades absolutas.
- **Perfil de resistencia.** Cada unidad tiene una banda por tipo. Sustituye a la
  resistencia numérica única de [ADR-015](ADR-015-atributos-inherentes-absorcion.md);
  los nueve atributos se mantienen.
- **Un resolvedor compartido.** Armas y hechizos usan la misma resolución de
  paquetes; no hay una fórmula paralela en `magic.ts` ni en la IA.

# Fórmula

```text
impacto: habilidad + acierto + 1d6 > defensa + escudo + 1d6

por paquete:
  físico:        bruto = cantidad + fuerza + 1d6 − (armadura + 1d6)
  mágico/eléctrico: bruto = cantidad + 1d6 − 1d6
  bruto = max(0, bruto)
  daño = max(0, floor(bruto × banda))
total = max(1, suma de daños)
```

# Consecuencias

- El daño deja de ser un número único en el motor, los eventos, el snapshot, el
  HUD y los tests. `AttackPerformed`, `ReplicaPerformed` y `SpellCast` necesitan
  un desglose por paquete.
- La resistencia plana desaparece de `UnitStats`; el roster y el bestiario pasan
  a declarar perfiles de cinco bandas.
- Las tablas de balance de `REQ-010` y los valores de resistencia de `REQ-015`
  quedan históricos. Los valores actuales son estimados para probar; el ajuste
  fino usará el método de win % cuando roster y bestiario estén completos.
- El ajuste fino masivo necesitará un mecanismo iterable que asigne a cada
  arquetipo y familia «frente a quién es fuerte» y «frente a quién es vulnerable»;
  se diseñará en el futuro, no en este corte.
- El catálogo de armas cambia de `damage` a `damagePackets`; el de hechizos
  declara tipo o paquete. Los hechizos de fuego causan daño mágico hasta que
  exista el trait de quemadura; los eléctricos causan eléctrico.
- La UI gana cinco bandas y un desglose de daño. El HUD debe distinguir «daño
  mágico» (tipo) de «nivel de magia» (atributo).
- El coste por ataque sube como máximo a dos tiradas de daño y dos de resistencia
  en este corte; el techo de paquetes acota el coste.
- El bestiario futuro se organiza por familias con perfiles reutilizables; no se
  ajustan 64 tablas únicas.

# Alternativas descartadas

- **Mantener un daño numérico único:** no da personalidad suficiente y obliga a
  distinguir enemigos solo por PV y armadura.
- **Un tipo por ataque:** no permite el caso deseado de filo + eléctrico en la
  misma arma.
- **Resistencia plana por tipo:** con PV pequeños, un +2 se acerca a la inmunidad
  y exige mostrar muchos números; las bandas son más legibles.
- **Porcentaje por tipo:** añade redondeos y se aleja de la fórmula actual; el
  multiplicador de banda ya da una lectura porcentual simple.
- **Armadura contra todos los tipos:** difumina el nicho del lanzador y hace que
  el tanque aguante también la magia.
- **Mágico/eléctrico ligados al nivel de magia:** contradice que cualquier héroe
  pueda usar un arma encantada.
- **Inmunidades absolutas:** pueden dejar una partida sin solución si el grupo no
  lleva el tipo adecuado.

# Enlaces

- [REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md)
- [REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md)
- [REQ-014](../requirements/REQ-014-atributos-inherentes-personajes.md)
- [REQ-015](../requirements/REQ-015-roster-arquetipos.md)
- [REQ-025](../requirements/REQ-025-magia-hechizos-mana.md)
- [ADR-012](ADR-012-combate-equipo-rng.md)
- [ADR-015](ADR-015-atributos-inherentes-absorcion.md)
- [ADR-019](ADR-019-magia-mana-hechizos.md)
