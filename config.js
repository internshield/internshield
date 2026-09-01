// ============================================================
// InternShield — Google Sheet connection
// After deploying the Apps Script (see apps-script-code.gs),
// paste your Web App URL below (it ends in /exec). Leave it
// empty ("") to keep the site working without a sheet connection.
// ============================================================
const SHEET_ENDPOINT = "";

function sendToSheet(formType, fields) {
  if (!SHEET_ENDPOINT) return;
  try {
    fetch(SHEET_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ formType: formType, fields: fields })
    }).catch(function () {});
  } catch (e) {}
}
