# OPERATING_PRIORITIES

## Prioridad obligatoria

Cuando existan varias lineas de trabajo abiertas, priorizar en este orden:

1. NexArtSign
2. Cash Flow
3. Field Ops
4. Mejoras secundarias

## Justificacion operativa

### 1. NexArtSign

Es el frente mas sensible porque toca:

- aprobacion comercial
- evidencia legal
- PDF final firmado
- certificado
- transicion estimate -> work order

Si NexArtSign sigue incompleto, no desviar el foco principal.

### 2. Cash Flow

Segundo frente critico porque afecta:

- payments
- balances
- invoices
- cobro real
- consistencia financiera

### 3. Field Ops

Tercero, porque sostiene ejecucion operativa:

- work orders
- asignacion
- seguimiento de campo
- cierre de trabajo

## Reglas de desempate

Si dos tareas compiten, decidir asi:

1. blockers en firma, completion, certificado o copia firmada
2. impacto en dinero recibido o pendiente
3. impacto en ejecucion de work orders de campo
4. mejoras UX o conveniencias administrativas

## Prioridades verificadas hoy

- NexArtSign tiene roadmap activo en `docs/nexartsign-security-roadmap.md`
- invoice nace desde work order, por lo tanto cash flow depende de esa continuidad
- existe separacion de acceso field en `src/App.jsx`

## Regla para nuevas tareas

Antes de ejecutar una tarea, dejar claro si:

- ayuda a cerrar NexArtSign
- protege cash flow
- mejora field ops
- o debe esperar por estar fuera de prioridad