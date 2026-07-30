# SignLaw — Marco legal de firmas electronicas y estandar de auditoria defendible en corte

> Investigacion + politica, 2026-07-30. Escrito para ser portable — las secciones 1-4 (base legal,
> exclusiones, estandar de industria, checklist de requisitos) no dependen de NexArtPro y se pueden
> reusar en cualquier otra app que implemente firma electronica. La seccion 5 (gap analysis) es
> especifica de NexArtSign (el modulo de firma de NexArtPro) — no aplica fuera de este repo.

---

## 1. Base legal (fuentes oficiales)

### Federal — ESIGN Act (Electronic Signatures in Global and National Commerce Act)

Ley federal de EEUU, codificada en **15 U.S.C. §7001 et seq.** Texto oficial:
[15 U.S.C. §7001 — govinfo.gov](https://www.govinfo.gov/link/uscode/15/7001) ·
[Cornell LII](https://www.law.cornell.edu/uscode/text/15/7001)

**Regla general de validez (§7001(a)):** una firma, contrato u otro registro relacionado con una
transaccion no puede negarse su efecto legal, validez o exigibilidad **solo porque esta en forma
electronica**.

**Definicion de "electronic signature" (§7006):** "un sonido, simbolo o proceso electronico,
adjunto o asociado logicamente a un contrato u otro registro, y ejecutado o adoptado por una
persona con la intencion de firmar el registro." — no exige ninguna tecnologia especifica
(no requiere PKI, no requiere certificado digital, no requiere biometria).

**Consentimiento del consumidor (§7001(c)):** cuando se reemplaza una divulgacion que la ley exige
que sea *por escrito*, el consumidor debe dar consentimiento afirmativo, despues de haber recibido
divulgacion clara de: (1) su derecho a pedir la version en papel, (2) su derecho a retirar el
consentimiento sin penalidad, (3) el alcance del consentimiento (una transaccion vs. categoria
continua), (4) el procedimiento para retirar el consentimiento y actualizar datos de contacto, (5)
como pedir copia en papel y si tiene costo, y (6) los requisitos de hardware/software necesarios
para acceder al registro electronico. Esto aplica quando se reemplaza una **divulgacion legalmente
obligatoria**, no necesariamente a cualquier firma de contrato comun — pero es la practica estandar
de la industria (DocuSign, Adobe Sign) mostrar esta divulgacion siempre, como capa extra de
proteccion.

**Exclusiones — §7003 (donde ESIGN NO aplica, sin importar el disenio del sistema):**
[Cornell LII §7003](https://www.law.cornell.edu/uscode/text/15/7003)
- Testamentos, codicilos, fideicomisos testamentarios.
- Derecho de familia (adopcion, divorcio y afines), segun la ley estatal.
- La mayoria del Uniform Commercial Code, excepto UCC §1-107, §1-206 y Articulos 2 y 2A.
- Ordenes judiciales, notificaciones, escritos y documentos oficiales de una corte.
- Avisos de cancelacion de servicios publicos (agua, calefaccion, electricidad).
- Avisos de default, aceleracion, embargo, ejecucion hipotecaria (foreclosure), desalojo
  (eviction), o derecho a subsanar sobre un prestamo o alquiler de **residencia principal**.
- Avisos de cancelacion o terminacion de beneficios de salud o de vida.
- Retiros de productos (recalls) o fallas de materiales que arriesguen salud/seguridad.
- Documentacion que acompaña transporte o manejo de materiales peligrosos, pesticidas o sustancias
  toxicas.

**Conclusion practica:** firmar electronicamente un estimate/contrato de construccion, una
propuesta comercial, o un documento similar **no esta en esta lista de exclusiones** — cae dentro
de lo que ESIGN cubre normalmente. Si en el futuro se firma algo relacionado con ejecucion
hipotecaria o desalojo sobre la residencia principal de un cliente, esa pieza especifica *no* se
puede resolver solo con firma electronica bajo ESIGN.

### Estatal — Oregon adopto la UETA (Uniform Electronic Transactions Act), ORS Capitulo 84

Texto oficial: [Oregon Legislature — ORS Chapter 84](https://www.oregonlegislature.gov/bills_laws/ors/ors084.html) ·
espejo legible: [oregon.public.law/statutes/ors_chapter_84](https://oregon.public.law/statutes/ors_chapter_84)

Secciones clave (cita oficial: 2001 c.535, la ley que adopto UETA en Oregon):

- **ORS 84.013 — Uso voluntario y por acuerdo mutuo.** La ley no obliga a nadie a usar medios
  electronicos. Solo aplica entre partes que **ambas** hayan acordado transaccionar
  electronicamente — el acuerdo se puede inferir del contexto y la conducta (ej. el cliente abre
  el link y firma), no hace falta un contrato aparte que lo diga explicitamente. Una parte puede
  negarse a usar medios electronicos para transacciones futuras aunque haya aceptado una vez, y
  esa proteccion **no se puede renunciar por contrato**.
- **ORS 84.019 — Reconocimiento legal.** Un registro o firma no pierde efecto legal solo por ser
  electronico. Un contrato no pierde efecto legal solo porque se uso un agente electronico o una
  firma electronica en su formacion.
- **ORS 84.025 — Atribucion.** *"Un registro o firma electronica es atribuible a una persona si
  fue el acto de esa persona. El acto de la persona se puede demostrar de cualquier manera,
  incluyendo mostrando la eficacia de cualquier procedimiento de seguridad aplicado para
  determinar a quien es atribuible el registro o firma."* — esta es la seccion mas importante para
  el diseño tecnico: la ley no exige una tecnologia especifica, exige poder **demostrar** (con lo
  que sea: OTP, IP, dispositivo, email verificado, secuencia de eventos) que fue esa persona.
- **ORS 84.034 — Retencion de registros electronicos.** Cuando la ley exige conservar un registro,
  basta con un registro electronico que (a) refleje fielmente la informacion desde que se genero
  en su forma final, y (b) siga siendo accesible para referencia posterior. Satisface tambien
  requisitos de "original" y de evidencia/auditoria, salvo que una ley posterior a 2001-06-22 lo
  prohiba especificamente para ese proposito.
- **ORS 84.037 — Admisibilidad en evidencia.** *"En un procedimiento, no se puede excluir evidencia
  de un registro o firma solo porque esta en forma electronica."* — la cita directa para responder
  "¿esto se sostiene en una demanda?": la ley de Oregon dice explicitamente que no se puede
  descartar solo por ser electronico. Lo que si determina el *peso* que le da un juez es la calidad
  del audit trail (ver seccion 3).

**Conclusion practica combinada (ESIGN + UETA):** en Oregon, una firma electronica capturada con un
procedimiento de seguridad razonable (identidad + intento de firmar + registro no alterado) es
legalmente valida y no puede ser rechazada como evidencia solo por ser electronica. Lo que gana o
pierde una demanda no es "¿fue electronica?" sino "¿se puede demostrar con evidencia solida que fue
esa persona, que acepto ese documento exacto, y que el documento no se altero despues?"

---

## 2. Que hace que un audit trail sea *persuasivo* en una demanda (no solo "legal")

La ley (seccion 1) establece que la firma electronica es valida. Lo que realmente se litiga en la
practica es la **credibilidad de la evidencia** — y ahi es donde entran los estandares de la
industria. Investigacion sobre practica real de las 2 plataformas dominantes:

### DocuSign — Certificate of Completion / Audit Trail
Fuente: [DocuSign — Are electronic signatures admissible in court?](https://www.docusign.com/blog/are-electronic-signatures-admissible-in-court)

Cada "envelope" (paquete de firma) genera un Certificate of Completion que incluye: nombres de
todas las partes firmantes, IP publica de cada una, ubicacion geografica (si el firmante acepta
compartirla), la secuencia completa de custodia (enviado -> visto -> firmado/rechazado), timestamp
de cada evento, y un **sello a prueba de manipulacion (tamper-evident seal)** que valida que el
documento no fue alterado fuera de cada evento de firma. El certificado es accesible por cualquier
parte de la transaccion y esta pensado especificamente para ser un registro admisible en corte.

### Adobe Acrobat Sign — Audit Report
Fuentes: [Adobe — What is an e-signature audit trail?](https://www.adobe.com/acrobat/business/hub/esignature-audit-trail.html) ·
[Adobe Acrobat Sign compliance whitepaper (21 CFR Part 11)](https://www.adobe.com/cc-shared/assets/pdf/trust-center/ungated/whitepapers/doc-cloud/acrobat-sign-compliance-21cfrpt11-wp.pdf)

Cada acuerdo tiene un **transaction ID unico**, verificable incluso por alguien que no tiene cuenta
Adobe (pagina publica de verificacion). El audit report captura identidad (nombre + email) de quien
firma, quien rechaza, quien cancela, la razon dada, y la IP desde la que se tomo cada accion. Adobe
recomienda ademas poder correlacionar el audit trail con logs de aplicacion propios para efectos de
cumplimiento/legal.

### Checklist sintetizado — que debe existir para que un audit trail aguante un interrogatorio

1. **Identidad del firmante** — nombre + email verificado (no solo un nombre tipeado a mano).
2. **Intento de firmar explicito** — un paso separado donde la persona confirma activamente que
   quiere firmar (checkbox/boton), no inferido de otra accion.
3. **Consentimiento a transaccionar electronicamente** — idealmente una divulgacion separada del
   "acepto firmar este documento" especifico (ver ESIGN §7001(c) arriba).
4. **Metodo de verificacion de identidad** — OTP por email/SMS, o autenticacion previa, algo mas
   fuerte que solo "quien tenga el link".
5. **IP address + user agent** de cada evento relevante (visto, firmado, rechazado).
6. **Fingerprint de dispositivo** (opcional pero recomendado, refuerza atribucion).
7. **Timestamp de cada evento** en la secuencia completa (enviado, visto, firmado/rechazado).
8. **Orden de firma** si hay multiples firmantes (quien firmo primero, quien despues).
9. **Documento final congelado e inalterable** — un hash criptografico (o mejor, una firma
   digital embebida en el PDF mismo, no solo un hash en base de datos) del documento **final**
   exacto que se firmo, no del borrador.
10. **Certificado verificable independientemente** — un numero/ID que un tercero (juez, perito,
    abogado contrario) pueda usar para verificar la integridad sin depender de que la empresa
    "diga que si".
11. **Registro de rechazos y cancelaciones**, no solo de firmas exitosas.
12. **Retencion accesible a largo plazo** del documento final y su evidencia (ORS 84.034).

---

## 3. Gap analysis — NexArtSign (modulo de firma de NexArtPro), 2026-07-30

Especifico de este repo. Verificado contra el codigo real, no contra el roadmap (que en sesiones
anteriores tuvo desactualizaciones — ver `docs/nexartsign-security-roadmap.md` y
`docs/agent/OPEN_GAPS.md`).

| Requisito del checklist (seccion 2) | Estado en NexArtSign hoy |
|---|---|
| 1. Identidad del firmante | Cumple — `signer_name`/`signer_email` capturados, mas verificacion OTP contra el email del participante (`requestSigningOtp`/`verifySigningOtp`). |
| 2. Intento de firmar explicito | Cumple — paso `consent` dedicado en `src/pages/SignDocumentView.jsx` (linea ~839-848): checkbox con texto "I confirm that I am the intended signer, I have reviewed this document, and I agree to sign it electronically." |
| 3. Consentimiento a transaccionar electronicamente (separado del "acepto firmar esto") | **Gap real.** Solo existe el consentimiento especifico al documento (punto 2). No hay una divulgacion separada tipo "ESIGN Disclosure and Consent" (derecho a copia en papel, derecho a retirar consentimiento, requisitos de hardware/software) antes de empezar el flujo. No es ilegal sin esto (UETA 84.013(2) permite inferir consentimiento de la conducta), pero es mas debil que el estandar DocuSign/Adobe. |
| 4. Metodo de verificacion de identidad | Cumple — OTP obligatorio antes de aprobar (Fase 3 del roadmap), con expiracion, contador de intentos, y bloqueo temporal tras fallos repetidos. |
| 5. IP + user agent | Cumple — capturado en `signing_participants` (`ip_address`, `user_agent`) y en cada evento de `security_audit_logs` via `writeSecurityAuditLog`. |
| 6. Fingerprint de dispositivo | Cumple — `device_fingerprint` (jsonb) en `signing_participants`, generado por `src/lib/deviceFingerprint.js`. |
| 7. Timestamp de cada evento | Cumple — `sent_at`, `viewed_at`, `signed_at`, `declined_at`, mas eventos en `signing_events` y `security_audit_logs`. |
| 8. Orden de firma (multi-firmante) | Cumple — `signing_order`, solo el participante activo puede avanzar (Fase 2 del roadmap). |
| 9. Documento final congelado + hash | Parcial. Se congela el PDF final y se calcula `sha256` (`completeSigningPackage`, `sha256HexFromBytes`) — el hash se guarda en `final_pdf_hash`. **No hay una firma digital/certificado embebido dentro del PDF mismo** (lo que DocuSign/Adobe si hacen, via PAdES/PKI) — la integridad depende de confiar en el hash guardado en la base de datos de NexArtPro, no en algo verificable de forma independiente por un tercero sin acceso a esa base de datos. |
| 10. Certificado verificable independientemente | Parcial, resuelto en su mayor parte hoy mismo (2026-07-30, Fase 6): existe `/verify-document`, que permite a cualquiera con el numero de certificado (`resolveSigningCertificate`) subir una copia del PDF y comparar el hash SHA-256. Es publico y no requiere login — cumple el espiritu de "verificable por un tercero". La limitacion sigue siendo el punto 9: la verificacion depende de que la base de datos de NexArtPro no haya sido alterada, no de una firma criptografica independiente. |
| 11. Registro de rechazos/cancelaciones | Cumple — `declined_at`, `declined_reason`/`voided_reason`, eventos `nexartsign.declined` en el audit log. |
| 12. Retencion accesible | Cumple a nivel de diseño (`final_pdf_url` persiste, no hay borrado real de `signing_certificates`/`signing_packages` desde el frontend) — no se verifico hoy una politica formal de cuanto tiempo se retiene ni un proceso de backup/archivo a largo plazo fuera de Supabase. |

### Resumen del gap analysis

NexArtSign cumple **10 de 12** puntos del checklist de forma solida, y 2 de forma parcial. Los 2
puntos parciales (9 y 10) comparten la misma raiz: **la integridad del documento final depende de
un hash guardado en la base de datos propia, no de una firma digital criptografica embebida en el
PDF que un tercero pueda verificar sin confiar en NexArtPro.** Esto no hace que la firma sea
invalida (ORS 84.037 sigue aplicando — no se puede excluir solo por ser electronica), pero es la
diferencia real entre "tan bueno como DocuSign" y "razonablemente defendible". Cerrar esto del todo
implicaria adoptar un estandar como PAdES (PDF Advanced Electronic Signatures) o similar, que es un
cambio de arquitectura, no un parche — queda fuera del alcance de hoy (documentar, no implementar).

El punto 3 (consentimiento formal separado del acepto-esto-documento) es el mas barato de cerrar
si se decide hacerlo mas adelante: es agregar una pantalla de divulgacion antes del flujo de firma,
no un cambio de arquitectura.

---

## 4. Recomendaciones (orden sugerido, ninguna ejecutada hoy — solo planificado)

1. **Barato, alto valor legal:** agregar una pantalla de "Electronic Record and Signature
   Disclosure" separada del consentimiento por documento — calca el patron de ESIGN §7001(c) /
   DocuSign, incluso si no es estrictamente obligatoria para este tipo de transaccion.
2. **Mediano, refuerza el punto mas debil:** evaluar firmar digitalmente el PDF final (certificado
   embebido, no solo hash en DB) — investigar librerias/servicios que soporten PAdES o
   equivalente para Deno/Supabase Edge Functions antes de comprometerse a una solucion.
3. **Bajo costo, cierre de proceso:** documentar formalmente la politica de retencion (cuanto
   tiempo se guardan certificados/PDFs firmados, backup, quien puede purgar y bajo que
   condiciones) — el mecanismo tecnico de soft-delete/archivo ya existe en varias tablas, falta la
   politica escrita.

---

## Fuentes

- [15 U.S.C. §7001 — govinfo.gov](https://www.govinfo.gov/link/uscode/15/7001)
- [15 U.S.C. §7001 — Cornell LII](https://www.law.cornell.edu/uscode/text/15/7001)
- [15 U.S.C. §7003 (exclusiones) — Cornell LII](https://www.law.cornell.edu/uscode/text/15/7003)
- [Oregon Revised Statutes Chapter 84 — Oregon Legislature (oficial)](https://www.oregonlegislature.gov/bills_laws/ors/ors084.html)
- [ORS 84.013 — oregon.public.law](https://oregon.public.law/statutes/ors_84.013)
- [ORS 84.025 — oregon.public.law](https://oregon.public.law/statutes/ors_84.025)
- [ORS 84.034 — oregon.public.law](https://oregon.public.law/statutes/ors_84.034)
- [ORS 84.037 — oregon.public.law](https://oregon.public.law/statutes/ors_84.037)
- [DocuSign — Are electronic signatures admissible in court?](https://www.docusign.com/blog/are-electronic-signatures-admissible-in-court)
- [Adobe — What is an e-signature audit trail?](https://www.adobe.com/acrobat/business/hub/esignature-audit-trail.html)
- [Adobe Acrobat Sign — 21 CFR Part 11 compliance whitepaper](https://www.adobe.com/cc-shared/assets/pdf/trust-center/ungated/whitepapers/doc-cloud/acrobat-sign-compliance-21cfrpt11-wp.pdf)

**Nota de responsabilidad:** este documento es investigacion tecnica distilada de fuentes publicas
para informar decisiones de producto/ingenieria. No es asesoria legal. Antes de basar una defensa
real en una demanda especifica en esto, consultar con un abogado licenciado en Oregon (o la
jurisdiccion que aplique).
