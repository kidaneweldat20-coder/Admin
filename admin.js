/* ==========================================================================
   👑 KINGDOM HOTEL - ADMIN DASHBOARD JAVASCRIPT (FULLY OPTIMIZED & FIXED)
   ========================================================================== */

// 🛠️ ፊክስ: እቲ ሕቡእ Character ዝነበሮ URL ጽሩይ ተገይሩ ኣሎ
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxET7X5eFqm1IxtbcR36YkJhtpeIBDrV-qNow4d3vo4UGru7wULWZ-A9jcT9jY3C_KxSQ/exec";
    
const roomPrices = {
    "Single Room": 1250,
    "Double Room": 3000,
    "VIP Suite": 10000
};

// 🌟 ናይ መዓልታት መጸብጸቢ ሎጂክ
function calculateDays(checkInStr, checkOutStr) {
    if (!checkInStr || !checkOutStr) return 1;
    
    const inDate = parseLocalDate(checkInStr);
    const outDate = parseLocalDate(checkOutStr);
    
    if (!inDate || !outDate) return 1;

    const diffTime = outDate - inDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 1; 
    
    return diffDays;
}

// 🛠️ ናይ Timezone ጸገም ንምፍታሕ
function parseLocalDate(dateString) {
    if (!dateString) return null;
    const cleanStr = dateString.split('T')[0]; 
    const parts = cleanStr.split('-');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
}

// 1. ኩሉ ዳታ ካብ Google Sheet ንምምጻእ
async function fetchAllBookings() {
    const tbody = document.getElementById("tableBody");
    if (!tbody) return;
    
    tbody.innerHTML = "<tr><td colspan='7' class='loading-row'><i class='fas fa-spinner fa-spin'></i> ይጽዓን ኣሎ...</td></tr>";

    if (document.getElementById("startDate")) document.getElementById("startDate").value = "";
    if (document.getElementById("endDate")) {
        document.getElementById("endDate").value = "";
        document.getElementById("endDate").removeAttribute("min"); 
    }
    if (document.getElementById("searchInput")) document.getElementById("searchInput").value = "";

    try {
        const response = await fetch(`${SCRIPT_URL}?action=getAllBookings`);
        const bookings = await response.json();

        window.allBookingsData = [...bookings].reverse(); 
        renderTable(window.allBookingsData, false);

    } catch (error) {
        console.error("Fetch Error:", error);
        tbody.innerHTML = "<tr><td colspan='7' style='color:red; text-align:center;'>ዳታ ክመጽእ ኣይከኣለን። ኢንተርነትኩም ፈትሽኹም ደጊምኩም ፈትኑ።</td></tr>";
    }
}

// 🛠️ ነቲ ሰሌዳን ናይ ላዕሊ ካርዳትን (Cards) ፍጹም ብዘይ ምድግጋምን ብትኽክልን ንምስኣል
function renderTable(bookingsToShow, isFiltering = false) {
    const tbody = document.getElementById("tableBody");
    if (!tbody) return;
    
    tbody.innerHTML = ""; 

    let totalRevenue = 0;
    let pendingCount = 0;

    bookingsToShow.forEach(book => {
        const currentStatus = book.status || 'Pending';
        if (currentStatus === "Pending") pendingCount++;
        
        if (currentStatus === "Confirmed") {
            const days = calculateDays(book.checkIn, book.checkOut);
            const pricePerNight = roomPrices[book.room] || 0;
            totalRevenue += (pricePerNight * days);
        }
    });

    document.getElementById("totalCount").innerText = bookingsToShow.length;
    document.getElementById("pendingCount").innerText = pendingCount;
    
    if (!isFiltering) {
        document.getElementById("revenue").innerText = totalRevenue.toLocaleString() + " ETB";
    } else {
        document.getElementById("revenue").innerText = totalRevenue.toLocaleString() + " ETB (ሪፖርት)";
    }

    if (bookingsToShow.length === 0) {
        tbody.innerHTML = `<tr><td colspan='7' style='text-align:center; padding: 20px; color: #777;'><i class='fas fa-exclamation-triangle'></i> ኣብዚ ዝመረጽካዮ ዕለት ወይ ሽም ዝተረኽበ ዳታ የለን!</td></tr>`;
        return;
    }

    bookingsToShow.forEach(book => {
        const currentStatus = book.status || 'Pending';
        const isDisabled = (currentStatus === "Confirmed" || currentStatus === "Cancelled") ? "disabled" : "";

        const row = `
            <tr>
                <td><strong>${book.name}</strong><br><small style="color:#777;">${book.timestamp ? book.timestamp.split('T')[0] : ''}</small></td>
                <td><span class="room-tag">${book.room}</span></td>
                <td>${book.phone && book.phone !== "No Phone" ? book.phone : '<span style="color:#aaa;">No Phone</span>'}</td>
                <td><small>In:</small> ${book.checkIn ? book.checkIn.split('T')[0] : ''}<br><small>Out:</small> ${book.checkOut ? book.checkOut.split('T')[0] : ''}</td>
                <td>
                    ${book.receipt && book.receipt !== "No Image" ? `<a href="${book.receipt}" target="_blank" class="btn view-receipt-btn" style="padding: 4px 8px; font-size:12px; background:#4A154B; color:white; text-decoration:none; border-radius:4px;"><i class="fas fa-image"></i> View</a>` : '<span style="color:#aaa;">No Receipt</span>'}
                </td>
                <td><span class="status-badge ${currentStatus.toLowerCase()}">${currentStatus}</span></td>
                <td>
                    <button class="btn table-confirm-btn" style="background:#2ecc71; color:white; border:none; padding:5px 8px; cursor:pointer; border-radius:4px;"
                            onclick="updateStatus(${book.row}, 'Confirmed', this)" 
                            ${isDisabled}>Confirm</button>
                    <button class="btn table-cancel-btn" style="background:#e74c3c; color:white; border:none; padding:5px 8px; cursor:pointer; border-radius:4px;"
                            onclick="updateStatus(${book.row}, 'Cancelled', this)" 
                            ${isDisabled}>Cancel</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// 🛠️ End Date ካብ Start Date ንታሕቲ ንከይመርጽ ዝከታተል ፋንክሽን
function setupDateListeners() {
    const startDateInput = document.getElementById("startDate");
    const endDateInput = document.getElementById("endDate");

    if (startDateInput && endDateInput) {
        startDateInput.addEventListener("input", function () {
            if (startDateInput.value) {
                endDateInput.min = startDateInput.value;
                if (endDateInput.value && endDateInput.value < startDateInput.value) {
                    endDateInput.value = startDateInput.value;
                }
            } else {
                endDateInput.removeAttribute("min");
            }
        });
    }
}

// 2. ብዕለት ሪፖርት ንምውጻእ
function filterByDate() {
    const startStr = document.getElementById("startDate").value;
    const endStr = document.getElementById("endDate").value;
    
    if (!startStr || !endStr) {
        showCustomAlert("በጃኹም ክልቲኡ ዕለታት ምልኡ!");
        return;
    }

    const startDate = parseLocalDate(startStr);
    const endDate = parseLocalDate(endStr);
    
    if (endDate < startDate) {
        showCustomAlert("ጌጋ: መወዳእታ ዕለት ካብ መጀመርታ ዕለት ክንእስ ኣይኽእልን!");
        return;
    }

    if (!window.allBookingsData || window.allBookingsData.length === 0) {
        showCustomAlert("ዳታ ገና ኣይተጻዕነን ወይ የለን!");
        return;
    }

    const filteredBookings = window.allBookingsData.filter(book => {
        if (!book.checkIn) return false;
        const checkInDate = parseLocalDate(book.checkIn);
        
        if (startDate.getTime() === endDate.getTime()) {
            return checkInDate && checkInDate.getTime() === startDate.getTime();
        } else {
            // 🛠️ ፊክስ: እታ መወዳእታ ዕለት እውን ንክትሕወስ <= ተገይራ ኣላ
            return checkInDate && checkInDate >= startDate && checkInDate <= endDate;
        }
    });

    renderTable(filteredBookings, true);
    showCustomAlert(`ሪፖርት ካብ ${startStr} ክሳብ ${endStr} ተጻርዩ ኣሎ!`);
}

// 3. Status ኩነታት ንምቕያር (FIXED FOR APPS SCRIPT CORS & REDIRECTS)
function updateStatus(row, newStatus, buttonElement) {
    const confirmOverlay = document.getElementById("customConfirmOverlay");
    const confirmMessage = document.getElementById("confirmMessage");
    const yesBtn = document.getElementById("confirmYesBtn");
    const noBtn = document.getElementById("confirmNoBtn");

    if (!confirmOverlay || !confirmMessage) return;

    confirmMessage.innerText = `ነዚ ምዝገባ ናብ "${newStatus}" ክትቅይሮን ንዓሚል ናይ ኢመይል መልእኽቲ ክትሰደሉን ርግጸኛ ዲኻ?`;
    confirmOverlay.style.display = "flex"; 

    noBtn.onclick = function() {
        confirmOverlay.style.display = "none";
    };

    yesBtn.onclick = async function() {
        confirmOverlay.style.display = "none"; 

        const originalText = buttonElement.innerText;
        buttonElement.innerHTML = "<i class='fas fa-spinner fa-spin'></i>";
        buttonElement.disabled = true;

        try {
            const updateData = { action: "updateStatus", row: row, status: newStatus };

            // 🛠️ ፊክስ: CORS Error ንምውጋድን Apps Script ብግቡእ ዴታ ክቕበልን 'no-cors' ጠፊኡ ኣሎ
            const response = await fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify(updateData) // Apps Script ነዚ JSON.parse(e.postData.contents) ጌሩ የንብቦ
            });

            // 🛠️ Google Apps Script መብዛሕቱ ግዘ Redirect ስለ ዝገብር (302)፣ ኔትወርክ ሰክሰስ ምዃኑ ጥራይ ምርግጋፅ ይኣክል
            showToast(`ትእዛዝ ተሰዲዱ ኣሎ! ዓሚል ናይ "${newStatus}" SMSን ኢመይልን ክበጽሖ እዩ።`, "success");
            
            setTimeout(() => {
                fetchAllBookings(); 
            }, 1500);

        } catch (e) {
            console.error("Update Error:", e);
            showToast("ጌጋ ተፈጢሩ፡ በጃኹም ኢንተርነትኩም ፈትሹ።", "error");
            buttonElement.disabled = false;
            buttonElement.innerText = originalText;
        }
    };
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toastNotification");
    const toastMsg = document.getElementById("toastMessage");
    const toastIcon = document.getElementById("toastIcon");

    if (!toast || !toastMsg || !toastIcon) return;

    toastMsg.innerText = message;

    if (type === "error") {
        toast.style.background = "#e74c3c";
        toastIcon.className = "fas fa-exclamation-circle";
    } else {
        toast.style.background = "#2ecc71";
        toastIcon.className = "fas fa-check-circle";
    }

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

// 4. Search Filter (ምድላይ)
function filterBookings() {
    const input = document.getElementById("searchInput");
    if (!input) return;
    const filter = input.value.trim().toLowerCase();
    
    if (!window.allBookingsData) return;

    const filtered = window.allBookingsData.filter(book => {
        const nameText = (book.name || "").toLowerCase();
        const roomText = (book.room || "").toLowerCase();
        const phoneText = book.phone !== undefined && book.phone !== null ? String(book.phone).toLowerCase() : "";
        
        return nameText.includes(filter) || roomText.includes(filter) || phoneText.includes(filter);
    });

    renderTable(filtered, false);
}

// 🔄 Theme መቐያየሪ ሎጂክ
function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById("themeToggle");
    if (!themeBtn) return;
    
    body.classList.toggle("dark-mode");
    
    if (body.classList.contains("dark-mode")) {
        themeBtn.innerHTML = `<i class="fas fa-sun"></i> Day Mode`;
        localStorage.setItem("theme", "dark");
    } else {
        themeBtn.innerHTML = `<i class="fas fa-moon"></i> Night Mode`;
        localStorage.setItem("theme", "light");
    }
}

// 🌟 ኩሉ ፔጅ ክኽፈት ከሎ ብሓባር ዝሰርሑ ሎጂካት 
document.addEventListener("DOMContentLoaded", () => {
    setupDateListeners();
    
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        const themeBtn = document.getElementById("themeToggle");
        if (themeBtn) themeBtn.innerHTML = `<i class="fas fa-sun"></i> Day Mode`;
    }

    fetchAllBookings();
});

function showCustomAlert(message) {
    const alertBox = document.getElementById("customAlert");
    const alertMsg = document.getElementById("customAlertMessage");
    if (alertBox && alertMsg) {
        alertMsg.innerText = message;
        alertBox.classList.remove("hidden");
    }
}

function closeCustomAlert() {
    const alertBox = document.getElementById("customAlert");
    if (alertBox) {
        alertBox.classList.add("hidden");
    }
}
