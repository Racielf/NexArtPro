# Smart Sales Suggestions — Guía de Decisiones Inteligentes

## Descripción

**Smart Suggestions** es un motor de recomendaciones basado en reglas que analiza tu propuesta actual contra patrones históricos y mejores prácticas. No es IA. Es un sistema determinista que extrae inteligencia de los datos que ya tienes en el sistema.

---

## 🎯 Cómo Funciona

### 1. Analiza tu contexto actual
- Estructura de propuesta (scope, inclusions, exclusions, timeline)
- Opciones de precios configuradas
- Modo de presentación elegido
- Estado y fecha de envío

### 2. Compara contra patrones históricos
- Propuestas ganadas vs perdidas
- Razones de pérdida más frecuentes
- Opciones de precios que más ganan
- Efectividad de seguimientos

### 3. Genera sugerencias accionables
- **Alta prioridad** (rojo): acciones inmediatas recomendadas
- **Prioridad media** (ámbar): mejoras recomendadas
- **Baja prioridad** (gris): optimizaciones opcionales

---

## 📊 Reglas de Sugerencias

### Regla 1: Estrategia de Precios

**Si no tienes opciones de precios pero tus datos históricos muestran que ayudan:**
- Mensaje: "Considera agregar 2-3 opciones de precios a esta propuesta"
- Contexto: Muestra el % de victorias que usaron opciones

**Si tienes opciones pero la presentación es "Detailed":**
- Mensaje: "Usa modo 'Pricing Options Only' para enfocar la decisión del cliente"
- Contexto: Las opciones funcionan mejor cuando son el foco principal

**Si detectas múltiples pérdidas por "precio muy alto":**
- Mensaje: "Sensibilidad de precio detectada: considera precios lump-sum"
- Contexto: Simplificar precios reduce la percepción de costo

### Regla 2: Seguimiento (Follow-up)

**Si una propuesta fue enviada hace 2+ días y no ha sido abierta:**
- Mensaje: "Haz seguimiento ahora: el cliente aún no la abre"
- Prioridad: ALTA
- Contexto: Mejor ventana de conversión: 48-72 horas

**Si tus victorias promedian 2+ seguimientos:**
- Mensaje: "Planifica múltiples seguimientos: tus victorias promedian 2+ contactos"
- Contexto: Porcentaje de victorias con ≥1 seguimiento

### Regla 3: Claridad de Alcance

**Si el Scope of Work es muy breve (<50 caracteres):**
- Mensaje: "Alcance muy breve: agrega detalles para reducir confusión"
- Prioridad: ALTA
- Contexto: El alcance claro reduce objeciones de confusión

**Si faltan claramente inclusions/exclusions:**
- Mensaje: "Define qué está incluido y excluido para evitar desalineación"
- Contexto: Los límites claros mejoran confianza y reducen disputas

**Si tienes pérdidas recientes por "scope mismatch":**
- Mensaje: "Pérdida reciente por desalineación: refuerza inclusions/exclusions"
- Contexto: Muestra número de pérdidas por este motivo

### Regla 4: Timeline & Urgencia

**Si no hay timeline documentado:**
- Mensaje: "Agrega timeline del proyecto para reducir incertidumbre"
- Contexto: La claridad de cronograma construye confianza

### Regla 5: Estrategia Competitiva

**Si ≥40% de tus pérdidas son a competidores:**
- Mensaje: "Presión competitiva detectada: enfatiza tu propuesta de valor única"
- Prioridad: ALTA
- Contexto: Porcentaje de pérdidas a competencia

**Si múltiples pérdidas por presupuesto/precio:**
- Mensaje: "Objeciones de presupuesto comunes: considera términos de pago flexibles o entrega por fases"
- Contexto: Número de pérdidas por asequibilidad

### Regla 6: Fecha de Expiración

**Si no hay fecha de expiración:**
- Mensaje: "Agrega fecha de expiración para crear sentido de urgencia"
- Contexto: Las ofertas limitadas en tiempo mejoran tasas de conversión

**Si la expiración está muy lejana (>30 días):**
- Mensaje: "Considera ventana de expiración más corta para acelerar decisiones"
- Contexto: Mejor práctica: 7-14 días

---

## 📍 Dónde Aparecen las Sugerencias

### ProposalEditor

El panel **Smart Suggestions** aparece en la parte superior del canvas cuando:
- ✅ Has agregado un cliente
- ✅ La propuesta está en modo edición (no preview)
- ✅ Tienes ≥1 sugerencia activa

Panel compacto y colapsable. Las sugerencias de alta prioridad siempre visibles.

---

## 🎯 Cómo Usar las Sugerencias

### 1. Lee la mensajería
Cada sugerencia es accionable y específica.

### 2. Revisa el contexto
El contexto te muestra por qué se dispara la sugerencia (datos históricos).

### 3. Actúa (o ignora consciente)
- Puedes actuar inmediatamente (ej: agregar opciones de precios)
- O ignorar si tu caso es único
- Las sugerencias son guía, no mandato

### 4. Mejora iterativa
Conforme cierres más propuestas, el sistema aprende tus patrones y afina sugerencias.

---

## 🧮 Datos Utilizados

Las sugerencias se basan en:

- `close_outcome` — won / lost / no_response / withdrawn
- `lost_reason` — price_too_high, chose_competitor, scope_mismatch, etc.
- `selected_pricing_option_id` — qué opción ganó
- `follow_up_count` — cuántos seguimientos tuvo
- `sent_at` / `closed_at` — tiempo a cierre
- Estructura actual: scope, inclusions, exclusions, timeline, pricing options

---

## 💡 Ejemplos Reales

### Escenario 1: Primera propuesta

Usuario: Crea propuesta sin datos históricos.
→ Sugerencias genéricas (agregar scope, timeline, inclusions/exclusions)

### Escenario 2: 3 victorias con opciones, 5 pérdidas sin

Usuario: Crea nueva propuesta sin opciones.
→ Sugerencia ALTA: "60% de victorias usan opciones de precios — considera agregar"

### Escenario 3: Patrón de pérdidas por "precio muy alto"

Usuario: 3 de últimas 5 pérdidas por precio.
→ Sugerencia MEDIA: "Sensibilidad de precio detectada — simplifica a lump-sum"

### Escenario 4: Propuesta enviada sin revisión

Usuario: Envía propuesta.
→ Después 2 días sin abrir:
→ Sugerencia ALTA: "Haz seguimiento ahora: no abierta en 48+ horas"

---

## 🔧 Configuración

Las sugerencias se generan automáticamente. No hay configuración.

Para ver la fuente de datos:
- `/lib/smartSuggestions.js` — motor de reglas
- `/components/proposals/SmartSuggestionsPanel.jsx` — UI
- `ProposalEditor` — integración

---

## 📈 Beneficios

✅ **Orientación accionable** — no genérica  
✅ **Basada en tus datos** — no externa  
✅ **Mejora iterativa** — aprende de tus patrones  
✅ **Sin fricción** — no interfiere con el workflow  
✅ **Determinista** — no es una caja negra

---

**Resultado:** Los usuarios hacen propuestas mejores, más rápido, con confianza en sus decisiones. 🚀