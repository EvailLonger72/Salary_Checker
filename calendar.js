// calendar.js - Enhanced Calendar View Functionality

// Global variables
let currentDate = new Date();
let currentView = "month"; // 'month' or 'week'
let weeklyData = JSON.parse(localStorage.getItem("weeklyData") || "[]");
let plannedShifts = JSON.parse(localStorage.getItem("plannedShifts") || "[]");
let editingEntry = null;

// Japanese holidays for 2025
const holidays = {
  "2025-01-01": "元日 (New Year)",
  "2025-01-13": "成人の日 (Coming of Age Day)",
  "2025-02-11": "建国記念の日 (National Foundation Day)",
  "2025-02-23": "天皇誕生日 (Emperor's Birthday)",
  "2025-02-24": "振替休日 (Substitute Holiday)",
  "2025-03-20": "春分の日 (Vernal Equinox Day)",
  "2025-04-29": "昭和の日 (Showa Day)",
  "2025-05-03": "憲法記念日 (Constitution Day)",
  "2025-05-04": "みどりの日 (Greenery Day)",
  "2025-05-05": "こどもの日 (Children's Day)",
  "2025-05-06": "振替休日 (Substitute Holiday)",
  "2025-07-21": "海の日 (Marine Day)",
  "2025-08-11": "山の日 (Mountain Day)",
  "2025-09-15": "敬老の日 (Respect for the Aged Day)",
  "2025-09-23": "秋分の日 (Autumnal Equinox Day)",
  "2025-10-13": "スポーツの日 (Sports Day)",
  "2025-11-03": "文化の日 (Culture Day)",
  "2025-11-23": "勤労感謝の日 (Labor Thanksgiving Day)",
  "2025-11-24": "振替休日 (Substitute Holiday)",
};

/**
 * Initialize calendar
 */
function initializeCalendar() {
  // Set view toggle listeners
  document.querySelectorAll(".view-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document
        .querySelectorAll(".view-toggle-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      currentView = this.dataset.view;
      renderCalendar();
    });
  });

  // Set today's date for quick add
  document.getElementById("planDate").value = new Date()
    .toISOString()
    .split("T")[0];

  // Initialize shift suggestions
  generateShiftSuggestions();

  // Render initial calendar
  renderCalendar();
}

/**
 * Generate shift suggestions based on previous shifts
 */
function generateShiftSuggestions() {
  const suggestionsList = document.getElementById("shiftSuggestions");
  if (!suggestionsList) return;

  // Get unique shift patterns from history
  const shiftPatterns = new Map();

  weeklyData.forEach((entry) => {
    const key = `${entry.shiftType}-${entry.startTime}-${entry.endTime}`;
    if (!shiftPatterns.has(key)) {
      shiftPatterns.set(key, {
        shiftType: entry.shiftType,
        startTime: entry.startTime,
        endTime: entry.endTime,
        count: 1,
        lastUsed: entry.workDate,
      });
    } else {
      const pattern = shiftPatterns.get(key);
      pattern.count++;
      if (entry.workDate > pattern.lastUsed) {
        pattern.lastUsed = entry.workDate;
      }
    }
  });

  // Sort by usage frequency and recency
  const sortedPatterns = Array.from(shiftPatterns.values())
    .sort((a, b) => {
      // First by count (frequency)
      if (b.count !== a.count) return b.count - a.count;
      // Then by recency
      return new Date(b.lastUsed) - new Date(a.lastUsed);
    })
    .slice(0, 5); // Top 5 suggestions

  // Add default shift patterns if no history
  if (sortedPatterns.length === 0) {
    sortedPatterns.push(
      { shiftType: "C341", startTime: "06:30", endTime: "17:30", count: 0 },
      { shiftType: "C342", startTime: "16:45", endTime: "01:25", count: 0 }
    );
  }

  // Generate suggestions HTML
  suggestionsList.innerHTML = sortedPatterns
    .map(
      (pattern) => `
        <div class="shift-suggestion" onclick="applySuggestion('${
          pattern.shiftType
        }', '${pattern.startTime}', '${pattern.endTime}')">
            <div class="suggestion-header">
                <span class="suggestion-shift">${pattern.shiftType}</span>
                <span class="suggestion-times">${pattern.startTime} - ${
        pattern.endTime
      }</span>
            </div>
            ${
              pattern.count > 0
                ? `<div class="suggestion-count">Used ${pattern.count} times</div>`
                : ""
            }
        </div>
    `
    )
    .join("");
}

/**
 * Apply suggestion to form
 */
function applySuggestion(shiftType, startTime, endTime) {
  document.getElementById("planShiftType").value = shiftType;
  document.getElementById("planStartTime").value = startTime;
  document.getElementById("planEndTime").value = endTime;

  // Show success feedback
  showMessage("Suggestion applied! Adjust times if needed.", "success");
}

/**
 * Render calendar based on current view
 */
function renderCalendar() {
  if (currentView === "month") {
    renderMonthView();
  } else {
    renderWeekView();
  }
  updateMonthlySummary();
}

/**
 * Render month view
 */
function renderMonthView() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Update current period display
  document.getElementById("currentPeriod").textContent =
    firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Create calendar grid
  let calendarHTML = '<div class="calendar-header">';
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  weekDays.forEach((day) => {
    calendarHTML += `<div class="week-day">${day}</div>`;
  });
  calendarHTML += '</div><div class="calendar-body">';

  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarHTML += '<div class="calendar-day empty"></div>';
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    const dayData = getDayData(dateStr);
    const isToday = isDateToday(dateStr);
    const isWeekend =
      new Date(year, month, day).getDay() === 0 ||
      new Date(year, month, day).getDay() === 6;
    const isHoliday = holidays[dateStr];

    let dayClasses = "calendar-day";
    if (isToday) dayClasses += " today";
    if (isWeekend) dayClasses += " weekend";
    if (isHoliday) dayClasses += " holiday";
    if (dayData.length > 0) dayClasses += " has-shift";

    calendarHTML += `
            <div class="${dayClasses}" data-date="${dateStr}" onclick="showDayDetails('${dateStr}')">
                <div class="day-number">${day}</div>
                ${
                  isHoliday
                    ? `<div class="holiday-name">${holidays[dateStr]}</div>`
                    : ""
                }
                ${renderDayShifts(dayData)}
                ${
                  dayData.length > 0
                    ? `<div class="day-earnings">¥${calculateDayEarnings(
                        dayData
                      ).toLocaleString()}</div>`
                    : ""
                }
            </div>
        `;
  }

  // Add empty cells for days after month ends
  const remainingCells = 42 - (startingDayOfWeek + daysInMonth);
  for (let i = 0; i < remainingCells; i++) {
    calendarHTML += '<div class="calendar-day empty"></div>';
  }

  calendarHTML += "</div>";
  document.getElementById("calendarGrid").innerHTML = calendarHTML;
  document.getElementById("calendarGrid").className =
    "calendar-grid month-view";
}

/**
 * Render week view
 */
function renderWeekView() {
  const startOfWeek = new Date(currentDate);
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

  // Update current period display
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  document.getElementById(
    "currentPeriod"
  ).textContent = `${startOfWeek.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${endOfWeek.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  // Create week grid
  let calendarHTML = '<div class="week-view-grid">';

  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(startOfWeek);
    currentDay.setDate(startOfWeek.getDate() + i);
    const dateStr = currentDay.toISOString().split("T")[0];
    const dayData = getDayData(dateStr);
    const isToday = isDateToday(dateStr);
    const isWeekend = i === 0 || i === 6;
    const isHoliday = holidays[dateStr];

    let dayClasses = "week-day-column";
    if (isToday) dayClasses += " today";
    if (isWeekend) dayClasses += " weekend";
    if (isHoliday) dayClasses += " holiday";

    calendarHTML += `
            <div class="${dayClasses}">
                <div class="week-day-header">
                    <div class="week-day-name">${currentDay.toLocaleDateString(
                      "en-US",
                      { weekday: "short" }
                    )}</div>
                    <div class="week-day-date">${currentDay.getDate()}</div>
                    ${
                      isHoliday
                        ? `<div class="holiday-badge">${holidays[dateStr]}</div>`
                        : ""
                    }
                </div>
                <div class="week-day-content" data-date="${dateStr}" onclick="showDayDetails('${dateStr}')">
                    ${renderWeekDayShifts(dayData)}
                    ${
                      dayData.length > 0
                        ? `
                        <div class="week-day-summary">
                            <div class="hours">${calculateDayHours(
                              dayData
                            ).toFixed(1)}h</div>
                            <div class="earnings">¥${calculateDayEarnings(
                              dayData
                            ).toLocaleString()}</div>
                        </div>
                    `
                        : '<div class="no-shift">No shift</div>'
                    }
                </div>
            </div>
        `;
  }

  calendarHTML += "</div>";
  document.getElementById("calendarGrid").innerHTML = calendarHTML;
  document.getElementById("calendarGrid").className = "calendar-grid week-view";
}

/**
 * Get shift data for a specific date
 */
function getDayData(dateStr) {
  const actualShifts = weeklyData.filter((entry) => entry.workDate === dateStr);
  const planned = plannedShifts.filter(
    (shift) => shift.date === dateStr && !shift.completed
  );
  return [...actualShifts, ...planned];
}

/**
 * Render shifts for a day in month view
 */
function renderDayShifts(dayData) {
  if (dayData.length === 0) return "";

  let shiftsHTML = '<div class="day-shifts">';
  dayData.forEach((shift) => {
    const shiftClass = shift.shiftType === "C341" ? "day-shift" : "night-shift";
    const isPlanned = shift.planned || false;
    shiftsHTML += `
            <div class="shift-indicator ${shiftClass} ${
      isPlanned ? "planned" : ""
    }">
                ${shift.shiftType}
            </div>
        `;
  });
  shiftsHTML += "</div>";
  return shiftsHTML;
}

/**
 * Render shifts for a day in week view
 */
function renderWeekDayShifts(dayData) {
  if (dayData.length === 0) return "";

  let shiftsHTML = '<div class="week-shifts">';
  dayData.forEach((shift) => {
    const shiftClass = shift.shiftType === "C341" ? "day-shift" : "night-shift";
    const isPlanned = shift.planned || false;
    const hasOvertime = shift.payInfo && shift.payInfo.overtimeHours > 0;

    shiftsHTML += `
            <div class="week-shift-block ${shiftClass} ${
      isPlanned ? "planned" : ""
    } ${hasOvertime ? "has-overtime" : ""}">
                <div class="shift-time">${shift.startTime || "06:30"} - ${
      shift.endTime || "17:30"
    }</div>
                <div class="shift-type">${shift.shiftType}</div>
                ${hasOvertime ? '<div class="overtime-badge">OT</div>' : ""}
            </div>
        `;
  });
  shiftsHTML += "</div>";
  return shiftsHTML;
}

/**
 * Calculate total earnings for a day
 */
function calculateDayEarnings(dayData) {
  return dayData.reduce((total, shift) => {
    if (shift.payInfo && shift.payInfo.totalPay) {
      return total + shift.payInfo.totalPay;
    }
    return total;
  }, 0);
}

/**
 * Calculate total hours for a day
 */
function calculateDayHours(dayData) {
  return dayData.reduce((total, shift) => {
    if (shift.workingTime && shift.workingTime.netHours) {
      return total + shift.workingTime.netHours;
    }
    return total;
  }, 0);
}

/**
 * Check if date is today
 */
function isDateToday(dateStr) {
  const today = new Date().toISOString().split("T")[0];
  return dateStr === today;
}

/**
 * Navigate calendar
 */
function navigateCalendar(direction) {
  if (currentView === "month") {
    if (direction === "prev") {
      currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  } else {
    if (direction === "prev") {
      currentDate.setDate(currentDate.getDate() - 7);
    } else {
      currentDate.setDate(currentDate.getDate() + 7);
    }
  }
  renderCalendar();
}

/**
 * Go to today
 */
function goToToday() {
  currentDate = new Date();
  renderCalendar();
}

/**
 * Show day details in modal with edit functionality
 */
function showDayDetails(dateStr) {
  const dayData = getDayData(dateStr);
  const modal = document.getElementById("shiftModal");
  const modalContent = document.getElementById("modalContent");

  const date = new Date(dateStr);
  const dayName = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  let contentHTML = `<h4>${dayName}</h4>`;

  if (dayData.length === 0) {
    contentHTML += "<p>No shifts scheduled for this day.</p>";
  } else {
    contentHTML += '<div class="shift-details-list">';
    dayData.forEach((shift, index) => {
      const isPlanned = shift.planned || false;
      const canEdit = !isPlanned; // Only actual shifts can be edited

      contentHTML += `
                <div class="shift-detail-item ${
                  isPlanned ? "planned" : ""
                }" id="shift-${dateStr}-${index}">
                    <div class="shift-detail-header">
                        <h5>${shift.shiftType} - ${
        isPlanned ? "Planned" : "Worked"
      }</h5>
                        ${
                          canEdit
                            ? `
                            <div class="shift-actions">
                                <button class="edit-shift-btn" onclick="editShift('${dateStr}', ${index})">✏️ Edit</button>
                                <button class="delete-shift-btn" onclick="deleteShiftFromCalendar('${dateStr}', ${index})">🗑️ Delete</button>
                            </div>
                        `
                            : ""
                        }
                    </div>
                    <div class="shift-detail-content">
                        <p><strong>Time:</strong> ${
                          shift.startTime || "TBD"
                        } - ${shift.endTime || "TBD"}</p>
                        ${
                          shift.workingTime
                            ? `<p><strong>Hours:</strong> ${shift.workingTime.netHours.toFixed(
                                2
                              )}h</p>`
                            : ""
                        }
                        ${
                          shift.payInfo
                            ? `<p><strong>Earnings:</strong> ¥${Math.round(
                                shift.payInfo.totalPay
                              ).toLocaleString()}</p>`
                            : ""
                        }
                        ${
                          shift.payInfo && shift.payInfo.hasNightHours
                            ? '<p><span class="night-premium-badge">Night Premium Applied</span></p>'
                            : ""
                        }
                        ${
                          shift.payInfo && shift.payInfo.overtimeHours > 0
                            ? `<p><span class="overtime-badge">Overtime: ${shift.payInfo.overtimeHours.toFixed(
                                1
                              )}h</span></p>`
                            : ""
                        }
                    </div>
                </div>
            `;
    });
    contentHTML += "</div>";

    // Add total for the day
    const totalEarnings = calculateDayEarnings(dayData);
    const totalHours = calculateDayHours(dayData);
    if (totalEarnings > 0 || totalHours > 0) {
      contentHTML += `
                <div class="day-total">
                    <p><strong>Day Total:</strong> ${totalHours.toFixed(
                      1
                    )}h = ¥${totalEarnings.toLocaleString()}</p>
                </div>
            `;
    }
  }

  // Add quick add button for future dates
  if (new Date(dateStr) >= new Date().setHours(0, 0, 0, 0)) {
    contentHTML += `
            <button class="quick-add-modal-btn" onclick="quickAddShiftForDate('${dateStr}')">
                + Add Shift for This Day
            </button>
        `;
  }

  modalContent.innerHTML = contentHTML;
  modal.style.display = "block";
}

/**
 * Edit shift inline
 */
function editShift(dateStr, shiftIndex) {
  const shiftEntry = weeklyData.find((entry) => entry.workDate === dateStr);
  if (!shiftEntry) return;

  editingEntry = { dateStr, shiftIndex, originalEntry: { ...shiftEntry } };

  const shiftDetailItem = document.getElementById(
    `shift-${dateStr}-${shiftIndex}`
  );
  const contentDiv = shiftDetailItem.querySelector(".shift-detail-content");

  // Replace content with edit form
  contentDiv.innerHTML = `
        <div class="edit-shift-form">
            <div class="form-row">
                <label>Shift Type:</label>
                <select id="editShiftType" onchange="updateEditShiftTimes()">
                    <option value="C341" ${
                      shiftEntry.shiftType === "C341" ? "selected" : ""
                    }>C341 - Day Shift</option>
                    <option value="C342" ${
                      shiftEntry.shiftType === "C342" ? "selected" : ""
                    }>C342 - Night Shift</option>
                </select>
            </div>
            <div class="form-row">
                <label>Start Time:</label>
                <input type="time" id="editStartTime" value="${
                  shiftEntry.startTime
                }">
            </div>
            <div class="form-row">
                <label>End Time:</label>
                <input type="time" id="editEndTime" value="${
                  shiftEntry.endTime
                }">
            </div>
            <div class="form-actions">
                <button class="save-btn" onclick="saveShiftEdit()">💾 Save</button>
                <button class="cancel-btn" onclick="cancelShiftEdit()">❌ Cancel</button>
            </div>
        </div>
    `;
}

/**
 * Update default times when editing shift type
 */
function updateEditShiftTimes() {
  const shiftType = document.getElementById("editShiftType").value;
  const startTimeInput = document.getElementById("editStartTime");
  const endTimeInput = document.getElementById("editEndTime");

  if (shiftType === "C341") {
    startTimeInput.value = "06:30";
    endTimeInput.value = "17:30";
  } else if (shiftType === "C342") {
    startTimeInput.value = "16:45";
    endTimeInput.value = "01:25";
  }
}

/**
 * Save shift edit
 */
function saveShiftEdit() {
  if (!editingEntry) return;

  const newShiftType = document.getElementById("editShiftType").value;
  const newStartTime = document.getElementById("editStartTime").value;
  const newEndTime = document.getElementById("editEndTime").value;

  if (!newShiftType || !newStartTime || !newEndTime) {
    showMessage("Please fill in all fields!", "error");
    return;
  }

  // Find and update the entry
  const entryIndex = weeklyData.findIndex(
    (entry) =>
      entry.workDate === editingEntry.dateStr &&
      entry.shiftType === editingEntry.originalEntry.shiftType &&
      entry.startTime === editingEntry.originalEntry.startTime
  );

  if (entryIndex !== -1) {
    // Recalculate with new times (simplified - in real app would use full calculation)
    weeklyData[entryIndex] = {
      ...weeklyData[entryIndex],
      shiftType: newShiftType,
      startTime: newStartTime,
      endTime: newEndTime,
      timestamp: new Date().toISOString(),
    };

    // Save to localStorage
    localStorage.setItem("weeklyData", JSON.stringify(weeklyData));

    // Update displays
    renderCalendar();
    showDayDetails(editingEntry.dateStr);

    showMessage("Shift updated successfully!", "success");
  }

  editingEntry = null;
}

/**
 * Cancel shift edit
 */
function cancelShiftEdit() {
  if (!editingEntry) return;

  showDayDetails(editingEntry.dateStr);
  editingEntry = null;
}

/**
 * Delete shift from calendar
 */
function deleteShiftFromCalendar(dateStr, shiftIndex) {
  if (confirm("Are you sure you want to delete this shift?")) {
    const entryIndex = weeklyData.findIndex(
      (entry) => entry.workDate === dateStr
    );

    if (entryIndex !== -1) {
      weeklyData.splice(entryIndex, 1);
      localStorage.setItem("weeklyData", JSON.stringify(weeklyData));

      renderCalendar();
      showDayDetails(dateStr);

      showMessage("Shift deleted successfully!", "success");
    }
  }
}

/**
 * Close modal
 */
function closeModal() {
  document.getElementById("shiftModal").style.display = "none";
  editingEntry = null;
}

/**
 * Enhanced quick add shift with time inputs
 */
function quickAddShift() {
  const date = document.getElementById("planDate").value;
  const shiftType = document.getElementById("planShiftType").value;
  const startTime = document.getElementById("planStartTime").value;
  const endTime = document.getElementById("planEndTime").value;

  if (!date || !shiftType || !startTime || !endTime) {
    showMessage("Please fill in all fields!", "error");
    return;
  }

  // Check if shift already exists for this date
  const existingShift = weeklyData.find((entry) => entry.workDate === date);
  if (existingShift) {
    showMessage(
      "A shift already exists for this date. Please edit it instead.",
      "error"
    );
    return;
  }

  // Add to planned shifts
  const plannedShift = {
    date: date,
    shiftType: shiftType,
    startTime: startTime,
    endTime: endTime,
    planned: true,
    id: Date.now(),
    createdAt: new Date().toISOString(),
  };

  plannedShifts.push(plannedShift);
  localStorage.setItem("plannedShifts", JSON.stringify(plannedShifts));

  // Clear form
  document.getElementById("planShiftType").value = "";
  document.getElementById("planStartTime").value = "";
  document.getElementById("planEndTime").value = "";

  // Refresh calendar and suggestions
  renderCalendar();
  generateShiftSuggestions();

  showMessage("Shift added to calendar!", "success");
}

/**
 * Quick add shift for specific date from modal
 */
function quickAddShiftForDate(dateStr) {
  document.getElementById("planDate").value = dateStr;
  closeModal();
  document.getElementById("planShiftType").focus();
}

/**
 * Update shift times when type changes
 */
function updateShiftTimes() {
  const shiftType = document.getElementById("planShiftType").value;
  const startTimeInput = document.getElementById("planStartTime");
  const endTimeInput = document.getElementById("planEndTime");

  if (shiftType === "C341") {
    startTimeInput.value = "06:30";
    endTimeInput.value = "17:30";
  } else if (shiftType === "C342") {
    startTimeInput.value = "16:45";
    endTimeInput.value = "01:25";
  }
}

/**
 * Update monthly summary
 */
function updateMonthlySummary() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(
    year,
    month + 1,
    0
  ).getDate()}`;

  const monthlyData = weeklyData.filter(
    (entry) => entry.workDate >= monthStart && entry.workDate <= monthEnd
  );

  const totalDays = monthlyData.length;
  const totalHours = monthlyData.reduce(
    (sum, entry) => sum + (entry.workingTime?.netHours || 0),
    0
  );
  const totalEarnings = monthlyData.reduce(
    (sum, entry) => sum + (entry.payInfo?.totalPay || 0),
    0
  );
  const avgDaily = totalDays > 0 ? totalEarnings / totalDays : 0;

  document.getElementById("totalDays").textContent = totalDays;
  document.getElementById("totalHours").textContent =
    totalHours.toFixed(1) + "h";
  document.getElementById("totalEarnings").textContent =
    "¥" + Math.round(totalEarnings).toLocaleString();
  document.getElementById("avgDaily").textContent =
    "¥" + Math.round(avgDaily).toLocaleString();
}

/**
 * Export calendar
 */
function exportCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Create iCal format
  let icalContent = "BEGIN:VCALENDAR\r\n";
  icalContent += "VERSION:2.0\r\n";
  icalContent += "PRODID:-//ShiftPay Calculator//Calendar Export//EN\r\n";

  // Add all shifts for the current month
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(
    year,
    month + 1,
    0
  ).getDate()}`;

  const monthlyShifts = weeklyData.filter(
    (entry) => entry.workDate >= monthStart && entry.workDate <= monthEnd
  );

  monthlyShifts.forEach((shift) => {
    icalContent += "BEGIN:VEVENT\r\n";
    icalContent += `DTSTART:${shift.workDate.replace(
      /-/g,
      ""
    )}T${shift.startTime.replace(":", "")}00\r\n`;
    icalContent += `DTEND:${shift.workDate.replace(
      /-/g,
      ""
    )}T${shift.endTime.replace(":", "")}00\r\n`;
    icalContent += `SUMMARY:${shift.shiftType} Shift\r\n`;
    icalContent += `DESCRIPTION:Pay: ¥${Math.round(
      shift.payInfo.totalPay
    ).toLocaleString()}\\nHours: ${shift.workingTime.netHours.toFixed(1)}h\r\n`;
    icalContent += "END:VEVENT\r\n";
  });

  icalContent += "END:VCALENDAR\r\n";

  // Download file
  const blob = new Blob([icalContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `shiftpay-calendar-${monthName.replace(" ", "-")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showMessage("Calendar exported successfully!", "success");
}

/**
 * Show message
 */
function showMessage(message, type = "success") {
  // Create message element
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = message;
  messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        background: ${type === "success" ? "#28a745" : "#dc3545"};
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        animation: slideInRight 0.3s ease;
    `;

  document.body.appendChild(messageDiv);

  // Remove after 3 seconds
  setTimeout(() => {
    messageDiv.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => messageDiv.remove(), 300);
  }, 3000);
}

// Close modal when clicking outside
window.onclick = function (event) {
  const modal = document.getElementById("shiftModal");
  if (event.target === modal) {
    closeModal();
  }
};
