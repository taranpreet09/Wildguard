// Global map references
let reportMap = null;
let welfareMap = null;

// Color coding for report types
const typeColors = {
    abuse: '#e41a1c',
    neglect: '#377eb8',
    poaching: '#4daf4a',
    habitat: '#984ea3',
    other: '#ff7f00'
};

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    // Clean up any existing maps first
    if (reportMap) reportMap.remove();
    if (welfareMap) welfareMap.remove();
    
    reportMap = null;
    welfareMap = null;
    
    // Initialize the appropriate map
    if (document.getElementById('locationMap')) {
        initReportMap();
    }
    
    if (document.getElementById('welfareMap')) {
        initWelfareMap();
    }
});

// Initialize report map on reports page
function initReportMap() {
    const mapElement = document.getElementById('locationMap');
    if (!mapElement || reportMap) return;
    
    reportMap = L.map('locationMap').setView([37.8, -96], 4);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(reportMap);
    
    let marker = null;
    
    // Handle map clicks
    reportMap.on('click', function(e) {
        if (marker) reportMap.removeLayer(marker);
        
        marker = L.marker(e.latlng).addTo(reportMap);
        document.getElementById('location').value = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
    });
    
    // Handle form submission
    setupReportForm();
}

function setupReportForm() {
    const form = document.getElementById('reportForm');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const reportType = document.getElementById('reportType').value;
        const animalType = document.getElementById('animalType').value;
        const location = document.getElementById('location').value;
        const description = document.getElementById('description').value;
        const isAnonymous = document.getElementById('anonymous').checked;
        
        if (!reportType || !animalType || !location || !description) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Create and save report
        saveReport({
            type: reportType,
            animal: animalType,
            location: location,
            description: description,
            isAnonymous: isAnonymous
        });
        
        // Show success modal
        const modal = new bootstrap.Modal(document.getElementById('reportSuccessModal'));
        modal.show();
        
        // Reset form
        this.reset();
        if (window.reportMap && window.reportMap.marker) {
            window.reportMap.removeLayer(window.reportMap.marker);
            window.reportMap.marker = null;
        }
    });
    
    // Handle photo upload preview
    document.getElementById('photoUpload')?.addEventListener('change', function(e) {
        const previewContainer = document.getElementById('photoPreview');
        previewContainer.innerHTML = '';
        
        Array.from(e.target.files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.createElement('div');
                preview.className = 'position-relative';
                preview.innerHTML = `
                    <img src="${e.target.result}" class="photo-preview">
                    <button class="photo-preview-remove">&times;</button>
                `;
                previewContainer.appendChild(preview);
                
                preview.querySelector('.photo-preview-remove').addEventListener('click', function() {
                    preview.remove();
                });
            };
            reader.readAsDataURL(file);
        });
    });
}

function saveReport(reportData) {
    const user = JSON.parse(localStorage.getItem('wildguard_user')) || { name: 'Anonymous', email: '' };
    
    const report = {
        id: Date.now(),
        type: reportData.type,
        animal: reportData.animal,
        location: reportData.location,
        description: reportData.description,
        date: new Date().toISOString(),
        status: 'Submitted',
        reporter: reportData.isAnonymous ? 'Anonymous' : user.name,
        photos: [] // In a real app, you would upload these to a server
    };
    
    // Save report to user's profile if logged in
    if (user.email) {
        user.reports = user.reports || [];
        user.reports.push(report);
        localStorage.setItem('wildguard_user', JSON.stringify(user));
    } else {
        // For demo purposes, store in localStorage even if not logged in
        const reports = JSON.parse(localStorage.getItem('wildguard_reports')) || [];
        reports.push(report);
        localStorage.setItem('wildguard_reports', JSON.stringify(reports));
    }
}

// Initialize welfare map on map page
function initWelfareMap() {
    const mapElement = document.getElementById('welfareMap');
    if (!mapElement || welfareMap) return;
    
    welfareMap = L.map('welfareMap').setView([37.8, -96], 4);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(welfareMap);
    
    // Load reports initially
    loadReportsOnMap();
    
    // Setup filters
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
    
    // Clear existing markers
    welfareMap.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
            welfareMap.removeLayer(layer);
        }
    });
    
    // Get and filter reports
    const filteredReports = filterReports(getAllReports(), filters);
    
    // Add markers to map
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
        }).addTo(welfareMap);
        
        marker.bindPopup(createPopupContent(report));
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
        <div class="map-popup">
            <h6>${capitalizeFirstLetter(report.type)} - ${capitalizeFirstLetter(report.animal)}</h6>
            <p>${report.description}</p>
            <small>Reported on ${formatDate(report.date)}</small>
            ${report.photos?.length > 0 ? 
                `<img src="${report.photos[0]}" style="max-width:100%;margin-top:8px;">` : ''}
        </div>
    `;
}

// Helper functions
function getAllReports() {
    const users = JSON.parse(localStorage.getItem('wildguard_users')) || [];
    const userReports = users.flatMap(user => user.reports || []);
    const anonymousReports = JSON.parse(localStorage.getItem('wildguard_reports')) || [];
    return [...userReports, ...anonymousReports];
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