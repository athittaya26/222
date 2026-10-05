const CSV_PATH = "../dataset/cleaned_bakery_dataset.csv";
const MONTH_ORDER = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const charts = {};
let allData = [];

const numberFormat = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
});

const moneyFormat = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const shortMoney = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
});

const categoryPalette = [
    "#6D5DFC", "#25A7A0", "#E5A84B", "#EF6A73", "#4D9DE0",
    "#8C6FF0", "#47B881", "#D977B4", "#7C8798", "#F59E0B"
];

document.addEventListener("DOMContentLoaded", loadData);

function loadData() {
    Papa.parse(CSV_PATH, {
        download: true,
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
            allData = results.data
                .filter(row => row.Transaction_ID)
                .map(normalizeRow);

            document.getElementById("statusText").textContent =
                `${numberFormat.format(allData.length)} รายการพร้อมใช้งาน`;

            setupFilters();
            updateDashboard();

            document.querySelectorAll(".chart-reset").forEach(button => {
                button.addEventListener("click", () => {
                    const chart = charts[button.dataset.chart];
                    if (chart) chart.resetZoom();
                });
            });
        },
        error: (error) => {
            console.error(error);
            document.getElementById("statusText").textContent =
                "โหลดข้อมูลไม่สำเร็จ";
            document.getElementById("dataExplanation").textContent =
                "ไม่สามารถอ่านไฟล์ CSV ได้ กรุณาตรวจสอบตำแหน่งไฟล์ dataset และเปิดเว็บไซต์ผ่าน Live Server";
        }
    });
}

function normalizeRow(row) {
    const numericFields = [
        "Customer_Age", "Quantity", "Unit_Price", "Discount_Percentage",
        "Discount_Amount", "Selling_Price", "Total_Bill", "Temperature",
        "Shelf_Life_Days", "Stock_Available", "Units_Produced",
        "Units_Sold", "Unsold_Units", "Promotion_Score",
        "Customer_Rating", "Profit", "Waste_Cost", "Recommended_Discount"
    ];

    numericFields.forEach(field => {
        row[field] = Number(row[field]) || 0;
    });

    return row;
}

function setupFilters() {
    fillSelect("monthFilter", uniqueValues(allData, "Month"), MONTH_ORDER);
    fillSelect("categoryFilter", uniqueValues(allData, "Category"));
    fillSelect("paymentFilter", uniqueValues(allData, "Payment_Method"));
    fillSelect("riskFilter", uniqueValues(allData, "Expiry_Risk"));

    document.querySelectorAll(".filters select").forEach(select => {
        select.addEventListener("change", updateDashboard);
    });

    document.getElementById("resetFilters").addEventListener("click", () => {
        document.querySelectorAll(".filters select").forEach(select => {
            select.value = "All";
        });
        updateDashboard();
    });
}

function fillSelect(id, values, preferredOrder = null) {
    const select = document.getElementById(id);
    const sorted = preferredOrder
        ? preferredOrder.filter(v => values.includes(v))
        : [...values].sort((a, b) => String(a).localeCompare(String(b)));

    sorted.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
}

function uniqueValues(data, field) {
    return [...new Set(
        data
            .map(row => row[field])
            .filter(value => value !== undefined && value !== null && value !== "")
    )];
}

function getFilteredData() {
    const month = document.getElementById("monthFilter").value;
    const category = document.getElementById("categoryFilter").value;
    const payment = document.getElementById("paymentFilter").value;
    const risk = document.getElementById("riskFilter").value;

    return allData.filter(row =>
        (month === "All" || row.Month === month) &&
        (category === "All" || row.Category === category) &&
        (payment === "All" || row.Payment_Method === payment) &&
        (risk === "All" || row.Expiry_Risk === risk)
    );
}

function updateDashboard() {
    const data = getFilteredData();

    updateTopInformation(data);
    updateKPIs(data);
    updateInsights(data);

    createOrUpdateMonthlySales(data);
    createOrUpdateCategorySales(data);
    createOrUpdateCategoryProfit(data);
    createOrUpdatePayment(data);
    createOrUpdateInventory(data);
    createOrUpdateRisk(data);
}

function updateTopInformation(data) {
    const dates = data
        .map(row => row.Date)
        .filter(Boolean)
        .sort();

    document.getElementById("recordCount").textContent =
        numberFormat.format(data.length);

    document.getElementById("dateRange").textContent =
        dates.length
            ? `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`
            : "-";

    const sales = sum(data, "Total_Bill");
    const profit = sum(data, "Profit");
    const unsold = sum(data, "Unsold_Units");

    document.getElementById("dataExplanation").textContent =
        `มุมมองปัจจุบันแสดง ${numberFormat.format(data.length)} รายการ ` +
        `มียอดขายรวม ${formatMoney(sales)} และกำไรรวม ${formatMoney(profit)} ` +
        `โดยมีสินค้าที่ขายไม่หมด ${numberFormat.format(unsold)} หน่วย ` +
        `สามารถใช้ตัวกรองด้านบนเพื่อเจาะดูข้อมูลเฉพาะเดือน หมวดหมู่ ช่องทางชำระเงิน ` +
        `หรือระดับความเสี่ยงหมดอายุได้`;

    updateFilterSummary(data.length);
}

function updateFilterSummary(count) {
    const month = document.getElementById("monthFilter").value;
    const category = document.getElementById("categoryFilter").value;
    const payment = document.getElementById("paymentFilter").value;
    const risk = document.getElementById("riskFilter").value;

    const active = [];

    if (month !== "All") active.push(`เดือน: ${month}`);
    if (category !== "All") active.push(`หมวดหมู่: ${category}`);
    if (payment !== "All") active.push(`ชำระเงิน: ${payment}`);
    if (risk !== "All") active.push(`ความเสี่ยง: ${risk}`);

    document.getElementById("filterSummary").textContent =
        active.length
            ? `กำลังแสดง ${numberFormat.format(count)} รายการ | ${active.join(" • ")}`
            : `กำลังแสดงข้อมูลทั้งหมด ${numberFormat.format(count)} รายการ`;
}

function updateKPIs(data) {
    document.getElementById("kpiSales").textContent =
        formatMoney(sum(data, "Total_Bill"));

    document.getElementById("kpiProfit").textContent =
        formatMoney(sum(data, "Profit"));

    document.getElementById("kpiUnits").textContent =
        numberFormat.format(sum(data, "Units_Sold"));

    document.getElementById("kpiUnsold").textContent =
        numberFormat.format(sum(data, "Unsold_Units"));

    document.getElementById("kpiWaste").textContent =
        formatMoney(sum(data, "Waste_Cost"));
}

function updateInsights(data) {
    const category = groupSum(data, "Category", "Total_Bill");
    const month = groupSum(data, "Month", "Total_Bill");
    const payment = groupCount(data, "Payment_Method");
    const risk = groupCount(data, "Expiry_Risk");

    document.getElementById("insightCategory").textContent =
        topKey(category, "-");

    document.getElementById("insightMonth").textContent =
        topKey(month, "-");

    document.getElementById("insightPayment").textContent =
        topKey(payment, "-");

    document.getElementById("insightRisk").textContent =
        topKey(risk, "-");
}

function createOrUpdateMonthlySales(data) {
    const totals = {};
    MONTH_ORDER.forEach(month => totals[month] = 0);

    data.forEach(row => {
        if (totals[row.Month] !== undefined) {
            totals[row.Month] += row.Total_Bill;
        }
    });

    const chartData = MONTH_ORDER.map(month => totals[month]);

    upsertChart("monthlySalesChart", {
        type: "line",
        data: {
            labels: MONTH_ORDER,
            datasets: [{
                label: "ยอดขายรวม",
                data: chartData,
                borderColor: "#6D5DFC",
                backgroundColor: "rgba(109, 93, 252, 0.12)",
                pointBackgroundColor: "#6D5DFC",
                pointBorderColor: "#ffffff",
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 7,
                borderWidth: 3,
                fill: true,
                tension: 0.35
            }]
        },
        options: lineOptions("ยอดขาย", true)
    });
}

function createOrUpdateCategorySales(data) {
    const totals = groupSum(data, "Category", "Total_Bill");
    const entries = sortedEntries(totals);

    upsertChart("categorySalesChart", {
        type: "bar",
        data: {
            labels: entries.map(([key]) => key),
            datasets: [{
                label: "ยอดขาย",
                data: entries.map(([, value]) => value),
                backgroundColor: categoryPalette.slice(0, entries.length),
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: barOptions("ยอดขาย")
    });
}

function createOrUpdateCategoryProfit(data) {
    const totals = groupSum(data, "Category", "Profit");
    const entries = sortedEntries(totals);

    upsertChart("categoryProfitChart", {
        type: "bar",
        data: {
            labels: entries.map(([key]) => key),
            datasets: [{
                label: "กำไร",
                data: entries.map(([, value]) => value),
                backgroundColor: entries.map(([, value]) =>
                    value >= 0 ? "#25A7A0" : "#EF6A73"
                ),
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: barOptions("กำไร")
    });
}

function createOrUpdatePayment(data) {
    const totals = groupCount(data, "Payment_Method");
    const entries = Object.entries(totals);

    upsertChart("paymentChart", {
        type: "doughnut",
        data: {
            labels: entries.map(([key]) => key),
            datasets: [{
                label: "จำนวนรายการ",
                data: entries.map(([, value]) => value),
                backgroundColor: ["#6D5DFC", "#25A7A0", "#E5A84B", "#EF6A73", "#4D9DE0"],
                borderColor: "#ffffff",
                borderWidth: 3,
                hoverOffset: 10
            }]
        },
        options: doughnutOptions()
    });
}

function createOrUpdateInventory(data) {
    const produced = groupSum(data, "Category", "Units_Produced");
    const sold = groupSum(data, "Category", "Units_Sold");
    const unsold = groupSum(data, "Category", "Unsold_Units");

    const categories = uniqueValues(data, "Category").sort();

    upsertChart("inventoryChart", {
        type: "bar",
        data: {
            labels: categories,
            datasets: [
                {
                    label: "ผลิต",
                    data: categories.map(c => produced[c] || 0),
                    backgroundColor: "#6D5DFC",
                    borderRadius: 6
                },
                {
                    label: "ขาย",
                    data: categories.map(c => sold[c] || 0),
                    backgroundColor: "#25A7A0",
                    borderRadius: 6
                },
                {
                    label: "เหลือ",
                    data: categories.map(c => unsold[c] || 0),
                    backgroundColor: "#E5A84B",
                    borderRadius: 6
                }
            ]
        },
        options: {
            ...barOptions("จำนวนหน่วย"),
            plugins: {
                ...barOptions("จำนวนหน่วย").plugins,
                legend: {
                    display: true,
                    position: "top",
                    labels: {
                        usePointStyle: true,
                        padding: 16
                    }
                }
            }
        }
    });
}

function createOrUpdateRisk(data) {
    const totals = groupCount(data, "Expiry_Risk");
    const riskOrder = ["Low", "Medium", "High"];

    const labels = riskOrder.filter(r => totals[r] !== undefined);
    const values = labels.map(r => totals[r]);

    upsertChart("riskChart", {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                label: "จำนวนรายการ",
                data: values,
                backgroundColor: ["#25A7A0", "#E5A84B", "#EF6A73"],
                borderColor: "#ffffff",
                borderWidth: 3,
                hoverOffset: 10
            }]
        },
        options: doughnutOptions()
    });
}

function upsertChart(id, config) {
    if (charts[id]) {
        charts[id].data = config.data;
        charts[id].options = config.options;
        charts[id].update();
        return;
    }

    charts[id] = new Chart(document.getElementById(id), config);
}

function commonPlugins() {
    return {
        legend: {
            display: false
        },
        tooltip: {
            enabled: true,
            backgroundColor: "rgba(23, 32, 51, 0.96)",
            titleFont: {
                family: "Kanit",
                size: 13,
                weight: "500"
            },
            bodyFont: {
                family: "Kanit",
                size: 12
            },
            padding: 12,
            cornerRadius: 10,
            displayColors: true
        },
        zoom: {
            pan: {
                enabled: true,
                mode: "x"
            },
            zoom: {
                wheel: {
                    enabled: true
                },
                pinch: {
                    enabled: true
                },
                drag: {
                    enabled: true,
                    backgroundColor: "rgba(109, 93, 252, 0.10)"
                },
                mode: "x"
            }
        }
    };
}

function baseScales(yTitle) {
    return {
        x: {
            grid: {
                display: false
            },
            ticks: {
                color: "#718096",
                font: {
                    family: "Kanit",
                    size: 10
                },
                maxRotation: 35,
                minRotation: 0
            }
        },
        y: {
            beginAtZero: true,
            grid: {
                color: "rgba(113, 128, 150, 0.10)"
            },
            ticks: {
                color: "#718096",
                font: {
                    family: "Kanit",
                    size: 10
                },
                callback: value => shortMoney.format(value)
            },
            title: {
                display: true,
                text: yTitle,
                color: "#718096",
                font: {
                    family: "Kanit",
                    size: 11
                }
            }
        }
    };
}

function lineOptions(yTitle, currency = false) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: "index",
            intersect: false
        },
        plugins: commonPlugins(),
        scales: baseScales(yTitle),
        animation: {
            duration: 700,
            easing: "easeOutQuart"
        }
    };
}

function barOptions(yTitle) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: "nearest",
            intersect: true
        },
        plugins: commonPlugins(),
        scales: baseScales(yTitle),
        animation: {
            duration: 650,
            easing: "easeOutQuart"
        }
    };
}

function doughnutOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "66%",
        plugins: {
            legend: {
                display: true,
                position: "bottom",
                labels: {
                    usePointStyle: true,
                    pointStyle: "circle",
                    padding: 18,
                    color: "#536174",
                    font: {
                        family: "Kanit",
                        size: 11
                    }
                }
            },
            tooltip: {
                enabled: true,
                backgroundColor: "rgba(23, 32, 51, 0.96)",
                padding: 12,
                cornerRadius: 10,
                titleFont: {
                    family: "Kanit",
                    size: 13
                },
                bodyFont: {
                    family: "Kanit",
                    size: 12
                },
                callbacks: {
                    label: context => {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const value = context.raw || 0;
                        const percent = total ? ((value / total) * 100).toFixed(1) : 0;
                        return ` ${value.toLocaleString()} รายการ (${percent}%)`;
                    }
                }
            }
        },
        animation: {
            animateRotate: true,
            animateScale: true,
            duration: 800
        }
    };
}

function groupSum(data, groupField, valueField) {
    return data.reduce((result, row) => {
        const key = row[groupField] || "ไม่ระบุ";
        result[key] = (result[key] || 0) + (Number(row[valueField]) || 0);
        return result;
    }, {});
}

function groupCount(data, field) {
    return data.reduce((result, row) => {
        const key = row[field] || "ไม่ระบุ";
        result[key] = (result[key] || 0) + 1;
        return result;
    }, {});
}

function sortedEntries(object) {
    return Object.entries(object)
        .sort((a, b) => b[1] - a[1]);
}

function topKey(object, fallback) {
    const entries = sortedEntries(object);
    return entries.length ? entries[0][0] : fallback;
}

function sum(data, field) {
    return data.reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

function formatMoney(value) {
    return `฿${moneyFormat.format(value)}`;
}

function formatDate(dateString) {
    const date = new Date(dateString + "T00:00:00");
    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

// Double-click on a chart to reset its zoom.
document.addEventListener("dblclick", event => {
    const canvas = event.target.closest("canvas");
    if (!canvas) return;

    const chart = Object.values(charts).find(
        item => item.canvas === canvas
    );

    if (chart) chart.resetZoom();
});
