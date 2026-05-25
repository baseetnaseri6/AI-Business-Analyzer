let productChart = null;
let regionChart = null;
let latestBusinessData = null;

document.addEventListener("DOMContentLoaded", function () {
    hidePageLoader();

    const fileInput = document.getElementById("fileInput");
    const analyzeBtn = document.getElementById("analyzeBtn");
    const chatBtn = document.getElementById("chatBtn");

    fileInput.addEventListener("change", function () {
        const files = Array.from(this.files);

        if (files.length === 0) {
            document.getElementById("selectedFileName").innerText = "No files selected";
            return;
        }

        document.getElementById("selectedFileName").innerHTML =
            files.map(file => `<div class="file-badge">${file.name}</div>`).join("");
    });

    analyzeBtn.addEventListener("click", function (event) {
        event.preventDefault();
        uploadFile();
    });

    if (chatBtn) chatBtn.addEventListener("click", askBusinessAI);
});

function hidePageLoader() {
    setTimeout(() => {
        const loader = document.getElementById("pageLoader");
        if (loader) loader.style.display = "none";
    }, 900);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

function showButtonLoader(button, text = "Processing...") {
    if (!button) return;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${text}`;
    button.disabled = true;
}

function hideButtonLoader(button) {
    if (!button) return;
    button.innerHTML = button.dataset.originalText;
    button.disabled = false;
}

function setActiveNav(clicked) {
    document.querySelectorAll("nav a").forEach(link => {
        link.classList.remove("active");
    });

    if (clicked) clicked.classList.add("active");
}

function showSection(section, clicked) {
    setActiveNav(clicked);

    const target = document.getElementById(section);

    if (target) {
        target.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

async function uploadFile() {
    const fileInput = document.getElementById("fileInput");
    const files = fileInput.files;
    const message = document.getElementById("message");
    const analyzeBtn = document.getElementById("analyzeBtn");

    if (!files.length) {
        message.innerHTML = "Please select at least one CSV or Excel file.";
        return;
    }

    message.innerHTML = "Analyzing business data with AI... please wait.";
    showButtonLoader(analyzeBtn, "Analyzing...");

    const formData = new FormData();

    for (let file of files) {
        formData.append("files", file);
    }

    try {
        const response = await fetch("http://127.0.0.1:8000/analyze", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error("Backend error: " + response.status);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        latestBusinessData = data;

        setText("rows", data.rows);
        setText("columns", data.columns.length);
        setText("sales", "$" + Number(data.total_sales).toLocaleString());
        setText("profit", "$" + Number(data.total_profit).toLocaleString());

        renderColumnList(data.columns);
        renderDataPreview(data.preview_rows || []);

        setText("result", data.ai_insight || "No AI insight generated.");

        createProductChart(data.sales_by_product || {});
        createRegionChart(data.sales_by_region || {});

        message.innerHTML = "AI analysis completed successfully.";

    } catch (error) {
        console.error(error);
        message.innerHTML = "Error: " + error.message;

    } finally {
        hideButtonLoader(analyzeBtn);
    }
}

function renderColumnList(columns) {
    const columnList = document.getElementById("columnList");
    columnList.innerHTML = "";

    columns.forEach((col) => {
        const item = document.createElement("div");
        item.className = "column-item";

        item.innerHTML = `
            <strong><i class="${getColumnIcon(col)}"></i> ${col}</strong>
            <span>${getColumnType(col)}</span>
        `;

        columnList.appendChild(item);
    });
}

function getColumnType(col) {
    const lower = col.toLowerCase();

    if (lower.includes("sales") || lower.includes("cost") || lower.includes("profit")) return "Number";
    if (lower.includes("date")) return "Date";
    if (lower.includes("source")) return "File";

    return "Text";
}

function getColumnIcon(col) {
    const lower = col.toLowerCase();

    if (lower.includes("date")) return "fa-solid fa-calendar-days";
    if (lower.includes("product")) return "fa-solid fa-tag";
    if (lower.includes("region")) return "fa-solid fa-location-dot";
    if (lower.includes("sales")) return "fa-solid fa-dollar-sign";
    if (lower.includes("cost")) return "fa-solid fa-coins";
    if (lower.includes("customer")) return "fa-solid fa-user";
    if (lower.includes("source")) return "fa-solid fa-file";

    return "fa-solid fa-database";
}

function renderDataPreview(rows) {
    const box = document.getElementById("dataPreview");

    if (!rows || rows.length === 0) {
        box.innerHTML = "<p>No preview data available.</p>";
        return;
    }

    const headers = Object.keys(rows[0]);

    let html = "<table><thead><tr>";

    headers.forEach((h) => {
        html += `<th>${h}</th>`;
    });

    html += "</tr></thead><tbody>";

    rows.forEach((row) => {
        html += "<tr>";

        headers.forEach((h) => {
            html += `<td>${row[h]}</td>`;
        });

        html += "</tr>";
    });

    html += "</tbody></table>";

    box.innerHTML = html;
}

function createProductChart(chartData) {
    const ctx = document.getElementById("productChart");
    if (!ctx) return;

    if (productChart) productChart.destroy();

    productChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: Object.keys(chartData),
            datasets: [{
                label: "Sales",
                data: Object.values(chartData),
                backgroundColor: ["#7c3aed", "#2563eb", "#38bdf8", "#22c55e", "#f59e0b"],
                borderRadius: 16
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1200,
                easing: "easeOutQuart"
            },
            plugins: {
                legend: {
                    labels: {
                        font: { size: 16 }
                    }
                }
            }
        }
    });
}

function createRegionChart(chartData) {
    const ctx = document.getElementById("regionChart");
    if (!ctx) return;

    if (regionChart) regionChart.destroy();

    regionChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: Object.keys(chartData),
            datasets: [{
                data: Object.values(chartData),
                backgroundColor: ["#7c3aed", "#2563eb", "#38bdf8", "#22c55e", "#f59e0b"]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "58%",
            animation: {
                duration: 1300,
                easing: "easeOutQuart"
            },
            plugins: {
                legend: {
                    position: "right",
                    labels: {
                        font: { size: 16 },
                        padding: 18
                    }
                }
            }
        }
    });
}

async function askBusinessAI() {
    const input = document.getElementById("chatInput");
    const chatBtn = document.getElementById("chatBtn");
    const question = input.value.trim();

    if (!question) return;

    if (!latestBusinessData) {
        addChatMessage("Please upload and analyze a CSV or Excel file first.", "ai");
        return;
    }

    addChatMessage(question, "user");
    input.value = "";

    showButtonLoader(chatBtn, "Thinking...");

    try {
        const response = await fetch("http://127.0.0.1:8000/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question: question,
                data: latestBusinessData
            })
        });

        const result = await response.json();
        addChatMessage(result.answer, "ai");

    } catch (error) {
        addChatMessage("Error talking with AI.", "ai");

    } finally {
        hideButtonLoader(chatBtn);
    }
}

function addChatMessage(text, sender) {
    const chatBox = document.getElementById("chatBox");
    const msg = document.createElement("div");

    msg.className = `chat-message ${sender}`;
    msg.innerText = text;

    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function openForecastFromSidebar(clicked) {
    setActiveNav(clicked);

    openActionModal(
        "AI Sales Forecast",
        "Generate an AI-powered forecast using your uploaded business data.",
        "fa-solid fa-chart-line",
        async function () {
            closeActionModal();
            await generateForecast();
            showSection("forecast", clicked);
        }
    );
}

function openExportFromSidebar(clicked) {
    setActiveNav(clicked);

    openActionModal(
        "Export PDF Report",
        "Create a modern PDF report including KPIs, AI insights and business summary.",
        "fa-solid fa-file-pdf",
        function () {
            closeActionModal();
            exportPdfReport();
        }
    );
}

function openActionModal(title, text, iconClass, actionCallback) {
    document.getElementById("actionTitle").innerText = title;
    document.getElementById("actionText").innerText = text;
    document.getElementById("actionIcon").innerHTML = `<i class="${iconClass}"></i>`;

    const btn = document.getElementById("actionMainBtn");
    btn.onclick = actionCallback;

    document.getElementById("actionModal").style.display = "flex";
}

function closeActionModal() {
    document.getElementById("actionModal").style.display = "none";
}

async function generateForecast() {
    if (!latestBusinessData) {
        alert("Please upload and analyze a CSV or Excel file first.");
        return;
    }

    document.getElementById("forecastReport").innerText = "Generating AI forecast...";

    try {
        const response = await fetch("http://127.0.0.1:8000/forecast", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(latestBusinessData)
        });

        const result = await response.json();

        setText("forecastSales", "$" + Number(result.predicted_sales).toLocaleString());
        setText("forecastProfit", "$" + Number(result.predicted_profit).toLocaleString());
        setText("forecastTrend", result.growth_trend);
        setText("forecastReport", result.forecast_report);

    } catch (error) {
        console.error(error);
        setText("forecastReport", "Forecast generation failed.");
    }
}

function exportPdfReport() {
    if (!latestBusinessData) {
        alert("Please upload and analyze a CSV or Excel file first.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");

    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 48, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(23);
    doc.text("AI Business Analysis Report", 18, 21);

    doc.setFontSize(11);
    doc.text("Generated by AI Business Analyzer Pro", 18, 31);

    doc.setTextColor(15, 23, 42);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, 58, 180, 48, 5, 5, "F");

    doc.setFontSize(15);
    doc.text("Business Summary", 20, 70);

    doc.setFontSize(10);
    doc.text(`Files: ${latestBusinessData.filename}`, 20, 80);
    doc.text(`Rows: ${latestBusinessData.rows}`, 20, 88);
    doc.text(`Columns: ${latestBusinessData.columns.length}`, 20, 96);

    doc.setFillColor(124, 58, 237);
    doc.roundedRect(15, 118, 85, 32, 5, 5, "F");

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(110, 118, 85, 32, 5, 5, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("Total Sales", 22, 131);
    doc.text(`$${Number(latestBusinessData.total_sales).toLocaleString()}`, 22, 141);

    doc.text("Total Profit", 117, 131);
    doc.text(`$${Number(latestBusinessData.total_profit).toLocaleString()}`, 117, 141);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(15);
    doc.text("AI Insight", 18, 168);

    doc.setFontSize(10);

    const insightText = doc.splitTextToSize(
        latestBusinessData.ai_insight || "No AI insight generated.",
        175
    );

    doc.text(insightText, 18, 178);

    doc.save("AI-Business-Analysis-Report.pdf");
}

function openChatModal(clicked) {
    if (clicked) setActiveNav(clicked);
    document.getElementById("chatModal").style.display = "flex";
}

function closeChatModal() {
    document.getElementById("chatModal").style.display = "none";
}

function openSettings(clicked) {
    if (clicked) setActiveNav(clicked);
    document.getElementById("settingsModal").style.display = "flex";
}

function closeSettings() {
    document.getElementById("settingsModal").style.display = "none";
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme");
    html.setAttribute("data-theme", currentTheme === "light" ? "dark" : "light");
}