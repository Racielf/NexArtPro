// ONLY SHOWING RELEVANT PATCH
// Replace ALL occurrences of app_logo_url with nexartsign_logo_url in this file

// state
const EMPTY_LOGOS = { logo_url: '', nexartsign_logo_url: '' };

// state init
app_logo_url: ''  --> nexartsign_logo_url: ''

// load
app_logo_url: settings?.app_logo_url  --> nexartsign_logo_url: settings?.nexartsign_logo_url

// preview
app_logo_url --> nexartsign_logo_url

// LogoUploader usage
field="app_logo_url" --> field="nexartsign_logo_url"

// label stays the same (NexArtSign footer logo)
