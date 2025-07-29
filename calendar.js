// calendar.js - Calendar functionality for Shift Pay Calculator

// Global variables
let currentDate = new Date();
let selectedDate = null;
let weeklyData = JSON.parse(localStorage.getItem("weeklyData") || "[]");

// Month names
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Initialize calendar on page load
document.addEventListener("DOMContentLoaded", function () {
  console.log("Initializing calendar...");
  renderCalendar();
  updateMonthlySummary();
  setupSwipeGestures();
});

/**
 * Render calendar for current month
 */
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Update month/year display
  document.getElementById(
    "currentMonthYear"
  ).textContent = `${monthNames[month]} ${year}`;

  // Clear existing calendar
  const calendarGrid = document.getElementById("calendarGrid");
  calendarGrid.innerHTML = "";

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Calculate total cells needed (6 weeks × 7 days = 42)
  const totalCells = 42;

  // Add previous month's trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayCell = createDayCell(
      daysInPrevMonth - i,
      month - 1,
      year,
      true // inactive
    );
    calendarGrid.appendChild(dayCell);
  }

  // Add current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = createDayCell(day, month, year, false);
    calendarGrid.appendChild(dayCell);
  }

  // Add next month's leading days
  const cellsUsed = firstDay + daysInMonth;
  const remainingCells = totalCells - cellsUsed;

  for (let day = 1; day <= remainingCells; day++) {
    const dayCell = createDayCell(
      day,
      month + 1,
      year,
      true // inactive
    );
    calendarGrid.appendChild(dayCell);
  }
}

/**
 * Create a day cell for the calendar
 */
function createDayCell(day, month, year, isInactive) {
  const dayCell = document.createElement("div");
  dayCell.className = "calendar-day";

  if (isInactive) {
    dayCell.classList.add("inactive");
  }

  // Create date object for this cell
  const cellDate = new Date(year, month, day);
  const dateStr = cellDate.toISOString().split("T")[0];

  // Check if today
  const today = new Date();
  if (
    !isInactive &&
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear()
  ) {
    dayCell.classList.add("today");
  }

  // Check if pay day (25th)
  if (!isInactive && day === 25) {
    dayCell.classList.add("pay-day");
  }

  // Day number
  const dayNumber = document.createElement("div");
  dayNumber.className = "day-number";
  dayNumber.textContent = day;
  dayCell.appendChild(dayNumber);

  // Check for shift data
  const shiftData = getShiftDataForDate(dateStr);
  if (shiftData) {
    // Add shift indicator
    const shiftIndicator = document.createElement("div");
    shiftIndicator.className = "shift-indicator";

    if (shiftData.shiftType === "C341") {
      shiftIndicator.classList.add("day-shift");
      shiftIndicator.innerHTML = "☀️";
    } else if (shiftData.shiftType === "C342") {
      shiftIndicator.classList.add("night-shift");
      shiftIndicator.innerHTML = "🌙";
    }

    dayCell.appendChild(shiftIndicator);

    // Add earnings amount
    const earnings = document.createElement("div");
    earnings.className = "day-earnings";
    earnings.textContent = `¥${Math.round(
      shiftData.payInfo.totalPay
    ).toLocaleString()}`;
    dayCell.appendChild(earnings);
  }

  // Add click handler
  if (!isInactive) {
    dayCell.addEventListener("click", () => showDayDetails(cellDate));
    dayCell.style.cursor = "pointer";
  }

  return dayCell;
}

/**
 * Get shift data for a specific date
 */
function getShiftDataForDate(dateStr) {
  return weeklyData.find((entry) => entry.workDate === dateStr);
}

/**
 * Show day details in modal
 */
function showDayDetails(date) {
  selectedDate = date;
  const dateStr = date.toISOString().split("T")[0];
  const shiftData = getShiftDataForDate(dateStr);

  // Update modal header
  const modalDate = document.getElementById("modalDate");
  modalDate.textContent = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Update modal body
  const modalBody = document.getElementById("modalBody");

  if (shiftData) {
    modalBody.innerHTML = `
            <div class="shift-details">
                <div class="detail-item">
                    <span class="detail-label">Shift Type:</span>
                    <span class="detail-value">${shiftData.shiftType}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Time:</span>
                    <span class="detail-value">${shiftData.startTime} - ${
      shiftData.endTime
    }</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Total Hours:</span>
                    <span class="detail-value">${(
                      shiftData.workingTime.totalMinutes / 60
                    ).toFixed(2)}h</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Break Time:</span>
                    <span class="detail-value">${(
                      shiftData.workingTime.breakMinutes / 60
                    ).toFixed(2)}h</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Net Working:</span>
                    <span class="detail-value">${shiftData.workingTime.netHours.toFixed(
                      2
                    )}h</span>
                </div>
                <div class="detail-separator"></div>
                <div class="detail-item">
                    <span class="detail-label">Regular Pay:</span>
                    <span class="detail-value">¥${Math.round(
                      shiftData.payInfo.regularPay
                    ).toLocaleString()}</span>
                </div>
                ${
                  shiftData.payInfo.overtimeHours > 0
                    ? `
                <div class="detail-item">
                    <span class="detail-label">Overtime Pay:</span>
                    <span class="detail-value">¥${Math.round(
                      shiftData.payInfo.overtimePay
                    ).toLocaleString()}</span>
                </div>
                `
                    : ""
                }
                ${
                  shiftData.payInfo.hasNightHours
                    ? `
                <div class="detail-item">
                    <span class="detail-label">Night Premium:</span>
                    <span class="detail-value">¥${Math.round(
                      shiftData.payInfo.nightPay
                    ).toLocaleString()}</span>
                </div>
                `
                    : ""
                }
                <div class="detail-separator"></div>
                <div class="detail-item total">
                    <span class="detail-label">Total Pay:</span>
                    <span class="detail-value">¥${Math.round(
                      shiftData.payInfo.totalPay
                    ).toLocaleString()}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Take-home (77.7%):</span>
                    <span class="detail-value">¥${Math.round(
                      shiftData.payInfo.totalPay * 0.777
                    ).toLocaleString()}</span>
                </div>
            </div>
        `;

    // Show edit button, hide add button
    document.querySelector(".btn-edit").style.display = "inline-block";
    document.querySelector(".btn-add").style.display = "none";
  } else {
    modalBody.innerHTML = `
            <div class="no-shift">
                <p>No shift recorded for this date.</p>
                <p>Click "Add Shift" to record a new shift.</p>
            </div>
        `;

    // Hide edit button, show add button
    document.querySelector(".btn-edit").style.display = "none";
    document.querySelector(".btn-add").style.display = "inline-block";
  }

  // Show modal
  document.getElementById("dayModal").style.display = "block";
}

/**
 * Close day details modal
 */
function closeDayModal() {
  document.getElementById("dayModal").style.display = "none";
  selectedDate = null;
}

/**
 * Navigate to previous month
 */
function previousMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
  updateMonthlySummary();
}

/**
 * Navigate to next month
 */
function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
  updateMonthlySummary();
}

/**
 * Update monthly summary statistics
 */
function updateMonthlySummary() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Filter data for current month
  const monthlyData = weeklyData.filter((entry) => {
    const entryDate = new Date(entry.workDate);
    return entryDate.getFullYear() === year && entryDate.getMonth() === month;
  });

  // Calculate statistics
  const totalDays = monthlyData.length;
  const dayShifts = monthlyData.filter((e) => e.shiftType === "C341").length;
  const nightShifts = monthlyData.filter((e) => e.shiftType === "C342").length;
  const totalHours = monthlyData.reduce(
    (sum, e) => sum + e.workingTime.netHours,
    0
  );
  const totalEarnings = monthlyData.reduce(
    (sum, e) => sum + e.payInfo.totalPay,
    0
  );
  const takeHome = totalEarnings * 0.777; // 77.7% after tax

  // Update summary display
  document.getElementById("totalDaysWorked").textContent = totalDays;
  document.getElementById("dayShifts").textContent = dayShifts;
  document.getElementById("nightShifts").textContent = nightShifts;
  document.getElementById("totalHours").textContent = `${totalHours.toFixed(
    1
  )}h`;
  document.getElementById("totalEarnings").textContent = `¥${Math.round(
    totalEarnings
  ).toLocaleString()}`;
  document.getElementById("takeHome").textContent = `¥${Math.round(
    takeHome
  ).toLocaleString()}`;

  // Update quick stats
  const avgDailyEarnings = totalDays > 0 ? totalEarnings / totalDays : 0;
  const avgDailyHours = totalDays > 0 ? totalHours / totalDays : 0;

  document.getElementById("avgDailyEarnings").textContent = `¥${Math.round(
    avgDailyEarnings
  ).toLocaleString()}`;
  document.getElementById(
    "avgDailyHours"
  ).textContent = `${avgDailyHours.toFixed(1)}h`;

  // Calculate monthly goal progress (assuming goal from settings)
  const settings = JSON.parse(localStorage.getItem("settings") || "{}");
  const monthlyGoal = settings.weeklyGoalPay
    ? settings.weeklyGoalPay * 4
    : 400000;
  const progress = (totalEarnings / monthlyGoal) * 100;

  document.getElementById("monthlyProgress").textContent = `${Math.min(
    100,
    progress
  ).toFixed(0)}%`;

  // Calculate work streak
  const streak = calculateWorkStreak(monthlyData);
  document.getElementById("streakDays").textContent = streak;
}

/**
 * Calculate consecutive work days streak
 */
function calculateWorkStreak(data) {
  if (data.length === 0) return 0;

  // Sort by date
  const sorted = data.sort(
    (a, b) => new Date(a.workDate) - new Date(b.workDate)
  );

  let currentStreak = 1;
  let maxStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].workDate);
    const currDate = new Date(sorted[i].workDate);
    const dayDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);

    if (dayDiff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

/**
 * Setup swipe gestures for mobile
 */
function setupSwipeGestures() {
  let touchStartX = 0;
  let touchEndX = 0;

  const calendarContainer = document.querySelector(".calendar-container");

  calendarContainer.addEventListener(
    "touchstart",
    function (e) {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );

  calendarContainer.addEventListener(
    "touchend",
    function (e) {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    },
    { passive: true }
  );

  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe left - next month
        nextMonth();
      } else {
        // Swipe right - previous month
        previousMonth();
      }
    }
  }
}

/**
 * Edit shift - redirect to calculator with date
 */
function editShift() {
  if (selectedDate) {
    const dateStr = selectedDate.toISOString().split("T")[0];
    // Store selected date and redirect
    localStorage.setItem("editDate", dateStr);
    window.location.href = "index.html#calculator";
  }
}

/**
 * Add new shift - redirect to calculator with date
 */
function addShift() {
  if (selectedDate) {
    const dateStr = selectedDate.toISOString().split("T")[0];
    // Store selected date and redirect
    localStorage.setItem("newShiftDate", dateStr);
    window.location.href = "index.html#calculator";
  }
}

// Close modal when clicking outside
window.onclick = function (event) {
  const modal = document.getElementById("dayModal");
  if (event.target === modal) {
    closeDayModal();
  }
};

// Keyboard navigation
document.addEventListener("keydown", function (e) {
  if (e.key === "ArrowLeft") {
    previousMonth();
  } else if (e.key === "ArrowRight") {
    nextMonth();
  } else if (e.key === "Escape") {
    closeDayModal();
  }
});

console.log("Calendar initialized successfully");
