// PATCH
// change this line:
// const signatureBrandLogoUrl = settings?.app_logo_url

const signatureBrandLogoUrl = settings?.nexartsign_logo_url
  || settings?.app_logo_url
  || companyLogoUrl
  || APP_CONFIG?.app?.logo_url
  || '';
