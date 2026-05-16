const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxET7X5eFqm1IxtbcR36YkJhtpeIBDrV-qNow4d3vo4UGru7wULWZ-A9jcT9jY3C_KxSQ/exec";
    
    const roomPrices = {
        "Single Room": 1250,
        "Double Room": 3000,
        "VIP Suite": 10000
    };

    // ፋንክሽን: መዓልታት ብንጹር ንምጽብጻብ
    function calculateDays(checkInStr, checkOutStr) {
        if (!checkInStr || !checkOutStr) return 1;
        
        // ጽሑፍ ጥራይ ፈሊኻ ንምውሳድ (e.g. "2026-05-16")
        const inDate = new Date(checkInStr.split('T')[0]);
        const outDate = new Date(checkOutStr.split('T')[0]);
        
        if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return 1;

        const diffTime = outDate - inDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // እቲ ቁጽሪ ካብ 0 ንታሕቲ ወይ ሰማይ ዝዓረገ ጌጋ እንተኮይኑ 1 መዓልቲ ይግበሮ
        if (diffDays <= 0 || diffDays > 60) return 1; 
        
        return diffDays;
    }

    // 1. ኩሉ ዳታ ካብ Google Sheet ንምምጻእ
    async function fetchAllBookings() {
        const tbody = document.getElementById("tableBody");
        tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>ይጽዓን ኣሎ...</td></tr>";

        if (document.getElementById("startDate")) document.getElementById("startDate").value = "";
        if (document.getElementById("endDate")) document.getElementById("endDate").value = "";
        if (document.getElementById("searchInput")) document.getElementById("searchInput").value = "";

        try {
            const response = await fetch(`${SCRIPT_URL}?action=getAllBookings`);
            const bookings = await response.json();

            window.allBookingsData = bookings; 

            tbody.innerHTML = "";
            let totalRevenue = 0;
            let pending = 0;

            [...bookings].reverse().forEach(book => {
                const currentStatus = book.status || 'Pending';
                
                // *** Confirmed ጥራይ ኣታዊኦም ብጥንቃቄ ይውሰድ ***
                if (currentStatus === "Confirmed") {
                    const days = calculateDays(book.checkIn, book.checkOut);
                    const pricePerNight = roomPrices[book.room] || 0;
                    totalRevenue += (pricePerNight * days);
                }

                if (currentStatus === "Pending") pending++;

                const isDisabled = (currentStatus === "Confirmed" || currentStatus === "Cancelled") ? "disabled" : "";

                const row = `
                    <tr>
                        <td><strong>${book.name}</strong><br><small>${book.timestamp || ''}</small></td>
                        <td>${book.room}</td>
                        <td>${book.phone || '<span style="color:#aaa;">No Phone</span>'}</td>
                        <td><small>In:</small> ${book.checkIn ? book.checkIn.split('T')[0] : ''}<br><small>Out:</small> ${book.checkOut ? book.checkOut.split('T')[0] : ''}</td>
                        <td>
                            ${book.receipt && book.receipt !== "No Image" ? `<a href="${book.receipt}" target="_blank" class="btn view-receipt" style="padding:4px 8px; font-size:0.8rem;"><i class="fas fa-image"></i> View</a>` : '<span style="color:#aaa;">No Receipt</span>'}
                        </td>
                        <td><span class="status-badge ${currentStatus.toLowerCase()}">${currentStatus}</span></td>
                        <td>
                            <button class="btn confirm-btn" style="padding:4px 8px; font-size:0.8rem;"
                                    onclick="updateStatus(${book.row}, 'Confirmed', this)" 
                                    ${isDisabled}>Confirm</button>
                            <button class="btn cancel-btn" style="padding:4px 8px; font-size:0.8rem;"
                                    onclick="updateStatus(${book.row}, 'Cancelled', this)" 
                                    ${isDisabled}>Cancel</button>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });

            document.getElementById("totalCount").innerText = bookings.length;
            document.getElementById("pendingCount").innerText = pending;
            document.getElementById("revenue").innerText = totalRevenue.toLocaleString() + " ETB";

        } catch (error) {
            console.error("Fetch Error:", error);
            tbody.innerHTML = "<tr><td colspan='7' style='color:red; text-align:center;'>ዳታ ክመጽእ ኣይከኣለን።</td></tr>";
        }
    }

    // 2. ብዕለት ሪፖርት ንምውጻእ
    function filterByDate() {
        const startStr = document.getElementById("startDate").value;
        const endStr = document.getElementById("endDate").value;
        
        if (!startStr || !endStr) {
            alert("በጃኹም ክልቲኡ ዕለታት ምልኡ!");
            return;
        }

        const startDate = new Date(startStr);
        const endDate = new Date(endStr);
        endDate.setHours(23, 59, 59);

        const table = document.getElementById("tableBody");
        const tr = table.getElementsByTagName("tr");
        let filteredRevenue = 0;

        const bookings = [...window.allBookingsData].reverse();

        for (let i = 0; i < tr.length; i++) {
            const book = bookings[i];
            if (!book) continue;

            const checkInDate = new Date(book.checkIn.split('T')[0]);

            if (checkInDate >= startDate && checkInDate <= endDate) {
                tr[i].style.display = "";
                
                if (book.status === "Confirmed") {
                    const days = calculateDays(book.checkIn, book.checkOut);
                    filteredRevenue += ((roomPrices[book.room] || 0) * days);
                }
            } else {
                tr[i].style.display = "none";
            }
        }

        document.getElementById("revenue").innerText = filteredRevenue.toLocaleString() + " ETB (ሪፖርት)";
        alert("ናይቲ ዝመረጽካዮ ዕለት ሪፖርት ተዳልዩ ኣሎ።");
    }

    // 3. Status ንምቕያር
    async function updateStatus(row, newStatus, buttonElement) {
        const bookings = window.allBookingsData || [];
        const currentBooking = bookings.find(b => b.row === row);

        if (!currentBooking) {
            alert("Error: Booking data not found.");
            return;
        }

        if (!confirm(`ነዚ ምዝገባ ናብ ${newStatus} ክትቅይሮን ንዓሚል ኢመይል ክትሰደሉን ርግጸኛ ዲኻ?`)) return;

        buttonElement.innerText = "Processing...";
        buttonElement.disabled = true;

        try {
            const updateData = {
                action: "updateStatus",
                row: row,
                status: newStatus
            };

            await fetch(SCRIPT_URL, {
                method: "POST",
                mode: "no-cors", 
                body: JSON.stringify(updateData)
            });

            alert(`ትእዛዝ ተሰዲዱ ኣሎ! ዓሚል ናይ ${newStatus} ኢመይል ክበጽሖ እዩ።`);
            
            setTimeout(() => {
                fetchAllBookings(); 
            }, 1500);

        } catch (e) {
            console.error("Update Error:", e);
            alert("ጌጋ ተፈጢሩ፡ በጃኹም ኢንተርነትኩም ፈትሹ።");
            buttonElement.disabled = false;
            buttonElement.innerText = newStatus;
        }
    }

    // 4. Search Filter
    function filterBookings() {
        const input = document.getElementById("searchInput");
        const filter = input.value.toLowerCase();
        const table = document.getElementById("tableBody");
        const tr = table.getElementsByTagName("tr");

        for (let i = 0; i < tr.length; i++) {
            const nameColumn = tr[i].getElementsByTagName("td")[0];
            const roomColumn = tr[i].getElementsByTagName("td")[1];
            const phoneColumn = tr[i].getElementsByTagName("td")[2];

            if (nameColumn || roomColumn || phoneColumn) {
                const nameText = nameColumn.textContent || nameColumn.innerText;
                const roomText = roomColumn.textContent || roomColumn.innerText;
                const phoneText = phoneColumn.textContent || phoneColumn.innerText;
                
                if (nameText.toLowerCase().indexOf(filter) > -1 || 
                    roomText.toLowerCase().indexOf(filter) > -1 ||
                    phoneText.toLowerCase().indexOf(filter) > -1) {
                    tr[i].style.display = "";
                } else {
                    tr[i].style.display = "none";
                }
            }
        }
    }

    window.onload = fetchAllBookings;