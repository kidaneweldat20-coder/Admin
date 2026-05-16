/**
 * KINGDOM HOTEL - BACKEND SYSTEM (FULLY FIXED & SYNCHRONIZED)
 * -----------------------------------------------------------
 */

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Kingdom backend");
  var data = {};

  // --- 1. ካብ ዝተፈላለዩ ፎርማታት ዳታ ምውህሃድ ---
  if (e.parameter && e.parameter.action) {
    data = e.parameter;
  } else if (e.postData && e.postData.contents) {
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      var raw = e.postData.contents;
      var pairs = raw.split('&');
      for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        data[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
      }
    }
  }

  // --- 2. ካብ Admin Dashboard ዝመጽእ Status Update (Confirm/Cancel) ---
  if (data.action === "updateStatus") {
    var rowIndex = parseInt(data.row);
    var newStatus = data.status;
    
    // Column I ማለት መበል 9 ዓንዲ እዩ (Status)። ቅድሚ ሕጂ 8 ኔሩ ሕጂ ናብ 9 ተቐይሩ ኣሎ።
    sheet.getRange(rowIndex, 9).setValue(newStatus); 
    
    // ንዓሚል ሓበሬታ ንምልኣኽ ዳታ ምውሳድ
    var rowData = sheet.getRange(rowIndex, 1, 1, 9).getValues()[0];
    var customerName = rowData[1];  // Column B
    var customerEmail = rowData[2]; // Column C
    var roomType = rowData[4];      // Column E (ክፍሊ)

    // ናይ Status ለውጢ ኢመይል ምስዳድ
    try {
      sendStatusEmail(customerEmail, customerName, roomType, newStatus);
    } catch (emailErr) {
      console.log("Email sending failed: " + emailErr);
    }
    
    var response = { "status": "success", "message": "Status updated and email processed." };
    return ContentService.createTextOutput(JSON.stringify(response))
                         .setMimeType(ContentService.MimeType.JSON);
  }

  // --- 3. ሓድሽ ምዝገባ ካብ ዓማውል (New Booking) ---
  if (data.name) {
    sheet.appendRow([
      new Date(),          // A: Timestamp
      data.name,           // B: Name
      data.email,          // C: Email
      data.phone || "",    // D: Phone Number (እዚ ተወሲኹ ዘሎ)
      data.room,           // E: Room type
      data.receipt,        // F: Receipt link
      data.checkIn,        // G: Check-in
      data.checkOut,       // H: Check-out
      "Pending"            // I: Status
    ]);

    // ናይ መጀመርታ "ምዝገባ ተቐቢልናዮ ኣለና" ዝብል ኢመይል
    try {
      sendConfirmationEmail(data.email, data.name, data.room, data.checkIn, data.checkOut);
    } catch (err) { 
      console.log("Initial email error: " + err); 
    }

    var response = { "status": "success", "message": "Booking added successfully." };
    return ContentService.createTextOutput(JSON.stringify(response))
                         .setMimeType(ContentService.MimeType.JSON);
  }

  var errorResponse = { "status": "error", "message": "Invalid action or parameters" };
  return ContentService.createTextOutput(JSON.stringify(errorResponse))
                       .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Kingdom backend");

  // --- 4. Dashboard Data (ንኹሉ ምዝገባታት ምርኣይ) ---
  if (e.parameter.action === "getAllBookings") {
    var data = sheet.getDataRange().getValues();
    var bookings = [];
    
    for (var i = 1; i < data.length; i++) {
      if (!data[i][1]) continue; // እንተደኣ ስም ባዶ ኾይኑ ንከይወስዶ
      
      // *** ዚ እዩ እቲ ቀንዲ መዐረዪ! Index-ታት ምስቲ Sheet ተሰማሚዖም ኣለዉ ***
      bookings.push({
        row: i + 1, 
        timestamp: data[i][0] ? Utilities.formatDate(new Date(data[i][0]), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd HH:mm") : "", 
        name: data[i][1],       // B
        email: data[i][2],      // C
        phone: data[i][3],      // D (ቅድሚ ሕጂ ተረሲዑ ዝነበረ)
        room: data[i][4],       // E
        receipt: data[i][5],    // F
        checkIn: data[i][6] ? Utilities.formatDate(new Date(data[i][6]), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : "",   // G
        checkOut: data[i][7] ? Utilities.formatDate(new Date(data[i][7]), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : "", // H
        status: data[i][8] || "Pending" // I
      });
    }
    return ContentService.createTextOutput(JSON.stringify(bookings))
                         .setMimeType(ContentService.MimeType.JSON);
  }

  // --- 5. Check Availability (ክፍሊ ምህላው/ዘይምህላው ምርጋጽ) ---
  var room = e.parameter.room;
  var checkIn = new Date(e.parameter.checkIn);
  var checkOut = new Date(e.parameter.checkOut);
  
  var inventorySheet = ss.getSheetByName("Inventory");
  if (!inventorySheet) {
    return ContentService.createTextOutput(JSON.stringify({ "error": "Inventory sheet not found" })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var invData = inventorySheet.getDataRange().getValues();
  var total = 0;
  for (var i = 1; i < invData.length; i++) { 
    if (invData[i][0] === room) { 
      total = parseInt(invData[i][1]) || 0; 
      break; 
    } 
  }

  var currentBookings = sheet.getDataRange().getValues();
  var count = 0;
  for (var j = 1; j < currentBookings.length; j++) {
    var bStatus = currentBookings[j][8] || "Pending"; // ዓምዲ 9 (Index 8)

    if (bStatus === "Cancelled") continue; 

    if (currentBookings[j][4] === room) { // ዓምዲ E (Index 4)
      var bIn = new Date(currentBookings[j][6]);  // ዓምዲ G
      var bOut = new Date(currentBookings[j][7]); // ዓምዲ H
      if (checkIn < bOut && checkOut > bIn) count++;
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    available: count < total, 
    remaining: total - count
  })).setMimeType(ContentService.MimeType.JSON);
}

// --- ኢመይል ዝሰድዱ Functions ---
function sendConfirmationEmail(customerEmail, customerName, roomType, checkIn, checkOut) {
  var subject = "Kingdom Hotel - Booking Received";
  var body = "ሰላም " + customerName + ",\n\n" +
             "ምዝገባኹም ተቐቢልናዮ ኣለና። ድሕሪ ምጽራይ መልሲ ክንህበኩም ኢና።\n\n" +
             "--- ዝርዝር ---\n" +
             "ዓይነት ክፍሊ: " + roomType + "\n" +
             "Check-in: " + checkIn + "\n" +
             "Check-out: " + checkOut + "\n\n" +
             "የቐንየልና!";
  MailApp.sendEmail(customerEmail, subject, body);
}

function sendStatusEmail(email, name, room, status) {
  var subject = "Update: Your Booking at Kingdom Hotel - " + status;
  var statusMsg = (status === "Confirmed") ? 
      "ምዝገባኹም ተረጋጊጹ ኣሎ (Confirmed)! ብደሓን ምጹ።" : 
      "ይቕሬታ፡ ምዝገባኹም ተሰሪዙ ኣሎ (Cancelled)። ንተወሳኺ ሓበሬታ ብኢመይል ወይ ብስልኪ ተወከሱና।";

  var body = "ሰላም " + name + ",\n\n" +
             statusMsg + "\n\n" +
             "--- ዝርዝር ---\n" +
             "ዓይነት ክፍሊ: " + room + "\n" +
             "ኩነታት (Status): " + status + "\n\n" +
             "የቐንየልና!";
  
  MailApp.sendEmail(email, subject, body);
}
