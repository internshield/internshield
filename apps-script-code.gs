// ============================================================
// InternShield — Google Sheet Backend (Apps Script)
// 1. Open your Google Sheet -> Extensions -> Apps Script
// 2. Delete any existing code, paste this file's content
// 3. Click Deploy -> New deployment -> type: Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 4. Click Deploy, authorize when asked, copy the URL (ends in /exec)
// 5. Paste that URL into config.js on the website (SHEET_ENDPOINT)
// ============================================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheetName = data.formType || 'Submissions';
    var fields = data.fields || {};
    var keys = Object.keys(fields);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['Timestamp'].concat(keys));
    }

    var lastCol = sheet.getLastColumn();
    var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : ['Timestamp'];

    // add any new field as a new column automatically
    keys.forEach(function (k) {
      if (headers.indexOf(k) === -1) {
        headers.push(k);
        sheet.getRange(1, headers.length).setValue(k);
      }
    });

    var row = headers.map(function (h) {
      if (h === 'Timestamp') return new Date();
      return fields[h] !== undefined ? fields[h] : '';
    });
    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Optional: lets you open the /exec URL directly in a browser to confirm it's live
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'InternShield endpoint is live' }))
    .setMimeType(ContentService.MimeType.JSON);
}
