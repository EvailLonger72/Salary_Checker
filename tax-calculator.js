// Enhanced tax-calculator.js with Fixed Monthly Deductions - CORRECTED VERSION

// Global variables
let currentPeriod = "monthly";
let weeklyData = JSON.parse(localStorage.getItem("weeklyData") || "[]");
let taxChartInstance = null;

// Fixed Monthly Deductions (ပုံမှန်လစဉ်ဖြတ်တောက်ချက်များ) - Updated from actual payslip
const FIXED_MONTHLY_DEDUCTIONS = {
  employmentInsurance: 2474, // 雇用保険料: ¥2,474 (ပုံမှန်လစဉ်)
  healthInsurance: 14960, // 健康保険料: ¥14,960 (ပုံမှန်လစဉ်)
  pension: 31110, // 厚生年金保険料: ¥31,110 (ပုံမှန်လစဉ်)
  dormitoryFee: 34000, // 寮・社宅: ¥34,000 (ပုံမှန်လစဉ်)

  // Calculate total fixed deductions
  getTotal: function () {
    return (
      this.employmentInsurance +
      this.healthInsurance +
      this.pension +
      this.dormitoryFee
    );
  },
};

// Variable Tax Rates (ဝင်ငွေခွန်အမျိုးမျိုး) - Updated from actual payslip
const VARIABLE_TAX_RATES = {
  incomeTax: 0.037, // Income tax rate (3.7% - calculated from ¥16,650/¥449,846)
  // Note: Resident tax not shown in this payslip - appears in different months
};

/**
 * Enhanced tax calculation with fixed and variable deductions
 */
function calculateTax() {
  const grossIncome =
    parseFloat(document.getElementById("grossIncome").value) || 0;
  const age = parseInt(document.getElementById("age").value) || 25;
  const dependents = parseInt(document.getElementById("dependents").value) || 0;
  const prefecture = document.getElementById("prefecture").value || "oita";
  const status = document.getElementById("status").value || "single";
  const incomeSource =
    document.getElementById("incomeSource").value || "employment";

  if (grossIncome <= 0) {
    showMessage("Please enter a valid gross income amount", "error");
    return;
  }

  // Calculate monthly and yearly gross income
  let monthlyGross, yearlyGross;

  if (currentPeriod === "monthly") {
    monthlyGross = grossIncome;
    yearlyGross = grossIncome * 12;
  } else {
    yearlyGross = grossIncome;
    monthlyGross = grossIncome / 12;
  }

  // FIXED MONTHLY DEDUCTIONS (ပုံမှန်လစဉ်ဖြတ်တောက်ချက်များ) - Updated
  const fixedDeductions = {
    employmentInsurance: FIXED_MONTHLY_DEDUCTIONS.employmentInsurance,
    healthInsurance: FIXED_MONTHLY_DEDUCTIONS.healthInsurance,
    pension: FIXED_MONTHLY_DEDUCTIONS.pension, // Now fixed amount from payslip
    dormitoryFee: FIXED_MONTHLY_DEDUCTIONS.dormitoryFee,
  };

  const totalFixedMonthly = FIXED_MONTHLY_DEDUCTIONS.getTotal();
  const totalFixedYearly = totalFixedMonthly * 12;

  // VARIABLE DEDUCTIONS (ဝင်ငွေခွန်အပေါ် ဖြတ်တောက်ချက်များ) - Only income tax now
  const variableDeductions = {
    incomeTax: monthlyGross * VARIABLE_TAX_RATES.incomeTax,
    residentTax: 0, // Not shown in this payslip - varies by month
  };

  const totalVariableMonthly = Object.values(variableDeductions).reduce(
    (sum, val) => sum + val,
    0
  );
  const totalVariableYearly = totalVariableMonthly * 12;

  // TOTAL DEDUCTIONS
  const totalMonthlyDeductions = totalFixedMonthly + totalVariableMonthly;
  const totalYearlyDeductions = totalFixedYearly + totalVariableYearly;

  // TAKE-HOME PAY
  const monthlyTakeHome = monthlyGross - totalMonthlyDeductions;
  const yearlyTakeHome = yearlyGross - totalYearlyDeductions;

  // PERCENTAGES
  const takeHomePercentage = (yearlyTakeHome / yearlyGross) * 100;
  const totalDeductionPercentage = (totalYearlyDeductions / yearlyGross) * 100;
  const fixedDeductionPercentage = (totalFixedYearly / yearlyGross) * 100;
  const variableDeductionPercentage = (totalVariableYearly / yearlyGross) * 100;

  // Prepare results object
  const results = {
    // Income
    monthlyGross: monthlyGross,
    yearlyGross: yearlyGross,

    // Fixed Deductions (ပုံမှန်ဖြတ်တောက်ချက်များ) - Updated structure
    fixedDeductions: {
      employmentInsurance: fixedDeductions.employmentInsurance * 12,
      healthInsurance: fixedDeductions.healthInsurance * 12,
      pension: fixedDeductions.pension * 12, // Now fixed amount
      dormitoryFee: fixedDeductions.dormitoryFee * 12,
      total: totalFixedYearly,
    },

    // Variable Deductions (ဝင်ငွေခွန်အပေါ်ဖြတ်တောက်ချက်များ) - Updated
    variableDeductions: {
      incomeTax: variableDeductions.incomeTax * 12,
      residentTax: 0, // Not in this payslip
      total: totalVariableYearly,
    },

    // Totals
    totalDeductions: totalYearlyDeductions,
    takeHomePay: yearlyTakeHome,

    // Percentages
    takeHomePercentage: takeHomePercentage,
    totalDeductionPercentage: totalDeductionPercentage,
    fixedDeductionPercentage: fixedDeductionPercentage,
    variableDeductionPercentage: variableDeductionPercentage,

    // Rates for display - Updated
    incomeTaxRate: VARIABLE_TAX_RATES.incomeTax * 100,
    residentTaxRate: 0, // Not shown in current payslip
    pensionRate: 0, // Now calculated as fixed amount, not percentage
  };

  // Display results
  displayEnhancedResults(results);

  // Show results section
  const resultsSection = document.getElementById("taxResults");
  if (resultsSection.style.display === "none") {
    resultsSection.style.display = "block";
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/**
 * Display enhanced results with fixed and variable deductions
 */
function displayEnhancedResults(results) {
  // Update period label
  document.getElementById("resultsPeriod").textContent =
    currentPeriod === "monthly" ? "Monthly Breakdown" : "Yearly Breakdown";

  // Calculate display values based on selected period
  const divider = currentPeriod === "monthly" ? 12 : 1;

  // Update take-home summary
  document.getElementById("takeHomeAmount").textContent = `¥${Math.round(
    results.takeHomePay / divider
  ).toLocaleString()}`;
  document.getElementById(
    "takeHomePercentage"
  ).textContent = `${results.takeHomePercentage.toFixed(1)}% of gross`;

  // Update deduction cards with new structure
  updateEnhancedDeductionCards(results, divider);

  // Update comparison table with enhanced breakdown
  updateEnhancedComparisonTable(results);

  // Update chart with new categories
  updateEnhancedTaxChart(results);
}

/**
 * Update deduction cards with fixed vs variable categorization
 */
function updateEnhancedDeductionCards(results, divider) {
  // Fixed Deductions - Updated structure
  updateDeductionCard(
    "employmentInsurance",
    results.fixedDeductions.employmentInsurance / divider,
    "¥2,474 Fixed"
  );
  updateDeductionCard(
    "healthInsurance",
    results.fixedDeductions.healthInsurance / divider,
    "¥14,960 Fixed"
  );
  updateDeductionCard(
    "pension",
    results.fixedDeductions.pension / divider,
    "¥31,110 Fixed"
  );
  updateDeductionCard(
    "dormitoryFee",
    results.fixedDeductions.dormitoryFee / divider,
    "¥34,000 Fixed"
  );

  // Variable Deductions - Updated
  updateDeductionCard(
    "incomeTax",
    results.variableDeductions.incomeTax / divider,
    results.incomeTaxRate.toFixed(2) + "%"
  );
  updateDeductionCard(
    "residentTax",
    results.variableDeductions.residentTax / divider,
    "Not in payslip"
  );
}

/**
 * Update individual deduction card
 */
function updateDeductionCard(id, amount, rate) {
  const amountElement = document.getElementById(id);
  if (amountElement) {
    amountElement.textContent = `¥${Math.round(amount).toLocaleString()}`;
  }

  const rateElement = document.getElementById(id + "Rate");
  if (rateElement) {
    rateElement.textContent = rate;
  }
}

/**
 * Enhanced comparison table with fixed vs variable breakdown
 */
function updateEnhancedComparisonTable(results) {
  const tbody = document.getElementById("comparisonTableBody");
  if (!tbody) return;

  const rows = [
    {
      name: "Gross Income",
      monthly: results.monthlyGross,
      yearly: results.yearlyGross,
      percentage: 100,
      class: "gross-income",
    },
    {
      name: "－ Fixed Monthly Deductions (ပုံမှန်လစဉ်ဖြတ်တောက်ချက်)",
      monthly: 0,
      yearly: 0,
      percentage: 0,
      class: "separator",
    },
    {
      name: `　Employment Insurance (雇用保険料)`,
      monthly: results.fixedDeductions.employmentInsurance / 12,
      yearly: results.fixedDeductions.employmentInsurance,
      percentage:
        (results.fixedDeductions.employmentInsurance / results.yearlyGross) *
        100,
      class: "fixed-deduction",
    },
    {
      name: `　Health Insurance (健康保険料)`,
      monthly: results.fixedDeductions.healthInsurance / 12,
      yearly: results.fixedDeductions.healthInsurance,
      percentage:
        (results.fixedDeductions.healthInsurance / results.yearlyGross) * 100,
      class: "fixed-deduction",
    },
    {
      name: `　Pension (厚生年金保険料)`,
      monthly: results.fixedDeductions.pension / 12,
      yearly: results.fixedDeductions.pension,
      percentage: (results.fixedDeductions.pension / results.yearlyGross) * 100,
      class: "fixed-deduction",
    },
    {
      name: `　Dormitory Fee (寮・社宅)`,
      monthly: results.fixedDeductions.dormitoryFee / 12,
      yearly: results.fixedDeductions.dormitoryFee,
      percentage:
        (results.fixedDeductions.dormitoryFee / results.yearlyGross) * 100,
      class: "fixed-deduction",
    },
    {
      name: "－ Variable Deductions (ဝင်ငွေခွန်အပေါ်ဖြတ်တောက်ချက်)",
      monthly: 0,
      yearly: 0,
      percentage: 0,
      class: "separator",
    },
    {
      name: `　Income Tax (${results.incomeTaxRate.toFixed(2)}%)`,
      monthly: results.variableDeductions.incomeTax / 12,
      yearly: results.variableDeductions.incomeTax,
      percentage: results.incomeTaxRate,
      class: "variable-deduction",
    },
    {
      name: "＝ Result",
      monthly: 0,
      yearly: 0,
      percentage: 0,
      class: "separator",
    },
    {
      name: "Total Fixed Deductions",
      monthly: results.fixedDeductions.total / 12,
      yearly: results.fixedDeductions.total,
      percentage: results.fixedDeductionPercentage,
      class: "total-fixed total-row",
    },
    {
      name: "Total Variable Deductions",
      monthly: results.variableDeductions.total / 12,
      yearly: results.variableDeductions.total,
      percentage: results.variableDeductionPercentage,
      class: "total-variable total-row",
    },
    {
      name: "Total All Deductions",
      monthly: results.totalDeductions / 12,
      yearly: results.totalDeductions,
      percentage: results.totalDeductionPercentage,
      class: "total-deduction total-row",
    },
    {
      name: "Take-Home Pay",
      monthly: results.takeHomePay / 12,
      yearly: results.takeHomePay,
      percentage: results.takeHomePercentage,
      class: "take-home total-row",
    },
  ];

  tbody.innerHTML = rows
    .map((row) => {
      if (row.class === "separator") {
        return `<tr class="separator-row"><td colspan="4"><strong>${row.name}</strong></td></tr>`;
      }

      return `
            <tr class="${row.class || ""}">
                <td>${row.name}</td>
                <td>¥${Math.round(row.monthly).toLocaleString()}</td>
                <td>¥${Math.round(row.yearly).toLocaleString()}</td>
                <td>${row.percentage.toFixed(2)}%</td>
            </tr>
        `;
    })
    .join("");
}

/**
 * Enhanced tax chart with fixed vs variable categories
 */
function updateEnhancedTaxChart(results) {
  const ctx = document.getElementById("taxChart");
  if (!ctx) return;

  // Destroy existing chart
  if (taxChartInstance) {
    taxChartInstance.destroy();
    taxChartInstance = null;
  }

  // Create enhanced doughnut chart
  taxChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: [
        `Take-Home Pay (${results.takeHomePercentage.toFixed(1)}%)`,
        `Employment Insurance - Fixed`,
        `Health Insurance - Fixed`,
        `Pension - Fixed`,
        `Dormitory Fee - Fixed`,
        `Income Tax (${results.incomeTaxRate.toFixed(1)}%)`,
      ],
      datasets: [
        {
          data: [
            results.takeHomePay,
            results.fixedDeductions.employmentInsurance,
            results.fixedDeductions.healthInsurance,
            results.fixedDeductions.pension,
            results.fixedDeductions.dormitoryFee,
            results.variableDeductions.incomeTax,
          ],
          backgroundColor: [
            "#28a745", // Green for take-home
            "#6c757d", // Gray for fixed - employment insurance
            "#17a2b8", // Cyan for fixed - health insurance
            "#6610f2", // Purple for fixed - pension
            "#fd7e14", // Orange for fixed - dormitory
            "#dc3545", // Red for variable - income tax
          ],
          borderWidth: 2,
          borderColor: "#fff",
          hoverOffset: 10,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 15,
            font: {
              size: 10,
            },
            generateLabels: function (chart) {
              const data = chart.data;
              const divider = currentPeriod === "monthly" ? 12 : 1;

              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                const amount = Math.round(value / divider).toLocaleString();

                return {
                  text: `${label}: ¥${amount}`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor,
                  lineWidth: data.datasets[0].borderWidth,
                  hidden: false,
                  index: i,
                };
              });
            },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const value = context.parsed;
              const divider = currentPeriod === "monthly" ? 12 : 1;
              const amount = Math.round(value / divider).toLocaleString();

              return `¥${amount}`;
            },
          },
        },
      },
    },
  });
}

/**
 * Show temporary message to user
 */
function showMessage(message, type = "success") {
  const existingMessages = document.querySelectorAll(".tax-message");
  existingMessages.forEach((msg) => msg.remove());

  const messageDiv = document.createElement("div");
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

  if (type === "success") {
    messageDiv.style.background = "#d4edda";
    messageDiv.style.color = "#155724";
    messageDiv.style.border = "1px solid #c3e6cb";
  } else if (type === "error") {
    messageDiv.style.background = "#f8d7da";
    messageDiv.style.color = "#721c24";
    messageDiv.style.border = "1px solid #f5c6cb";
  } else {
    messageDiv.style.background = "#d1ecf1";
    messageDiv.style.color = "#0c5460";
    messageDiv.style.border = "1px solid #bee5eb";
  }

  messageDiv.textContent = message;
  document.body.appendChild(messageDiv);

  setTimeout(() => {
    messageDiv.remove();
  }, 3000);
}

// Export the calculate function for global access
window.calculateTax = calculateTax;
