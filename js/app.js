 // Load recent reports on homepage
function loadRecentReports() {
    const container = document.getElementById('recentReports');
    if (!container) return;
    
    // Get reports from localStorage
    const user = JSON.parse(localStorage.getItem('wildguard_user'));
    const anonymousReports = JSON.parse(localStorage.getItem('wildguard_reports')) || [];
    
    const userReports = user?.reports || [];
    const allReports = [...userReports, ...anonymousReports]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);
    
    if (allReports.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-4">
                <i class="fas fa-paw fa-3x text-muted mb-3"></i>
                <h4>No reports yet</h4>
                <p>Be the first to submit a report and help protect animals in your area.</p>
                <a href="reports.html" class="btn btn-success">Submit Report</a>
            </div>
        `;
        return;
    }
    
    // Color coding for report types
    const typeColors = {
        abuse: '#e41a1c',
        neglect: '#377eb8',
        poaching: '#4daf4a',
        habitat: '#984ea3',
        other: '#ff7f00'
    };
    
    container.innerHTML = allReports.map(report => `
        <div class="col-md-4">
            <div class="card h-100 border-0 shadow-sm report-card ${report.type}">
                <div class="card-body">
                    <div class="d-flex justify-content-between mb-3">
                        <span class="badge" style="background-color: ${typeColors[report.type] || typeColors.other}">
                            ${report.type}
                        </span>
                        <small class="text-muted">${new Date(report.date).toLocaleDateString()}</small>
                    </div>
                    <h5 class="card-title">${report.animal}</h5>
                    <p class="card-text text-muted">${report.description.substring(0, 100)}${report.description.length > 100 ? '...' : ''}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small>Reported by ${report.reporter}</small>
                        <a href="map.html" class="btn btn-sm btn-outline-success">View on Map</a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAuth(); // From auth.js
    loadRecentReports();
    
    // Any other page-specific initialization can go here
});

// Add these new functions to app.js

// Load reports on homepage
function loadReportsFeed() {
    const container = document.getElementById('reportsContainer');
    if (!container) return;
  
    // Get all reports from localStorage
    const allReports = getAllReports();
    
    if (allReports.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="fas fa-paw fa-4x text-muted mb-4"></i>
          <h3>No Reports Yet</h3>
          <p class="lead text-muted">Be the first to report an animal welfare issue in your area</p>
          <a href="reports.html" class="btn btn-success btn-lg">Submit First Report</a>
        </div>
      `;
      return;
    }
  
    // Display first 6 reports
    displayReports(allReports.slice(0, 6));
    
    // Set up load more button
    document.getElementById('loadMoreBtn')?.addEventListener('click', function() {
      const currentCount = container.children.length;
      displayReports(allReports.slice(currentCount, currentCount + 3));
      
      // Hide button if all reports are loaded
      if (container.children.length >= allReports.length) {
        this.style.display = 'none';
      }
    });
  }
  
  // Display reports in a grid
  function displayReports(reports) {
    const container = document.getElementById('reportsContainer');
    
    reports.forEach(report => {
      const reportCard = document.createElement('div');
      reportCard.className = 'col-md-6 col-lg-4';
      reportCard.innerHTML = `
        <div class="card h-100 border-0 shadow-sm report-card">
          <div class="card-body">
            <div class="d-flex justify-content-between mb-3">
              <span class="badge bg-${getReportTypeColor(report.type)}">
                ${capitalizeFirstLetter(report.type)}
              </span>
              <small class="text-muted">${formatDate(report.date)}</small>
            </div>
            
            <h5 class="card-title">${capitalizeFirstLetter(report.animal)}</h5>
            <p class="card-text text-muted">${report.description.substring(0, 100)}${report.description.length > 100 ? '...' : ''}</p>
            
            ${report.photos?.length > 0 ? `
              <img src="${report.photos[0]}" class="img-fluid rounded mb-3" alt="Report photo">
            ` : ''}
            
            <div class="d-flex justify-content-between align-items-center">
              <small class="text-muted">
                <i class="fas fa-map-marker-alt me-1"></i>
                ${report.location || 'Unknown location'}
              </small>
              <a href="#" class="btn btn-sm btn-outline-success view-report-btn" data-id="${report.id}">
                View Details
              </a>
            </div>
          </div>
        </div>
      `;
      
      container.appendChild(reportCard);
    });
  }
  
  // Get all reports from localStorage (both logged in and anonymous)
  function getAllReports() {
    // Get reports from logged in users
    const users = JSON.parse(localStorage.getItem('wildguard_users')) || [];
    const userReports = users.flatMap(user => user.reports || []);
    
    // Get anonymous reports
    const anonymousReports = JSON.parse(localStorage.getItem('wildguard_reports')) || [];
    
    // Combine and sort by date (newest first)
    return [...userReports, ...anonymousReports].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
  }
  
  // Handle current location button
  function setupCurrentLocationButton() {
    document.getElementById('useCurrentLocation')?.addEventListener('click', function() {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
      }
      
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
      this.disabled = true;
      
      navigator.geolocation.getCurrentPosition(
        position => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          document.getElementById('location').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          
          // Update map if it exists
          if (window.map) {
            if (window.marker) {
              window.map.removeLayer(window.marker);
            }
            window.marker = L.marker([lat, lng]).addTo(window.map);
            window.map.setView([lat, lng], 13);
          }
          
          this.innerHTML = '<i class="fas fa-check"></i> Location Set';
          setTimeout(() => {
            this.innerHTML = '<i class="fas fa-location-arrow"></i> Current Location';
            this.disabled = false;
          }, 2000);
        },
        error => {
          alert('Unable to retrieve your location: ' + error.message);
          this.innerHTML = '<i class="fas fa-location-arrow"></i> Current Location';
          this.disabled = false;
        }
      );
    });
  }
  
  // Helper functions
  function getReportTypeColor(type) {
    const colors = {
      abuse: 'danger',
      neglect: 'warning',
      poaching: 'success',
      habitat: 'info',
      other: 'secondary'
    };
    return colors[type] || 'primary';
  }
  
  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }
  
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  // Initialize when DOM loads
  document.addEventListener('DOMContentLoaded', function() {
    loadReportsFeed();
    setupCurrentLocationButton();
    
    // Add report button
    document.getElementById('addReportBtn')?.addEventListener('click', function() {
      window.location.href = 'reports.html';
    });
  });