// Color coding for report types
const typeColors = {
    abuse: '#e41a1c',
    neglect: '#377eb8',
    poaching: '#4daf4a',
    habitat: '#984ea3',
    other: '#ff7f00'
};

// Global map reference
let welfareMap = null;
let reportLayers = {};

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the appropriate map
    if (document.getElementById('welfareMap')) {
        initWelfareMap();
    }
    
    // Check if we need to highlight a specific report
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get('report');
    if (reportId) {
        setTimeout(() => highlightReport(reportId), 1000);
    }
    
    // Setup auth state
    checkAuthState();
});

function initWelfareMap() {
    const mapElement = document.getElementById('welfareMap');
    if (!mapElement || welfareMap) return;
    
    welfareMap = L.map('welfareMap').setView([37.8, -96], 4);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(welfareMap);
    
    // Create layer groups for each report type
    reportLayers = {
        abuse: L.layerGroup().addTo(welfareMap),
        neglect: L.layerGroup().addTo(welfareMap),
        poaching: L.layerGroup().addTo(welfareMap),
        habitat: L.layerGroup().addTo(welfareMap),
        other: L.layerGroup().addTo(welfareMap)
    };
    
    // Add layer control
    const layerControl = L.control.layers(null, null, { collapsed: false }).addTo(welfareMap);
    layerControl.addOverlay(reportLayers.abuse, 'Animal Abuse');
    layerControl.addOverlay(reportLayers.neglect, 'Neglect');
    layerControl.addOverlay(reportLayers.poaching, 'Poaching');
    layerControl.addOverlay(reportLayers.habitat, 'Habitat Destruction');
    layerControl.addOverlay(reportLayers.other, 'Other Issues');
    
    // Load reports initially
    loadReportsOnMap();
    
    // Setup filters if they exist
    document.getElementById('applyFilters')?.addEventListener('click', function() {
        const filters = {
            animal: document.getElementById('animalFilter').value,
            issue: document.getElementById('issueFilter').value,
            date: document.getElementById('dateFilter').value
        };
        loadReportsOnMap(filters);
    });
}

function loadReportsOnMap(filters = {}) {
    if (!welfareMap) return;
    
    // Clear existing markers from all layers
    Object.values(reportLayers).forEach(layer => layer.clearLayers());
    
    // Get and filter reports
    const filteredReports = filterReports(getAllReports(), filters);
    
    // Add markers to appropriate layers
    filteredReports.forEach(report => {
        if (!report.location) return;
        
        const [lat, lng] = report.location.split(',').map(Number);
        if (isNaN(lat) || isNaN(lng)) return;
        
        const marker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: getReportColor(report.type),
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        });
        
        marker.bindPopup(createPopupContent(report));
        
        // Store report ID on marker for highlighting
        marker.reportId = report.id;
        
        // Add to appropriate layer
        const layer = reportLayers[report.type] || reportLayers.other;
        marker.addTo(layer);
    });
}

function filterReports(reports, filters) {
    return reports.filter(report => {
        // Animal filter
        if (filters.animal && filters.animal !== 'all' && report.animal !== filters.animal) {
            return false;
        }
        
        // Issue type filter
        if (filters.issue && filters.issue !== 'all' && report.type !== filters.issue) {
            return false;
        }
        
        // Date filter
        if (filters.date && filters.date !== 'all') {
            const reportDate = new Date(report.date);
            const now = new Date();
            let cutoffDate;
            
            switch (filters.date) {
                case 'week':
                    cutoffDate = new Date(now.setDate(now.getDate() - 7));
                    break;
                case 'month':
                    cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
                    break;
                case 'year':
                    cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
                    break;
                default:
                    return true;
            }
            
            return reportDate > cutoffDate;
        }
        
        return true;
    });
}

function createPopupContent(report) {
    return `
        <div class="map-popup" style="max-width: 300px;">
            <h6 style="margin: 0 0 8px 0; color: ${getReportColor(report.type)}">
                ${capitalizeFirstLetter(report.type)} - ${capitalizeFirstLetter(report.animal)}
            </h6>
            <p style="margin: 0 0 8px 0; font-size: 14px;">${report.description}</p>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <small style="color: #666;">Reported by: ${report.reporter}</small>
                <small style="color: #666;">${formatDate(report.date)}</small>
            </div>
            ${report.photos?.length > 0 ? 
                `<img src="${report.photos[0]}" style="max-width:100%; border-radius: 4px; margin-top: 8px;">` : ''}
            <div style="margin-top: 8px;">
                <a href="report-details.html?id=${report.id}" class="btn btn-sm btn-success" style="width: 100%;">
                    View Details
                </a>
            </div>
        </div>
    `;
}

function highlightReport(reportId) {
    if (!welfareMap) return;
    
    // Find the marker with this report ID
    let foundMarker = null;
    
    Object.values(reportLayers).forEach(layer => {
        layer.eachLayer(marker => {
            if (marker.reportId == reportId) {
                foundMarker = marker;
            }
        });
    });
    
    if (foundMarker) {
        // Zoom to the marker and open its popup
        welfareMap.setView(foundMarker.getLatLng(), 15);
        foundMarker.openPopup();
        
        // Pulse animation
        let pulseCount = 0;
        const pulseInterval = setInterval(() => {
            foundMarker.setStyle({
                fillColor: pulseCount % 2 === 0 ? '#ffff00' : getReportColor(foundMarker.report.type)
            });
            pulseCount++;
            if (pulseCount > 5) {
                clearInterval(pulseInterval);
                foundMarker.setStyle({
                    fillColor: getReportColor(foundMarker.report.type)
                });
            }
        }, 300);
    }
}

function getAllReports() {
    // Check central reports collection first
    const allReports = JSON.parse(localStorage.getItem('wildguard_all_reports')) || [];
    
    // Also check individual user reports
    const users = JSON.parse(localStorage.getItem('wildguard_users')) || [];
    const userReports = users.flatMap(user => user.reports || []);
    
    // And anonymous reports
    const anonymousReports = JSON.parse(localStorage.getItem('wildguard_reports')) || [];
    
    // Combine all sources, removing duplicates by ID
    const combined = [...allReports, ...userReports, ...anonymousReports];
    const uniqueIds = new Set();
    return combined.filter(report => {
        if (uniqueIds.has(report.id)) return false;
        uniqueIds.add(report.id);
        return true;
    });
}

function getReportColor(type) {
    return typeColors[type] || typeColors.other;
}

function capitalizeFirstLetter(string) {
    return string?.charAt(0).toUpperCase() + string?.slice(1) || '';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function checkAuthState() {
    const user = JSON.parse(localStorage.getItem('wildguard_user'));
    if (user) {
        document.getElementById('loginBtn')?.classList.add('d-none');
        document.getElementById('logoutBtn')?.classList.remove('d-none');
        document.getElementById('profileBtn')?.classList.remove('d-none');
    } else {
        document.getElementById('loginBtn')?.classList.remove('d-none');
        document.getElementById('logoutBtn')?.classList.add('d-none');
        document.getElementById('profileBtn')?.classList.add('d-none');
    }
}

// Setup login/logout buttons
document.getElementById('loginBtn')?.addEventListener('click', () => {
    new bootstrap.Modal(document.getElementById('loginModal')).show();
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('wildguard_user');
    window.location.reload();
});
