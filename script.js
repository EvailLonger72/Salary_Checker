// Global variables
let weeklyData = JSON.parse(localStorage.getItem('weeklyData') || '[]');
let currentCalculation = null;
let settings = JSON.parse(localStorage.getItem('settings') || JSON.stringify({
    baseRate: 2100,
    overtimeRate: 2625,
    weeklyGoalHours: 40,
    weeklyGoalPay: 100000
}));

/**
 * Initialize navigation system
 */
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    
    console.log('Found nav items:', navItems.length);
    console.log('Found pages:', pages.length);
    
    navItems.forEach((item, index) => {
        console.log(`Setting up nav item ${index}:`, item.getAttribute('data-page'));
        
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const targetPage = item.getAttribute('data-page');
            console.log('Clicked nav item:', targetPage);
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show target page
            pages.forEach(page => page.classList.remove('active'));
            const targetPageElement = document.getElementById(targetPage);
            if (targetPageElement) {
                targetPageElement.classList.add('active');
                console.log('Showing page:', targetPage);
            } else {
                console.error('Page not found:', targetPage);
            }
            
            // Update page-specific content
            if (targetPage === 'dashboard') {
                updateDashboard();
            } else if (targetPage === 'weekly') {
                updateWeeklyDisplay();
                if (typeof updateWeeklyChart === 'function') {
                    updateWeeklyChart();
                }
            }
        });
        
        // Add cursor pointer style
        item.style.cursor = 'pointer';
    });
}

/**
 * Set today's date as default
 */
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    const workDateInput = document.getElementById('workDate');
    if (workDateInput) {
        workDateInput.value = today;
    }
}

/**
 * Time utility functions
 */
function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function minutesToHours(minutes) {
    return minutes / 60;
}

/**
 * Update shift information when shift type is selected
 */
function updateShiftInfo() {
    const shiftType = document.getElementById('shiftType').value;
    const shiftInfo = document.getElementById('shiftInfo');
    const breakList = document.getElementById('breakList');
    const startTime = document.getElementById('startTime');
    const endTime = document.getElementById('endTime');

    if (shiftType && SHIFTS[shiftType]) {
        const shift = SHIFTS[shiftType];
        const defaultTimes = getDefaultTimes(shiftType);
        
        // Set default times
        startTime.value = defaultTimes.defaultStart;
        endTime.value = defaultTimes.defaultEnd;

        // Show break schedule
        updateBreakDisplay();
        shiftInfo.style.display = 'block';
    } else {
        shiftInfo.style.display = 'none';
    }
}

/**
 * Calculate net working time after deducting breaks (UPDATED)
 */
function calculateNetWorkingTime(startTime, endTime, shiftType) {
    let startMinutes = timeToMinutes(startTime);
    let endMinutes = timeToMinutes(endTime);

    // Handle overnight shifts
    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60; // Add 24 hours
    }

    const totalMinutes = endMinutes - startMinutes;
    
    // Use dynamic break calculation instead of fixed break minutes
    const breakMinutes = getActualBreakMinutes(shiftType, startTime, endTime);
    const netMinutes = Math.max(0, totalMinutes - breakMinutes);

    return {
        totalMinutes,
        breakMinutes,
        netMinutes,
        netHours: netMinutes / 60
    };
}

/**
 * Update break display based on actual work times
 */
function updateBreakDisplay() {
    const shiftType = document.getElementById('shiftType').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const breakList = document.getElementById('breakList');

    if (!shiftType || !startTime || !endTime) {
        // Show all breaks if times not set
        if (shiftType && SHIFTS[shiftType]) {
            const shift = SHIFTS[shiftType];
            breakList.innerHTML = '';
            shift.breaks.forEach(breakItem => {
                const breakDiv = document.createElement('div');
                breakDiv.className = 'break-item';
                breakDiv.innerHTML = `
                    <span>${breakItem.start} 〜 ${breakItem.end}</span>
                    <span><strong>${breakItem.minutes} mins</strong></span>
                `;
                breakList.appendChild(breakDiv);
            });
        }
        return;
    }

    // Get actual break details
    const breakDetails = getBreakDetails(shiftType, startTime, endTime);
    breakList.innerHTML = '';

    // Show taken breaks
    breakDetails.taken.forEach(breakItem => {
        const breakDiv = document.createElement('div');
        breakDiv.className = 'break-item taken';
        breakDiv.innerHTML = `
            <span>${breakItem.start} 〜 ${breakItem.end}</span>
            <span><strong>${breakItem.minutes} mins ✓</strong></span>
        `;
        breakList.appendChild(breakDiv);
    });

    // Show skipped breaks
    breakDetails.skipped.forEach(breakItem => {
        const breakDiv = document.createElement('div');
        breakDiv.className = 'break-item skipped';
        breakDiv.innerHTML = `
            <span>${breakItem.start} 〜 ${breakItem.end}</span>
            <span style="opacity: 0.6;"><strong>${breakItem.minutes} mins (skipped)</strong></span>
        `;
        breakList.appendChild(breakDiv);
    });

    // Add summary
    if (breakDetails.skipped.length > 0) {
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'break-summary';
        summaryDiv.innerHTML = `
            <p style="margin-top: 15px; padding: 10px; background: #e3f2fd; border-radius: 8px; font-size: 0.9rem;">
                <strong>Break Summary:</strong><br>
                Taken: ${breakDetails.totalMinutes} minutes<br>
                Skipped: ${breakDetails.skipped.reduce((sum, b) => sum + b.minutes, 0)} minutes
            </p>
        `;
        breakList.appendChild(summaryDiv);
    }
}

// Add event listeners to update break display when times change
document.addEventListener('DOMContentLoaded', function() {
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    
    if (startTimeInput) {
        startTimeInput.addEventListener('change', updateBreakDisplay);
    }
    
    if (endTimeInput) {
        endTimeInput.addEventListener('change', updateBreakDisplay);
    }
});

/**
 * Calculate pay with improved logic for overtime and night rates
 */
function calculatePayAmount(netHours, startTime, endTime) {
    const baseRate = settings.baseRate;
    const overtimeRate = settings.overtimeRate;
    
    // Calculate regular and overtime hours
    const regularHours = Math.min(netHours, TIME_THRESHOLDS.regularHoursLimit);
    const overtimeHours = Math.max(0, netHours - TIME_THRESHOLDS.regularHoursLimit);
    
    // Calculate night hours
    const nightInfo = calculateNightHours(startTime, endTime);
    
    // Calculate pay
    let regularPay = 0;
    let overtimePay = 0;
    let nightPay = 0;
    
    if (nightInfo.hasNightHours) {
        // If shift includes night hours, use night rate for those hours
        const nightHours = Math.min(nightInfo.nightHours, netHours);
        const remainingHours = netHours - nightHours;
        
        nightPay = nightHours * overtimeRate; // Night rate = overtime rate
        
        if (remainingHours > 0) {
            const remainingRegular = Math.min(remainingHours, TIME_THRESHOLDS.regularHoursLimit);
            const remainingOvertime = Math.max(0, remainingHours - TIME_THRESHOLDS.regularHoursLimit);
            
            regularPay = remainingRegular * baseRate;
            overtimePay = remainingOvertime * overtimeRate;
        }
    } else {
        // Standard calculation without night premium
        regularPay = regularHours * baseRate;
        overtimePay = overtimeHours * overtimeRate;
    }
    
    return {
        regularHours,
        overtimeHours,
        nightHours: nightInfo.nightHours,
        regularPay,
        overtimePay,
        nightPay,
        totalPay: regularPay + overtimePay + nightPay,
        hasNightHours: nightInfo.hasNightHours
    };
}

/**
 * Main calculation function
 */
function calculatePay() {
    const shiftType = document.getElementById('shiftType').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const workDate = document.getElementById('workDate').value;

    // Validate inputs
    const validation = validateShiftTimes(shiftType, startTime, endTime);
    if (!validation.isValid) {
        alert('Please correct the following errors:\n' + validation.errors.join('\n'));
        return;
    }

    if (!workDate) {
        alert('Please select work date');
        return;
    }

    const workingTime = calculateNetWorkingTime(startTime, endTime, shiftType);
    const payInfo = calculatePayAmount(workingTime.netHours, startTime, endTime);

    currentCalculation = {
        shiftType,
        startTime,
        endTime,
        workDate,
        workingTime,
        payInfo,
        timestamp: new Date().toISOString()
    };

    // Call the main displayResults function from HTML
    if (typeof displayResults === 'function') {
        displayResults(currentCalculation);
    } else {
        console.error('displayResults function not found');
    }
}

/**
 * Add current calculation to weekly data
 */
function addToWeekly() {
    if (!currentCalculation) {
        alert('Please calculate pay first');
        return;
    }

    weeklyData.push(currentCalculation);
    localStorage.setItem('weeklyData', JSON.stringify(weeklyData));
    updateDashboard();
    updateWeeklyDisplay();
    
    // Show success message
    showMessage('Entry added to weekly report successfully!', 'success');
}

/**
 * Clear all weekly data
 */
function clearWeekly() {
    if (confirm('Are you sure you want to clear all weekly data? This action cannot be undone.')) {
        weeklyData = [];
        localStorage.setItem('weeklyData', JSON.stringify(weeklyData));
        updateDashboard();
        updateWeeklyDisplay();
        showMessage('All weekly data cleared successfully!', 'success');
    }
}

/**
 * Update dashboard statistics - ENHANCED with new charts
 */
function updateDashboard() {
    // Ensure we have the required data
    if (typeof weeklyData === 'undefined' || typeof settings === 'undefined') {
        console.log('Data not ready for dashboard update');
        return;
    }
    
    const totalEarnings = weeklyData.reduce((sum, entry) => sum + entry.payInfo.totalPay, 0);
    const totalHours = weeklyData.reduce((sum, entry) => sum + entry.workingTime.netHours, 0);
    const averageDaily = weeklyData.length > 0 ? totalEarnings / weeklyData.length : 0;
    const weeklyGoalProgress = (totalEarnings / settings.weeklyGoalPay) * 100;

    // Update DOM elements if they exist
    const totalEarningsEl = document.getElementById('totalEarnings');
    const totalHoursEl = document.getElementById('totalHours');
    const averageDailyEl = document.getElementById('averageDaily');
    const weeklyGoalEl = document.getElementById('weeklyGoal');

    if (totalEarningsEl) totalEarningsEl.textContent = `¥${Math.round(totalEarnings).toLocaleString()}`;
    if (totalHoursEl) totalHoursEl.textContent = `${totalHours.toFixed(1)}h`;
    if (averageDailyEl) averageDailyEl.textContent = `¥${Math.round(averageDaily).toLocaleString()}`;
    if (weeklyGoalEl) weeklyGoalEl.textContent = `${Math.min(100, weeklyGoalProgress).toFixed(0)}%`;

    updateRecentShifts();
    
    // Update all charts including new ones
    if (typeof updateDashboardChart === 'function') {
        updateDashboardChart();
    }
    
    // NEW: Update advanced charts
    if (typeof createMonthlyComparisonChart === 'function') {
        createMonthlyComparisonChart();
    }
    
    if (typeof createShiftHeatmap === 'function') {
        createShiftHeatmap();
    }
}

/**
 * Update recent shifts display
 */
function updateRecentShifts() {
    const recentShiftsList = document.getElementById('recentShiftsList');
    if (!recentShiftsList) return;
    
    const recentShifts = weeklyData.slice(-5).reverse();

    if (recentShifts.length === 0) {
        recentShiftsList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No recent shifts</p>';
        return;
    }

    recentShiftsList.innerHTML = recentShifts.map(shift => `
        <div class="shift-entry">
            <div class="shift-entry-header">
                <span class="shift-entry-date">${new Date(shift.workDate).toLocaleDateString()}</span>
                <span class="shift-entry-pay">¥${Math.round(shift.payInfo.totalPay)}</span>
            </div>
            <div class="shift-entry-details">
                ${shift.shiftType} | ${shift.startTime}-${shift.endTime} | ${shift.workingTime.netHours.toFixed(1)}h
            </div>
        </div>
    `).join('');
}

/**
 * Update weekly display
 */
function updateWeeklyDisplay() {
    const weeklyEntries = document.getElementById('weeklyEntries');
    const weeklySummaryCards = document.getElementById('weeklySummaryCards');

    // Check if elements exist
    if (!weeklyEntries || !weeklySummaryCards) {
        console.log('Weekly display elements not found');
        return;
    }

    if (weeklyData.length === 0) {
        weeklyEntries.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No entries yet. Calculate and add your first shift!</p>';
        weeklySummaryCards.innerHTML = '';
        return;
    }

    // Update entries list
    weeklyEntries.innerHTML = weeklyData.map((entry, index) => `
        <div class="entry-item">
            <h4>${new Date(entry.workDate).toLocaleDateString()} - ${entry.shiftType}</h4>
            <p><strong>Time:</strong> ${entry.startTime} - ${entry.endTime}</p>
            <p><strong>Working Hours:</strong> ${entry.workingTime.netHours.toFixed(2)}h</p>
            <p><strong>Pay:</strong> ¥${Math.round(entry.payInfo.totalPay)}</p>
            ${entry.payInfo.hasNightHours ? '<p><strong>Night Premium Applied</strong></p>' : ''}
        </div>
    `).join('');

    // Update summary cards
    const totalHours = weeklyData.reduce((sum, entry) => sum + entry.workingTime.netHours, 0);
    const totalPay = weeklyData.reduce((sum, entry) => sum + entry.payInfo.totalPay, 0);
    const averageDaily = weeklyData.length > 0 ? totalPay / weeklyData.length : 0;
    const goalProgress = (totalPay / settings.weeklyGoalPay) * 100;

    weeklySummaryCards.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">⏱️</div>
            <div class="stat-content">
                <h3>${totalHours.toFixed(1)}h</h3>
                <p>Total Hours</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-content">
                <h3>¥${Math.round(totalPay).toLocaleString()}</h3>
                <p>Total Pay</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
                <h3>¥${Math.round(averageDaily).toLocaleString()}</h3>
                <p>Daily Average</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">🎯</div>
            <div class="stat-content">
                <h3>${Math.min(100, goalProgress).toFixed(0)}%</h3>
                <p>Goal Progress</p>
            </div>
        </div>
    `;
}

/**
 * Load and apply settings
 */
function loadSettings() {
    const baseRateEl = document.getElementById('baseRate');
    const overtimeRateEl = document.getElementById('overtimeRate');
    const weeklyGoalHoursEl = document.getElementById('weeklyGoalHours');
    const weeklyGoalPayEl = document.getElementById('weeklyGoalPay');

    if (baseRateEl) baseRateEl.value = settings.baseRate;
    if (overtimeRateEl) overtimeRateEl.value = settings.overtimeRate;
    if (weeklyGoalHoursEl) weeklyGoalHoursEl.value = settings.weeklyGoalHours;
    if (weeklyGoalPayEl) weeklyGoalPayEl.value = settings.weeklyGoalPay;

    // Add event listeners for settings
    const settingInputs = ['baseRate', 'overtimeRate', 'weeklyGoalHours', 'weeklyGoalPay'];
    settingInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', saveSettings);
        }
    });
}

/**
 * Save settings to localStorage
 */
function saveSettings() {
    settings = {
        baseRate: parseFloat(document.getElementById('baseRate').value) || 2100,
        overtimeRate: parseFloat(document.getElementById('overtimeRate').value) || 2625,
        weeklyGoalHours: parseFloat(document.getElementById('weeklyGoalHours').value) || 40,
        weeklyGoalPay: parseFloat(document.getElementById('weeklyGoalPay').value) || 100000
    };
    
    localStorage.setItem('settings', JSON.stringify(settings));
    updateDashboard();
    showMessage('Settings saved successfully!', 'success');
}

/**
 * Export data as CSV file
 */
function exportData() {
    if (weeklyData.length === 0) {
        showMessage('No data to export!', 'error');
        return;
    }
    
    // CSV headers
    const headers = [
        'Date',
        'Shift Type',
        'Start Time',
        'End Time',
        'Total Hours',
        'Break Hours',
        'Net Working Hours',
        'Regular Hours',
        'Overtime Hours',
        'Night Hours',
        'Regular Pay (¥)',
        'Overtime Pay (¥)',
        'Night Pay (¥)',
        'Total Pay (¥)',
        'Has Night Premium'
    ];
    
    // Convert data to CSV rows
    const csvRows = [
        headers.join(','), // Header row
        ...weeklyData.map(entry => {
            const row = [
                entry.workDate,
                entry.shiftType,
                entry.startTime,
                entry.endTime,
                (entry.workingTime.totalMinutes / 60).toFixed(2),
                (entry.workingTime.breakMinutes / 60).toFixed(2),
                entry.workingTime.netHours.toFixed(2),
                entry.payInfo.regularHours.toFixed(2),
                entry.payInfo.overtimeHours.toFixed(2),
                entry.payInfo.nightHours.toFixed(2),
                Math.round(entry.payInfo.regularPay),
                Math.round(entry.payInfo.overtimePay),
                Math.round(entry.payInfo.nightPay),
                Math.round(entry.payInfo.totalPay),
                entry.payInfo.hasNightHours ? 'Yes' : 'No'
            ];
            
            // Handle commas in data by wrapping in quotes
            return row.map(field => {
                if (typeof field === 'string' && field.includes(',')) {
                    return `"${field}"`;
                }
                return field;
            }).join(',');
        })
    ];
    
    // Create CSV content
    const csvContent = csvRows.join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `shiftpay-data-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('CSV file exported successfully!', 'success');
    } else {
        showMessage('CSV export not supported in this browser!', 'error');
    }
}

/**
 * Export summary data as CSV
 */
function exportSummaryData() {
    if (weeklyData.length === 0) {
        showMessage('No data to export!', 'error');
        return;
    }
    
    // Calculate summary statistics
    const totalHours = weeklyData.reduce((sum, entry) => sum + entry.workingTime.netHours, 0);
    const totalPay = weeklyData.reduce((sum, entry) => sum + entry.payInfo.totalPay, 0);
    const totalRegularPay = weeklyData.reduce((sum, entry) => sum + entry.payInfo.regularPay, 0);
    const totalOvertimePay = weeklyData.reduce((sum, entry) => sum + entry.payInfo.overtimePay, 0);
    const totalNightPay = weeklyData.reduce((sum, entry) => sum + entry.payInfo.nightPay, 0);
    const averageDaily = weeklyData.length > 0 ? totalPay / weeklyData.length : 0;
    const averageHours = weeklyData.length > 0 ? totalHours / weeklyData.length : 0;
    
    // Group by week
    const weeklyStats = {};
    weeklyData.forEach(entry => {
        const date = new Date(entry.workDate);
        const weekKey = getWeekNumber(date) + '-' + date.getFullYear();
        
        if (!weeklyStats[weekKey]) {
            weeklyStats[weekKey] = {
                week: weekKey,
                totalHours: 0,
                totalPay: 0,
                entries: 0,
                regularPay: 0,
                overtimePay: 0,
                nightPay: 0
            };
        }
        
        weeklyStats[weekKey].totalHours += entry.workingTime.netHours;
        weeklyStats[weekKey].totalPay += entry.payInfo.totalPay;
        weeklyStats[weekKey].regularPay += entry.payInfo.regularPay;
        weeklyStats[weekKey].overtimePay += entry.payInfo.overtimePay;
        weeklyStats[weekKey].nightPay += entry.payInfo.nightPay;
        weeklyStats[weekKey].entries++;
    });
    
    // Create summary CSV
    const summaryHeaders = [
        'Summary Type',
        'Value'
    ];
    
    const summaryRows = [
        summaryHeaders.join(','),
        `Total Entries,${weeklyData.length}`,
        `Total Hours,${totalHours.toFixed(2)}`,
        `Total Pay (¥),${Math.round(totalPay)}`,
        `Regular Pay (¥),${Math.round(totalRegularPay)}`,
        `Overtime Pay (¥),${Math.round(totalOvertimePay)}`,
        `Night Pay (¥),${Math.round(totalNightPay)}`,
        `Average Daily Pay (¥),${Math.round(averageDaily)}`,
        `Average Daily Hours,${averageHours.toFixed(2)}`,
        `Weekly Goal Progress,${((totalPay / settings.weeklyGoalPay) * 100).toFixed(1)}%`,
        '',
        'Weekly Breakdown:',
        'Week,Hours,Pay (¥),Days Worked,Regular Pay (¥),Overtime Pay (¥),Night Pay (¥)'
    ];
    
    // Add weekly breakdown
    Object.values(weeklyStats)
        .sort((a, b) => {
            const [weekA, yearA] = a.week.split('-').map(Number);
            const [weekB, yearB] = b.week.split('-').map(Number);
            if (yearA !== yearB) return yearA - yearB;
            return weekA - weekB;
        })
        .forEach(week => {
            summaryRows.push(
                `Week ${week.week},${week.totalHours.toFixed(2)},${Math.round(week.totalPay)},${week.entries},${Math.round(week.regularPay)},${Math.round(week.overtimePay)},${Math.round(week.nightPay)}`
            );
        });
    
    const csvContent = summaryRows.join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `shiftpay-summary-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('Summary CSV exported successfully!', 'success');
    } else {
        showMessage('CSV export not supported in this browser!', 'error');
    }
}

/**
 * Import CSV data
 */
function importCSV() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.style.display = 'none';
    
    fileInput.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const csvContent = e.target.result;
                const lines = csvContent.split('\n');
                
                if (lines.length < 2) {
                    showMessage('Invalid CSV file format!', 'error');
                    return;
                }
                
                // Check if it's our CSV format
                const headers = lines[0].split(',');
                const expectedHeaders = ['Date', 'Shift Type', 'Start Time', 'End Time'];
                const hasCorrectHeaders = expectedHeaders.every(header => 
                    headers.includes(header)
                );
                
                if (!hasCorrectHeaders) {
                    showMessage('CSV file does not match expected format!', 'error');
                    return;
                }
                
                if (confirm('This will replace all existing data. Continue?')) {
                    // Parse CSV data (simplified - for production use a proper CSV parser)
                    const importedData = [];
                    
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;
                        
                        const values = line.split(',');
                        if (values.length >= 4) {
                            // Reconstruct entry object (simplified)
                            const entry = {
                                workDate: values[0],
                                shiftType: values[1],
                                startTime: values[2],
                                endTime: values[3],
                                workingTime: {
                                    totalMinutes: parseFloat(values[4]) * 60,
                                    breakMinutes: parseFloat(values[5]) * 60,
                                    netHours: parseFloat(values[6])
                                },
                                payInfo: {
                                    regularHours: parseFloat(values[7]),
                                    overtimeHours: parseFloat(values[8]),
                                    nightHours: parseFloat(values[9]),
                                    regularPay: parseFloat(values[10]),
                                    overtimePay: parseFloat(values[11]),
                                    nightPay: parseFloat(values[12]),
                                    totalPay: parseFloat(values[13]),
                                    hasNightHours: values[14] === 'Yes'
                                },
                                timestamp: new Date().toISOString()
                            };
                            importedData.push(entry);
                        }
                    }
                    
                    if (importedData.length > 0) {
                        weeklyData = importedData;
                        localStorage.setItem('weeklyData', JSON.stringify(weeklyData));
                        updateDashboard();
                        updateWeeklyDisplay();
                        showMessage(`Successfully imported ${importedData.length} entries!`, 'success');
                    } else {
                        showMessage('No valid data found in CSV file!', 'error');
                    }
                }
            } catch (error) {
                console.error('Error parsing CSV:', error);
                showMessage('Error reading CSV file!', 'error');
            }
        };
        reader.readAsText(file);
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

/**
 * Import data functionality
 */
function importData() {
    const fileInput = document.getElementById('importFile');
    fileInput.click();
    
    fileInput.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (importedData.weeklyData && Array.isArray(importedData.weeklyData)) {
                    if (confirm('This will replace all existing data. Continue?')) {
                        weeklyData = importedData.weeklyData;
                        localStorage.setItem('weeklyData', JSON.stringify(weeklyData));
                        
                        if (importedData.settings) {
                            settings = { ...settings, ...importedData.settings };
                            localStorage.setItem('settings', JSON.stringify(settings));
                            loadSettings();
                        }
                        
                        updateDashboard();
                        updateWeeklyDisplay();
                        showMessage('Data imported successfully!', 'success');
                    }
                } else {
                    showMessage('Invalid file format!', 'error');
                }
            } catch (error) {
                showMessage('Error reading file!', 'error');
            }
        };
        reader.readAsText(file);
    };
}

/**
 * Show success/error messages
 */
function showMessage(message, type = 'success') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert at top of main content
    const mainContent = document.querySelector('.main-content');
    const firstPage = mainContent.querySelector('.page.active');
    if (firstPage) {
        firstPage.insertBefore(messageDiv, firstPage.firstChild);
    }
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

/**
 * Get week number for grouping
 */
function getWeekNumber(date) {
    const d = new Date(date);
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Initialize application only if not already initialized by main HTML
document.addEventListener('DOMContentLoaded', function() {
    // Check if required dependencies are loaded
    if (typeof SHIFTS === 'undefined') {
        console.error('break_schedule.js not loaded properly');
        return;
    }
    
    // Initialize only if we're not already initialized by main HTML
    if (typeof initializeNavigation === 'function' && !document.querySelector('.nav-item.active')) {
        initializeNavigation();
        updateDashboard();
        updateWeeklyDisplay();
        loadSettings();
        setTodayDate();
    }
});

// Auto-save functionality
setInterval(() => {
    localStorage.setItem('weeklyData', JSON.stringify(weeklyData));
    localStorage.setItem('settings', JSON.stringify(settings));
}, 30000); // Auto-save every 30 seconds

// Mobile Functions - Add these to script.js

/**
 * Initialize mobile navigation
 */
function initializeMobileNavigation() {
    // Create mobile menu toggle button
    const mobileToggle = document.createElement('button');
    mobileToggle.className = 'mobile-menu-toggle';
    mobileToggle.innerHTML = '☰';
    mobileToggle.setAttribute('aria-label', 'Toggle mobile menu');
    
    // Create mobile overlay
    const mobileOverlay = document.createElement('div');
    mobileOverlay.className = 'mobile-overlay';
    
    // Insert elements
    document.body.insertBefore(mobileToggle, document.body.firstChild);
    document.body.appendChild(mobileOverlay);
    
    const sidebar = document.querySelector('.sidebar');
    
    // Toggle menu function
    function toggleMobileMenu() {
        sidebar.classList.toggle('mobile-open');
        mobileOverlay.classList.toggle('active');
        
        // Update button icon
        if (sidebar.classList.contains('mobile-open')) {
            mobileToggle.innerHTML = '✕';
        } else {
            mobileToggle.innerHTML = '☰';
        }
    }
    
    // Close menu function
    function closeMobileMenu() {
        sidebar.classList.remove('mobile-open');
        mobileOverlay.classList.remove('active');
        mobileToggle.innerHTML = '☰';
    }
    
    // Event listeners
    mobileToggle.addEventListener('click', toggleMobileMenu);
    mobileOverlay.addEventListener('click', closeMobileMenu);
    
    // Close menu when nav item is clicked
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                setTimeout(closeMobileMenu, 300); // Delay for smooth transition
            }
        });
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
            closeMobileMenu();
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
    });
}

/**
 * Handle mobile-specific chart adjustments
 */
function adjustChartsForMobile() {
    if (window.innerWidth <= 768) {
        // Update chart options for mobile
        const mobileChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 10,
                        usePointStyle: true,
                        font: {
                            size: 9
                        },
                        boxWidth: 12
                    }
                }
            },
            layout: {
                padding: {
                    top: 5,
                    bottom: 5,
                    left: 5,
                    right: 5
                }
            }
        };
        
        // Apply mobile options to existing charts
        if (typeof dashboardChartInstance !== 'undefined' && dashboardChartInstance) {
            dashboardChartInstance.options = { ...dashboardChartInstance.options, ...mobileChartOptions };
            dashboardChartInstance.update();
        }
        
        if (typeof pieChartInstance !== 'undefined' && pieChartInstance) {
            pieChartInstance.options = { ...pieChartInstance.options, ...mobileChartOptions };
            pieChartInstance.update();
        }
        
        if (typeof barChartInstance !== 'undefined' && barChartInstance) {
            barChartInstance.options = { ...barChartInstance.options, ...mobileChartOptions };
            barChartInstance.update();
        }
        
        if (typeof weeklyChartInstance !== 'undefined' && weeklyChartInstance) {
            weeklyChartInstance.options = { ...weeklyChartInstance.options, ...mobileChartOptions };
            weeklyChartInstance.update();
        }
        
        if (typeof monthlyComparisonChartInstance !== 'undefined' && monthlyComparisonChartInstance) {
            monthlyComparisonChartInstance.options = { ...monthlyComparisonChartInstance.options, ...mobileChartOptions };
            monthlyComparisonChartInstance.update();
        }
        
        if (typeof shiftHeatmapChartInstance !== 'undefined' && shiftHeatmapChartInstance) {
            shiftHeatmapChartInstance.options = { ...shiftHeatmapChartInstance.options, ...mobileChartOptions };
            shiftHeatmapChartInstance.update();
        }
    }
}

/**
 * Mobile-specific form handling
 */
function initializeMobileFormHandling() {
    // Prevent zoom on input focus (iOS)
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (input.getAttribute('type') !== 'date' && input.getAttribute('type') !== 'time') {
            input.style.fontSize = '16px';
        }
    });
    
    // Add touch-friendly styling
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
    }
}

/**
 * Handle orientation changes
 */
function handleOrientationChange() {
    // Delay to allow for orientation change completion
    setTimeout(() => {
        // Resize charts
        if (typeof handleChartResize === 'function') {
            handleChartResize();
        }
        
        // Adjust mobile layouts
        adjustChartsForMobile();
        
        // Update dashboard if visible
        if (document.getElementById('dashboard').classList.contains('active')) {
            updateDashboard();
        }
    }, 500);
}

/**
 * Mobile-specific touch gestures
 */
function initializeTouchGestures() {
    let touchStartX = 0;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
        if (!touchStartX || !touchStartY) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;
        
        // Horizontal swipe detection
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (Math.abs(diffX) > 100) { // Minimum swipe distance
                const sidebar = document.querySelector('.sidebar');
                
                if (diffX > 0) {
                    // Swipe left - close menu
                    if (sidebar.classList.contains('mobile-open')) {
                        sidebar.classList.remove('mobile-open');
                        document.querySelector('.mobile-overlay').classList.remove('active');
                        document.querySelector('.mobile-menu-toggle').innerHTML = '☰';
                    }
                } else {
                    // Swipe right - open menu (only if starting from left edge)
                    if (touchStartX < 50 && !sidebar.classList.contains('mobile-open')) {
                        sidebar.classList.add('mobile-open');
                        document.querySelector('.mobile-overlay').classList.add('active');
                        document.querySelector('.mobile-menu-toggle').innerHTML = '✕';
                    }
                }
            }
        }
        
        // Reset
        touchStartX = 0;
        touchStartY = 0;
    }, { passive: true });
}

/**
 * Mobile-specific table handling
 */
function makeMobileResponsiveTable() {
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        if (!table.classList.contains('mobile-responsive')) {
            table.classList.add('mobile-responsive');
            
            // Wrap table in scrollable container
            const wrapper = document.createElement('div');
            wrapper.style.overflowX = 'auto';
            wrapper.style.webkitOverflowScrolling = 'touch';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
    });
}

/**
 * Handle mobile keyboard appearance
 */
function handleMobileKeyboard() {
    if (window.innerWidth <= 768) {
        const viewport = document.querySelector('meta[name=viewport]');
        
        document.addEventListener('focusin', (e) => {
            if (e.target.matches('input, select, textarea')) {
                // Adjust viewport to prevent zoom
                if (viewport) {
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
                }
                
                // Scroll element into view with delay
                setTimeout(() => {
                    e.target.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                }, 300);
            }
        });
        
        document.addEventListener('focusout', (e) => {
            if (e.target.matches('input, select, textarea')) {
                // Restore normal viewport
                if (viewport) {
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1');
                }
            }
        });
    }
}

/**
 * Initialize all mobile features
 */
function initializeMobileFeatures() {
    // Check if mobile features are needed
    if (window.innerWidth <= 768) {
        initializeMobileNavigation();
        initializeMobileFormHandling();
        initializeTouchGestures();
        makeMobileResponsiveTable();
        handleMobileKeyboard();
    }
    
    // Always handle orientation changes
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', adjustChartsForMobile);
}

// Update the main DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // Check if required dependencies are loaded
    if (typeof SHIFTS === 'undefined') {
        console.error('break_schedule.js not loaded properly');
        return;
    }
    
    // Initialize mobile features
    initializeMobileFeatures();
    
    console.log('Mobile features initialized');
});

// Handle page visibility changes (mobile apps switching)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && window.innerWidth <= 768) {
        // Refresh charts when app becomes visible on mobile
        setTimeout(() => {
            if (typeof handleChartResize === 'function') {
                handleChartResize();
            }
            adjustChartsForMobile();
        }, 100);
    }
});

// ===== DELETE HISTORY FEATURE =====
// Add these functions to your script.js file

/**
 * Delete a single entry from weekly data
 * @param {number} index - Index of the entry to delete
 */
function deleteEntry(index) {
    // Validate index
    if (index < 0 || index >= weeklyData.length) {
        showMessage('Invalid entry index!', 'error');
        return;
    }
    
    // Get entry details for confirmation
    const entry = weeklyData[index];
    const date = new Date(entry.workDate).toLocaleDateString();
    const pay = Math.round(entry.payInfo.totalPay);
    
    // Show confirmation dialog with entry details
    const confirmMessage = `Are you sure you want to delete this entry?\n\nDate: ${date}\nShift: ${entry.shiftType}\nTime: ${entry.startTime} - ${entry.endTime}\nPay: ¥${pay.toLocaleString()}\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
        // Remove entry from array
        weeklyData.splice(index, 1);
        
        // Save to localStorage
        localStorage.setItem('weeklyData', JSON.stringify(weeklyData));
        
        // Update displays
        updateDashboard();
        updateWeeklyDisplay();
        
        // Update charts if functions exist
        if (typeof updateWeeklyChart === 'function') {
            updateWeeklyChart();
        }
        if (typeof createMonthlyComparisonChart === 'function') {
            createMonthlyComparisonChart();
        }
        if (typeof createShiftHeatmap === 'function') {
            createShiftHeatmap();
        }
        
        // Show success message
        showMessage('Entry deleted successfully!', 'success');
    }
}

/**
 * Delete multiple entries at once
 * @param {Array<number>} indices - Array of indices to delete
 */
function deleteMultipleEntries(indices) {
    if (!indices || indices.length === 0) {
        showMessage('No entries selected for deletion!', 'error');
        return;
    }
    
    const confirmMessage = `Are you sure you want to delete ${indices.length} selected entries?\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
        // Sort indices in descending order to avoid index shifting issues
        indices.sort((a, b) => b - a);
        
        // Remove entries
        indices.forEach(index => {
            if (index >= 0 && index < weeklyData.length) {
                weeklyData.splice(index, 1);
            }
        });
        
        // Save to localStorage
        localStorage.setItem('weeklyData', JSON.stringify(weeklyData));
        
        // Update displays
        updateDashboard();
        updateWeeklyDisplay();
        
        // Update charts
        if (typeof updateWeeklyChart === 'function') {
            updateWeeklyChart();
        }
        if (typeof createMonthlyComparisonChart === 'function') {
            createMonthlyComparisonChart();
        }
        if (typeof createShiftHeatmap === 'function') {
            createShiftHeatmap();
        }
        
        // Show success message
        showMessage(`${indices.length} entries deleted successfully!`, 'success');
    }
}

/**
 * Updated updateWeeklyDisplay function with delete buttons
 * Replace the existing updateWeeklyDisplay function in script.js with this one
 */
function updateWeeklyDisplay() {
    const weeklyEntries = document.getElementById('weeklyEntries');
    const weeklySummaryCards = document.getElementById('weeklySummaryCards');

    // Check if elements exist
    if (!weeklyEntries || !weeklySummaryCards) {
        console.log('Weekly display elements not found');
        return;
    }

    if (weeklyData.length === 0) {
        weeklyEntries.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No entries yet. Calculate and add your first shift!</p>';
        weeklySummaryCards.innerHTML = '';
        return;
    }

    // Add select all checkbox and bulk delete button
    const bulkDeleteControls = `
        <div class="bulk-delete-controls">
            <label class="select-all-label">
                <input type="checkbox" id="selectAllEntries" onchange="toggleSelectAll()">
                <span>Select All</span>
            </label>
            <button class="bulk-delete-btn" onclick="deleteBulkEntries()" style="display: none;">
                <span>🗑️</span> Delete Selected (<span id="selectedCount">0</span>)
            </button>
        </div>
    `;

    // Update entries list with delete buttons and checkboxes
    weeklyEntries.innerHTML = bulkDeleteControls + weeklyData.map((entry, index) => `
        <div class="entry-item" data-index="${index}">
            <div class="entry-checkbox">
                <input type="checkbox" class="entry-select" value="${index}" onchange="updateBulkDeleteButton()">
            </div>
            <div class="entry-content">
                <h4>${new Date(entry.workDate).toLocaleDateString()} - ${entry.shiftType}</h4>
                <p><strong>Time:</strong> ${entry.startTime} - ${entry.endTime}</p>
                <p><strong>Working Hours:</strong> ${entry.workingTime.netHours.toFixed(2)}h</p>
                <p><strong>Pay:</strong> ¥${Math.round(entry.payInfo.totalPay)}</p>
                ${entry.payInfo.hasNightHours ? '<p><strong>Night Premium Applied</strong></p>' : ''}
            </div>
            <button class="delete-entry-btn" onclick="deleteEntry(${index})" title="Delete this entry">
                <span>🗑️</span>
            </button>
        </div>
    `).join('');

    // Update summary cards (unchanged)
    const totalHours = weeklyData.reduce((sum, entry) => sum + entry.workingTime.netHours, 0);
    const totalPay = weeklyData.reduce((sum, entry) => sum + entry.payInfo.totalPay, 0);
    const averageDaily = weeklyData.length > 0 ? totalPay / weeklyData.length : 0;
    const goalProgress = (totalPay / settings.weeklyGoalPay) * 100;

    weeklySummaryCards.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">⏱️</div>
            <div class="stat-content">
                <h3>${totalHours.toFixed(1)}h</h3>
                <p>Total Hours</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-content">
                <h3>¥${Math.round(totalPay).toLocaleString()}</h3>
                <p>Total Pay</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
                <h3>¥${Math.round(averageDaily).toLocaleString()}</h3>
                <p>Daily Average</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">🎯</div>
            <div class="stat-content">
                <h3>${Math.min(100, goalProgress).toFixed(0)}%</h3>
                <p>Goal Progress</p>
            </div>
        </div>
    `;
}

/**
 * Toggle select all checkboxes
 */
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllEntries');
    const entryCheckboxes = document.querySelectorAll('.entry-select');
    
    entryCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateBulkDeleteButton();
}

/**
 * Update bulk delete button visibility and count
 */
function updateBulkDeleteButton() {
    const selectedCheckboxes = document.querySelectorAll('.entry-select:checked');
    const bulkDeleteBtn = document.querySelector('.bulk-delete-btn');
    const selectedCount = document.getElementById('selectedCount');
    
    if (bulkDeleteBtn) {
        if (selectedCheckboxes.length > 0) {
            bulkDeleteBtn.style.display = 'inline-flex';
            if (selectedCount) {
                selectedCount.textContent = selectedCheckboxes.length;
            }
        } else {
            bulkDeleteBtn.style.display = 'none';
        }
    }
    
    // Update select all checkbox state
    const selectAllCheckbox = document.getElementById('selectAllEntries');
    const allCheckboxes = document.querySelectorAll('.entry-select');
    if (selectAllCheckbox && allCheckboxes.length > 0) {
        selectAllCheckbox.checked = selectedCheckboxes.length === allCheckboxes.length;
    }
}

/**
 * Delete bulk entries
 */
function deleteBulkEntries() {
    const selectedCheckboxes = document.querySelectorAll('.entry-select:checked');
    const indices = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
    
    if (indices.length > 0) {
        deleteMultipleEntries(indices);
    }
}

/**
 * Filter entries by date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
function filterEntriesByDateRange(startDate, endDate) {
    const filteredData = weeklyData.filter(entry => {
        const entryDate = entry.workDate;
        return entryDate >= startDate && entryDate <= endDate;
    });
    
    return filteredData;
}

/**
 * Delete entries by date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
function deleteEntriesByDateRange(startDate, endDate) {
    const entriesToDelete = filterEntriesByDateRange(startDate, endDate);
    
    if (entriesToDelete.length === 0) {
        showMessage('No entries found in the selected date range!', 'error');
        return;
    }
    
    const confirmMessage = `Are you sure you want to delete ${entriesToDelete.length} entries between ${startDate} and ${endDate}?\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
        // Filter out entries that fall within the date range
        weeklyData = weeklyData.filter(entry => {
            return entry.workDate < startDate || entry.workDate > endDate;
        });
        
        // Save to localStorage
        localStorage.setItem('weeklyData', JSON.stringify(weeklyData));
        
        // Update displays
        updateDashboard();
        updateWeeklyDisplay();
        
        // Update charts
        if (typeof updateWeeklyChart === 'function') {
            updateWeeklyChart();
        }
        if (typeof createMonthlyComparisonChart === 'function') {
            createMonthlyComparisonChart();
        }
        if (typeof createShiftHeatmap === 'function') {
            createShiftHeatmap();
        }
        
        // Show success message
        showMessage(`${entriesToDelete.length} entries deleted successfully!`, 'success');
    }
}
