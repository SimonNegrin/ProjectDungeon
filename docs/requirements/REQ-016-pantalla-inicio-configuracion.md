---
type: Requirement Sheet
id: REQ-016
title: Pantalla de inicio y configuración de jugadores
description: "Pantalla previa a la mazmorra donde se elige el número de jugadores (1-6) y, para cada uno, el arquetipo, la variante de sprite y el nombre. Borrador: quedan preguntas abiertas."
status: draft
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-09T15:00:00Z
updated_at: 2026-11-09T15:00:00Z
related_tasks: []
generated: { by: deepseek/v4-pro, at: 2026-11-09T15:00:00Z }
verified:
---

# Contexto

El juego arranca directo con un único jugador y sin pantalla previa. Para jugar
en grupo (hasta 6 cooperativos, hotseat en fase 2) hace falta una pantalla de
inicio donde se configure la partida: cuántos jugadores y, para cada uno, qué
personaje usa (arquetipo de REQ-015 + variante de sprite) y su nombre.

Esta hoja define esa pantalla. Es **borrador**: recoge lo decidido y deja
abiertas las preguntas que faltan para cerrarla.

# Objetivos de experiencia

- Fricción cero: pasar de arrancar a jugar en pocos pasos.
- Que cada jugador entienda qué elige y qué define a su personaje (stats y
  variante visibles).
- Configurar la partida (1-6 jugadores) sin implementar aún el hotseat.

# Requisitos creativos (borrador)

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | La pantalla de inicio aparece al arrancar, antes de entrar a la mazmorra. | Arrancar muestra la pantalla de configuración, no la mazmorra. |
| R-002 | Se elige el número de jugadores: de 1 a 6. | El selector admite 1-6 y lo guarda. |
| R-003 | Cada jugador elige uno de los nueve arquetipos de REQ-015. | El roster completo está disponible para elegir. |
| R-004 | Cada jugador elige una de las dos variantes de sprite de su arquetipo (sin etiqueta de género). | Cada arquetipo ofrece dos variantes; la elegida se guarda. |
| R-005 | Cada jugador escribe un nombre para su personaje; por defecto, el del arquetipo. | El nombre se guarda; por defecto es el del arquetipo. |
| R-006 | Al confirmar, la partida arranca con los N jugadores y sus personajes configurados. | El estado parte con N jugadores, cada uno con arquetipo, variante y nombre. |

# Requisitos técnicos (borrador)

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | El estado guarda una lista de N jugadores; cada uno con arquetipo, variante y nombre. | El snapshot expone la lista y sus datos; es serializable. |
| T-002 | La pantalla es presentación del host; no cambia el motor ni las fórmulas de combate. | El motor sigue puro; la pantalla solo construye el estado inicial. |
| T-003 | Los sprites salen de `rogues.png` (ADR-006); se asigna un sprite por variante de arquetipo. | Cada variante apunta a un sprite concreto del pack. |
| T-004 | Sin dependencias nuevas, sin red ni persistencia. | `package.json` y `pnpm-lock.yaml` no cambian. |

# Fuera de alcance

- Hotseat real (turnos de varios jugadores en el mismo teclado): fase 2.
- Red, QR, controladores móviles y salas.
- Persistencia de configuraciones entre sesiones.
- Progresión, desbloqueos de arquetipos u objetos.

# Preguntas abiertas

1. **Qué significa elegir 2-6 jugadores ahora**: la build actual es de un jugador
   y el hotseat es fase 2. ¿La pantalla guarda N jugadores en el estado aunque
   hoy solo juegue 1 con teclado, o limitamos el selector a 1 hasta que llegue
   el hotseat?
2. **Entrada para varios jugadores**: en hotseat, ¿cómo se reparte el teclado
   (turnos con el mismo teclado, confirmado en glosario)?
3. **Límites del nombre**: longitud máxima, ¿vacío permitido?, ¿nombres
   duplicados?
4. **Mapeo de sprites**: qué sprite de `rogues.png` corresponde a cada
   arquetipo/variante.
5. **Cuándo aparece la pantalla**: ¿solo al arrancar, o también al reiniciar
   (`R`)?
6. **Flujo de selección**: ¿se configura jugador a jugador, o por columnas
   (primero nº jugadores, luego todos los personajes)?

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| 2026-11-09 | Pantalla de inicio con nº de jugadores (1-6) y, por jugador, arquetipo + variante + nombre. | human:simon | aceptada |
| 2026-11-09 | Nombre por defecto = nombre del arquetipo; dos variantes de sprite por arquetipo. | human:simon | aceptada |

# Aceptación de la hoja

- [ ] El usuario ha aprobado el flujo de configuración.
- [ ] El usuario ha resuelto las preguntas abiertas (hotseat, nombre, sprites).
- [ ] Los requisitos son verificables.
- [ ] Se puede generar un grafo de tareas.
