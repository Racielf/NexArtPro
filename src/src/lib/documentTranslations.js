/**
 * documentTranslations.js — Bilingual copy for BID & PROPOSAL documents
 *
 * Languages: EN, ES, BILINGUAL (shows both)
 * Document types: PROPOSAL (client-friendly), BID (technical/commercial)
 *
 * Usage:
 *   import { t, tb } from '@/lib/documentTranslations';
 *   t('proposal', 'coverNote', 'en')        → English string
 *   t('proposal', 'coverNote', 'es')        → Spanish string
 *   tb('proposal', 'coverNote', 'bilingual') → "English\n\nSpanish"
 */

const PROPOSAL = {
  // Header
  docLabel:         { en: 'PROPOSAL', es: 'PROPUESTA' },
  validUntil:       { en: 'Valid Until', es: 'Válido Hasta' },

  // Section titles
  clientProjectInfo:  { en: 'Client / Project Info', es: 'Información del Cliente / Proyecto' },
  preparedFor:        { en: 'Prepared For', es: 'Preparado Para' },
  project:            { en: 'Project', es: 'Proyecto' },
  yourInvestment:     { en: 'Your Investment', es: 'Su Inversión' },

  coverNote:          { en: 'Cover Note', es: 'Nota de Presentación' },
  executiveSummary:   { en: 'Executive Summary', es: 'Resumen Ejecutivo' },
  scopeOfWork:        { en: 'Scope of Work', es: 'Alcance del Trabajo' },
  projectSummary:     { en: 'Project Summary', es: 'Resumen del Proyecto' },
  servicesIncluded:   { en: 'Services Included', es: 'Servicios Incluidos' },
  whatsIncluded:      { en: "What's Included", es: 'Lo Que Incluye' },
  whatsNotIncludedTitle: { en: "What's Not Included", es: 'Lo Que No Incluye' },
  optionalAddOns:     { en: 'Optional Add-ons', es: 'Opciones Adicionales' },
  scheduleTimeline:   { en: 'Project Timeline', es: 'Cronograma del Proyecto' },
  investmentSummary:  { en: 'Pricing Summary', es: 'Resumen de Precios' },
  totalInvestment:    { en: 'Total Investment', es: 'Inversión Total' },
  terms:              { en: 'Terms & Conditions', es: 'Términos y Condiciones' },
  acceptance:         { en: 'Acceptance', es: 'Aceptación' },
  callToAction:       { en: 'Ready to Get Started?', es: '¿Listo para Comenzar?' },
  investmentOptions:  { en: 'Investment Options', es: 'Opciones de Inversión' },
  investmentOptionsIntro: {
    en: 'Choose the option that best fits your needs and budget. All options include our commitment to quality and professional workmanship.',
    es: 'Elija la opción que mejor se adapte a sus necesidades y presupuesto. Todas las opciones incluyen nuestro compromiso con la calidad y la mano de obra profesional.',
  },
  included:           { en: "What's Included", es: 'Incluye' },
  notIncluded:        { en: "What's Not Included", es: 'No Incluye' },

  // Sub-labels
  estimatedStart:       { en: 'Estimated Start', es: 'Inicio Estimado' },
  estimatedCompletion:  { en: 'Estimated Completion', es: 'Finalización Estimada' },
  whatsNotIncluded:     { en: "What's Not Included", es: 'Lo Que No Incluye' },
  paymentTerms:         { en: 'Payment Terms', es: 'Términos de Pago' },
  warranty:             { en: 'Warranty', es: 'Garantía' },
  termsConditions:      { en: 'Terms & Conditions', es: 'Términos y Condiciones' },
  authorizedRep:        { en: 'Authorized Representative', es: 'Representante Autorizado' },
  clientSignature:      { en: 'Client Signature', es: 'Firma del Cliente' },
  date:                 { en: 'Date', es: 'Fecha' },

  // Body copy — Call to Action
  callToActionBody: {
    en: 'To proceed with this project, please review and accept this proposal. We are ready to begin upon your approval. Feel free to reach out with any questions — we are here to make this process as smooth as possible.',
    es: 'Para continuar con este proyecto, por favor revise y acepte esta propuesta. Estamos listos para comenzar con su aprobación. No dude en comunicarse con cualquier pregunta — estamos aquí para hacer este proceso lo más sencillo posible.',
  },

  // Body copy — Cover Note
  coverGreeting:      { en: 'Dear', es: 'Estimado(a)' },
  coverBody1: {
    en: "Thank you for giving us the opportunity to earn your business. We've put together this proposal based on our understanding of your project needs. Our goal is to deliver exceptional quality, transparent communication, and a finished result you'll love.",
    es: 'Gracias por darnos la oportunidad de trabajar con usted. Hemos preparado esta propuesta basándonos en nuestra comprensión de las necesidades de su proyecto. Nuestro objetivo es ofrecer calidad excepcional, comunicación transparente y un resultado final que le encantará.',
  },
  coverBody2: {
    en: "Please review the details below. If anything needs adjusting, we're happy to discuss — we want to make sure this is exactly right for you.",
    es: 'Por favor revise los detalles a continuación. Si algo necesita ajustarse, con gusto lo discutimos — queremos asegurarnos de que todo sea perfecto para usted.',
  },

  // Body copy — Project Summary fallback
  projectSummaryDefault: {
    en: 'A detailed scope of work covering all services listed in this proposal. All work will be performed to professional standards using quality materials.',
    es: 'Un alcance de trabajo detallado que cubre todos los servicios incluidos en esta propuesta. Todo el trabajo se realizará con estándares profesionales utilizando materiales de calidad.',
  },

  // Body copy — Services
  servicesIntro: {
    en: 'The following services are included in this proposal. Each line item represents the scope, quantity, and pricing for the work described.',
    es: 'Los siguientes servicios están incluidos en esta propuesta. Cada partida representa el alcance, cantidad y precio del trabajo descrito.',
  },

  // Body copy — What's Included (default)
  whatsIncludedTitle:  { en: 'Your proposal includes:', es: 'Su propuesta incluye:' },
  whatsIncludedItems: {
    en: [
      'All labor and workmanship for the services described above',
      'Materials and supplies as specified in each line item',
      'Project management and coordination throughout the job',
      'Clean-up and removal of project-related debris upon completion',
      'A final walkthrough to ensure your complete satisfaction',
    ],
    es: [
      'Toda la mano de obra para los servicios descritos anteriormente',
      'Materiales e insumos según lo especificado en cada partida',
      'Gestión y coordinación del proyecto durante todo el trabajo',
      'Limpieza y retiro de escombros relacionados con el proyecto al finalizar',
      'Una inspección final para asegurar su completa satisfacción',
    ],
  },

  // Body copy — Optional Add-ons
  addOnsIntro: {
    en: 'The following items are optional upgrades or additions. They are not included in the total above unless specifically selected.',
    es: 'Los siguientes elementos son mejoras u opciones adicionales. No están incluidos en el total anterior a menos que se seleccionen específicamente.',
  },

  // Body copy — Schedule fallback
  scheduleDefault: {
    en: 'Project scheduling will be coordinated upon acceptance. We will provide a detailed timeline and keep you informed at every step.',
    es: 'La programación del proyecto se coordinará al momento de la aceptación. Le proporcionaremos un cronograma detallado y lo mantendremos informado en cada paso.',
  },

  // Body copy — Terms defaults
  warrantyDefault: {
    en: 'All workmanship is backed by our standard warranty. Specific warranty terms will be provided upon project completion and are subject to manufacturer guidelines for any materials used.',
    es: 'Todo el trabajo está respaldado por nuestra garantía estándar. Los términos específicos de garantía se proporcionarán al finalizar el proyecto y están sujetos a las directrices del fabricante para cualquier material utilizado.',
  },
  termsDefault: {
    en: 'This proposal is valid for 30 days from the date of issue. Pricing is subject to change after expiration. Any changes to the scope of work may result in revised pricing. Written change orders are required for additional work not described in this proposal.',
    es: 'Esta propuesta es válida por 30 días a partir de la fecha de emisión. Los precios están sujetos a cambios después del vencimiento. Cualquier cambio en el alcance del trabajo puede resultar en precios revisados. Se requieren órdenes de cambio por escrito para trabajo adicional no descrito en esta propuesta.',
  },
  termsValidPeriod: {
    en: 'This proposal is valid for the period indicated above.',
    es: 'Esta propuesta es válida por el período indicado anteriormente.',
  },

  // Acceptance
  acceptanceBody: {
    en: 'By signing below, you acknowledge that you have reviewed this proposal, agree to the scope of work and pricing described, and authorize {company} to proceed. A signed proposal constitutes a binding agreement between both parties.',
    es: 'Al firmar a continuación, usted reconoce que ha revisado esta propuesta, acepta el alcance del trabajo y los precios descritos, y autoriza a {company} a proceder. Una propuesta firmada constituye un acuerdo vinculante entre ambas partes.',
  },
};

const BID = {
  // Header
  docLabel:         { en: 'BID', es: 'LICITACIÓN' },
  validUntil:       { en: 'Valid Until', es: 'Válido Hasta' },

  // Section titles
  projectInformation: { en: 'Project Information', es: 'Información del Proyecto' },
  ownerClient:        { en: 'Owner / Client', es: 'Propietario / Cliente' },
  references:         { en: 'References', es: 'Referencias' },
  scopeOfWork:        { en: 'Scope of Work', es: 'Alcance del Trabajo' },
  baseBid:            { en: 'Base Bid', es: 'Oferta Base' },
  alternatesOptions:  { en: 'Alternates / Options', es: 'Alternativas / Opciones' },
  inclusions:         { en: 'Inclusions', es: 'Inclusiones' },
  exclusions:         { en: 'Exclusions', es: 'Exclusiones' },
  clarifications:     { en: 'Clarifications', es: 'Aclaraciones' },
  commercialTerms:    { en: 'Commercial Terms', es: 'Términos Comerciales' },
  acceptanceAuth:     { en: 'Acceptance / Authorization', es: 'Aceptación / Autorización' },

  // Sub-labels
  jobNumber:      { en: 'Job Number', es: 'Número de Trabajo' },
  planReference:  { en: 'Plan Reference', es: 'Referencia del Plano' },
  startDate:      { en: 'Start Date', es: 'Fecha de Inicio' },
  completion:     { en: 'Completion', es: 'Finalización' },
  projectLead:    { en: 'Project Lead', es: 'Líder del Proyecto' },
  bidSummary:     { en: 'Bid Summary', es: 'Resumen de Oferta' },
  paymentTerms:   { en: 'Payment Terms', es: 'Términos de Pago' },
  bidValidity:    { en: 'Bid Validity', es: 'Validez de la Oferta' },
  additionalTerms:{ en: 'Additional Terms', es: 'Términos Adicionales' },
  contractor:     { en: 'Contractor', es: 'Contratista' },
  ownerAuthRep:   { en: 'Owner / Authorized Representative', es: 'Propietario / Representante Autorizado' },
  date:           { en: 'Date', es: 'Fecha' },

  // Body copy — Scope of Work fallback
  scopeDefault: {
    en: 'The Contractor shall furnish all labor, materials, equipment, and supervision necessary to complete the work described in the line items below, in accordance with the referenced plans and specifications, applicable building codes, and industry-standard workmanship practices.',
    es: 'El Contratista proporcionará toda la mano de obra, materiales, equipos y supervisión necesarios para completar el trabajo descrito en las partidas a continuación, de acuerdo con los planos y especificaciones referenciados, los códigos de construcción aplicables y las prácticas estándar de la industria.',
  },

  // Body copy — Base Bid
  baseBidIntro: {
    en: 'The Base Bid includes all labor, materials, and equipment required to complete the scope of work described herein.',
    es: 'La Oferta Base incluye toda la mano de obra, materiales y equipos necesarios para completar el alcance del trabajo descrito en este documento.',
  },

  // Body copy — Alternates
  alternatesIntro: {
    en: "The following alternates are priced separately and may be added to the Base Bid at the Owner's discretion. Alternate pricing is valid only when accepted concurrently with the Base Bid.",
    es: 'Las siguientes alternativas tienen precio independiente y pueden agregarse a la Oferta Base a discreción del Propietario. El precio de las alternativas es válido solo cuando se acepta conjuntamente con la Oferta Base.',
  },

  // Body copy — Inclusions (default)
  inclusionsIntroDefault: {
    en: 'This Bid includes the following unless otherwise noted:',
    es: 'Esta oferta incluye lo siguiente a menos que se indique lo contrario:',
  },
  inclusionsItemsDefault: {
    en: [
      'All labor, materials, and equipment as described in the line items above',
      'Applicable permits and inspection coordination',
      'Standard site clean-up and debris removal upon completion',
      'Project management and scheduling',
    ],
    es: [
      'Toda la mano de obra, materiales y equipos según lo descrito en las partidas anteriores',
      'Permisos aplicables y coordinación de inspecciones',
      'Limpieza estándar del sitio y retiro de escombros al finalizar',
      'Gestión del proyecto y programación',
    ],
  },

  // Body copy — Exclusions (default)
  exclusionsIntroDefault: {
    en: 'The following items are expressly excluded from this Bid:',
    es: 'Los siguientes elementos están expresamente excluidos de esta oferta:',
  },
  exclusionsItemsDefault: {
    en: [
      'Work not specifically described in the Scope of Work or line items',
      'Concealed conditions, hazardous material abatement, or structural modifications not identified',
      'Utility relocations, temporary services, or engineering beyond specified scope',
      'Owner-furnished materials or fixtures unless noted',
    ],
    es: [
      'Trabajo no específicamente descrito en el Alcance del Trabajo o partidas',
      'Condiciones ocultas, remoción de materiales peligrosos o modificaciones estructurales no identificadas',
      'Reubicación de servicios públicos, servicios temporales o ingeniería más allá del alcance especificado',
      'Materiales o accesorios proporcionados por el Propietario a menos que se indique',
    ],
  },

  // Body copy — Clarifications (default)
  clarificationsItemsDefault: {
    en: [
      'This Bid is based on the plans, specifications, and site conditions as observed at the time of the estimate.',
      'Any changes to scope, materials, or scheduling requested after acceptance may result in a Change Order with revised pricing.',
      'All work will be performed during standard business hours (Monday–Friday, 7:00 AM – 5:00 PM) unless otherwise agreed.',
      'The Contractor warrants all workmanship for a period of one (1) year from the date of substantial completion.',
    ],
    es: [
      'Esta oferta se basa en los planos, especificaciones y condiciones del sitio observadas al momento del presupuesto.',
      'Cualquier cambio en el alcance, materiales o programación solicitado después de la aceptación puede resultar en una Orden de Cambio con precios revisados.',
      'Todo el trabajo se realizará durante el horario comercial estándar (lunes a viernes, 7:00 AM – 5:00 PM) a menos que se acuerde lo contrario.',
      'El Contratista garantiza toda la mano de obra por un período de un (1) año a partir de la fecha de finalización sustancial.',
    ],
  },

  // Body copy — Commercial Terms
  paymentWithDeposit: {
    en: 'A deposit of {pct}% (${amt}) is due upon execution of this agreement. The remaining balance of ${rem} is due upon substantial completion unless alternate billing milestones are agreed upon in writing.',
    es: 'Un depósito del {pct}% (${amt}) es pagadero al momento de la ejecución de este acuerdo. El saldo restante de ${rem} es pagadero al completar sustancialmente el trabajo, a menos que se acuerden hitos de facturación alternativos por escrito.',
  },
  paymentDefault: {
    en: 'Payment terms: Net 30 from date of invoice. Progress billing may apply for projects exceeding 30 days in duration.',
    es: 'Términos de pago: Neto a 30 días desde la fecha de la factura. Puede aplicarse facturación progresiva para proyectos que excedan los 30 días de duración.',
  },
  validityWithDate: {
    en: 'This Bid is valid for the period indicated (through {date}). After this period, the Contractor reserves the right to revise pricing based on current material costs and labor availability.',
    es: 'Esta oferta es válida por el período indicado (hasta {date}). Después de este período, el Contratista se reserva el derecho de revisar los precios según los costos actuales de materiales y la disponibilidad de mano de obra.',
  },
  validityDefault: {
    en: 'This Bid is valid for thirty (30) calendar days from the date of submission. After this period, the Contractor reserves the right to revise pricing based on current material costs and labor availability.',
    es: 'Esta oferta es válida por treinta (30) días calendario a partir de la fecha de presentación. Después de este período, el Contratista se reserva el derecho de revisar los precios según los costos actuales de materiales y la disponibilidad de mano de obra.',
  },

  // Acceptance
  acceptanceBody: {
    en: 'By executing this document, the Owner/Client accepts the above Bid in its entirety and authorizes the Contractor to proceed with the described scope of work under the terms and conditions stated herein. This acceptance constitutes a binding agreement between the parties.',
    es: 'Al ejecutar este documento, el Propietario/Cliente acepta la oferta anterior en su totalidad y autoriza al Contratista a proceder con el alcance del trabajo descrito bajo los términos y condiciones aquí establecidos. Esta aceptación constituye un acuerdo vinculante entre las partes.',
  },
};

// Shared table/financial labels
const SHARED = {
  description:    { en: 'Description', es: 'Descripción' },
  qty:            { en: 'Qty', es: 'Cant.' },
  unit:           { en: 'Unit', es: 'Unidad' },
  unitPrice:      { en: 'Unit Price', es: 'Precio Unitario' },
  total:          { en: 'Total', es: 'Total' },
  subtotal:       { en: 'Subtotal', es: 'Subtotal' },
  discount:       { en: 'Discount', es: 'Descuento' },
  tax:            { en: 'Tax', es: 'Impuesto' },
  noItems:        { en: 'No items', es: 'Sin partidas' },
  paymentSchedule:{ en: 'Payment Schedule', es: 'Calendario de Pagos' },
  depositToStart: { en: 'Deposit to Start Work', es: 'Depósito para Iniciar Trabajo' },
  ofTotal:        { en: 'of total', es: 'del total' },
  remaining:      { en: 'Remaining', es: 'Saldo Restante' },
};

/**
 * Get a translation string for a given document type, key, and language.
 * @param {'proposal'|'bid'|'shared'} docType
 * @param {string} key
 * @param {'en'|'es'} lang
 */
export function t(docType, key, lang = 'en') {
  const dict = docType === 'bid' ? BID : docType === 'shared' ? SHARED : PROPOSAL;
  const entry = dict[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
}

/**
 * Get bilingual text (EN + ES separated by newline).
 * For BILINGUAL mode, renders both; for single language, renders just that one.
 * @param {'proposal'|'bid'|'shared'} docType
 * @param {string} key
 * @param {'en'|'es'|'bilingual'} lang
 */
export function tb(docType, key, lang = 'en') {
  if (lang === 'bilingual') {
    const en = t(docType, key, 'en');
    const es = t(docType, key, 'es');
    if (en === es) return en;
    return `${en}\n${es}`;
  }
  return t(docType, key, lang);
}

/**
 * Get array translations for list items.
 * @param {'proposal'|'bid'|'shared'} docType
 * @param {string} key
 * @param {'en'|'es'|'bilingual'} lang
 * @returns {string[]}
 */
export function tList(docType, key, lang = 'en') {
  const dict = docType === 'bid' ? BID : docType === 'shared' ? SHARED : PROPOSAL;
  const entry = dict[key];
  if (!entry || !Array.isArray(entry.en)) return [];

  if (lang === 'bilingual') {
    return entry.en.map((enItem, i) => {
      const esItem = entry.es?.[i] || enItem;
      return enItem === esItem ? enItem : `${enItem} / ${esItem}`;
    });
  }

  return entry[lang] || entry.en;
}

/**
 * Replace template vars like {company}, {pct}, {amt}, {rem}, {date}
 */
export function tReplace(str, vars = {}) {
  let result = str;
  for (const [k, v] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return result;
}

// Language options for UI
export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'bilingual', label: 'Bilingual (EN/ES)' },
];

export { PROPOSAL, BID, SHARED };