// =============================================
//  SPRINT ENROLLMENT FORM — Code.gs
//  Google Apps Script Backend
//  Saves data to Google Sheets + Google Drive
// =============================================
//
//  SETUP INSTRUCTIONS:
//  1. Go to https://script.google.com → New Project
//  2. Paste this entire file into the editor
//  3. Replace SHEET_ID and FOLDER_ID with your own (see below)
//  4. Click Deploy → New deployment → Web app
//     - Execute as: Me
//     - Who has access: Anyone
//  5. Copy the deployed URL into script.js → APPS_SCRIPT_URL
// =============================================

// ── CONFIGURATION ──
const SHEET_ID  = 'YOUR_GOOGLE_SHEET_ID_HERE';   // From the Sheet URL
const FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID'; // Drive folder for file uploads

// ── Handle POST request from the form ──
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();
    const folder = DriveApp.getFolderById(FOLDER_ID);

    // Create a subfolder per employee
    const empFolder = folder.createFolder(
      `${data.firstName}_${data.lastName}_${new Date().toISOString().slice(0,10)}`
    );

    // Upload files to Drive and get their URLs
    const fileFields = [
      { key: 'aadharFile',     nameKey: 'aadharFileName',     label: 'Aadhar' },
      { key: 'panFile',        nameKey: 'panFileName',        label: 'PAN' },
      { key: 'relievingFile',  nameKey: 'relievingFileName',  label: 'Relieving' },
      { key: 'experienceFile', nameKey: 'experienceFileName', label: 'Experience' },
      { key: 'photoFile',      nameKey: 'photoFileName',      label: 'Photo' },
      { key: 'signFile',       nameKey: 'signFileName',       label: 'Sign' },
    ];

    const fileUrls = {};
    fileFields.forEach(f => {
      if (data[f.key]) {
        const url = saveFileToDrive(data[f.key], data[f.nameKey] || f.label, empFolder);
        fileUrls[f.key + 'Url'] = url;
      } else {
        fileUrls[f.key + 'Url'] = 'Not uploaded';
      }
    });

    // Append row to sheet
    sheet.appendRow([
      new Date(),
      data.firstName,
      data.lastName,
      data.relName,
      data.dob,
      data.pob,
      data.bloodGroup,
      data.mobile,
      data.email,
      data.doj,
      data.currentAddrType,
      data.currentAddr,
      data.permAddrType,
      data.permAddr,
      data.emergencyName,
      data.emergencyNumber,
      data.dlNumber        || '',
      data.passportNumber  || '',
      fileUrls.aadharFileUrl,
      fileUrls.panFileUrl,
      fileUrls.relievingFileUrl,
      fileUrls.experienceFileUrl,
      fileUrls.photoFileUrl,
      fileUrls.signFileUrl,
      empFolder.getUrl(),
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', folder: empFolder.getUrl() }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Handle GET (for CORS pre-flight) ──
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Sprint Enrollment API is live.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Save Base64 file to Google Drive ──
function saveFileToDrive(base64Data, fileName, folder) {
  try {
    const decoded  = Utilities.base64Decode(base64Data);
    const blob     = Utilities.newBlob(decoded, getMimeType(fileName), fileName);
    const file     = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    return 'Upload error: ' + err.message;
  }
}

// ── Determine MIME type from filename ──
function getMimeType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const types = {
    'pdf':  'application/pdf',
    'png':  'image/png',
    'jpg':  'image/jpeg',
    'jpeg': 'image/jpeg',
  };
  return types[ext] || 'application/octet-stream';
}

// ── Get or create the Google Sheet with headers ──
function getOrCreateSheet() {
  const ss          = SpreadsheetApp.openById(SHEET_ID);
  const sheetName   = 'Enrollments';
  let sheet         = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = [
      'Submitted At', 'First Name', 'Last Name', 'Relative Name',
      'Date of Birth', 'Place of Birth', 'Blood Group',
      'Mobile', 'Email', 'Date of Joining',
      'Current Addr Type', 'Current Address',
      'Perm Addr Type', 'Permanent Address',
      'Emergency Contact Name', 'Emergency Contact Number',
      'DL Number', 'Passport Number',
      'Aadhar File URL', 'PAN File URL',
      'Relieving Letter URL', 'Experience Letter URL',
      'Photo URL', 'Signature URL',
      'Documents Folder URL'
    ];
    sheet.appendRow(headers);

    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#1a2a4a');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}
