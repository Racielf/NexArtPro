/**
 * resolveDocumentLanguage.js
 *
 * Determines the document language using a priority chain:
 *   1. document.document_language (manual override — already saved)
 *   2. client.preferred_language  (from Client/Customer record)
 *   3. 'en' (fallback)
 *
 * Usage:
 *   const lang = resolveDocumentLanguage(estimate, clientRecord);
 *
 * Returns { language, source } where source explains where it came from.
 */

const VALID = new Set(['en', 'es', 'bilingual']);

/**
 * @param {Object} document  - Estimate or Proposal entity
 * @param {Object} [client]  - Client or Customer entity (optional)
 * @returns {{ language: string, source: 'document'|'client'|'default' }}
 */
export function resolveDocumentLanguage(document, client) {
  // 1. Already set on the document → respect it (manual override)
  const docLang = document?.document_language;
  if (docLang && VALID.has(docLang)) {
    return { language: docLang, source: 'document' };
  }

  // 2. Client preference
  const clientLang = client?.preferred_language;
  if (clientLang && VALID.has(clientLang)) {
    return { language: clientLang, source: 'client' };
  }

  // 3. Default
  return { language: 'en', source: 'default' };
}

/**
 * Resolves language for initial auto-selection when a client is first
 * associated with a document. Only returns a value if the client has a
 * preference AND the document doesn't already have one set.
 *
 * @returns {string|null} language to set, or null if no change needed
 */
export function getAutoLanguageForClient(document, client) {
  const docLang = document?.document_language;
  // If document already has a language set, don't override
  if (docLang && VALID.has(docLang)) return null;

  const clientLang = client?.preferred_language;
  if (clientLang && VALID.has(clientLang)) return clientLang;

  return null;
}