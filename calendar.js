// calendar.js - Calendar View Functionality

// Global variables
let currentDate = new Date();
let currentView = 'month'; // 'month' or 'week'
let weeklyData = JSON.parse(localStorage.getItem('weeklyData') || '[]');
let plannedShifts = JSON.parse(localStorage.getItem('plannedShifts') || '[]');

// Japanese holidays for 2025 (add more as needed)
const holidays = {
    '2025-01-01': '元日 (New Year)',
    '2025-01-13': '成人の日 (Coming of Age Day)',
    '2025-02-11': '建国記念の日 (National Foundation Day)',
    '2025-02-23': '天皇誕生日 (Emperor\'s Birthday)',
    '2025-02-24': '振替休日 (Substitute Holiday)',
    '2025-03-20': '春分の日 (Vernal Equinox Day)',
    '2025-04-29': '昭和の日 (Showa Day)',
    '2025-05-03': '憲法記念日 (Constitution Day)',
    '2025-05-04': 'みどりの日 (Greenery Day)',
    '2025-05-05': 'こどもの日 (Children\'s Day)',
    '2025-05-06': '振替休日 (Substitute Holiday)',
    '2025-07-21': '海の日 (Marine Day)',
    '2025-08-11': '山の日 (Mountain Day)',
    '2025-09-15': '敬老の日 (Respect for the Aged Day)',
    '2025-09-23': '秋分の日 (Autumnal Equinox Day)',
    '2025-10-13': 'スポーツの日 (Sports Day)',
    '2025-11-03': '文化の日 (Culture Day)',
    '2025-11-23': '勤労感謝の日 (Labor Thanksgiving Day)',
    '2025-11-24': '振替休日 (Substitute Holiday)'
};

/**
 * Initialize calendar
 */
function initializeCalendar() {
    // Set view toggle listeners
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentView = this.dataset.view;
            renderCalendar();
        });
    });

    // Set today's date for quick add
    document.getElementById('planDate').value = new Date().toISOString().split('T')[0];

    // Render initial calendar
    renderCalendar();
}

/**
 * Render calendar based on current view
 */
function renderCalendar() {
    if (currentView === 'month') {
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
    document.getElementById('currentPeriod').textContent = 
        firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Create calendar grid
    let calendarHTML = '<div class="calendar-header">';
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekDays.forEach(day => {
        calendarHTML += `<div class="week-day">${day}</div>`;
    });
    calendarHTML += '</div><div class="calendar-body">';

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = getDayData(dateStr);
        const isToday = isDateToday(dateStr);
        const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6;
        const isHoliday = holidays[dateStr];

        let dayClasses = 'calendar-day';
        if (isToday) dayClasses += ' today';
        if (isWeekend) dayClasses += ' weekend';
        if (isHoliday) dayClasses += ' holiday';
        if (dayData.length > 0) dayClasses += ' has-shift';

        calendarHTML += `
            <div class="${dayClasses}" data-date="${dateStr}" onclick="showDayDetails('${dateStr}')">
                <div class="day-number">${day}</div>
                ${isHoliday ? `<div class="holiday-name">${holidays[dateStr]}</div>` : ''}
                ${renderDayShifts(dayData)}
                ${dayData.length > 0 ? `<div class="day-earnings">¥${calculateDayEarnings(dayData).toLocaleString()}</div>` : ''}
            </div>
        `;
    }

    // Add empty cells for days after month ends
    const remainingCells = 42 - (startingDayOfWeek + daysInMonth); // 6 rows * 7 days
    for (let i = 0; i < remainingCells; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }

    calendarHTML += '</div>';
    document.getElementById('calendarGrid').innerHTML = calendarHTML;
    document.getElementById('calendarGrid').className = 'calendar-grid month-view';
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
    
    document.getElementById('currentPeriod').textContent = 
        `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // Create week grid
    let calendarHTML = '<div class="week-view-grid">';
    
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(startOfWeek.getDate() + i);
        const dateStr = currentDay.toISOString().split('T')[0];
        const dayData = getDayData(dateStr);
        const isToday = isDateToday(dateStr);
        const isWeekend = i === 0 || i === 6;
        const isHoliday = holidays[dateStr];

        let dayClasses = 'week-day-column';
        if (isToday) dayClasses += ' today';
        if (isWeekend) dayClasses += ' weekend';
        if (isHoliday) dayClasses += ' holiday';

        calendarHTML += `
            <div class="${dayClasses}">
                <div class="week-day-header">
                    <div class="week-day-name">${currentDay.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div class="week-day-date">${currentDay.getDate()}</div>
                    ${isHoliday ? `<div class="holiday-badge">${holidays[dateStr]}</div>` : ''}
                </div>
                <div class="week-day-content" data-date="${dateStr}" onclick="showDayDetails('${dateStr}')">
                    ${renderWeekDayShifts(dayData)}
                    ${dayData.length > 0 ? `
                        <div class="week-day-summary">
                            <div class="hours">${calculateDayHours(dayData).toFixed(1)}h</div>
                            <div class="earnings">¥${calculateDayEarnings(dayData).toLocaleString()}</div>
                        </div>
                    ` : '<div class="no-shift">No shift</div>'}
                </div>
            </div>
        `;
    }

    calendarHTML += '</div>';
    document.getElementById('calendarGrid').innerHTML = calendarHTML;
    document.getElementById('calendarGrid').className = 'calendar-grid week-view';
}

/**
 * Get shift data for a specific date
 */
function getDayData(dateStr) {
    const actualShifts = weeklyData.filter(entry => entry.workDate === dateStr);
    const planned = plannedShifts.filter(shift => shift.date === dateStr && !shift.completed);
    return [...actualShifts, ...planned];
}

/**
 * Render shifts for a day in month view
 */
function renderDayShifts(dayData) {
    if (dayData.length === 0) return '';
    
    let shiftsHTML = '<div class="day-shifts">';
    dayData.forEach(shift => {
        const shiftClass = shift.shiftType === 'C341' ? 'day-shift' : 'night-shift';
        const isPlanned = shift.planned || false;
        shiftsHTML += `
            <div class="shift-indicator ${shiftClass} ${isPlanned ? 'planned' : ''}">
                ${shift.shiftType}
            </div>
        `;
    });
    shiftsHTML += '</div>';
    return shiftsHTML;
}

/**
 * Render shifts for a day in week view
 */
function renderWeekDayShifts(dayData) {
    if (dayData.length === 0) return '';
    
    let shiftsHTML = '<div class="week-shifts">';
    dayData.forEach(shift => {
        const shiftClass = shift.shiftType === 'C341' ? 'day-shift' : 'night-shift';
        const isPlanned = shift.planned || false;
        const hasOvertime = shift.payInfo && shift.payInfo.overtimeHours > 0;
        
        shiftsHTML += `
            <div class="week-shift-block ${shiftClass} ${isPlanned ? 'planned' : ''} ${hasOvertime ? 'has-overtime' : ''}">
                <div class="shift-time">${shift.startTime || '06:30'} - ${shift.endTime || '17:30'}</div>
                <div class="shift-type">${shift.shiftType}</div>
                ${hasOvertime ? '<div class="overtime-badge">OT</div>' : ''}
            </div>
        `;
    });
    shiftsHTML += '</div>';
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
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
}

/**
 * Navigate calendar
 */
function navigateCalendar(direction) {
    if (currentView === 'month') {
        if (direction === 'prev') {
            currentDate.setMonth(currentDate.getMonth() - 1);
        } else {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
    } else { // week view
        if (direction === 'prev') {
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
 * Show day details in modal
 */
function showDayDetails(dateStr) {
    const dayData = getDayData(dateStr);
    const modal = document.getElementById('shiftModal');
    const modalContent = document.getElementById('modalContent');
    
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    let contentHTML = `<h4>${dayName}</h4>`;
    
    if (dayData.length === 0) {
        contentHTML += '<p>No shifts scheduled for this day.</p>';
    } else {
        contentHTML += '<div class="shift-details-list">';
        dayData.forEach((shift, index) => {
            const isPlanned = shift.planned || false;
            contentHTML += `
                <div class="shift-detail-item ${isPlanned ? 'planned' : ''}">
                    <h5>${shift.shiftType} - ${isPlanned ? 'Planned' : 'Worked'}</h5>
                    <p><strong>Time:</strong> ${shift.startTime || 'TBD'} - ${shift.endTime || 'TBD'}</p>
                    ${shift.workingTime ? `<p><strong>Hours:</strong> ${shift.workingTime.netHours.toFixed(2)}h</p>` : ''}
                    ${shift.payInfo ? `<p><strong>Earnings:</strong> ¥${Math.round(shift.payInfo.totalPay).toLocaleString()}</p>` : ''}
                    ${shift.payInfo && shift.payInfo.hasNightHours ? '<p><span class="night-premium-badge">Night Premium Applied</span></p>' : ''}
                    ${shift.payInfo && shift.payInfo.overtimeHours > 0 ? `<p><span class="overtime-badge">Overtime: ${shift.payInfo.overtimeHours.toFixed(1)}h</span></p>` : ''}
                </div>
            `;
        });
        contentHTML += '</div>';
        
        // Add total for the day
        const totalEarnings = calculateDayEarnings(dayData);
        const totalHours = calculateDayHours(dayData);
        if (totalEarnings > 0 || totalHours > 0) {
            contentHTML += `
                <div class="day-total">
                    <p><strong>Day Total:</strong> ${totalHours.toFixed(1)}h = ¥${totalEarnings.toLocaleString()}</p>
                </div>
            `;
        }
    }
    
    // Add quick add button for future dates
    if (new Date(dateStr) >= new Date().setHours(0,0,0,0)) {
        contentHTML += `
            <button class="quick-add-modal-btn" onclick="quickAddShiftForDate('${dateStr}')">
                + Add Shift for This Day
            </button>
        `;
    }
    
    modalContent.innerHTML = contentHTML;
    modal.style.display = 'block';
}

/**
 * Close modal
 */
function closeModal() {
    document.getElementById('shiftModal').style.display = 'none';
}

/**
 * Quick add shift
 */
function quickAddShift() {
    const date = document.getElementById('planDate').value;
    const shiftType = document.getElementById('planShiftType').value;
    
    if (!date || !shiftType) {
        alert('Please select both date and shift type');
        return;
    }
    
    // Check if shift already exists for this date
    const existingShift = weeklyData.find(entry => entry.workDate === date);
    if (existingShift) {
        alert('A shift already exists for this date. Please use the calculator to modify it.');
        return;
    }
    
    // Add to planned shifts
    const plannedShift = {
        date: date,
        shiftType: shiftType,
        planned: true,
        id: Date.now(),
        createdAt: new Date().toISOString()
    };
    
    plannedShifts.push(plannedShift);
    localStorage.setItem('plannedShifts', JSON.stringify(plannedShifts));
    
    // Clear form
    document.getElementById('planShiftType').value = '';
    
    // Refresh calendar
    renderCalendar();
    
    // Show success message
    showMessage('Shift added to calendar!', 'success');
}

/**
 * Quick add shift for specific date from modal
 */
function quickAddShiftForDate(dateStr) {
    document.getElementById('planDate').value = dateStr;
    closeModal();
    document.getElementById('planShiftType').focus();
}

/**
 * Update monthly summary
 */
function updateMonthlySummary() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;
    
    const monthlyData = weeklyData.filter(entry => 
        entry.workDate >= monthStart && entry.workDate <= monthEnd
    );
    
    const totalDays = monthlyData.length;
    const totalHours = monthlyData.reduce((sum, entry) => sum + (entry.workingTime?.netHours || 0), 0);
    const totalEarnings = monthlyData.reduce((sum, entry) => sum + (entry.payInfo?.totalPay || 0), 0);
    const avgDaily = totalDays > 0 ? totalEarnings / totalDays : 0;
    
    document.getElementById('totalDays').textContent = totalDays;
    document.getElementById('totalHours').textContent = totalHours.toFixed(1) + 'h';
    document.getElementById('totalEarnings').textContent = '¥' + Math.round(totalEarnings).toLocaleString();
    document.getElementById('avgDaily').textContent = '¥' + Math.round(avgDaily).toLocaleString();
}

/**
 * Export calendar
 */
function exportCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Create iCal format
    let icalContent = 'BEGIN:VCALENDAR\r\n';
    icalContent += 'VERSION:2.0\r\n';
    icalContent += 'PRODID:-//ShiftPay Calculator//Calendar Export//EN\r\n';
    
    // Add all shifts for the current month
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;
    
    const monthlyShifts = weeklyData.filter(entry => 
        entry.workDate >= monthStart && entry.workDate <= monthEnd
    );
    
    monthlyShifts.forEach(shift => {
        icalContent += 'BEGIN:VEVENT\r\n';
        icalContent += `DTSTART:${shift.workDate.replace(/-/g, '')}T${shift.startTime.replace(':', '')}00\r\n`;
        icalContent += `DTEND:${shift.workDate.replace(/-/g, '')}T${shift.endTime.replace(':', '')}00\r\n`;
        icalContent += `SUMMARY:${shift.shiftType} Shift\r\n`;
        icalContent += `DESCRIPTION:Pay: ¥${Math.round(shift.payInfo.totalPay).toLocaleString()}\\nHours: ${shift.workingTime.netHours.toFixed(1)}h\r\n`;
        icalContent += 'END:VEVENT\r\n';
    });
    
    icalContent += 'END:VCALENDAR\r\n';
    
    // Download file
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `shiftpay-calendar-${monthName.replace(' ', '-')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('Calendar exported successfully!', 'success');
}

/**
 * Show message
 */
function showMessage(message, type = 'success') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.zIndex = '9999';
    
    document.body.appendChild(messageDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('shiftModal');
    if (event.target === modal) {
        closeModal();
    }
};