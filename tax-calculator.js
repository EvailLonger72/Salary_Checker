// tax-calculator.js - Complete Japanese Tax Calculator with Actual Rates

// Global variables
let currentPeriod = 'monthly';
let weeklyData = JSON.parse(localStorage.getItem('weeklyData') || '[]');
let taxChartInstance = null;

// Actual Japanese Tax Rates based on your payslip
const TAX_RATES = {
    // Individual tax rates
    incomeTax: 0.0177,           // 1.77% - 所得税
    residentTax: 0.0389,         // 3.89% - 住民税
    healthInsurance: 0.0626,     // 6.26% - 健康保険
    pension: 0.0945,             // 9.45% - 厚生年金
    employmentInsurance: 0.0093, // 0.93% - 雇用保険
    
    // Total rates
    totalDeductionRate: 0.223,   // 22.3% - 総控除率
    takeHomeRate: 0.777          // 77.7% - 手取り率
};

/**
 * Initialize tax calculator on page load
 */
function initializeTaxCalculator() {
    console.log('Initializing Tax Calculator...');
    
    // Set up period toggle buttons
    document.querySelectorAll('.period-toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.period-toggle-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPeriod = this.dataset.period;
            
            // Update results period label
            if (document.getElementById('resultsPeriod')) {
                document.getElementById('resultsPeriod').textContent = 
                    currentPeriod === 'monthly' ? 'Monthly Breakdown' : 'Yearly Breakdown';
            }
            
            // Recalculate if results are visible
            if (document.getElementById('taxResults').style.display !== 'none') {
                calculateTax();
            }
        });
    });

    // Set up input listeners for real-time calculation
    const inputs = ['grossIncome', 'age', 'dependents', 'prefecture', 'status', 'incomeSource'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', function() {
                // Auto calculate if results are already showing
                if (document.getElementById('taxResults').style.display !== 'none' && 
                    document.getElementById('grossIncome').value) {
                    calculateTax();
                }
            });
        }
    });

    // Set default values
    const today = new Date();
    if (document.getElementById('age')) {
        document.getElementById('age').value = 25;
    }
    if (document.getElementById('dependents')) {
        document.getElementById('dependents').value = 0;
    }

    // Auto-fill current month data if available
    setTimeout(() => {
        fillThisMonth();
    }, 500);
}

/**
 * Fill income from last month's data
 */
function fillLastMonth() {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    
    fillIncomeForPeriod(lastMonth, lastMonthEnd, 'Last Month');
}

/**
 * Fill income from this month's data
 */
function fillThisMonth() {
    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthEnd = today; // Up to today
    
    fillIncomeForPeriod(thisMonthStart, thisMonthEnd, 'This Month (so far)');
}

/**
 * Fill income from last year's data
 */
function fillLastYear() {
    const today = new Date();
    const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
    
    fillIncomeForPeriod(lastYearStart, lastYearEnd, 'Last Year', true);
}

/**
 * Fill income for a specific period
 */
function fillIncomeForPeriod(startDate, endDate, periodName, isYearly = false) {
    const periodData = weeklyData.filter(entry => {
        const entryDate = new Date(entry.workDate);
        return entryDate >= startDate && entryDate <= endDate;
    });
    
    const totalIncome = periodData.reduce((sum, entry) => sum + (entry.payInfo?.totalPay || 0), 0);
    
    if (totalIncome > 0) {
        document.getElementById('grossIncome').value = Math.round(totalIncome);
        
        // Switch to appropriate view
        if (isYearly) {
            document.querySelector('[data-period="yearly"]').click();
        } else {
            document.querySelector('[data-period="monthly"]').click();
        }
        
        showMessage(`Filled with ${periodName}: ¥${totalIncome.toLocaleString()} (${periodData.length} entries)`, 'success');
        
        // Auto calculate
        calculateTax();
    } else {
        showMessage(`No data found for ${periodName}`, 'info');
    }
}

/**
 * Main tax calculation function
 */
function calculateTax() {
    // Get input values
    const grossIncome = parseFloat(document.getElementById('grossIncome').value) || 0;
    const age = parseInt(document.getElementById('age').value) || 25;
    const dependents = parseInt(document.getElementById('dependents').value) || 0;
    const prefecture = document.getElementById('prefecture').value || 'oita';
    const status = document.getElementById('status').value || 'single';
    const incomeSource = document.getElementById('incomeSource').value || 'employment';

    // Validate input
    if (grossIncome <= 0) {
        showMessage('Please enter a valid gross income amount', 'error');
        return;
    }

    // Calculate based on period
    let monthlyGross, yearlyGross;
    
    if (currentPeriod === 'monthly') {
        monthlyGross = grossIncome;
        yearlyGross = grossIncome * 12;
    } else {
        yearlyGross = grossIncome;
        monthlyGross = grossIncome / 12;
    }
    
    // Calculate each deduction using actual percentages
    const monthlyDeductions = {
        incomeTax: monthlyGross * TAX_RATES.incomeTax,
        residentTax: monthlyGross * TAX_RATES.residentTax,
        healthInsurance: monthlyGross * TAX_RATES.healthInsurance,
        pension: monthlyGross * TAX_RATES.pension,
        employmentInsurance: monthlyGross * TAX_RATES.employmentInsurance
    };
    
    // Calculate totals
    const totalMonthlyDeductions = Object.values(monthlyDeductions).reduce((sum, val) => sum + val, 0);
    const monthlyTakeHome = monthlyGross - totalMonthlyDeductions;
    
    // Calculate yearly values
    const yearlyDeductions = {
        incomeTax: monthlyDeductions.incomeTax * 12,
        residentTax: monthlyDeductions.residentTax * 12,
        healthInsurance: monthlyDeductions.healthInsurance * 12,
        pension: monthlyDeductions.pension * 12,
        employmentInsurance: monthlyDeductions.employmentInsurance * 12
    };
    
    const totalYearlyDeductions = totalMonthlyDeductions * 12;
    const yearlyTakeHome = yearlyGross - totalYearlyDeductions;
    
    // Calculate percentages
    const takeHomePercentage = (yearlyTakeHome / yearlyGross) * 100;
    const deductionPercentage = (totalYearlyDeductions / yearlyGross) * 100;
    
    // Prepare results object
    const results = {
        // Income
        monthlyGross: monthlyGross,
        yearlyGross: yearlyGross,
        
        // Deductions (yearly for chart)
        incomeTax: yearlyDeductions.incomeTax,
        residentTax: yearlyDeductions.residentTax,
        healthInsurance: yearlyDeductions.healthInsurance,
        pension: yearlyDeductions.pension,
        employmentInsurance: yearlyDeductions.employmentInsurance,
        
        // Totals
        totalTaxAndDeductions: totalYearlyDeductions,
        takeHomePay: yearlyTakeHome,
        
        // Percentages
        takeHomePercentage: takeHomePercentage,
        deductionPercentage: deductionPercentage,
        
        // Individual rates for display
        incomeTaxRate: TAX_RATES.incomeTax * 100,
        residentTaxRate: TAX_RATES.residentTax * 100,
        healthInsuranceRate: TAX_RATES.healthInsurance * 100,
        pensionRate: TAX_RATES.pension * 100,
        employmentInsuranceRate: TAX_RATES.employmentInsurance * 100
    };
    
    // Display results
    displayResults(results);
    
    // Show results section with animation
    const resultsSection = document.getElementById('taxResults');
    if (resultsSection.style.display === 'none') {
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Display calculation results
 */
function displayResults(results) {
    // Update period label
    document.getElementById('resultsPeriod').textContent = 
        currentPeriod === 'monthly' ? 'Monthly Breakdown' : 'Yearly Breakdown';
    
    // Calculate display values based on selected period
    const divider = currentPeriod === 'monthly' ? 12 : 1;
    
    // Update take-home summary
    document.getElementById('takeHomeAmount').textContent = 
        `¥${Math.round(results.takeHomePay / divider).toLocaleString()}`;
    document.getElementById('takeHomePercentage').textContent = 
        `${results.takeHomePercentage.toFixed(1)}% of gross`;
    
    // Update individual deduction cards
    updateDeductionCard('incomeTax', results.incomeTax / divider, results.incomeTaxRate);
    updateDeductionCard('residentTax', results.residentTax / divider, results.residentTaxRate);
    updateDeductionCard('healthInsurance', results.healthInsurance / divider, results.healthInsuranceRate);
    updateDeductionCard('pension', results.pension / divider, results.pensionRate);
    updateDeductionCard('employmentInsurance', results.employmentInsurance / divider, results.employmentInsuranceRate);
    
    // Update comparison table
    updateComparisonTable(results);
    
    // Update chart
    updateTaxChart(results);
}

/**
 * Update individual deduction card
 */
function updateDeductionCard(id, amount, rate) {
    const amountElement = document.getElementById(id);
    if (amountElement) {
        amountElement.textContent = `¥${Math.round(amount).toLocaleString()}`;
    }
    
    // Update rate if element exists
    const rateElement = document.getElementById(id + 'Rate');
    if (rateElement) {
        rateElement.textContent = `${rate.toFixed(2)}%`;
    }
}

/**
 * Update comparison table with detailed breakdown
 */
function updateComparisonTable(results) {
    const tbody = document.getElementById('comparisonTableBody');
    if (!tbody) return;
    
    const rows = [
        { 
            name: 'Gross Income', 
            monthly: results.monthlyGross, 
            yearly: results.yearlyGross,
            percentage: 100,
            class: 'gross-income'
        },
        { 
            name: '－ Deductions', 
            monthly: 0, 
            yearly: 0,
            percentage: 0,
            class: 'separator'
        },
        { 
            name: `　Income Tax (${results.incomeTaxRate.toFixed(2)}%)`, 
            monthly: results.incomeTax / 12, 
            yearly: results.incomeTax,
            percentage: results.incomeTaxRate,
            class: 'deduction'
        },
        { 
            name: `　Resident Tax (${results.residentTaxRate.toFixed(2)}%)`, 
            monthly: results.residentTax / 12, 
            yearly: results.residentTax,
            percentage: results.residentTaxRate,
            class: 'deduction'
        },
        { 
            name: `　Health Insurance (${results.healthInsuranceRate.toFixed(2)}%)`, 
            monthly: results.healthInsurance / 12, 
            yearly: results.healthInsurance,
            percentage: results.healthInsuranceRate,
            class: 'deduction'
        },
        { 
            name: `　Pension (${results.pensionRate.toFixed(2)}%)`, 
            monthly: results.pension / 12, 
            yearly: results.pension,
            percentage: results.pensionRate,
            class: 'deduction'
        },
        { 
            name: `　Employment Insurance (${results.employmentInsuranceRate.toFixed(2)}%)`, 
            monthly: results.employmentInsurance / 12, 
            yearly: results.employmentInsurance,
            percentage: results.employmentInsuranceRate,
            class: 'deduction'
        },
        { 
            name: '＝ Result', 
            monthly: 0, 
            yearly: 0,
            percentage: 0,
            class: 'separator'
        },
        { 
            name: 'Total Deductions', 
            monthly: results.totalTaxAndDeductions / 12, 
            yearly: results.totalTaxAndDeductions,
            percentage: results.deductionPercentage,
            class: 'total-deduction total-row'
        },
        { 
            name: 'Take-Home Pay', 
            monthly: results.takeHomePay / 12, 
            yearly: results.takeHomePay,
            percentage: results.takeHomePercentage,
            class: 'take-home total-row'
        }
    ];
    
    tbody.innerHTML = rows.map(row => {
        if (row.class === 'separator') {
            return `<tr class="separator-row"><td colspan="4">${row.name}</td></tr>`;
        }
        
        return `
            <tr class="${row.class || ''}">
                <td>${row.name}</td>
                <td>¥${Math.round(row.monthly).toLocaleString()}</td>
                <td>¥${Math.round(row.yearly).toLocaleString()}</td>
                <td>${row.percentage.toFixed(1)}%</td>
            </tr>
        `;
    }).join('');
}

/**
 * Update tax visualization chart
 */
function updateTaxChart(results) {
    const ctx = document.getElementById('taxChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (taxChartInstance) {
        taxChartInstance.destroy();
        taxChartInstance = null;
    }
    
    // Create new doughnut chart
    taxChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [
                `Take-Home Pay (${results.takeHomePercentage.toFixed(1)}%)`,
                `Income Tax (${results.incomeTaxRate.toFixed(2)}%)`,
                `Resident Tax (${results.residentTaxRate.toFixed(2)}%)`,
                `Health Insurance (${results.healthInsuranceRate.toFixed(2)}%)`,
                `Pension (${results.pensionRate.toFixed(2)}%)`,
                `Employment Insurance (${results.employmentInsuranceRate.toFixed(2)}%)`
            ],
            datasets: [{
                data: [
                    results.takeHomePay,
                    results.incomeTax,
                    results.residentTax,
                    results.healthInsurance,
                    results.pension,
                    results.employmentInsurance
                ],
                backgroundColor: [
                    '#28a745', // Green for take-home
                    '#dc3545', // Red for income tax
                    '#ffc107', // Yellow for resident tax
                    '#17a2b8', // Cyan for health insurance
                    '#6610f2', // Purple for pension
                    '#e83e8c'  // Pink for employment insurance
                ],
                borderWidth: 2,
                borderColor: '#fff',
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 11
                        },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            const divider = currentPeriod === 'monthly' ? 12 : 1;
                            
                            return data.labels.map((label, i) => {
                                const value = data.datasets[0].data[i];
                                const amount = Math.round(value / divider).toLocaleString();
                                
                                return {
                                    text: `${label}: ¥${amount}`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    strokeStyle: data.datasets[0].borderColor,
                                    lineWidth: data.datasets[0].borderWidth,
                                    hidden: false,
                                    index: i
                                };
                            });
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const divider = currentPeriod === 'monthly' ? 12 : 1;
                            const amount = Math.round(value / divider).toLocaleString();
                            
                            return `¥${amount}`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Export tax calculation report
 */
function exportTaxReport() {
    const results = document.getElementById('taxResults');
    if (!results || results.style.display === 'none') {
        showMessage('Please calculate tax first before exporting', 'error');
        return;
    }
    
    // Get current values
    const grossIncome = document.getElementById('grossIncome').value;
    const period = currentPeriod;
    const takeHome = document.getElementById('takeHomeAmount').textContent;
    
    // Get all deduction values
    const deductions = {
        incomeTax: document.getElementById('incomeTax').textContent,
        residentTax: document.getElementById('residentTax').textContent,
        healthInsurance: document.getElementById('healthInsurance').textContent,
        pension: document.getElementById('pension').textContent,
        employmentInsurance: document.getElementById('employmentInsurance').textContent
    };
    
    // Create report content
    let reportContent = `JAPANESE TAX CALCULATION REPORT\n`;
    reportContent += `==============================\n\n`;
    reportContent += `Generated: ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    })}\n`;
    reportContent += `Period: ${period.charAt(0).toUpperCase() + period.slice(1)}\n\n`;
    
    reportContent += `INCOME INFORMATION\n`;
    reportContent += `------------------\n`;
    reportContent += `Gross Income: ¥${parseInt(grossIncome).toLocaleString()}\n`;
    reportContent += `Take-Home Pay: ${takeHome}\n`;
    reportContent += `Take-Home Rate: 77.7%\n\n`;
    
    reportContent += `DEDUCTIONS BREAKDOWN\n`;
    reportContent += `-------------------\n`;
    reportContent += `Income Tax (1.77%): ${deductions.incomeTax}\n`;
    reportContent += `Resident Tax (3.89%): ${deductions.residentTax}\n`;
    reportContent += `Health Insurance (6.26%): ${deductions.healthInsurance}\n`;
    reportContent += `Pension (9.45%): ${deductions.pension}\n`;
    reportContent += `Employment Insurance (0.93%): ${deductions.employmentInsurance}\n`;
    reportContent += `------------------\n`;
    reportContent += `Total Deductions: 22.3%\n\n`;
    
    reportContent += `QUICK REFERENCE\n`;
    reportContent += `---------------\n`;
    reportContent += `Formula: Take-home = Gross Income × 0.777\n`;
    reportContent += `Total Tax Rate: 22.3%\n`;
    reportContent += `Net Income Rate: 77.7%\n\n`;
    
    reportContent += `NOTE: This calculation uses standard Japanese tax rates.\n`;
    reportContent += `Actual amounts may vary based on individual circumstances.\n`;
    reportContent += `Please consult with a tax professional for detailed advice.\n`;
    
    // Create and download file
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tax-report-${currentPeriod}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('Tax report exported successfully!', 'success');
}

/**
 * Show temporary message to user
 */
function showMessage(message, type = 'success') {
    // Remove any existing messages
    const existingMessages = document.querySelectorAll('.tax-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `tax-message ${type}`;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    
    // Set colors based on type
    if (type === 'success') {
        messageDiv.style.background = '#d4edda';
        messageDiv.style.color = '#155724';
        messageDiv.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
        messageDiv.style.background = '#f8d7da';
        messageDiv.style.color = '#721c24';
        messageDiv.style.border = '1px solid #f5c6cb';
    } else {
        messageDiv.style.background = '#d1ecf1';
        messageDiv.style.color = '#0c5460';
        messageDiv.style.border = '1px solid #bee5eb';
    }
    
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            messageDiv.remove();
            style.remove();
        }, 300);
    }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTaxCalculator);

// Log successful load
console.log('Tax Calculator loaded successfully with actual Japanese tax rates (22.3% total)');