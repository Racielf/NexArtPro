// Provider-agnostic external signature adapter layer
// This does NOT activate any provider. It prepares the system for future integrations.

export const SIGNATURE_PROVIDERS = {
  INTERNAL: 'internal',
  DOCUSIGN: 'docusign',
  DROPBOX_SIGN: 'dropbox_sign',
  PANDADOC: 'pandadoc',
  ADOBE_SIGN: 'adobe_sign',
  SIGNNOW: 'signnow',
};

// Standard interface all providers must implement
export async function createSignatureRequest(provider, payload) {
  switch (provider) {
    case SIGNATURE_PROVIDERS.DOCUSIGN:
      return createDocuSignRequest(payload);
    case SIGNATURE_PROVIDERS.DROPBOX_SIGN:
      return createDropboxSignRequest(payload);
    case SIGNATURE_PROVIDERS.PANDADOC:
      return createPandaDocRequest(payload);
    default:
      throw new Error('Unsupported signature provider');
  }
}

export async function handleSignatureWebhook(provider, event) {
  switch (provider) {
    case SIGNATURE_PROVIDERS.DOCUSIGN:
      return handleDocuSignWebhook(event);
    case SIGNATURE_PROVIDERS.DROPBOX_SIGN:
      return handleDropboxSignWebhook(event);
    case SIGNATURE_PROVIDERS.PANDADOC:
      return handlePandaDocWebhook(event);
    default:
      throw new Error('Unsupported signature provider');
  }
}

// ---- STUB IMPLEMENTATIONS (NOT ACTIVE) ----

async function createDocuSignRequest(payload) {
  return {
    provider: 'docusign',
    status: 'not_implemented',
    message: 'DocuSign integration not yet configured',
  };
}

async function handleDocuSignWebhook(event) {
  return { provider: 'docusign', received: true, event };
}

async function createDropboxSignRequest(payload) {
  return {
    provider: 'dropbox_sign',
    status: 'not_implemented',
    message: 'Dropbox Sign integration not yet configured',
  };
}

async function handleDropboxSignWebhook(event) {
  return { provider: 'dropbox_sign', received: true, event };
}

async function createPandaDocRequest(payload) {
  return {
    provider: 'pandadoc',
    status: 'not_implemented',
    message: 'PandaDoc integration not yet configured',
  };
}

async function handlePandaDocWebhook(event) {
  return { provider: 'pandadoc', received: true, event };
}
