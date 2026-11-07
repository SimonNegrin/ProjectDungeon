---
name: Requirements Interview
description: Conducir una conversación de requisitos, separar creativo y técnico, detectar contradicciones y producir una hoja aprobada.
---

# Cuándo usarla

Cuando el usuario quiere definir o cambiar una feature, un sistema o una
experiencia.

# Principios

- El usuario es la autoridad creativa.
- El agente puede proponer, comparar y advertir; no decidir por el usuario.
- Las decisiones técnicas rutinarias puede tomarlas el agente y registrarlas.
- Una decisión creativa abierta bloquea la tarea.
- Si una duda no se resuelve hablando, propón un experimento.

# Conversación

No lances un formulario. Avanza por bloques:

1. **Contexto**: qué experiencia o problema hay detrás.
2. **Objetivos**: qué debe sentir, entender o decidir el jugador.
3. **Creativo**: tono, cámara, ritmo, clases, combate, arte, audio.
4. **Técnico**: restricciones, plataformas, rendimiento, red.
5. **Alcance**: qué entra ahora y qué se aplaza.
6. **Aceptación**: cómo sabremos que funciona.
7. **Riesgos**: contradicciones, dependencias y costes.

Haz preguntas enfocadas. Refleja lo entendido. Propón opciones con tradeoffs.
Señala contradicciones en el momento.

# Creativo vs técnico

| Tipo | Quién decide | Registro |
|---|---|---|
| Cómo se ve, suena, juega o siente | Usuario | Requisito + verificación humana |
| Stack, estructura, tests, rendimiento | Agente | ADR o nota técnica |
| Técnico con impacto fuerte en la experiencia | Usuario, tras propuesta | ADR + decisión |
| Técnico irreversible o caro | Usuario | ADR |

# Antes de escribir

Resume:

- lo que has entendido;
- las decisiones creativas;
- las decisiones técnicas;
- lo que queda fuera;
- las preguntas abiertas.

Pide aprobación explícita. Si el usuario corrige, vuelve a resumir.

# Salida

- Hoja `docs/requirements/REQ-NNN-*.md` usando la plantilla.
- Una hoja por área o milestone, no una hoja gigante.
- Experimentos propuestos si hay incertidumbre.
- Tareas solo después de la aprobación.
- Actualización de `docs/requirements/index.md` y `docs/log.md`.

# Checklist

- [ ] El usuario ha aprobado lo creativo.
- [ ] Los requisitos son verificables.
- [ ] Está claro el fuera de alcance.
- [ ] No hay contradicciones abiertas.
- [ ] Las decisiones técnicas están registradas.
- [ ] Si hace falta, hay un experimento definido.
- [ ] La hoja tiene versión y fecha.
