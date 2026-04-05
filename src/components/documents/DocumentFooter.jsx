import React from 'react';

/**
 * DocumentFooter — Pie de página de documento reutilizable
 * 
 * Responsabilidad: Renderizar footer (empresa, licencia, fecha)
 * Flexibilidad: Estilos configurables por props
 * 
 * Props:
 *   today (string) - Fecha formateada
 *   companyName (string) - Nombre de empresa (default: "FSM Pro")
 *   licenseNumber (string) - Número de licencia (default: "#2024-FSM-01")
 *   variant (string) - 'minimal' | 'standard' | 'modern' | 'executive' | 'compact' | 'pro'
 *   style (object) - Estilos CSS custom
 *   className (string) - Classes custom
 *   showCompany (boolean) - Mostrar empresa (default: true)
 *   showLicense (boolean) - Mostrar licencia (default: true)
 *   showDate (boolean) - Mostrar fecha (default: false)
 */
export default function DocumentFooter({
  today = '',
  companyName = 'FSM Pro',
  licenseNumber = '#2024-FSM-01',
  variant = 'standard',
  style = {},
  className = '',
  showCompany = true,
  showLicense = true,
  showDate = false,
}) {
  // Template-specific defaults
  const variantDefaults = {
    minimal: {
      fontSize: 9,
      color: '#666',
      padding: '10px 0',
    },
    standard: {
      fontSize: 8,
      color: '#94a3b8',
      padding: '10px 52px',
      background: '#f8fafc',
      borderTop: '1px solid #e2e8f0',
    },
    modern: {
      fontSize: 10,
      color: '#6b7280',
      padding: '20px 0',
      borderTop: '2px solid #7c3aed',
    },
    executive: {
      fontSize: 10,
      color: '#7a7a7a',
      padding: '20px 0',
      borderTop: '2px solid #d4a574',
    },
    compact: {
      fontSize: 10,
      color: '#999',
      padding: '15px 30px',
    },
    pro: {
      fontSize: 9,
      color: '#94a3b8',
      padding: '20px 28px',
      borderTop: '1px solid #e2e8f0',
    },
  };

  const defaults = variantDefaults[variant] || variantDefaults.standard;

  return (
    <div
      className={className}
      style={{
        ...defaults,
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {showCompany && companyName && (
            <span>{companyName}</span>
          )}
          {showLicense && licenseNumber && (
            <>
              {showCompany && ' · '}
              <span>License {licenseNumber}</span>
            </>
          )}
        </div>
        {showDate && today && (
          <div>{today}</div>
        )}
      </div>
    </div>
  );
}