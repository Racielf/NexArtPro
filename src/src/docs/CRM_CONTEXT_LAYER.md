# CRM Context Layer — Customer Commercial Intelligence

## Overview

Se ha agregado una capa CRM ligera pero operacional que proporciona contexto comercial real durante la creación y seguimiento de propuestas. El sistema ahora surfacea inteligencia de clientes basada en datos históricos sin construir un módulo CRM pesado.

## Architecture

### Components Agregados

#### 1. **ClientCRMSummary** (`components/shared/ClientCRMSummary.jsx`)
- **Propósito**: Resumen compacto del historial comercial del cliente
- **Datos que recupera**:
  - Total de propuestas (todas, ganadas, perdidas)
  - Resumen de facturas (cobradas vs. pendientes)
  - Tasa de ganancia (%)
  
- **Señales Comerciales Derivadas**:
  - `repeat` — Cliente que ha recibido >1 propuesta
  - `high_win` — Tasa de ganancia >50% (si hay ≥2 propuestas)
  - `multiple_lost` — ≥2 propuestas perdidas
  - `active_project` — Facturas pendientes (proyecto activo)
  - `price_sensitive` — ≥2 propuestas perdidas por precio

#### 2. **ClientRecentActivity** (`components/shared/ClientRecentActivity.jsx`)
- **Propósito**: Lista compacta de actividad reciente (últimas 3-5 propuestas e facturas)
- **Muestra**:
  - Tipo de documento (Propuesta / Factura)
  - Número de documento
  - Estado (aprobado, pagado, rechazado, etc.)
  - Monto
  - Fecha (relativa)

### Integration Point

**ProposalSidebarCustomer** (`components/proposals/ProposalSidebarCustomer.jsx`)

El componente lateral de cliente, usado durante la creación y edición de propuestas, ahora incluye:

```
[HEADER: Customer]
[Hero Image + Contact]
[Contact Details]
[NUEVO] Commercial Context
  - Proposal Stats (total, won, lost, win rate)
  - Financial Summary (collected, pending)
  - Commercial Signals (repeat, price-sensitive, etc.)
  - Recent Activity (últimas 3 propuestas/facturas)
[Location Map]
[NUEVO] Recent Activity Timeline
```

## How It Works

### Data Flow

1. **Al seleccionar un cliente** en ProposalSidebarCustomer:
   - `ClientCRMSummary` ejecuta dos queries en paralelo:
     - `Proposal.filter({client_id})` — obtiene historial de propuestas
     - `Invoice.filter({client_id})` — obtiene historial de facturas

2. **Cálculo de estadísticas**:
   - Recuento total de propuestas
   - Contar propuestas con `close_outcome === 'won'`
   - Contar propuestas con `close_outcome === 'lost'`
   - Sumar facturas pagadas
   - Sumar facturas pendientes

3. **Derivación de señales comerciales**:
   - Lógica simple basada en recuentos e historial
   - Sin cálculos pesados, sin ML ni heurística compleja
   - Solo hechos del registro

4. **Actividad reciente**:
   - Merge de propuestas e facturas
   - Ordenar por fecha descendente
   - Mostrar últimas N items con contexto

## Commercial Signals Reference

| Signal | Condición | Tipo | Propósito |
|--------|-----------|------|-----------|
| Repeat customer | `total_proposals > 1` | 🟢 Positivo | Validar relación establecida |
| High win rate | `won/total > 50%` (si ≥2) | 🟢 Positivo | Destacar cliente bien calificado |
| Multiple lost | `lost_proposals >= 2` | 🟡 Advertencia | Alertar sobre patrón de rechazo |
| Active project | `pending_invoices > 0` | ⚪ Neutral | Indicar trabajo en curso |
| Price-sensitive | `lost_to_price >= 2` | 🟡 Advertencia | Señal de objeción a precio |

## Usage

### For Proposal Creation/Editing

Mientras se crea o edita una propuesta, el usuario ve automáticamente:

1. **¿Quién es este cliente?**
   - Total de propuestas previas
   - Relación establecida (repeat, win rate)

2. **¿Cuál es el contexto comercial?**
   - ¿Ha ganado aquí antes?
   - ¿Cuál es su patrón de objeción?
   - ¿Hay proyectos activos?

3. **¿Qué actividad reciente es relevante?**
   - Últimas propuestas (estados)
   - Últimas facturas (pagadas vs. pendientes)

### For Sales Decisions

Antes de enviar una propuesta:
- **Validación de precio**: Si el cliente es "price_sensitive", considerar margen vs. riesgo
- **Frecuencia**: Si "repeat customer" con alto win rate, considerar acelerar seguimiento
- **Timing**: Si hay facturas pendientes, coordinar propuesta con fin del proyecto actual

## Data Sources

- **Proposal entity**: Historial completo (todos los estados, lost_reason, close_outcome)
- **Invoice entity**: Historial de facturas (status, total)
- **Client entity**: Información básica (nombre, contacto)

*No se requieren cambios de esquema; se usa solo datos existentes.*

## Performance

- **Queries**: 2 parallel reads (Proposal + Invoice lists)
- **Limit**: Capped a 100 registros por query para evitar sobrecarga
- **Caching**: React Query gestiona caching automáticamente
- **Rendering**: Componentes optimizados, sin loops pesados

## Limitations & Scope

✅ **Incluido:**
- Conteos de propuestas por resultado
- Resumen de ingresos (cobrado vs. pendiente)
- Señales derivadas basadas en recuentos
- Timeline de 5 últimas actividades
- Integración en flujo de propuestas

❌ **NO incluido:**
- Full CRM dashboard
- Gestión de cuentas
- Reportes históricos complejos
- Predicción de probabilidad
- Workflows de seguimiento personalizados
- Campos CRM adicionales en Cliente

## Future Expansion

Posibles mejoras sin pesantez:

1. **Follow-up hints** — Si `last_follow_up > X días` y `status != closed`, sugerir acción
2. **Pricing intelligence** — Si `price_sensitive` y propuesta actual > promedio histórico, advertencia visual
3. **Win/loss analysis** — Filtrar por `lost_reason` para identificar patrones específicos
4. **Territory signals** — Si multiple clientes en zona con alta win rate, destacar oportunidad regional

## Summary

Se añadió una **capa CRM operativa y ligera** que:

- ✅ Proporciona contexto comercial real sin construir un módulo CRM pesado
- ✅ Deriv señales de objeción/riesgo únicamente de datos existentes
- ✅ Se integra naturalmente en el flujo de propuestas (ProposalSidebarCustomer)
- ✅ Permite decisiones comerciales más informadas sin fricción
- ✅ Mantiene el sistema operativo, no especulativo

El usuario ahora **ve quiénes son los clientes, qué ha sucedido y qué señales importan** antes de tomar decisiones sobre propuestas.