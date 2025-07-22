// Chart.js configurations and functions - UPDATED WITH NEW CHARTS

let dashboardChartInstance = null;
let pieChartInstance = null;
let barChartInstance = null;
let weeklyChartInstance = null;
let monthlyComparisonChartInstance = null;
let shiftHeatmapChartInstance = null;

/**
 * Common chart colors and styling
 */
const CHART_COLORS = {
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#4facfe',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    gradient1: ['#667eea', '#764ba2'],
    gradient2: ['#4facfe', '#00f2fe'],
    workingTime: '#667eea',
    breakTime: '#ff6b6b',
    regularPay: '#4facfe',
    overtimePay: '#764ba2',
    nightPay: '#28a745'
};

const CHART_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                padding: 15,
                usePointStyle: true,
                font: {
                    size: 11
                }
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

/**
 * Create dashboard earnings trend chart
 */
function updateDashboardChart() {
    const ctx = document.getElementById('dashboardChart');
    if (!ctx) {
        console.log('Dashboard chart canvas not found');
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }

    if (typeof weeklyData === 'undefined' || !Array.isArray(weeklyData)) {
        console.log('Weekly data not available for dashboard chart');
        return;
    }

    const last7Days = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        last7Days.push({
            date: date.toISOString().split('T')[0],
            label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        });
    }

    const dailyEarnings = last7Days.map(day => {
        const dayEntries = weeklyData.filter(entry => entry.workDate === day.date);
        return dayEntries.reduce((sum, entry) => {
            if (entry && entry.payInfo && typeof entry.payInfo.totalPay === 'number') {
                return sum + entry.payInfo.totalPay;
            }
            return sum;
        }, 0);
    });

    if (dashboardChartInstance) {
        try {
            dashboardChartInstance.destroy();
        } catch (error) {
            console.warn('Error destroying dashboard chart:', error);
        }
        dashboardChartInstance = null;
    }

    try {
        dashboardChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days.map(day => day.label),
                datasets: [{
                    label: 'Daily Earnings',
                    data: dailyEarnings,
                    borderColor: CHART_COLORS.primary,
                    backgroundColor: CHART_COLORS.primary + '20',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: CHART_COLORS.primary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                ...CHART_OPTIONS,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '¥' + Math.round(value).toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    ...CHART_OPTIONS.plugins,
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Earnings: ¥' + Math.round(context.parsed.y).toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating dashboard chart:', error);
    }
}

/**
 * Create pie chart for working time breakdown
 */
function createPieChart(calc) {
    const ctx = document.getElementById('pieChart');
    if (!ctx) {
        console.log('Pie chart canvas not found');
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }

    if (!calc || !calc.workingTime || 
        typeof calc.workingTime.netMinutes !== 'number' || 
        typeof calc.workingTime.breakMinutes !== 'number') {
        console.error('Invalid calculation data for pie chart');
        return;
    }

    if (pieChartInstance) {
        try {
            pieChartInstance.destroy();
        } catch (error) {
            console.warn('Error destroying pie chart:', error);
        }
        pieChartInstance = null;
    }

    const data = {
        labels: ['Working Time', 'Break Time'],
        datasets: [{
            data: [calc.workingTime.netMinutes, calc.workingTime.breakMinutes],
            backgroundColor: [CHART_COLORS.workingTime, CHART_COLORS.breakTime],
            borderWidth: 0
        }]
    };

    try {
        pieChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            usePointStyle: true,
                            font: {
                                size: 10
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const hours = (context.parsed / 60).toFixed(1);
                                return context.label + ': ' + hours + 'h';
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating pie chart:', error);
    }
}

/**
 * Create bar chart for pay distribution
 */
function createBarChart(calc) {
    const ctx = document.getElementById('barChart');
    if (!ctx) {
        console.log('Bar chart canvas not found');
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }

    if (!calc || !calc.payInfo || typeof calc.payInfo.regularPay !== 'number') {
        console.error('Invalid calculation data for bar chart');
        return;
    }

    if (barChartInstance) {
        try {
            barChartInstance.destroy();
        } catch (error) {
            console.warn('Error destroying bar chart:', error);
        }
        barChartInstance = null;
    }

    const labels = ['Regular Pay'];
    const data = [calc.payInfo.regularPay || 0];
    const colors = [CHART_COLORS.regularPay];

    if (calc.payInfo.overtimeHours > 0 && calc.payInfo.overtimePay > 0) {
        labels.push('Overtime Pay');
        data.push(calc.payInfo.overtimePay);
        colors.push(CHART_COLORS.overtimePay);
    }

    if (calc.payInfo.hasNightHours && calc.payInfo.nightPay > 0) {
        labels.push('Night Premium');
        data.push(calc.payInfo.nightPay);
        colors.push(CHART_COLORS.nightPay);
    }

    try {
        barChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                ...CHART_OPTIONS,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ¥' + Math.round(context.parsed.y).toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '¥' + Math.round(value).toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating bar chart:', error);
    }
}

/**
 * Create weekly performance chart
 */
function updateWeeklyChart() {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) {
        console.log('Weekly chart canvas not found');
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }

    if (typeof weeklyData === 'undefined' || !Array.isArray(weeklyData) || weeklyData.length === 0) {
        if (weeklyChartInstance) {
            try {
                weeklyChartInstance.destroy();
            } catch (error) {
                console.warn('Error destroying weekly chart:', error);
            }
            weeklyChartInstance = null;
        }
        console.log('No weekly data available for chart');
        return;
    }

    const weeklyStats = {};
    
    weeklyData.forEach(entry => {
        if (!entry || !entry.workDate || !entry.workingTime || !entry.payInfo) {
            console.warn('Invalid entry in weeklyData:', entry);
            return;
        }

        try {
            const date = new Date(entry.workDate);
            const weekKey = getWeekNumber(date) + '-' + date.getFullYear();
            
            if (!weeklyStats[weekKey]) {
                weeklyStats[weekKey] = {
                    week: weekKey,
                    totalHours: 0,
                    totalPay: 0,
                    entries: 0
                };
            }
            
            weeklyStats[weekKey].totalHours += entry.workingTime.netHours || 0;
            weeklyStats[weekKey].totalPay += entry.payInfo.totalPay || 0;
            weeklyStats[weekKey].entries++;
        } catch (error) {
            console.warn('Error processing entry:', entry, error);
        }
    });

    const sortedWeeks = Object.values(weeklyStats).sort((a, b) => {
        const [weekA, yearA] = a.week.split('-').map(Number);
        const [weekB, yearB] = b.week.split('-').map(Number);
        if (yearA !== yearB) return yearA - yearB;
        return weekA - weekB;
    });

    const recentWeeks = sortedWeeks.slice(-8);

    if (recentWeeks.length === 0) {
        if (weeklyChartInstance) {
            try {
                weeklyChartInstance.destroy();
            } catch (error) {
                console.warn('Error destroying weekly chart:', error);
            }
            weeklyChartInstance = null;
        }
        return;
    }

    if (weeklyChartInstance) {
        try {
            weeklyChartInstance.destroy();
        } catch (error) {
            console.warn('Error destroying weekly chart:', error);
        }
        weeklyChartInstance = null;
    }

    try {
        weeklyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: recentWeeks.map(week => `Week ${week.week.split('-')[0]}`),
                datasets: [
                    {
                        label: 'Hours Worked',
                        data: recentWeeks.map(week => week.totalHours),
                        backgroundColor: CHART_COLORS.workingTime + '80',
                        borderColor: CHART_COLORS.workingTime,
                        borderWidth: 2,
                        yAxisID: 'y',
                        borderRadius: 4
                    },
                    {
                        label: 'Total Pay',
                        data: recentWeeks.map(week => week.totalPay),
                        backgroundColor: CHART_COLORS.success + '80',
                        borderColor: CHART_COLORS.success,
                        borderWidth: 2,
                        yAxisID: 'y1',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 0) {
                                    return 'Hours: ' + context.parsed.y.toFixed(1) + 'h';
                                } else {
                                    return 'Pay: ¥' + Math.round(context.parsed.y).toLocaleString();
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Hours'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(0) + 'h';
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Pay (¥)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '¥' + Math.round(value).toLocaleString();
                            }
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating weekly chart:', error);
    }
}

/**
 * NEW: Process monthly data for comparison chart
 */
function processMonthlyData(data) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Initialize weekly totals
    const current = [0, 0, 0, 0, 0]; // 5 weeks max
    const previous = [0, 0, 0, 0, 0];
    
    data.forEach(entry => {
        const date = new Date(entry.workDate);
        const month = date.getMonth();
        const year = date.getFullYear();
        const weekOfMonth = Math.floor((date.getDate() - 1) / 7);
        
        if (weekOfMonth < 5) { // Ensure we don't exceed array bounds
            if (year === currentYear && month === currentMonth) {
                current[weekOfMonth] += entry.payInfo.totalPay;
            } else if (
                (year === currentYear && month === currentMonth - 1) ||
                (year === currentYear - 1 && currentMonth === 0 && month === 11)
            ) {
                previous[weekOfMonth] += entry.payInfo.totalPay;
            }
        }
    });
    
    return { current, previous };
}

/**
 * NEW: Create monthly comparison chart
 */
function createMonthlyComparisonChart() {
    const ctx = document.getElementById('monthlyComparisonChart');
    if (!ctx) {
        console.log('Monthly comparison chart canvas not found');
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }

    if (typeof weeklyData === 'undefined' || !Array.isArray(weeklyData)) {
        console.log('Weekly data not available for monthly comparison chart');
        return;
    }

    const monthlyData = processMonthlyData(weeklyData);
    
    // Calculate totals
    const currentTotal = monthlyData.current.reduce((a, b) => a + b, 0);
    const previousTotal = monthlyData.previous.reduce((a, b) => a + b, 0);
    const growthRate = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal * 100) : 0;
    
    // Update stats
    const currentMonthTotalEl = document.getElementById('currentMonthTotal');
    const previousMonthTotalEl = document.getElementById('previousMonthTotal');
    const growthRateEl = document.getElementById('growthRate');
    
    if (currentMonthTotalEl) currentMonthTotalEl.textContent = `¥${Math.round(currentTotal).toLocaleString()}`;
    if (previousMonthTotalEl) previousMonthTotalEl.textContent = `¥${Math.round(previousTotal).toLocaleString()}`;
    if (growthRateEl) {
        growthRateEl.textContent = `${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%`;
        growthRateEl.className = `stat-value growth-rate ${growthRate >= 0 ? 'positive' : 'negative'}`;
    }

    // Destroy existing chart
    if (monthlyComparisonChartInstance) {
        try {
            monthlyComparisonChartInstance.destroy();
        } catch (error) {
            console.warn('Error destroying monthly comparison chart:', error);
        }
        monthlyComparisonChartInstance = null;
    }

    try {
        monthlyComparisonChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
                datasets: [
                    {
                        label: 'Current Month',
                        data: monthlyData.current,
                        backgroundColor: 'rgba(102, 126, 234, 0.8)',
                        borderColor: '#667eea',
                        borderWidth: 2,
                        borderRadius: 8
                    },
                    {
                        label: 'Previous Month',
                        data: monthlyData.previous,
                        backgroundColor: 'rgba(118, 75, 162, 0.8)',
                        borderColor: '#764ba2',
                        borderWidth: 2,
                        borderRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ¥' + Math.round(context.parsed.y).toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '¥' + (value / 1000).toFixed(0) + 'k';
                            }
                        },
                        grid: {
                            borderDash: [5, 5]
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    } catch (error) {
        console.error('Error creating monthly comparison chart:', error);
    }
}

/**
 * NEW: Generate heatmap data
 */
function generateHeatmapData(data) {
    const heatmapData = [];
    const hourCounts = {};
    const dayCounts = {};
    
    // Initialize hour counts
    for (let hour = 0; hour < 24; hour++) {
        hourCounts[hour] = {};
        for (let day = 0; day < 7; day++) {
            hourCounts[hour][day] = 0;
        }
    }
    
    // Process data
    data.forEach(entry => {
        const date = new Date(entry.workDate);
        const dayOfWeek = date.getDay();
        let startHour = parseInt(entry.startTime.split(':')[0]);
        let endHour = parseInt(entry.endTime.split(':')[0]);
        
        // Handle overnight shifts
        if (endHour < startHour) {
            // Count hours until midnight
            for (let hour = startHour; hour < 24; hour++) {
                hourCounts[hour][dayOfWeek]++;
            }
            // Count hours after midnight on next day
            const nextDay = (dayOfWeek + 1) % 7;
            for (let hour = 0; hour <= endHour; hour++) {
                hourCounts[hour][nextDay]++;
            }
        } else {
            // Normal shift
            for (let hour = startHour; hour <= endHour; hour++) {
                hourCounts[hour][dayOfWeek]++;
            }
        }
        
        // Count days
        dayCounts[dayOfWeek] = (dayCounts[dayOfWeek] || 0) + 1;
    });
    
    // Convert to heatmap format
    for (let hour = 0; hour < 24; hour++) {
        for (let day = 0; day < 7; day++) {
            heatmapData.push({
                x: day,
                y: hour,
                v: hourCounts[hour][day]
            });
        }
    }
    
    // Find peak hour and most active day
    let maxHour = 0;
    let maxHourCount = 0;
    for (let hour = 0; hour < 24; hour++) {
        const hourTotal = Object.values(hourCounts[hour]).reduce((a, b) => a + b, 0);
        if (hourTotal > maxHourCount) {
            maxHourCount = hourTotal;
            maxHour = hour;
        }
    }
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let maxDay = 0;
    let maxDayCount = 0;
    Object.entries(dayCounts).forEach(([day, count]) => {
        if (count > maxDayCount) {
            maxDayCount = count;
            maxDay = parseInt(day);
        }
    });
    
    return {
        heatmapData,
        stats: {
            peakHour: `${maxHour}:00-${maxHour + 1}:00`,
            mostActiveDay: days[maxDay],
            totalShifts: data.length
        }
    };
}

/**
 * NEW: Create shift pattern heatmap
 */
function createShiftHeatmap() {
    const ctx = document.getElementById('shiftHeatmapChart');
    if (!ctx) {
        console.log('Shift heatmap chart canvas not found');
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }

    if (typeof weeklyData === 'undefined' || !Array.isArray(weeklyData) || weeklyData.length === 0) {
        console.log('No weekly data available for heatmap');
        return;
    }

    const { heatmapData, stats } = generateHeatmapData(weeklyData);
    
    // Update stats
    const peakHourEl = document.getElementById('peakHour');
    const mostActiveDayEl = document.getElementById('mostActiveDay');
    const totalShiftsEl = document.getElementById('totalShifts');
    
    if (peakHourEl) peakHourEl.textContent = stats.peakHour;
    if (mostActiveDayEl) mostActiveDayEl.textContent = stats.mostActiveDay;
    if (totalShiftsEl) totalShiftsEl.textContent = stats.totalShifts;

    // Destroy existing chart
    if (shiftHeatmapChartInstance) {
        try {
            shiftHeatmapChartInstance.destroy();
        } catch (error) {
            console.warn('Error destroying shift heatmap chart:', error);
        }
        shiftHeatmapChartInstance = null;
    }

    try {
        // Create custom heatmap using scatter chart
        shiftHeatmapChartInstance = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Work Hours',
                    data: heatmapData.map(item => ({
                        x: item.x,
                        y: item.y,
                        v: item.v
                    })),
                    backgroundColor: function(context) {
                        const value = context.raw.v;
                        const maxValue = Math.max(...heatmapData.map(d => d.v)) || 1;
                        if (value === 0) return 'rgba(200, 200, 200, 0.1)';
                        const intensity = value / maxValue;
                        const opacity = 0.3 + (intensity * 0.7);
                        return `rgba(102, 126, 234, ${opacity})`;
                    },
                    borderColor: function(context) {
                        const value = context.raw.v;
                        return value > 0 ? 'rgba(102, 126, 234, 0.8)' : 'transparent';
                    },
                    borderWidth: 1,
                    pointRadius: function(context) {
                        const width = context.chart.width;
                        const height = context.chart.height;
                        const size = Math.min(width / 8, height / 25) * 0.4;
                        return size;
                    },
                    pointHoverRadius: function(context) {
                        const width = context.chart.width;
                        const height = context.chart.height;
                        const size = Math.min(width / 8, height / 25) * 0.45;
                        return size;
                    },
                    pointStyle: 'rect'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            title: function() {
                                return '';
                            },
                            label: function(context) {
                                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                const day = days[context.parsed.x];
                                const hour = context.parsed.y;
                                const count = context.raw.v;
                                return [
                                    `${day} ${hour}:00-${hour + 1}:00`,
                                    `Worked: ${count} time${count !== 1 ? 's' : ''}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'top',
                        min: -0.5,
                        max: 6.5,
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                return days[value] || '';
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        type: 'linear',
                        reverse: true,
                        min: -0.5,
                        max: 23.5,
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                if (value % 2 === 0) {
                                    return value + ':00';
                                }
                                return '';
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeInOutQuart'
                }
            }
        });
    } catch (error) {
        console.error('Error creating shift heatmap chart:', error);
    }
}

/**
 * Create charts for calculator results
 */
function createCalculatorCharts(calc) {
    if (!calc || !calc.workingTime || !calc.payInfo) {
        console.error('Invalid calculation data for charts');
        return;
    }
    
    try {
        createPieChart(calc);
        createBarChart(calc);
    } catch (error) {
        console.error('Error creating calculator charts:', error);
    }
}

/**
 * Update all charts when calculation is complete
 */
function updateCharts(calculation) {
    try {
        if (calculation) {
            createPieChart(calculation);
            createBarChart(calculation);
        }
        
        updateDashboardChart();
        updateWeeklyChart();
        
        // NEW: Update advanced charts
        createMonthlyComparisonChart();
        createShiftHeatmap();
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

/**
 * Responsive chart handling
 */
function handleChartResize() {
    const charts = [
        dashboardChartInstance, 
        pieChartInstance, 
        barChartInstance, 
        weeklyChartInstance,
        monthlyComparisonChartInstance,
        shiftHeatmapChartInstance
    ];
    
    charts.forEach(chart => {
        if (chart) {
            try {
                chart.resize();
            } catch (error) {
                console.warn('Error resizing chart:', error);
            }
        }
    });
}

/**
 * Chart utility functions
 */
function destroyAllCharts() {
    const charts = [
        { instance: dashboardChartInstance, name: 'dashboard' },
        { instance: pieChartInstance, name: 'pie' },
        { instance: barChartInstance, name: 'bar' },
        { instance: weeklyChartInstance, name: 'weekly' },
        { instance: monthlyComparisonChartInstance, name: 'monthly' },
        { instance: shiftHeatmapChartInstance, name: 'heatmap' }
    ];
    
    charts.forEach(chart => {
        if (chart.instance) {
            try {
                chart.instance.destroy();
            } catch (error) {
                console.warn(`Error destroying ${chart.name} chart:`, error);
            }
        }
    });
    
    dashboardChartInstance = null;
    pieChartInstance = null;
    barChartInstance = null;
    weeklyChartInstance = null;
    monthlyComparisonChartInstance = null;
    shiftHeatmapChartInstance = null;
}

/**
 * Export chart as image
 */
function exportChart(chartInstance, filename) {
    if (!chartInstance) {
        console.warn('No chart instance provided for export');
        return;
    }
    
    try {
        const url = chartInstance.toBase64Image();
        const link = document.createElement('a');
        link.download = filename + '.png';
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error exporting chart:', error);
    }
}

/**
 * Safe week number calculation
 */
function getWeekNumber(date) {
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            console.warn('Invalid date provided to getWeekNumber:', date);
            return 1;
        }
        
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    } catch (error) {
        console.error('Error calculating week number:', error);
        return 1;
    }
}

// Add resize listener with error handling
window.addEventListener('resize', function() {
    try {
        handleChartResize();
    } catch (error) {
        console.warn('Error in resize handler:', error);
    }
});

// Update charts when page becomes visible (for better performance)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        setTimeout(() => {
            try {
                handleChartResize();
            } catch (error) {
                console.warn('Error in visibility change handler:', error);
            }
        }, 100);
    }
});

console.log('Chart.js loaded successfully with new chart features');