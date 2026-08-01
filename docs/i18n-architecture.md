# NexArtPro — arquitectura de idiomas

## Estado

Infraestructura inicial implementada el 2026-07-31 con dos idiomas:

- `es` — español, idioma predeterminado.
- `en` — inglés.

El selector está en **Settings → General → Idioma de la aplicación**. La preferencia se guarda localmente en el dispositivo con la clave `nexartpro_language`; no requiere SQL, columnas nuevas ni cambios de Auth/RLS.

## Implementación

- Provider y catálogos: `src/lib/i18n.jsx`.
- Montaje global: `src/main.jsx` mediante `LanguageProvider`.
- Consumo: `const { language, setLanguage, t } = useLanguage()`.
- El provider actualiza `document.documentElement.lang`.
- `t()` admite interpolación con marcadores como `{services}`.

Ejemplo:

```jsx
const { t } = useLanguage();
return <h1>{t('estimate.header.title')}</h1>;
```

## Cobertura actual

Traducido en esta primera fase:

- Settings: encabezado, navegación principal de preferencias y panel General.
- Estimate Editor: header, estado de guardado, template, sidebar, Partidas, pipeline, e-sign y Actividad.

El resto de NexArtPro conserva sus textos actuales hasta que cada módulo se migre. La infraestructura es global, pero no se debe afirmar que toda la aplicación está traducida todavía.

## Cómo añadir otro idioma

1. Agregar el código y nombre a `SUPPORTED_LANGUAGES`.
2. Añadir un catálogo con las mismas claves en `messages`.
3. No duplicar lógica ni crear condicionales de idioma dentro de reglas de negocio.
4. Usar claves semánticas por módulo (`estimate.*`, `settings.*`).
5. Verificar textos largos, fechas, moneda, accesibilidad y responsive.

## Reglas

- Nunca usar el idioma de interfaz para cambiar importes o reglas financieras.
- El idioma del documento enviado al cliente (`document_language`) sigue siendo una decisión distinta del idioma operativo de la app.
- No guardar traducciones en la base de datos salvo que sean contenido comercial editable.
- Mantener español como fallback si falta una clave.
