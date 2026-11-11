---
type: Requirement Sheet
id: REQ-018
title: Inventario y equipo por personaje
description: "Modelo de objetos, inventario personal y ocho huecos de equipo; sustituye el modelo de tres armas de REQ-010. Borrador: capacidad, coste de equipar y aporte de piezas secundarias pendientes."
status: draft
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-10T20:00:00Z
updated_at: 2026-11-10T20:00:00Z
related_tasks: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T20:00:00Z }
verified:
---

# Contexto

El equipo actual viene de [REQ-010](REQ-010-combate-equipo-acierto-defensa.md):
el jugador lleva tres armas en una lista, recoge con `G` (1 MP), equipa
automáticamente y cambia con `1`-`3`; la armadura y el escudo son fijos. Ese
modelo fue suficiente para el corte de combate, pero no permite inventario,
objetos equipados por hueco, accesorios ni objetos que aporten traits.

El pack 32rogues incluye `items.png` con armas, escudos, armaduras, guantes,
botas, cascos, colgantes, anillos, pociones, pergaminos, llaves, munición,
monedas y comida. El proyecto usará todo el pack con el tiempo; este corte no lo
define entero.

Esta hoja define el **inventario personal y el equipo**: qué es un objeto, qué
categorías entran, qué huecos tiene un personaje, cómo se equipa y desequipa,
cómo se guardan los objetos y cómo se suman sus stats. No define los efectos
especiales de los objetos ([REQ-019](REQ-019-traits-objetos.md)) ni los cofres y
el saqueo ([REQ-020](REQ-020-cofres-saqueo.md)).

Es un **borrador**: recoge lo decidido y deja abiertas las decisiones que faltan
para cerrarla.

# Objetivos de experiencia

- Que el equipo se lea de un vistazo: qué llevo puesto y qué llevo en la mochila.
- Que elegir objeto sea una decisión: arma, escudo, armadura y accesorios cambian
  el combate.
- Que recoger y equipar no sea una pelea con la interfaz.
- Que el inventario sea personal y comprensible en hotseat.
- Que el modelo aguante traits, cofres y contenido futuro sin rehacerse.

# Requisitos creativos (decididos)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | Cada personaje tiene un inventario personal además de su equipo. | El estado de cada personaje distingue inventario y equipo; el inventario no es compartido por defecto. |
| R-002 | Cada personaje tiene ocho huecos de equipo: arma, escudo, armadura, casco, botas, guantes, collar y un anillo. | El panel de personaje muestra los ocho huecos; cada uno acepta solo su categoría. |
| R-003 | El hueco de arma admite armas a una mano o a dos manos. Un arma a dos manos anula el escudo. | Con un arma a dos manos no se puede llevar escudo; con un arma a una mano, sí. |
| R-004 | El primer corte incluye equipo y accesorios: armas melee a una y dos manos, escudos, armaduras, cascos, botas, guantes, collares y anillos. | El catálogo inicial solo contiene esas categorías. |
| R-005 | Quedan fuera del primer corte los consumibles, la magia, las llaves, la munición y las monedas. | Esos objetos no aparecen en el catálogo ni en el inventario de este corte. |
| R-006 | El inventario y el equipo son por personaje; no hay una bolsa compartida por defecto. | Cada personaje tiene su propio inventario; los cofres de `REQ-020` serán el almacenamiento común. |
| R-007 | Equipar y desequipar mueve el objeto entre inventario y hueco, sin duplicarlo ni perderlo. | Un objeto está exactamente en un sitio; el número total de objetos no cambia. |
| R-008 | Si el hueco está ocupado, el objeto anterior vuelve al inventario. Si no cabe, la operación se rechaza y nada cambia. | El intercambio es atómico; el inventario no se desborda. |
| R-009 | El modelo de tres armas de `REQ-010` queda sustituido por el inventario y los ocho huecos. | No conviven la lista de tres armas y el inventario; el cambio de arma se hace desde el equipo. |

# Decisiones de contenido pendientes

Estas decisiones afectan a la sensación de juego y no están cerradas. Se dejan
como preguntas para la sesión de cierre.

- **Capacidad del inventario:** 12 huecos, ilimitado o bolsa compartida.
- **Coste de equipar/desequipar:** 1 MP, gratis o acción del turno.
- **Aporte de las piezas secundarias:** armadura, traits o mezcla.
- **Flujo de recogida:** `G` al inventario o auto-equipar; teclas y pantalla.
- **Equipo inicial por arquetipo:** solo arma temática o también ropa básica.
- **Cambio con arma a dos manos:** el escudo vuelve al inventario, se rechaza o
  se guarda en un hueco reservado.

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El catálogo de objetos es dato, no código: ID estable, nombre, categoría, hueco, manos, modificadores de stats, traits (vacío en este corte), sprite y descripción. | Cambiar un valor del catálogo cambia el juego sin tocar fórmulas; los IDs son estables; el catálogo es la única fuente de valores. |
| T-002 | Cada objeto del mundo es una instancia con ID propio y una localización única: inventario, hueco de equipo, contenedor o suelo. | El snapshot expone la localización; no hay objetos duplicados ni huérfanos. |
| T-003 | El inventario y el equipo son serializables; la capacidad es un parámetro del modelo, no una constante dispersa. | Cambiar la capacidad cambia la validación sin tocar la UI ni el motor. |
| T-004 | Hay un único punto de agregación de stats efectivos: inherentes de [REQ-014](REQ-014-atributos-inherentes-personajes.md) + modificadores del equipo + traits cuando existan. | Combate y UI leen los stats efectivos; no hay una suma paralela en el host. |
| T-005 | Equipar, desequipar y recoger son operaciones atómicas: validan hueco, categoría, manos y capacidad antes de mover; si fallan, no dejan cambios parciales. | Tests de invariantes: no se duplica, no se pierde y no se supera la capacidad. |
| T-006 | La regla de dos manos se aplica en el modelo: un arma a dos manos ocupa el hueco de arma y bloquea el escudo; el intento de llevar ambos se rechaza o resuelve según la decisión de contenido. | El modelo no permite un estado con arma a dos manos y escudo equipados. |
| T-007 | El motor sigue siendo puro: sin DOM, sin red y sin relojes; el host presenta y traduce input. | `src/game/` no importa `src/host/`; los tests del motor corren sin DOM. |
| T-008 | El host presenta el panel de personaje, el inventario, los huecos, los tooltips y el HUD de equipo; el input permite navegar, equipar, desequipar y recoger. | La UI coincide con el estado; se puede jugar solo con teclado; el snapshot de debug expone inventario y equipo. |
| T-009 | El arte de objetos sale de `items.png` mediante el mapa de `items.txt` ([ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md)); el catálogo referencia el sprite, no lo incrusta. | Cada objeto del catálogo tiene sprite; cambiar el pack no cambia la lógica. |
| T-010 | Tests nuevos: catálogo, instancias, capacidad, equipar/desequipar, intercambio de hueco, dos manos/escudo, agregación de stats, serialización y E2E de la UI. No se debilitan tests existentes. | `pnpm run verify` pasa; los tests de `REQ-010` conservan su intención. |
| T-011 | Se actualizan glosario, [economía de turno](../design/turn-economy.md) y arquitectura; se registra un ADR de inventario y equipo. | `pnpm run docs:check` pasa; no quedan referencias al inventario de tres armas como modelo vigente. |
| T-012 | Sin dependencias nuevas, sin red y sin persistencia entre sesiones. | `package.json` y `pnpm-lock.yaml` no cambian; no hay llamadas de red. |

# Requisitos no funcionales

- **Rendimiento:** inventarios pequeños y operaciones O(n); el coste no debe
  afectar al objetivo de 60 fps ni al render.
- **Accesibilidad:** navegación completa por teclado, foco visible, texto legible
  y información que no dependa solo del color o del icono.
- **Compatibilidad:** Chromium de escritorio como objetivo; Firefox y Safari
  recientes como deseables.
- **Seguridad:** sin datos personales, sin red y sin nuevas dependencias.
- **Mantenibilidad:** catálogo como fuente única, IDs estables, un punto de
  agregación de stats y operaciones atómicas reutilizables por `REQ-020`.

# Dependencias

- [REQ-010](REQ-010-combate-equipo-acierto-defensa.md): equipo, armas y recogida
  vigentes; esta hoja sustituye su inventario de tres armas y su equipo fijo.
- [REQ-014](REQ-014-atributos-inherentes-personajes.md): nueve atributos y capa de
  absorción; el equipo aporta modificadores sobre ellos.
- [REQ-015](REQ-015-roster-arquetipos.md): arquetipos, arma temática y nombre;
  el equipo inicial por arquetipo se decide en esta hoja.
- [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md): arte placeholder
  y licencia del pack.
- [ADR-014](../decisions/ADR-014-balance-provisional-fuente-unica.md): valores en
  catálogos y balance provisional; el equipo nuevo exigirá una pasada de ajuste.
- [ADR-015](../decisions/ADR-015-atributos-inherentes-absorcion.md): esquema de
  atributos y resistencia como absorción.
- **Sucesoras:** `REQ-019` (traits de objetos) y `REQ-020` (cofres y saqueo).

# Fuera de alcance

- Los efectos especiales de los objetos y el sistema de traits (`REQ-019`).
- Cofres, cadáveres saqueables y transferencia (`REQ-020`).
- Consumibles, pociones, comida, pergaminos, magia, llaves, munición y monedas.
- Arcos, ballestas y bastones: dependen de puntería y magia.
- Crafting, durabilidad, peso, rareza, afijos, comercio y tienda.
- Rebalanceo completo de equipo y bestiario; este corte fija el modelo y un
  catálogo mínimo. Los números se ajustan con el método de `ADR-014`.
- Implementación de hotseat, red, QR, persistencia y guardado.
- Arte final.

# Preguntas abiertas

1. **Capacidad del inventario.** ¿12 huecos por personaje, ilimitado o bolsa
   compartida? La propuesta es 12 huecos personales y cofres como almacenamiento
   común; así el inventario no se convierte en una lista infinita y los cofres
   tienen función.
2. **Coste de equipar y desequipar.** ¿1 MP sin gastar la acción, gratis siempre
   o acción del turno? La propuesta es 1 MP y gratis cuando ningún enemigo está
   alertado.
3. **Aporte de casco, botas y guantes.** ¿Suman armadura, dan sobre todo traits o
   mezcla? La propuesta es armadura corporal como absorción principal y piezas
   secundarias con poca armadura o traits.
4. **Flujo de recogida y UI.** ¿`G` manda al inventario y una pantalla aparte
   equipa, o se auto-equipa como en `REQ-010`? ¿Qué teclas abren inventario y
   equipo? ¿Hay comparación de objeto antes de equipar?
5. **Equipo inicial por arquetipo.** ¿Cada personaje empieza solo con su arma
   temática, o también con ropa, casco, botas y guantes básicos? ¿El Guerrero
   conserva la armadura 1 y el escudo 1 de `REQ-010`?
6. **Arma a dos manos y escudo.** Al equipar un arma a dos manos con escudo
   puesto, ¿el escudo vuelve al inventario, se rechaza el cambio o se guarda en
   un hueco reservado? ¿Qué pasa si el inventario está lleno?
7. **Instancias y duplicados.** ¿Dos espadas iguales son dos instancias distintas?
   ¿Los objetos de equipo se apilan? La propuesta es no apilar equipo y no tener
   durabilidad ni afijos en este corte.
8. **Acceso en hotseat.** ¿Solo el jugador activo puede abrir su inventario? ¿La
   pantalla pausa la partida? ¿Qué ve el resto de jugadores?
9. **Calendario.** Se propuso implementar este hito después de cerrar hotseat,
   pero hotseat aún no tiene hoja de requisitos ni tareas. Confirmar si los
   objetos van antes o después cuando exista esa hoja.
10. **Catálogo inicial y arte.** ¿Qué subconjunto de `items.png` entra en el
    primer catálogo y qué sprite de `items.txt` corresponde a cada objeto?

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-10 | Tres hojas separadas: inventario/equipo, traits y cofres/saqueo. | human:simon | aceptada |
| 2026-11-10 | Alcance inicial: equipo y accesorios; consumibles, magia, llaves, munición y monedas fuera. | human:simon | aceptada |
| 2026-11-10 | Ocho huecos: arma, escudo, armadura, casco, botas, guantes, collar y un anillo; un arma a dos manos anula el escudo. | human:simon | aceptada |
| 2026-11-10 | Inventario y equipo por personaje; sin bolsa compartida por defecto. | human:simon | aceptada |
| 2026-11-10 | Definir en orden `REQ-018` → `REQ-019` → `REQ-020`; aplicar `REQ-018` → `REQ-020` → `REQ-019`. | human:simon | aceptada |
| 2026-11-10 | Implementación después de cerrar hotseat. | human:simon | provisional; hotseat aún no tiene hoja ni tareas |

# Aceptación de la hoja

- [ ] El usuario ha aprobado la capacidad del inventario.
- [ ] El usuario ha aprobado el coste de equipar y desequipar.
- [ ] El usuario ha aprobado el aporte de casco, botas y guantes.
- [ ] El usuario ha aprobado el flujo de recogida y la UI.
- [ ] El usuario ha aprobado el equipo inicial por arquetipo.
- [ ] El usuario ha resuelto el cambio de arma a dos manos con escudo.
- [ ] Los requisitos son verificables.
- [ ] Las dependencias están claras.
- [ ] Se puede generar un grafo de tareas.
