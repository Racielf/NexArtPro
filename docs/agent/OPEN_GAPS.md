# OPEN_GAPS

## Proposito

Centralizar gaps conocidos para evitar re-diagnostico innecesario.

## Formato

- modulo
- gap real
- impacto
- prioridad
- estado
- evidencia

---

## 1. NexArtSign

### Gap

Migracion completa a lookup por `token_hash` y retiro total del uso residual de token plano.

### Impacto

Integridad legal, seguridad y endurecimiento del acceso publico.

### Prioridad

Critica

### Estado

Parcial. El roadmap indica que sigue pendiente como hardening separado.

### Evidencia

- `docs/nexartsign-security-roadmap.md`

---

## 2. NexArtSign

### Gap

Minimizacion de la verificacion publica en `/verify-document`.

### Impacto

Exposicion innecesaria de datos de firma si la vista publica muestra mas de lo necesario.

### Prioridad

Alta

### Estado

Pendiente segun roadmap.

### Evidencia

- `docs/nexartsign-security-roadmap.md`

---

## 3. NexArtSign

### Gap

Migracion de paquetes, participantes, eventos y certificados a tablas Supabase con RLS.

### Impacto

Seguridad, aislamiento y consistencia del modelo de firma.

### Prioridad

Alta

### Estado

Pendiente segun roadmap.

### Evidencia

- `docs/nexartsign-security-roadmap.md`

---

## 4. System map

### Gap

Mapa tecnico aun incompleto para entidades y relaciones fuera de las areas ya verificadas.

### Impacto

Mas tiempo de verificacion en cada tarea y mas riesgo de preguntar cosas ya conocidas pero no documentadas.

### Prioridad

Media

### Estado

Abierto

### Evidencia

- `src/App.jsx`
- `src/lib/nexArtSign.js`
- `src/lib/workOrderInvoiceConversion.js`
- `src/brain/modules/securityBrain.js`

---

## 5. Cash flow

### Gap

No esta documentado aqui todavia el mapa completo entre invoice, payments, pagos reales y conciliacion bancaria.

### Impacto

Riesgo de ambiguedad en tareas financieras.

### Prioridad

Alta despues de NexArtSign

### Estado

Pendiente de documentar mejor

### Evidencia

- `src/lib/workOrderInvoiceConversion.js`

---

## Regla de mantenimiento

Cuando un gap se cierre:

1. actualizar este archivo
2. enlazar el archivo real que lo confirma
3. moverlo de pendiente a resuelto o parcial