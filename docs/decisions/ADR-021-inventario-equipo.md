---
type: ADR
title: "ADR-021: inventario, huecos de equipo y panel único"
description: Ocho huecos de equipo y ocho de mochila por personaje, catálogo como fuente única de objetos, operaciones atómicas y una sola vista modal para gestionar equipo, mochila y suelo.
status: stable
decision_status: accepted
decided_by: [human:simon, deepseek/v4.1-flash]
decided_at: 2026-11-11T18:00:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T18:00:00Z }
---

> **Nota de vigencia (2026-11-13).** El modelo sigue vigente con tres
> actualizaciones: el campo de traits ya está en uso y el panel muestra traits y
> desglose de stats ([REQ-019](../requirements/REQ-019-traits-objetos.md));
> anillo, collar y guantes llegan con REQ-019 y entran por
> [REQ-020](../requirements/REQ-020-cofres-saqueo.md), mientras casco y botas
> siguen vacíos; y equipar admite origen en el suelo del tile o en un contenedor
> abierto por 1 MP, con el objeto sustituido de vuelta a la mochila y rechazo
> entero si no cabe ([REQ-018](../requirements/REQ-018-inventario-equipo.md),
> R-021).

> **Cierre de implementación (2026-11-13).** Lo descrito arriba está implementado
> en TASK-0093 a TASK-0098: instancias y operaciones atómicas (TASK-0094), panel
> único con `I` y `Escape` (TASK-0095), arte y debug (TASK-0096), glosario,
> arquitectura y notas de vigencia (TASK-0097) y E2E/QA visual (TASK-0098).
> [REQ-018](../requirements/REQ-018-inventario-equipo.md) v5 enmienda R-004: este
> corte solo trae armas a una mano; la regla de dos manos vive en el modelo y sus
> unitarios, y la primera arma a dos manos jugable es la maza de
> [REQ-019](../requirements/REQ-019-traits-objetos.md), cuya v3 añade a T-013 el
> E2E de dos manos con escudo diferido.

# Contexto

El equipo de [REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md)
era una lista de tres armas con auto-equipado y una tecla `G`, más escudo y
armadura fijos. [REQ-018](../requirements/REQ-018-inventario-equipo.md) lo
sustituye por objetos con localización única, ocho huecos de equipo y una mochila
personal, y añade objetos con efectos futuros
([REQ-019](../requirements/REQ-019-traits-objetos.md)) y contenedores
([REQ-020](../requirements/REQ-020-cofres-saqueo.md)).

Hacía falta fijar dónde vive la verdad de cada objeto, cómo se valida un
movimiento y cuántas vistas necesita el jugador para gestionarlo.

# Decisión

- **Un objeto, una localización.** Cada instancia tiene ID propio y está en la
  mochila de un personaje, en un hueco de equipo, en un contenedor o en el suelo.
  No hay listas duplicadas ni copias.
- **Ocho huecos de equipo** (arma, escudo, armadura, casco, botas, guantes,
  collar y un anillo) y **ocho de mochila** por personaje. La capacidad es un
  parámetro del modelo; el equipo puesto no consume mochila.
- **Catálogo como fuente única**: ID estable, categoría, hueco, manos,
  modificadores, traits reservados, sprite y descripción. Los objetos sin efecto
  no entran en el catálogo; por eso casco, botas, guantes, collar y anillo llegan
  con `REQ-019`.
- **Operaciones atómicas** de equipar, desequipar, recoger y soltar: validan
  hueco, categoría, manos y capacidad antes de mover. Un fallo no deja cambios
  parciales.
- **Un único punto de agregación** de stats efectivos: inherentes + equipo +
  traits futuros. El combate y la UI leen de ahí.
- **Una sola vista de gestión**: panel modal sobre el mapa, abierto con `I`, con
  equipo, mochila y suelo del tile del jugador. `G` se retira.
- **Coste**: 1 MP por equipar, desequipar, recoger y soltar; ninguna de estas
  operaciones gasta acción.

# Consecuencias

- `REQ-020` reutiliza el mismo modelo de localizaciones y las mismas operaciones
  atómicas para transferir a un contenedor.
- El host gana un panel modal con navegación completa por teclado; el mapa deja
  de aceptar comandos mientras está abierto.
- El cambio de arma pasa a costar 1 MP más la interacción con el panel; el arma
  tiende a elegirse antes del combate. Es una consecuencia asumida.
- La mochila de ocho con equipo no apilado se llena pronto; se corrige cambiando
  el parámetro, no el modelo.
- El snapshot y el guardado deben exponer localización, capacidad y contenido.

# Alternativas descartadas

- **Tres armas y auto-equipado** (`REQ-010`): no admite inventario, huecos ni
  accesorios.
- **Bolsa compartida por el grupo**: contradice el inventario personal, complica
  el hotseat y solapa con los cofres de `REQ-020`.
- **Mochila ilimitada**: elimina la decisión de qué llevar y deja los cofres sin
  función.
- **Piezas secundarias con armadura desde el inicio**: tres piezas con +1
  absorción reescriben el combate contra enemigos de armadura 2 sin datos para
  medirlo.
- **Atajos de cambio rápido `1`-`3`**: reintroducen el modelo de tres armas que
  `R-009` da por sustituido.
- **Recogida con `G` y equipar en un panel aparte**: dos vistas y dos teclas para
  una sola decisión.
