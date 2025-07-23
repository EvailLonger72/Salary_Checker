// tax-calculator.js - Japanese Tax Calculator

// Global variables
let currentPeriod = 'monthly';
let weeklyData = JSON.parse(localStorage.getItem('weeklyData') || '[]');
let taxChartInstance = null;

// Japanese Tax Rates for 2025
const TAX_RATES = {
    income: [
        { min: 0, max: 1950000, rate: 0.05 },
        { min: 1950000, max: 3300000, rate: 0.10 },
        { min: 3300000, max: 6950000, rate: 0.20 },
        { min: 6950000, max: 9000000, rate: 0.23 },
        { min: 9000000, max: 18000000, rate: 0.33 },
        { min: 18000000, max: 40000000, rate: 0.40 },
        { min: 40000000, max: Infinity, rate: 0.45 }
    ],
    resident: 0.10, // 10% flat rate
    healthInsurance: {
        tokyo: 0.0998,
        osaka: 0.1029,
        oita: 0.0977,
        other: 0.10
    },
    pension: 0.0915, // 9.15% for employees
    employmentInsurance: 0.003, // 0.3% for employees
    basicDeduction: 480000, // Basic deduction per year
    dependentDeduction: 380000 // Per dependent per year
};

/**
 * Initialize tax calculator
 */
function initializeTaxCalculator() {
    // Set up period toggle
    document.querySelectorAll('.period-toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.period-toggle-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPeriod = this.dataset.period;
            
            // Recalculate if results are visible
            if (document.getElementById('taxResults').style.display !== 'none') {
                calculateTax();
            }
        });
    });

    // Set up input listeners for real-time calculation
    const inputs = ['grossIncome', 'age', 'dependents', 'prefecture', 'status'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', function() {
                if (document.getElementById('taxResults').style.display !== 'none') {
                    calculateTax();
                }
            });
        }
    });

    // Auto-fill current month data if available
    fillThisMonth();
}

/**
 * Fill income from last month's data
 */
function fillLastMonth() {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    
    fillIncomeForPeriod(lastMonth, lastMonthEnd);
}

/**
 * Fill income from this month's data
 */
function fillThisMonth() {
    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    fillIncomeForPeriod(thisMonthStart, thisMonthEnd);
}

/**
 * Fill income from last year's data
 */
function fillLastYear() {
    const today = new Date();
    const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
    
    fillIncomeForPeriod(lastYearStart, lastYearEnd, true);
}

/**
 * Fill income for a specific period
 */
function fillIncomeForPeriod(startDate, endDate, isYearly = false) {
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
        
        showMessage(`Filled with ${periodData.length} entries: ¥${totalIncome.toLocaleString()}`, 'success');
    } else {
        showMessage('No data found for the selected period', 'info');
    }
}

/**
 * Calculate tax based on inputs
 */
function calculateTax() {
    // Get input values
    const grossIncome = parseFloat(document.getElementById('grossIncome').value) || 0;
    const age = parseInt(document.getElementById('age').value) || 25;
    const dependents = parseInt(document.getElementById('dependents').value) || 0;
    const prefecture = document.getElementById('prefecture').value;
    const status = document.getElementById('status').value;
    const incomeSource = document.getElementById('incomeSource').value;

    if (grossIncome <= 0) {
        showMessage('Please enter a valid gross income', 'error');
        return;
    }

    // Convert to yearly if needed
    const yearlyGross = currentPeriod === 'monthly' ? grossIncome * 12 : grossIncome;
    
    // Calculate deductions
    const basicDeduction = TAX_RATES.basicDeduction;
    const dependentDeduction = TAX_RATES.dependentDeduction * dependents;
    const totalDeductions = basicDeduction + dependentDeduction;
    
    // Calculate taxable income
    const taxableIncome = Math.max(0, yearlyGross - totalDeductions);
    
    // Calculate income tax
    const incomeTax = calculateIncomeTax(taxableIncome);
    
    // Calculate resident tax (previous year's income based)
    const residentTax = taxableIncome * TAX_RATES.resident;
    
    // Calculate social insurance
    const healthInsuranceRate = TAX_RATES.healthInsurance[prefecture] || TAX_RATES.healthInsurance.other;
    const healthInsurance = yearlyGross * healthInsuranceRate;
    
    // Calculate pension
    const pension = yearlyGross * TAX_RATES.pension;
    
    // Calculate employment insurance (only for employed workers)
    const employmentInsurance = incomeSource === 'employment' ? yearlyGross * TAX_RATES.employmentInsurance : 0;
    
    // Total deductions
    const totalTaxAndDeductions = incomeTax + residentTax + healthInsurance + pension + employmentInsurance;
    
    // Take-home pay
    const takeHomePay = yearlyGross - totalTaxAndDeductions;
    const takeHomePercentage = (takeHomePay / yearlyGross) * 100;
    
    // Display results
    displayResults({
        yearlyGross,
        incomeTax,
        residentTax,
        healthInsurance,
        pension,
        employmentInsurance,
        totalTaxAndDeductions,
        takeHomePay,
        takeHomePercentage,
        healthInsuranceRate,
        effectiveTaxRate: (incomeTax / yearlyGross) * 100
    });
    
    // Show results section
    document.getElementById('taxResults').style.display = 'block';
    document.getElementById('taxResults').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Calculate income tax based on progressive tax brackets
 */
function calculateIncomeTax(taxableIncome) {
    let tax = 0;
    
    for (const bracket of TAX_RATES.income) {
        if (taxableIncome > bracket.min) {
            const taxableInBracket = Math.min(taxableIncome - bracket.min, bracket.max - bracket.min);
            tax += taxableInBracket * bracket.rate;
        }
    }
    
    return tax;
}

/**
 * Display calculation results
 */
function displayResults(results) {
    // Update period label
    document.getElementById('resultsPeriod').textContent = currentPeriod === 'monthly' ? 'Monthly Breakdown' : 'Yearly Breakdown';
    
    // Calculate display values
    const divider = currentPeriod === 'monthly' ? 12 : 1;
    
    // Update take-home summary
    document.getElementById('takeHomeAmount').textContent = 
        `¥${Math.round(results.takeHomePay / divider).toLocaleString()}`;
    document.getElementById('takeHomePercentage').textContent = 
        `${results.takeHomePercentage.toFixed(1)}% of gross`;
    
    // Update deduction cards
    document.getElementById('incomeTax').textContent = 
        `¥${Math.round(results.incomeTax / divider).toLocaleString()}`;
    document.getElementById('incomeTaxRate').textContent = 
        `${results.effectiveTaxRate.toFixed(1)}%`;
    
    document.getElementById('residentTax').textContent = 
        `¥${Math.round(results.residentTax / divider).toLocaleString()}`;
    
    document.getElementById('healthInsurance').textContent = 
        `¥${Math.round(results.healthInsurance / divider).toLocaleString()}`;
    document.getElementById('healthInsuranceRate').textContent = 
        `${(results.healthInsuranceRate * 100).toFixed(2)}%`;
    
    document.getElementById('pension').textContent = 
        `¥${Math.round(results.pension / divider).toLocaleString()}`;
    
    document.getElementById('employmentInsurance').textContent = 
        `¥${Math.round(results.employmentInsurance / divider).toLocaleString()}`;
    
    // Update comparison table
    updateComparisonTable(results);
    
    // Update chart
    updateTaxChart(results);
}

/**
 * Update comparison table
 */
function updateComparisonTable(results) {
    const tbody = document.getElementById('comparisonTableBody');
    
    const items = [
        { name: 'Gross Income', value: results.yearlyGross },
        { name: 'Income Tax', value: results.incomeTax },
        { name: 'Resident Tax', value: results.residentTax },
        { name: 'Health Insurance', value: results.healthInsurance },
        { name: 'Pension', value: results.pension },
        { name: 'Employment Insurance', value: results.employmentInsurance },
        { name: 'Total Deductions', value: results.totalTaxAndDeductions },
        { name: 'Take-Home Pay', value: results.takeHomePay }
    ];
    
    tbody.innerHTML = items.map(item => {
        const percentage = (item.value / results.yearlyGross) * 100;
        const isTotal = item.name === 'Total Deductions' || item.name === 'Take-Home Pay';
        
        return `
            <tr class="${isTotal ? 'total-row' : ''}">
                <td>${item.name}</td>
                <td>¥${Math.round(item.value / 12).toLocaleString()}</td>
                <td>¥${Math.round(item.value).toLocaleString()}</td>
                <td>${percentage.toFixed(1)}%</td>
            </tr>
        `;
    }).join('');
}

/**
 * Update tax visualization chart
 */
function updateTaxChart(results) {
    const ctx = document.getElementById('taxChart');
    
    // Destroy existing chart
    if (taxChartInstance) {
        taxChartInstance.destroy();
    }
    
    // Create new chart
    taxChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [
                'Take-Home Pay',
                'Income Tax',
                'Resident Tax',
                'Health Insurance',
                'Pension',
                'Employment Insurance'
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
                    '#28a745',
                    '#dc3545',
                    '#ffc107',
                    '#17a2b8',
                    '#6610f2',
                    '#e83e8c'
                ],
                borderWidth: 2,
                borderColor: '#fff'
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
                            size: 12
                        },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            return data.labels.map((label, i) => {
                                const value = data.datasets[0].data[i];
                                const percentage = ((value / results.yearlyGross) * 100).toFixed(1);
                                const divider = currentPeriod === 'monthly' ? 12 : 1;
                                return {
                                    text: `${label}: ¥${Math.round(value / divider).toLocaleString()} (${percentage}%)`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
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
                            const percentage = ((value / results.yearlyGross) * 100).toFixed(1);
                            const divider = currentPeriod === 'monthly' ? 12 : 1;
                            return `${label}: ¥${Math.round(value / divider).toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Export tax report
 */
function exportTaxReport() {
    const results = document.getElementById('taxResults');
    if (results.style.display === 'none') {
        showMessage('Please calculate tax first', 'error');
        return;
    }
    
    // Get current calculation data
    const grossIncome = parseFloat(document.getElementById('grossIncome').value) || 0;
    const takeHome = document.getElementById('takeHomeAmount').textContent;
    const period = currentPeriod;
    
    // Create report content
    let reportContent = `TAX CALCULATION REPORT\n`;
    reportContent += `Generated: ${new Date().toLocaleDateString()}\n`;
    reportContent += `Period: ${period.charAt(0).toUpperCase() + period.slice(1)}\n\n`;
    
    reportContent += `INCOME INFORMATION\n`;
    reportContent += `Gross Income: ¥${grossIncome.toLocaleString()}\n`;
    reportContent += `Take-Home Pay: ${takeHome}\n\n`;
    
    reportContent += `DEDUCTIONS BREAKDOWN\n`;
    
    // Get all deduction values
    const deductions = [
        { name: 'Income Tax', value: document.getElementById('incomeTax').textContent },
        { name: 'Resident Tax', value: document.getElementById('residentTax').textContent },
        { name: 'Health Insurance', value: document.getElementById('healthInsurance').textContent },
        { name: 'Pension', value: document.getElementById('pension').textContent },
        { name: 'Employment Insurance', value: document.getElementById('employmentInsurance').textContent }
    ];
    
    deductions.forEach(item => {
        reportContent += `${item.name}: ${item.value}\n`;
    });
    
    // Create and download file
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tax-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('Tax report exported successfully!', 'success');
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
    messageDiv.style.padding = '15px 25px';
    messageDiv.style.borderRadius = '10px';
    messageDiv.style.fontWeight = '500';
    
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
    
    document.body.appendChild(messageDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}