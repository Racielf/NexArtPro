/**
 * PaymentMethodsSection — Shared component for rendering payment methods
 * in document templates (Clean, Premium, ModernCard).
 *
 * Props:
 *   paymentMethods — string (newline or comma-separated list)
 *   sectionLabelStyle — object for section label styling
 *   textStyle — object for body text styling
 *   containerStyle — object for outer container styling
 */
import React from 'react';

export default function PaymentMethodsSection({ paymentMethods, sectionLabelStyle = {}, textStyle = {}, containerStyle = {} }) {
  if (!paymentMethods || !paymentMethods.trim()) return null;

  // Split by newline or semicolon to support list format
  const items = paymentMethods
    .split(/[\n;]+/)
    .map(s => s.trim())
    .filter(Boolean);

  return (
    <div style={containerStyle}>
      <div style={sectionLabelStyle}>Payment Methods</div>
      {items.length > 1 ? (
        <ul style={{ margin: 0, paddingLeft: 18, ...textStyle }}>
          {items.map((item, i) => (
            <li key={i} style={{ marginBottom: 3 }}>{item}</li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: 0, whiteSpace: 'pre-wrap', ...textStyle }}>{paymentMethods}</p>
      )}
    </div>
  );
}