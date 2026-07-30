# SignLaw — Marco legal de firmas electronicas y estandar de auditoria defendible en corte

> v2, 2026-07-30. Escrito para ser portable — las secciones 1-8 (base legal, terminologia, pilares
> de exigibilidad, modelo de evidencia, matriz de disputas, patrones de industria, roles/gates,
> fuentes) no dependen de NexArtPro y se pueden reusar en cualquier app que implemente firma
> electronica. La seccion 9 (gap analysis) es especifica de NexArtSign — no aplica fuera de este
> repo.
>
> **v2 adapta y fusiona la politica mas rigurosa que el dueno ya habia construido para otra app
> propia** (`SingLw-V1` / `legal-evidence-policy.md`, ArtFocusSing,
> `D:\My Bussines\SQL BSE\ArtFouS app\dj-artfocus-prod\skills\singlw-v1`, 2026-07-29). Esa version
> es mas rigurosa en 3 cosas que v1 de este doc no tenia: (1) un limite explicito de terminologia
> legal (que palabras NO se pueden usar sin aprobacion de abogado), (2) un modelo de evidencia con
> **cadena de hashes** encadenados (no un hash suelto), y (3) un modelo de gobernanza con roles y
> gates de aprobacion antes de tocar produccion. Se adapta aca, no se copia ciego: ArtFocusSing esta
> en fase "propuesta, nada construido todavia"; NexArtSign ya esta en produccion y ya tomo
> decisiones (ej. si recolectar IP/user-agent) que ArtFocusSing todavia tiene como pendientes — las
> divergencias se marcan explicitamente en la seccion 9, no se ocultan.

---

## 1. Limite y proposito

Este documento no es asesoria legal. No establece que una firma via NexArtSign (o cualquier app que
reuse este documento) sea automaticamente valida, admisible, exigible, no repudiable, o apta para
cualquier tipo de documento. Validez y admisibilidad son decisiones especificas de los hechos, el
documento, la jurisdiccion y el procedimiento — las decide un abogado licenciado y, en ultima
instancia, un juez.

## 2. Base legal (fuentes oficiales)

### Federal — ESIGN Act (Electronic Signatures in Global and National Commerce Act)

Ley federal de EEUU, codificada en **15 U.S.C. §7001 et seq.** Texto oficial:
[15 U.S.C. §7001 — govinfo.gov](https://www.govinfo.gov/link/uscode/15/7001) ·
[Cornell LII](https://www.law.cornell.edu/uscode/text/15/7001)

**Regla general de validez (§7001(a)):** una firma, contrato u otro registro relacionado con una
transaccion no puede negarse su efecto legal, validez o exigibilidad **solo porque esta en forma
electronica**.

**Definicion de "electronic signature" (§7006):** un sonido, simbolo o proceso electronico, adjunto
o asociado logicamente a un contrato u otro registro, y ejecutado o adoptado por una persona con la
intencion de firmar el registro. No exige ninguna tecnologia especifica (no requiere PKI, no
requiere certificado digital, no requiere biometria).

**Consentimiento del consumidor (§7001(c)):** cuando se reemplaza una divulgacion que la ley exige
que sea *por escrito*, el consumidor debe dar consentimiento afirmativo, despues de recibir
divulgacion clara de: (1) su derecho a pedir la version en papel, (2) su derecho a retirar el
consentimiento sin penalidad, (3) el alcance del consentimiento (una transaccion vs. categoria
continua), (4) el procedimiento para retirar el consentimiento y actualizar datos de contacto, (5)
como pedir copia en papel y si tiene costo, y (6) los requisitos de hardware/software necesarios
para acceder al registro electronico.

**Exclusiones — §7003** ([Cornell LII §7003](https://www.law.cornell.edu/uscode/text/15/7003)):
testamentos/codicilos/fideicomisos testamentarios; derecho de familia (adopcion, divorcio); la
mayoria del UCC salvo §1-107, §1-206 y Articulos 2/2A; ordenes y documentos judiciales; avisos de
cancelacion de servicios publicos; avisos de default/aceleracion/embargo/ejecucion
hipotecaria/desalojo sobre **residencia principal**; cancelacion de beneficios de salud/vida;
retiros de productos que arriesguen salud/seguridad; documentacion de materiales peligrosos.

**Regla de aplicacion:** cualquier app debe **negar, no solo advertir**, cuando la clase de
documento cae en una exclusion o es desconocida — nunca asumir que un flujo normal de firma cubre
una excepcion legal.

### Estatal — enfoque UETA (Uniform Electronic Transactions Act)

La mayoria de los estados de EEUU adoptaron una version de la UETA del Uniform Law Commission
([texto modelo — ULC](https://www.uniformlaws.org/viewdocument/final-act-21?CommunityKey=2c04b76c-2b7d-4399-977e-d5876ba7e034)),
pero **el texto modelo no es ley** hasta que un estado lo promulga con su propio texto y variantes —
tratar el modelo como ley generica en cualquier estado sin verificar el texto promulgado real es un
error comun. Mantener una matriz de aprobacion estado-por-estado (seccion 8) en vez de asumir
uniformidad.

**Oregon (donde opera R.C Art Construction LLC) — ORS Capitulo 84**, texto oficial:
[Oregon Legislature](https://www.oregonlegislature.gov/bills_laws/ors/ors084.html) · espejo legible:
[oregon.public.law/statutes/ors_chapter_84](https://oregon.public.law/statutes/ors_chapter_84)

- **ORS 84.013 — Uso voluntario y por acuerdo mutuo.** Solo aplica entre partes que ambas hayan
  acordado transaccionar electronicamente — se puede inferir de la conducta. Una parte puede
  negarse a medios electronicos para transacciones futuras aunque haya aceptado una vez; esa
  proteccion no se puede renunciar por contrato.
- **ORS 84.019 — Reconocimiento legal.** Un registro/firma/contrato no pierde efecto legal solo por
  ser electronico o por usar un agente electronico en su formacion.
- **ORS 84.025 — Atribucion.** *"Un registro o firma electronica es atribuible a una persona si fue
  el acto de esa persona. El acto se puede demostrar de cualquier manera, incluyendo mostrando la
  eficacia de cualquier procedimiento de seguridad aplicado."* — la ley no exige tecnologia
  especifica, exige poder **demostrar** que fue esa persona.
- **ORS 84.034 — Retencion.** Basta un registro electronico que refleje fielmente la informacion
  desde su forma final y siga accesible para referencia posterior.
- **ORS 84.037 — Admisibilidad.** *"No se puede excluir evidencia de un registro o firma solo
  porque esta en forma electronica."*

**California — Civil Code Title 2.5** ([texto oficial](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&lawCode=CIV&part=2.&title=2.5.)):
aborda acuerdo a transaccionar electronicamente, atribucion, procedimientos de seguridad,
retenibilidad y accesibilidad posterior — util como segundo estado de referencia si la app opera
alli, solo despues de que un abogado de California apruebe la ceremonia y plantillas completas.

### Reglas federales de evidencia (para litigio en corte federal de EEUU)

[Federal Rules of Evidence](https://www.uscourts.gov/sites/default/files/document/federal-rules-of-evidence.pdf)
— Reglas **803(6)** (registros de negocio regulares), **901** (autenticacion), **902(11)/902(13)/902(14)**
(certificaciones de procesos/datos electronicos), y **1001-1003** (originales/duplicados) son las
que se invocan para admitir un registro electronico. Mantener registros contemporaneos de proceso
regular, un sistema explicable y preciso, exports exactos, y un custodio calificado — estos
controles **apoyan** una base de admisibilidad, no la garantizan.

### Guias regulatorias (no son ley, pesan distinto)

- [FTC — reporte al Congreso sobre consentimiento del consumidor bajo ESIGN](https://www.ftc.gov/reports/report-congress-electronic-signatures-global-national-commerce-act-consumer-consent-provision) —
  el consentimiento no puede reducirse a terminos ocultos o una visita pasiva al navegador.
- [NIST SP 800-63 — gestion de riesgo de identidad digital](https://pages.nist.gov/800-63-4/sp800-63/dirm/) —
  elegir la fuerza de autenticacion segun el riesgo de la transaccion.
- [NIST SP 800-63B — guia de sesiones](https://pages.nist.gov/800-63-4/sp800-63b/session/) —
  IP/dispositivo son señales de sesion, no prueba de identidad por si solas.
- [California Privacy Protection Agency — minimizacion de datos](https://cppa.ca.gov/pdf/enfadvisory202401.pdf) —
  cada campo de evidencia personal necesita proposito, regla de acceso, y retencion explicitos.

**Conclusion practica combinada:** una firma electronica con un procedimiento de seguridad
razonable (identidad + intento de firmar + registro no alterado) no puede ser rechazada como
evidencia solo por ser electronica. Lo que gana o pierde una demanda no es "¿fue electronica?" sino
"¿se puede demostrar con evidencia solida que fue esa persona, que acepto ese documento exacto, y
que el documento no se altero despues?"

---

## 3. Terminologia aprobada — limite obligatorio de afirmaciones

**No decir** "legalmente vinculante", "admisible en corte", "no repudiable", "a prueba de
manipulacion" (usar **"a prueba de manipulacion evidente"** solo cuando la verificacion realmente
detecta un byte cambiado o un enlace de evidencia roto), "firma digital" (a menos que exista PKI/
certificado real), "notarizado", o "cumple en todos los estados" — a menos que un abogado
licenciado haya aprobado el release exacto implementado y los hechos que lo sostienen sean
verdaderos.

- Usar **"firma electronica"**, no "firma digital", salvo que exista una firma criptografica
  PKI real embebida.
- Usar **"paquete de evidencia"** o **"reporte de finalizacion"**, no "certificado de corte".
- No afirmar verificacion biometrica, sellado de tiempo independiente, o garantia de autoridad
  certificadora a menos que una implementacion aprobada realmente lo provea.

## 4. Pilares de exigibilidad propuestos

Cada firma completada deberia tener evidencia para cada pilar aplicable. La falla de un pilar
deberia **bloquear la finalizacion o marcar el acuerdo como no soportado** — nunca ocultarse
mostrando igual el grafico de la firma.

1. **Elegibilidad** — el tipo de documento y la jurisdiccion estan aprobados, ninguna exclusion
   aplica (ver seccion 2, §7003).
2. **Acuerdo a transaccionar electronicamente** — la conducta de ambas partes apoya el uso del
   proceso electronico (UETA/ORS 84.013).
3. **Divulgacion y consentimiento del consumidor** — version exacta de la divulgacion y
   consentimiento afirmativo, grabados **independientemente** de la intencion final de firmar.
4. **Acceso y retencion** — el firmante puede acceder, retener, y reproducir fielmente la forma
   usada para el registro.
5. **Asociacion exacta al registro** — la ceremonia esta ligada a una version inmutable del
   documento y su hash SHA-256.
6. **Intencion** — una accion final clara indica que el firmante intenta firmar el registro exacto.
7. **Atribucion** — identidad de portal verificada o una concesion exacta y de un solo uso, junto
   con evidencia circundante, liga la accion al participante esperado.
8. **Integridad y cronologia** — eventos de servidor confiables, ordenados, de solo-agregar, y
   encadenados por hash (ver seccion 5).
9. **Operaciones confiables** — el sistema esta probado, monitoreado, versionado, y se usa como
   proceso de negocio regular (no reconstruido despues de una disputa).
10. **Prueba reproducible** — un custodio autorizado puede exportar, verificar, y explicar el
    registro original y el proceso sin alterarlos.

## 5. Modelo de evidencia demostrable en codigo

La evidencia autoritativa viene de limites de servidor confiables, no de analitica de navegador.
Cada evento deberia preservar o referenciar: version del schema de evidencia y revision de release
de la app; identificadores de tenant/paquete/participante/version-de-documento; SHA-256 exacto del
contenido del documento; **secuencia monotonicamente creciente del paquete y el hash de evidencia
previo**; tipo de evento y timestamp UTC de servidor confiable; metodo de identidad y referencia
opaca de identidad; version/hash de divulgacion-consentimiento cuando aplique; hash de la
representacion de firma cuando aplique; identificadores de correlacion/idempotencia; metadata
acotada y en lista blanca (sin secretos, cookies, ni tokens de concesion crudos).

**La diferencia clave frente a "guardar un hash del PDF final" (lo que hace la mayoria de las apps
simples, incluida NexArtSign hoy — ver seccion 9):** encadenar cada evento con el hash del evento
anterior, no solo el documento final. Verificacion conceptual:

```text
assert sha256(document_bytes) == completion.document_content_hash

previous = null
for event in events ordered by sequence:
  assert event.sequence is the expected next integer
  assert event.previous_evidence_hash == previous
  canonical = canonicalize_with(event.hash_algorithm_version, event.fields)
  assert sha256(canonical) == event.evidence_hash
  previous = event.evidence_hash

assert sha256(final_pdf_bytes) == artifact.pdf_sha256
```

Un hash solo prueba que los bytes comparados son iguales bajo el algoritmo declarado. Una cadena de
hashes auto-controlada detecta inconsistencias posteriores pero **no prueba por si sola** quien
actuo, cuando existio un evento, que los bytes iniciales eran veraces, o que no se creo una
historia paralela. Registros de identidad, control de acceso, tiempo confiable, backups, y
testimonio operativo siguen siendo controles separados.

**Nota tecnica de canonicalizacion:** si se usa tanto JSON canonico (claves ordenadas, portable
entre lenguajes) como hashing de texto nativo de una base de datos (ej. `jsonb::text` en
PostgreSQL), esos dos metodos **no son intercambiables automaticamente** — declarar siempre el
algoritmo y version exactos usados para cada hash, y nunca recalcular un hash de base de datos con
el algoritmo portable y llamar corrupcion a un mismatch que en realidad es solo una diferencia de
canonicalizacion.

## 6. Matriz de disputas — que evidencia ayuda, y su limite real

| Alegato | Evidencia/control necesario | Limitacion importante |
|---|---|---|
| "Yo no firme esto" | Participante exacto, metodo de identidad, eventos de autenticacion/concesion, intencion, cronologia, entrega. | Posesion de un link o acceso a un email no es prueba concluyente de identidad; IP tampoco. |
| "El documento fue alterado" | Bytes originales, version inmutable, hash de contenido, cadena de eventos, hash del PDF final, verificacion offline. | Un hash no prueba que el contenido original fuera justo o presentado correctamente. |
| "No tuve intencion de aceptar" | Redaccion/accion de intencion final separada, nombre tipeado, referencia al registro presentado, finalizacion confiable. | La redaccion de UI y las circunstancias siguen importando. |
| "No pude acceder o guardarlo" | Divulgacion aprobada de hardware/software, demostracion de acceso, disponibilidad de copia retenida. | Un `200` de servidor solo no prueba comprension humana ni retencion real. |
| "La version en español era distinta" | Texto/hash exacto por locale, traducciones revisadas legalmente. | Paridad de ingenieria no es aprobacion de traduccion legal. |
| "La empresa edito sus logs" | Permisos de solo-agregar, cadena de hashes, backups, huellas de release, custodia de exports. | Una cadena controlada por el proveedor no es notarizacion independiente. |
| "El timestamp esta mal" | Fuente de tiempo de servidor, evento UTC, monitoreo de sincronizacion. | El reloj del navegador y un reloj de servidor sin monitorear son evidencia debil. |
| "Mi cuenta/link fue comprometido" | Autenticacion apropiada al riesgo, ciclo de vida de la concesion, registros de incidentes. | Un login exitoso no elimina la posibilidad de compromiso. |
| "Retire mi consentimiento electronico" | Solicitud de retiro, momento efectivo, alcance. | El retiro es prospectivo salvo que la ley o el abogado indiquen otra cosa — nunca edita evidencia previa en silencio. |
| "Este documento no se puede firmar electronicamente" | Registro de clasificacion de documento y aprobacion de jurisdiccion. | Ninguna ceremonia generica cura una exclusion legal (§7003). |

## 7. Patrones de la industria — comparacion de diseño, no autoridad legal

Aprender el patron, nunca copiar la afirmacion de marketing del proveedor como si fuera ley.

| Fuente oficial | Patron util | Respuesta propia recomendada |
|---|---|---|
| [DocuSign — platform safety](https://www.docusign.com/safety/platform-safety) / [Are e-signatures admissible in court?](https://www.docusign.com/blog/are-electronic-signatures-admissible-in-court) | Certificate of Completion: nombres, IP publica, ubicacion opcional, cadena completa de custodia, sello a prueba de manipulacion evidente. | Reporte de finalizacion neutral + hashes verificables independientemente; evitar "indiscutible" o admisibilidad automatica. |
| [Adobe — audit report controls](https://helpx.adobe.com/sign/config/global/audit-report.html) / [esignature audit trail](https://www.adobe.com/acrobat/business/hub/esignature-audit-trail.html) | Rastrea creacion, envio, vista, autenticacion, firma, y estado terminal; transaction ID verificable incluso sin cuenta. | Taxonomia de eventos tipada; declarar explicitamente que NO registra el audit. |
| [Adobe — authentication methods](https://helpx.adobe.com/sign/config/send-settings/auth-methods/overview.html) | La fuerza de autenticacion varia segun el riesgo de la transaccion y se muestra en el audit. | Persistir el metodo real usado, no una bandera vaga de "verificado". |
| [Dropbox Sign — audit trail overview](https://help.dropbox.com/security/dropbox-sign-audit-trail-overview) | Log de transacciones con timestamp, hash del PDF, manipulacion de log detectable. | Preservar hashes exactos y cadena de eventos, con las limitaciones de la seccion 5. |
| [Dropbox Sign — signing ceremony](https://help.dropbox.com/share/signing-a-dropbox-sign-document) | Pasos de revision separados y una accion final explicita de "acepto"; copia completada disponible. | Preservar intencion final explicita y acceso a copia retenida en movil/tablet/desktop. |

## 8. Roles requeridos y gates de aceptacion (gobernanza, antes de tocar produccion)

- **Dueño del negocio** — elige mercados/estados servidos y financia los controles requeridos.
- **Abogado licenciado** — aprueba matriz de jurisdiccion, plantillas de documento, divulgaciones,
  exclusiones, retencion, legal hold, y procedimiento de disputas.
- **Dueño de privacidad** — aprueba proposito/minimizacion/aviso/acceso/retencion por cada campo de
  dato personal (IP, user-agent, fingerprint, biometria de firma dibujada).
- **Dueño de seguridad** — aprueba fuerza de autenticacion, manejo de claves, tiempo confiable,
  monitoreo, backup, respuesta a incidentes.
- **Custodio de evidencia** — entiende las operaciones reales y controla exports/certificaciones
  autorizadas.
- **Ingenieria** — implementa el contrato aceptado, preserva pruebas reproducibles, no hace
  conclusiones legales.

**Gates sugeridos antes de cualquier cambio real de produccion:** (1) revision de politica —
documentar sin cambiar comportamiento protegido; (2) decisiones de abogado/dueño por escrito
(estados servidos, clases de documento incluidas/excluidas, divulgaciones exactas, retencion); (3)
preparacion de artefacto protegido (migracion/RLS/RPC/campo de evidencia) solo con aprobacion
exacta del dueño; (4) ejecucion en ambiente desechable/local; (5) QA de runtime y adversarial
(reintentos, manipulacion, fallas, multi-tenant); (6) release final solo con aprobacion del
abogado contra el release exacto implementado.

---

## 9. Gap analysis — NexArtSign (modulo de firma de NexArtPro), 2026-07-30

Especifico de este repo. Verificado contra el codigo real, no contra el roadmap (que en sesiones
anteriores tuvo desactualizaciones — ver `docs/nexartsign-security-roadmap.md` y
`docs/agent/OPEN_GAPS.md`).

| Pilar (seccion 4) | Estado en NexArtSign hoy |
|---|---|
| 1. Elegibilidad de documento/jurisdiccion | **No implementado.** NexArtSign no tiene un clasificador que niegue tipos de documento excluidos (testamentos, ordenes judiciales, etc.) — hoy solo se usa para estimates/contratos de construccion, que no caen en las exclusiones de §7003, pero no hay una barrera de codigo que lo garantice si se usara para otra cosa. |
| 2. Acuerdo a transaccionar electronicamente | Implicito en la conducta (abrir el link, avanzar el flujo) — cubierto por ORS 84.013(2), pero sin una pantalla de divulgacion formal separada (ver punto 3). |
| 3. Divulgacion y consentimiento del consumidor (separado de "acepto firmar esto") | **Gap real.** Solo existe el consentimiento especifico al documento — paso `consent` en `src/pages/SignDocumentView.jsx` (linea ~839-848): checkbox "I confirm that I am the intended signer, I have reviewed this document, and I agree to sign it electronically." No hay una divulgacion ESIGN §7001(c) separada (derecho a copia en papel, retiro de consentimiento, requisitos de hardware/software). |
| 4. Acceso y retencion | Cumple a nivel de diseño (`final_pdf_url` persiste, sin borrado real desde el frontend) — no se verifico una politica formal de cuanto tiempo, backup, o legal hold. |
| 5. Asociacion exacta al registro | Cumple — `completeSigningPackage` congela el PDF final y calcula `sha256HexFromBytes`, bloqueando la generacion del certificado si falla (`final_pdf_url`/`final_pdf_hash` requeridos). |
| 6. Intencion | Cumple — mismo paso de consentimiento del punto 3, con boton explicito, no inferido de otra accion. |
| 7. Atribucion | Cumple — OTP obligatorio (`requestSigningOtp`/`verifySigningOtp`) contra el email del participante, mas `ip_address`/`user_agent`/`device_fingerprint` en `signing_participants`. |
| 8. Integridad y cronologia | **Parcial — la diferencia real frente al modelo de la seccion 5.** Hay timestamps por evento (`sent_at`/`viewed_at`/`signed_at`/`declined_at`) y eventos en `signing_events`/`security_audit_logs`, pero **no hay una cadena de hashes encadenados** (`previous_evidence_hash`) entre eventos — solo un hash final del documento. Esto es mas debil que el modelo de evidencia recomendado en seccion 5: un tercero puede verificar que el PDF final coincide con un hash, pero no puede verificar independientemente que la secuencia completa de eventos no fue alterada o reordenada. |
| 9. Operaciones confiables | Cumple razonablemente — el flujo esta en produccion, versionado en migraciones (mayormente), y probado con casos reales hoy (formulario de contacto, etc. son casos aparte de Base44, no de NexArtSign). |
| 10. Prueba reproducible | Parcial — existe `/verify-document` (`resolveSigningCertificate`, minimizado 2026-07-30) para que un tercero compare el hash del PDF. No existe todavia un export de litigio completo (manifiesto + cadena de eventos + versiones de renderer/schema) como describe el modelo de la seccion 5. |

### Divergencia deliberada frente a ArtFocusSing — IP/user-agent

ArtFocusSing (`SingLw-V1`) parte de una posicion **conservadora por defecto**: no recolectar
IP/user-agent hasta que abogado + dueño de privacidad aprueben proposito, minimizacion, y
retencion especificos. **NexArtSign ya toma la decision contraria y ya esta en produccion:**
recolecta `ip_address`/`user_agent`/`device_fingerprint` en `signing_participants` sin que conste
una revision de privacidad formal por escrito. Esto no es necesariamente incorrecto (es exactamente
el patron que usan DocuSign/Adobe), pero es una divergencia real que vale la pena que el dueño
revise conscientemente — no es un gap tecnico, es una decision de politica ya tomada de facto por
el codigo, sin el proceso de aprobacion formal que este documento recomienda en la seccion 8.

### Resumen

NexArtSign cumple solido 6 de 10 pilares, parcial en 3 (retencion formal, integridad/cronologia,
prueba reproducible), y no implementado en 1 (clasificador de elegibilidad de documento). El
hallazgo mas importante de esta version 2 (que v1 no habia detectado): **el gap de integridad no es
solo "falta una firma digital embebida en el PDF"** (lo que decia v1) — es mas preciso decir que
falta **encadenar los eventos entre si con hash**, que es una mejora bastante mas barata de
implementar que adoptar PAdES/PKI completo, y cierra una parte real del gap sin cambiar de
arquitectura de firma.

---

## 10. Recomendaciones (orden sugerido, ninguna ejecutada — solo planificado)

1. **Barato, cierra el hallazgo mas importante de v2:** encadenar `signing_events` con un hash del
   evento anterior (`previous_evidence_hash`), siguiendo el modelo de la seccion 5 — no requiere
   cambiar el modelo de firma, solo agregar una columna y calcular el hash al insertar cada evento.
2. **Barato, alto valor legal:** agregar una pantalla de "Electronic Record and Signature
   Disclosure" separada del consentimiento por documento (pilar 3).
3. **Mediano:** evaluar firmar digitalmente el PDF final (PAdES/PKI) — mas caro que la opcion 1,
   solo si se decide perseguir paridad total con DocuSign/Adobe.
4. **Bajo costo, proceso:** documentar formalmente la politica de retencion/legal-hold, y someter
   la decision ya tomada de recolectar IP/UA/fingerprint a una revision formal de privacidad (ver
   divergencia arriba), no como bloqueo pero si como proceso pendiente.
5. **Cuando se use NexArtSign para otro tipo de documento que no sea un estimate/contrato de
   construccion:** construir el clasificador de elegibilidad (pilar 1) antes, no despues.

---

## Fuentes

- [15 U.S.C. §7001 — govinfo.gov](https://www.govinfo.gov/link/uscode/15/7001) ·
  [Cornell LII](https://www.law.cornell.edu/uscode/text/15/7001)
- [15 U.S.C. §7003 (exclusiones) — Cornell LII](https://www.law.cornell.edu/uscode/text/15/7003)
- [Uniform Law Commission — UETA, texto modelo final](https://www.uniformlaws.org/viewdocument/final-act-21?CommunityKey=2c04b76c-2b7d-4399-977e-d5876ba7e034)
- [Oregon Revised Statutes Chapter 84 — Oregon Legislature (oficial)](https://www.oregonlegislature.gov/bills_laws/ors/ors084.html) ·
  [ORS 84.013](https://oregon.public.law/statutes/ors_84.013) ·
  [ORS 84.025](https://oregon.public.law/statutes/ors_84.025) ·
  [ORS 84.034](https://oregon.public.law/statutes/ors_84.034) ·
  [ORS 84.037](https://oregon.public.law/statutes/ors_84.037)
- [California Civil Code, Title 2.5 (UETA de California)](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&lawCode=CIV&part=2.&title=2.5.)
- [Federal Rules of Evidence (Dec. 1, 2025)](https://www.uscourts.gov/sites/default/files/document/federal-rules-of-evidence.pdf)
- [FTC — reporte al Congreso, consentimiento del consumidor bajo ESIGN](https://www.ftc.gov/reports/report-congress-electronic-signatures-global-national-commerce-act-consumer-consent-provision)
- [NIST SP 800-63 — gestion de riesgo de identidad digital](https://pages.nist.gov/800-63-4/sp800-63/dirm/) ·
  [NIST SP 800-63B — guia de sesiones](https://pages.nist.gov/800-63-4/sp800-63b/session/)
- [California Privacy Protection Agency — advisory de minimizacion](https://cppa.ca.gov/pdf/enfadvisory202401.pdf)
- [DocuSign — platform safety](https://www.docusign.com/safety/platform-safety) ·
  [DocuSign — are e-signatures admissible in court?](https://www.docusign.com/blog/are-electronic-signatures-admissible-in-court)
- [Adobe — audit report controls](https://helpx.adobe.com/sign/config/global/audit-report.html) ·
  [Adobe — esignature audit trail](https://www.adobe.com/acrobat/business/hub/esignature-audit-trail.html) ·
  [Adobe — authentication methods](https://helpx.adobe.com/sign/config/send-settings/auth-methods/overview.html) ·
  [Adobe — embedded signer identity](https://helpx.adobe.com/sign/developer/signer-identity-in-workflows.html) ·
  [Adobe Acrobat Sign — 21 CFR Part 11 whitepaper](https://www.adobe.com/cc-shared/assets/pdf/trust-center/ungated/whitepapers/doc-cloud/acrobat-sign-compliance-21cfrpt11-wp.pdf)
- [Dropbox Sign — audit trail overview](https://help.dropbox.com/security/dropbox-sign-audit-trail-overview) ·
  [Dropbox Sign — signing ceremony](https://help.dropbox.com/share/signing-a-dropbox-sign-document)
- `SingLw-V1` / `legal-evidence-policy.md` (ArtFocusSing, dueño propio, 2026-07-29) —
  `D:\My Bussines\SQL BSE\ArtFouS app\dj-artfocus-prod\skills\singlw-v1\references\legal-evidence-policy.md`

**Nota de responsabilidad:** este documento es investigacion tecnica distilada de fuentes publicas
para informar decisiones de producto/ingenieria. No es asesoria legal. Antes de basar una defensa
real en una demanda especifica en esto, consultar con un abogado licenciado en la jurisdiccion que
aplique.
