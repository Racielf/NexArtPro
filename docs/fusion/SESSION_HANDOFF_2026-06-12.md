# Session Handoff — 2026-06-12

> Para retomar mañana. Leer esto + CLAUDE.md al iniciar la sesión.

## Estado del repo

```text
Branch:        integration/investor-hub-schema
Último commit: 0ac5c70 — fix(auth): prevent local auth bootstrap from hanging indefinitely
Working tree:  limpio
Producción:    INTACTA (nexartpro / hdiejuqbhqhebrpneymo — nunca tocada)
Bridge:        protegido en supabase/drafts/ (NO en migrations/)
Investor Hub:  SQL draft pausado, sin aplicar a ninguna DB
Phase 6 UI:    NO aprobada
```

## Cadena de commits de hoy (más recientes primero)

```text
0ac5c70  fix(auth): timeout 8s en bootstrap de auth (anti-spinner infinito)
3898061  ci: workflow mínimo GitHub Actions (build + lint)
4dda10e  docs(security): RLS-0 backup/storage checklist completo
51efe13  docs(security): prerequisitos owner verificados (Docker/CLI/backups)
0e06fbf  docs(security): plan RLS hardening fase 0
0508599  docs(security): auditoría RLS de producción
9cf0ffc  docs(schema): fix role equity_partner en plan de validación
00373e9  docs(schema): plan de validación local (Docker + Supabase CLI)
4b89842  docs(schema): bloqueo por costo de staging documentado
```

## Lo completado hoy

1. **Auditoría RLS de producción** — CRÍTICO: 49/49 tablas con `anon_full_access` (RLS efectivamente apagado). `app_users` editable por anon (escalación de privilegios). Ver `PRODUCTION_RLS_SECURITY_AUDIT.md`.
2. **Plan RLS-0** — backup/restore + Storage. Backups diarios confirmados (PITR presunto NO). Bucket `documents` es PÚBLICO (24 objetos, ~169 MB) y NO está cubierto por backups de DB. Ver `RLS_HARDENING_PHASE_0_PLAN.md`.
3. **Prerequisitos verificados** — WSL 2.7.8.0, Docker 29.5.3, Compose v5.1.4, Supabase CLI 2.106.0 (vía `npx supabase`).
4. **CI mínimo** — `.github/workflows/ci.yml` (npm ci + build + lint, Node 20, sin secrets). OJO: lint tiene 126 errores preexistentes (unused-imports) → el step lint saldrá ROJO en el primer run. Decisión pendiente (Patch 3 NO aprobado).
5. **Fix runtime local** — timeout de 8s en `AuthContext.jsx` para que el spinner infinito no pueda ocurrir. El AUTH BYPASS sigue activo (desde baseline) — restaurarlo es tarea futura ligada a RLS-1.

## Pendientes inmediatos (en orden sugerido)

```text
1. Owner: crear .env.local con valores reales (template en .env.example;
   está gitignored, nunca se commitea). Falta probar npm run dev local
   con el fix de timeout.
2. Owner: correr npm run build en Windows para confirmar el patch 0ac5c70
   (en sandbox no se pudo: node_modules es de Windows).
3. Decidir qué hacer con los 126 errores de lint (CI rojo):
   lint:fix masivo (Patch 3, no aprobado) o lint non-blocking temporal.
4. Supabase local: npx supabase init + start (requiere go-ahead explícito).
   Plan completo en LOCAL_VALIDATION_SETUP_PLAN.md.
5. Con stack local corriendo → validación Investor Hub (Fase 5.3) y
   pruebas de RLS-1 (app_users + audit logs + recovery_vault).
```

## Hallazgos abiertos (sin acción aún, no olvidar)

- `supabaseClient.js` tiene **fallback hardcodeado a producción** (URL + anon key) → dev local sin .env apunta a PRODUCCIÓN. Quitar en patch futuro aprobado.
- `.env.example` está gitignored (`.env.*`) y no trackeado — agregar `!.env.example` a .gitignore si se quiere versionar (mi edición con VITE_SUPABASE_LOGO_BUCKET está solo en disco).
- AUTH BYPASS activo también en el deploy → /dashboard abierto sin login. Restaurar ProtectedRoute = fase ligada a RLS-1 con QA de login.
- Bucket `documents` público → evaluar privacidad + signed URLs en RLS-2.
- Backup de Storage pendiente antes de RLS-2 (opciones en RLS_HARDENING_PHASE_0_PLAN.md §10.3).
- 2 SQL sueltos en `supabase/` raíz (001_users_roles.sql, 002_customers.sql) — no corren con db reset; revisar en cleanup.

## Reglas vigentes (sin cambios)

NO producción · NO SQL sin aprobación · NO bridge · NO Phase 6 UI · NO lint:fix masivo · bypass de auth se queda hasta orden explícita · clasificar cada acción (SAFE READ ONLY / DOC ONLY / CODE CHANGE / DB WRITE / PRODUCTION RISK) antes de ejecutar.

---
*Handoff generado al cierre de sesión — R.C Art Construction LLC — NexArtPro*
