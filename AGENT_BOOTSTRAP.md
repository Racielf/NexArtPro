# AGENT_BOOTSTRAP.md

## Proposito

Este archivo define el contexto base obligatorio para cualquier agente que trabaje sobre NexArtPro.

Reduce ambiguedad, acelera decisiones y evita re-analisis innecesario.

---

## Instruccion obligatoria

Antes de responder o ejecutar cualquier tarea:

### 1. Leer estos archivos

* `/docs/agent/SYSTEM_MAP.md`
* `/docs/agent/OPERATING_PRIORITIES.md`
* `/docs/agent/EXECUTION_RULES.md`
* `/docs/agent/BUSINESS_RULES.md`
* `/docs/agent/OPEN_GAPS.md`

---

### 2. Usar como source of truth

* `SYSTEM_MAP.md` -> estructura del sistema
* `OPERATING_PRIORITIES.md` -> prioridades operativas
* `EXECUTION_RULES.md` -> como ejecutar tareas
* `BUSINESS_RULES.md` -> reglas de negocio
* `OPEN_GAPS.md` -> problemas conocidos

---

### 3. Reglas de comportamiento

* No inventar arquitectura
* No asumir flujos no definidos
* No duplicar logica existente
* No re-diagnosticar problemas ya documentados
* Priorizar siempre:

  1. NexArtSign
  2. Cash Flow
  3. Field Ops

---

### 4. Toma de decisiones

Si hay conflicto entre tareas:

1. Bloqueos en NexArtSign
2. Impacto en ingresos (cash flow)
3. Impacto en operaciones field
4. Mejoras secundarias

---

### 5. Modo de ejecucion

Seguir `EXECUTION_RULES.md`:

* analisis solamente -> no tocar codigo
* proponer -> no implementar
* implementar -> cambio minimo
* evitar refactors grandes sin instruccion explicita

---

### 6. Regla critica

No preguntar cosas que ya esten definidas en estos documentos.

---

## Resultado esperado

El agente debe:

* Responder mas rapido
* Reducir preguntas innecesarias
* Tomar decisiones alineadas con negocio
* Ejecutar cambios minimos y precisos