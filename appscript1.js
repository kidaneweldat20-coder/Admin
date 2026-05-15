/**
 * KINGDOM HOTEL - BACKEND SYSTEM
 * -----------------------------
 * ዝተፈላለዩ ተግባራት: 
 * 1. ሓድሽ ምዝገባ ምቕባል
 * 2. ምዝገባ ምርግጋጽ/ምስራዝ (Update Status)
 * 3. ዘለዉ ምዝገባታት ዳታ ምሃብ
 * 4. ክፍሊ ምህላው/ዘይምህላው ምርጋጽ (Availability)
 */

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Kingdom backend");
  var data = JSON.parse(e.postData.contents);

  // --- 1. ካብ Admin Dashboard ዝመጽእ Status Update (Confirm/Cancel) ---
  if (data.action === "updateStatus") {
    // ኣብቲ ዝተዋህበ መስርዕ (Row) Status ጥራይ ምቕያር
    sheet.getRange(data.row, 8).setValue(data.status); // Column H: Status
    
    // ንዓሚል ሓበሬታ ንምልኣኽ ዳታ ምውሳድ
    var rowData = sheet.getRange(data.row, 1, 1, 8).getValues()[0];
    var customerName = rowData[1];  // Column B
    var customerEmail = rowData[2]; // Column C
    var roomType = rowData[3];      // Column D

    // ናይ Status ለውጢ ኢመይል ምስዳድ
    sendStatusEmail(customerEmail, customerName, roomType, data.status);
    
    return ContentService.createTextOutput("Updated and Email Sent");
  }

  // --- 2. ሓድሽ ምዝገባ (New Booking) ---
  // ዳታ ናብቲ ሽት (Sheet) ምእታው
  sheet.appendRow([
    new Date(),      // A: Timestamp
    data.name,       // B: Name
    data.email,      // C: Email
    data.room,       // D: Room type
    data.receipt,    // E: Receipt link
    data.checkIn,    // F: Check-in
    data.checkOut,   // G: Check-out
    "Pending"        // H: Status (መጀመርታ ኩሉ ግዜ Pending እዩ)
  ]);

  // ናይ መጀመርታ "ምዝገባ ተቐቢልናዮ ኣለና" ዝብል ኢመይል
  try {
    sendConfirmationEmail(data.email, data.name, data.room, data.checkIn, data.checkOut);
  } catch (err) { 
    console.log("Initial email error: " + err); 
  }

  return ContentService.createTextOutput("Success");
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Kingdom backend");

  // --- 3. Dashboard Data (ንኹሉ ምዝገባታት ምርኣይ) ---
  if (e.parameter.action === "getAllBookings") {
    var data = sheet.getDataRange().getValues();
    var bookings = [];
    
    for (var i = 1; i < data.length; i++) {
      bookings.push({
        row: i + 1, 
        timestamp: data[i][0], 
        name: data[i][1], 
        email: data[i][2],
        room: data[i][3], 
        receipt: data[i][4], 
        checkIn: data[i][5], 
        checkOut: data[i][6],
        status: data[i][7] || "Pending"
      });
    }
    return ContentService.createTextOutput(JSON.stringify(bookings))
                         .setMimeType(ContentService.MimeType.JSON);
  }

  // --- 4. Check Availability (ክፍሊ ምህላው/ዘይምህላው ምርጋጽ) ---
  var room = e.parameter.room;
  var checkIn = new Date(e.parameter.checkIn);
  var checkOut = new Date(e.parameter.checkOut);
  
  // ካብ Inventory Sheet ጠቕላላ ብዝሒ ክፍልታት ምርካብ
  var inventorySheet = ss.getSheetByName("Inventory");
  var invData = inventorySheet.getDataRange().getValues();
  var total = 0;
  for (var i = 1; i < invData.length; i++) { 
    if (invData[i][0] === room) { 
      total = invData[i][1]; 
      break; 
    } 
  }

  // ሕጂ ተታሒዞም ዘለዉ ክፍልታት ምቑጻር
  var currentBookings = sheet.getDataRange().getValues();
  var count = 0;
  for (var j = 1; j < currentBookings.length; j++) {
    var bStatus = currentBookings[j][7] || "Pending";

    // ዝተሰረዙ (Cancelled) ከይቆጽሮም
    if (bStatus === "Cancelled") continue; 

    if (currentBookings[j][3] === room) {
      var bIn = new Date(currentBookings[j][5]);
      var bOut = new Date(currentBookings[j][6]);
      // ዕለታት ዝደራረቡ እንተኾይኖም
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
      "ይቕሬታ፡ ምዝገባኹም ተሰሪዙ ኣሎ (Cancelled)። ንተወሳኺ ሓበሬታ ብኢመይል ወይ ብስልኪ ተወከሱና።";

  var body = "ሰላም " + name + ",\n\n" +
             statusMsg + "\n\n" +
             "--- ዝርዝር ---\n" +
             "ዓይነት ክፍሊ: " + room + "\n" +
             "ኩነታት (Status): " + status + "\n\n" +
             "የቐንየልና!";
  
  MailApp.sendEmail(email, subject, body);
}
