// API Configuration
const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

// Initialize Socket.IO connection
const socket = io(SOCKET_URL);

// State Management
let currentScanId = null;
let scanHistory = [];
let currentResults = null;

// DOM Elements
const scanForm = document.getElementById('scanForm');
const targetsInput = document.getElementById('targets');
const scanTypeSelect = document.getElementById('scanType');
const scanProgress = document.getElementById('scanProgress');
const progressMessage = document.getElementById('progressMessage');
const progressFill = document.getElementById('progressFill');
const scanLogs = document.getElementById('scanLogs');
const logList = document.getElementById('logList');
const successAlert = document.getElementById('successAlert');
const errorAlert = document.getElementById('errorAlert');
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const historyTable = document.getElementById('historyTable');
const historyBody = document.getElementById('historyBody');
const refreshHistoryBtn = document.getElementById('refreshHistory');
const resultsView = document.getElementById('resultsView');
const resultsDetail = document.getElementById('resultsDetail');
const backButton = document.getElementById('backButton');
const portModal = document.getElementById('portModal');
const modalClose = document.querySelector('.close');
const exportResultsBtn = document.getElementById('exportResults');
const downloadPdfBtn = document.getElementById('downloadPdf');
const downloadRawBtn = document.getElementById('downloadRaw');
const riskBadge = document.getElementById('riskBadge');
const scanStatusBadge = document.getElementById('scanStatusBadge');
const statusChartCanvas = document.getElementById('statusChart');
const portChartCanvas = document.getElementById('portChart');
const modeToggleBtn = document.getElementById('modeToggle');

let statusChart = null;
let portChart = null;
let currentTheme = 'dark';

// Event Listeners
scanForm.addEventListener('submit', handleScanSubmit);
refreshHistoryBtn.addEventListener('click', loadScanHistory);
backButton.addEventListener('click', goBackToHistory);
modalClose.addEventListener('click', closeModal);
portModal.addEventListener('click', (e) => {
    if (e.target === portModal) closeModal();
});
exportResultsBtn.addEventListener('click', exportResults);
downloadPdfBtn.addEventListener('click', downloadReport);
downloadRawBtn.addEventListener('click', downloadRawOutput);
modeToggleBtn.addEventListener('click', toggleTheme);

// Tab Navigation
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        switchTab(tabName);
    });
});

// Socket.IO Events
socket.on('connect', () => {
    console.log('Connected to server');
    showSuccess('Connected to scanning server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    showError('Disconnected from scanning server');
});

socket.on('scan_log', (data) => {
    if (data.scan_id === currentScanId) {
        appendLog(data.message);
    }
});

socket.on('scan_progress', (data) => {
    if (data.scan_id === currentScanId) {
        progressMessage.textContent = data.message;
        if (typeof data.progress === 'number') {
            progressFill.style.width = `${data.progress}%`;
        } else {
            progressFill.style.width = '50%';
        }
        scanLogs.classList.remove('hidden');
    }
});

socket.on('scan_complete', (data) => {
    if (data.scan_id === currentScanId) {
        progressFill.style.width = '100%';
        showSuccess('Scan completed successfully!');
        currentResults = data.results;
        loadScanHistory();
        setTimeout(() => {
            displayResults(data.results);
        }, 500);
    }
});

socket.on('scan_error', (data) => {
    if (data.scan_id === currentScanId) {
        scanProgress.classList.add('hidden');
        showError(`Scan error: ${data.error}`);
    }
});

// Functions

/**
 * Handle scan form submission
 */
async function handleScanSubmit(e) {
    e.preventDefault();

    const target = targetsInput.value.trim();
    const scanType = scanTypeSelect.value;

    if (!target) {
        showError('Please enter at least one target');
        return;
    }

    scanLogs.classList.add('hidden');
    logList.innerHTML = '';
    scanProgress.classList.remove('hidden');
    progressFill.style.width = '10%';
    progressMessage.textContent = `Preparing ${scanType} scan...`;

    // Disable form
    scanForm.style.opacity = '0.6';
    scanForm.style.pointerEvents = 'none';

    try {
        const response = await fetch(`${API_URL}/scan/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ targets: target, scan_type: scanType }),
        });

        const data = await response.json();

        if (response.ok) {
            currentScanId = data.scan_id;
            scanProgress.classList.remove('hidden');
            progressMessage.textContent = `Scan started for ${data.targets.join(', ')}`;
            progressFill.style.width = '15%';
            showSuccess(`Scan started with ID: ${data.scan_id}`);
            updateScanStatus('Scanning');
        } else {
            showError(data.error || 'Failed to start scan');
        }
    } catch (error) {
        showError(`Error: ${error.message}`);
    } finally {
        // Re-enable form
        scanForm.style.opacity = '1';
        scanForm.style.pointerEvents = 'auto';
    }
}

/**
 * Load scan history from backend
 */
async function loadScanHistory() {
    try {
        const response = await fetch(`${API_URL}/scan/history`);
        const data = await response.json();

        scanHistory = data;
        renderHistoryTable(data);
    } catch (error) {
        showError(`Error loading history: ${error.message}`);
    }
}

/**
 * Render scan history table
 */
function renderHistoryTable(scans) {
    if (scans.length === 0) {
        historyBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="5">No scans yet. Start a new scan!</td>
            </tr>
        `;
        return;
    }

    historyBody.innerHTML = scans.map(scan => `
        <tr>
            <td>${escapeHtml(scan.target)}</td>
            <td>${formatScanType(scan.scan_type)}</td>
            <td><span class="badge badge-${scan.status}">${scan.status}</span></td>
            <td>${formatDate(scan.start_time)}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="viewResults('${scan.id}')">View</button>
                <button class="btn btn-danger btn-sm" onclick="deleteScan('${scan.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

/**
 * View scan results
 */
async function viewResults(scanId) {
    try {
        const response = await fetch(`${API_URL}/scan/results/${scanId}`);
        if (response.ok) {
            const results = await response.json();
            currentScanId = scanId;
            currentResults = results;
            displayResults(results);
            switchTab('results');
        } else {
            showError('Failed to load results');
        }
    } catch (error) {
        showError(`Error: ${error.message}`);
    }
}

/**
 * Display scan results
 */
function displayResults(results) {
    resultsView.style.display = 'none';
    resultsDetail.classList.remove('hidden');
    resultsDetail.classList.add('visible');

    const targetList = results.targets ? results.targets.join(', ') : results.hosts[0]?.host || 'Unknown';
    document.getElementById('resultTarget').textContent = `Target: ${targetList}`;
    document.getElementById('resultInfo').textContent = `Total Hosts: ${results.total_hosts} | Hosts Up: ${results.hosts.length}`;

    updateRiskBadge(results.risk_level || 'None');
    updateScanStatus('Completed');

    renderCharts(results.chart_data);

    const hostsContainer = document.getElementById('hostsContainer');
    hostsContainer.innerHTML = results.hosts.map(host => generateHostCard(host)).join('');

    downloadPdfBtn.disabled = false;
    downloadRawBtn.disabled = false;
}

/**
 * Normalize port state values.
 */
function normalizePortState(state) {
    if (!state || state === '0') {
        return 'filtered';
    }
    return String(state).toLowerCase();
}

/**
 * Format port state for display.
 */
function formatPortState(state) {
    const normalized = normalizePortState(state);
    if (normalized === 'closed' || normalized === 'filtered' || normalized === 'open') {
        return normalized;
    }
    return 'filtered';
}

/**
 * Generate HTML for host card
 */
function generateHostCard(host) {
    const openPorts = host.ports.filter(p => normalizePortState(p.state) === 'open').length;
    const closedPorts = host.ports.filter(p => {
        const state = normalizePortState(p.state);
        return state === 'closed' || state === 'filtered';
    }).length;

    return `
        <div class="host-card">
            <div class="host-header">
                <div>
                    <h4>${host.host}</h4>
                    <p style="color: var(--text-secondary); font-size: 0.9em;">Status: ${host.status}</p>
                </div>
                <div style="text-align: right;">
                    <p style="color: var(--success-color);">🟢 ${openPorts} Open</p>
                    <p style="color: var(--text-secondary);">🔴 ${closedPorts} Closed / Filtered</p>
                </div>
            </div>

            ${host.os ? `
                <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color);">
                    <strong>OS Detection:</strong>
                    <p>${host.os.join(', ')}</p>
                </div>
            ` : ''}

            ${host.ports.length > 0 ? `
                <table class="ports-table">
                    <thead>
                        <tr>
                            <th>Port</th>
                            <th>State</th>
                            <th>Service</th>
                            <th>Version</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${host.ports.map(port => {
                            const state = formatPortState(port.state);
                            const badgeClass = state === 'open' ? 'open' : 'closed';
                            return `
                                <tr onclick="showPortDetails('${host.host}', ${port.port}, '${port.name}', '${port.product}', '${port.version}', '${port.extrainfo}', '${state}')">
                                    <td><span class="port-link">${port.port}</span></td>
                                    <td><span class="badge badge-${badgeClass}">${state}</span></td>
                                    <td>${port.name || 'Unknown'}</td>
                                    <td>${port.product} ${port.version}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            ` : '<p style="color: var(--text-secondary);">No ports found</p>'}
        </div>
    `;
}

/**
 * Show port details in modal
 */
function showPortDetails(host, port, name, product, version, extrainfo, state) {
    document.getElementById('portModalTitle').textContent = `Port ${port}/${name} on ${host}`;
    document.getElementById('portModalBody').innerHTML = `
        <div style="line-height: 2;">
            <p><strong>State:</strong> ${state}</p>
            <p><strong>Service:</strong> ${name}</p>
            <p><strong>Product:</strong> ${product}</p>
            <p><strong>Version:</strong> ${version}</p>
            ${extrainfo ? `<p><strong>Extra Info:</strong> ${extrainfo}</p>` : ''}
        </div>
    `;
    portModal.classList.remove('hidden');
    portModal.classList.add('visible');
}

/**
 * Delete scan record
 */
async function deleteScan(scanId) {
    if (!confirm('Are you sure you want to delete this scan?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/scan/delete/${scanId}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            showSuccess('Scan deleted successfully');
            loadScanHistory();
        } else {
            showError('Failed to delete scan');
        }
    } catch (error) {
        showError(`Error: ${error.message}`);
    }
}

/**
 * Export results as JSON
 */
function exportResults() {
    if (!currentResults) {
        showError('No results to export');
        return;
    }

    const dataStr = JSON.stringify(currentResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scan-results-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess('Results exported successfully');
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Hide all tabs
    tabContents.forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active state from all buttons
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');

    // Add active state to clicked button
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Load data when switching to history tab
    if (tabName === 'history') {
        loadScanHistory();
    }
}

/**
 * Go back from results detail view
 */
function goBackToHistory() {
    resultsDetail.classList.add('hidden');
    resultsDetail.classList.remove('visible');
    resultsView.style.display = 'block';
    loadScanHistory();
}

/**
 * Close modal
 */
function closeModal() {
    portModal.classList.add('hidden');
    portModal.classList.remove('visible');
}

/**
 * Show success alert
 */
function showSuccess(message) {
    successAlert.textContent = message;
    successAlert.classList.remove('hidden');
    setTimeout(() => {
        successAlert.classList.add('hidden');
    }, 5000);
}

/**
 * Show error alert
 */
function showError(message) {
    errorAlert.textContent = message;
    errorAlert.classList.remove('hidden');
    setTimeout(() => {
        errorAlert.classList.add('hidden');
    }, 5000);
}

/**
 * Append a log line to the live log window
 */
function appendLog(message) {
    const line = document.createElement('div');
    line.className = 'log-line';
    line.textContent = message;
    logList.appendChild(line);
    logList.scrollTop = logList.scrollHeight;
}

/**
 * Render chart visualizations for scan results
 */
function renderCharts(chartData) {
    if (!chartData) {
        return;
    }

    const statusData = chartData.status_counts || { open: 0, closed: 0, filtered: 0 };
    const portData = chartData.top_ports || [];

    const statusLabels = ['Open', 'Closed', 'Filtered'];
    const statusValues = [statusData.open, statusData.closed, statusData.filtered];

    if (statusChart) {
        statusChart.destroy();
    }
    statusChart = new Chart(statusChartCanvas, {
        type: 'pie',
        data: {
            labels: statusLabels,
            datasets: [{
                data: statusValues,
                backgroundColor: ['#10b981', '#64748b', '#f59e0b']
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    if (portChart) {
        portChart.destroy();
    }
    portChart = new Chart(portChartCanvas, {
        type: 'bar',
        data: {
            labels: portData.map(item => `Port ${item.port}`),
            datasets: [{
                label: 'Occurrences',
                data: portData.map(item => item.count),
                backgroundColor: '#2563eb'
            }]
        },
        options: {
            scales: {
                x: { ticks: { color: '#cbd5e1' } },
                y: { beginAtZero: true, ticks: { color: '#cbd5e1' } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

/**
 * Update the risk badge display color
 */
function updateRiskBadge(level) {
    riskBadge.textContent = `Risk: ${level}`;
    riskBadge.className = 'risk-badge';
    if (level === 'High') {
        riskBadge.classList.add('risk-high');
    } else if (level === 'Medium') {
        riskBadge.classList.add('risk-medium');
    } else if (level === 'Low') {
        riskBadge.classList.add('risk-low');
    } else {
        riskBadge.classList.add('risk-none');
    }
}

/**
 * Update scan status indicator
 */
function updateScanStatus(status) {
    scanStatusBadge.textContent = `Status: ${status}`;
    scanStatusBadge.className = 'risk-badge badge-' + (status.toLowerCase() === 'completed' ? 'completed' : 'scanning');
}

/**
 * Download PDF report for the current scan
 */
function downloadReport() {
    if (!currentScanId) {
        showError('No scan selected to download report');
        return;
    }
    window.open(`${API_URL}/scan/report/${currentScanId}`, '_blank');
}

/**
 * Download raw Nmap output for the current scan
 */
function downloadRawOutput() {
    if (!currentScanId) {
        showError('No scan selected to download raw output');
        return;
    }
    window.open(`${API_URL}/scan/raw/${currentScanId}`, '_blank');
}

/**
 * Toggle dark/light mode
 */
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLightMode = document.body.classList.contains('light-mode');
    currentTheme = isLightMode ? 'light' : 'dark';
    localStorage.setItem('theme', currentTheme);
    modeToggleBtn.textContent = isLightMode ? 'Dark Mode' : 'Light Mode';
}

/**
 * Format scan type for display
 */
function formatScanType(type) {
    const types = {
        'basic': 'Basic Port Scan',
        'quick': 'Quick Scan',
        'full': 'Full Scan',
        'aggressive': 'Aggressive Scan',
        'service_detection': 'Service Detection',
        'os_detection': 'OS Detection',
        'vulnerability': 'Vulnerability Scan',
        'comprehensive': 'Comprehensive Scan',
    };
    return types[type] || type;
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Restore saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        modeToggleBtn.textContent = 'Dark Mode';
        currentTheme = 'light';
    } else {
        document.body.classList.remove('light-mode');
        modeToggleBtn.textContent = 'Light Mode';
        currentTheme = 'dark';
    }
    
    // Ensure scan progress and logs are hidden at startup
    scanProgress.classList.add('hidden');
    scanLogs.classList.add('hidden');
    loadScanHistory();
});
