// auth.js - Complete Authentication System

// Initialize authentication system
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
    loadUserReports(); // Load reports if on profile page
});

// Check authentication state
function checkAuth() {
    const user = getCurrentUser();
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileBtn = document.getElementById('profileBtn');

    if (user) {
        // User is logged in
        if (loginBtn) loginBtn.classList.add('d-none');
        if (logoutBtn) logoutBtn.classList.remove('d-none');
        
        // Update profile button
        if (profileBtn) {
            profileBtn.innerHTML = `<i class="fas fa-user me-1"></i>${user.name}`;
            profileBtn.classList.remove('d-none');
        }
        
        // Update profile page if we're on it
        if (window.location.pathname.includes('profile.html')) {
            updateProfileInfo(user);
        }
    } else {
        // User is not logged in
        if (loginBtn) loginBtn.classList.remove('d-none');
        if (logoutBtn) logoutBtn.classList.add('d-none');
        
        if (profileBtn) {
            profileBtn.innerHTML = '<i class="fas fa-user me-1"></i>Profile';
            profileBtn.classList.add('d-none');
        }
    }
}

// Get current user from localStorage
function getCurrentUser() {
    const user = localStorage.getItem('wildguard_user');
    return user ? JSON.parse(user) : null;
}

// Setup all authentication event listeners
function setupEventListeners() {
    // Login form submission
    document.getElementById('loginForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });

    // Register form submission
    document.getElementById('registerForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        handleRegister();
    });

    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', function() {
        handleLogout();
    });

    // Toggle between login and register modals
    document.getElementById('showRegister')?.addEventListener('click', function(e) {
        e.preventDefault();
        toggleAuthModals('register');
    });

    document.getElementById('showLogin')?.addEventListener('click', function(e) {
        e.preventDefault();
        toggleAuthModals('login');
    });

    // Initialize login modal
    document.getElementById('loginBtn')?.addEventListener('click', function() {
        const modal = new bootstrap.Modal(document.getElementById('loginModal'));
        modal.show();
    });
}

// Handle login process
function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showAlert('Please fill in all fields', 'danger');
        return;
    }

    // In a real app, you would validate credentials with a server
    // For demo, we'll check if user exists in localStorage
    const users = JSON.parse(localStorage.getItem('wildguard_users')) || [];
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        // Store current user in localStorage (without password)
        const { password, ...userData } = user;
        localStorage.setItem('wildguard_user', JSON.stringify(userData));
        
        // Close modal and refresh auth state
        const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        modal.hide();
        
        checkAuth();
        showAlert('Login successful!', 'success');
        
        // If on profile page, reload reports
        if (window.location.pathname.includes('profile.html')) {
            loadUserReports();
        }
    } else {
        showAlert('Invalid email or password', 'danger');
    }
}

// Handle registration process
function handleRegister() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;

    if (!name || !email || !password || !confirm) {
        showAlert('Please fill in all fields', 'danger');
        return;
    }

    if (password !== confirm) {
        showAlert('Passwords do not match', 'danger');
        return;
    }

    // Check if user already exists
    const users = JSON.parse(localStorage.getItem('wildguard_users')) || [];
    if (users.some(u => u.email === email)) {
        showAlert('Email already registered', 'danger');
        return;
    }

    // Create new user
    const newUser = {
        id: Date.now(),
        name,
        email,
        password, // In a real app, you would hash this
        joinDate: new Date().toISOString(),
        reports: [],
        following: [],
        impactScore: 0
    };

    // Save to users list
    users.push(newUser);
    localStorage.setItem('wildguard_users', JSON.stringify(users));

    // Automatically log in the new user (without storing password)
    const { password: _, ...userData } = newUser;
    localStorage.setItem('wildguard_user', JSON.stringify(userData));

    // Close modal and refresh auth state
    const modal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
    modal.hide();
    
    checkAuth();
    showAlert('Registration successful! You are now logged in.', 'success');
    
    // If on profile page, reload reports
    if (window.location.pathname.includes('profile.html')) {
        loadUserReports();
    }
}

// Handle logout process
function handleLogout() {
    localStorage.removeItem('wildguard_user');
    checkAuth();
    showAlert('You have been logged out.', 'info');
    
    // Redirect to home page if on profile page
    if (window.location.pathname.includes('profile.html')) {
        window.location.href = 'index.html';
    }
}

// Toggle between login and register modals
function toggleAuthModals(target) {
    if (target === 'register') {
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        loginModal.hide();
        
        const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
        registerModal.show();
    } else {
        const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
        registerModal.hide();
        
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    }
}

// Update profile information
function updateProfileInfo(user) {
    if (!user) return;

    // Basic info
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('joinDate').textContent = new Date(user.joinDate).toLocaleDateString();
    
    // Stats
    document.getElementById('reportCount').textContent = user.reports?.length || 0;
    document.getElementById('followingCount').textContent = user.following?.length || 0;
    document.getElementById('impactScore').textContent = user.impactScore || 0;
    
    // Load reports into table
    loadUserReports();
}

// Load user's reports into profile table
function loadUserReports() {
    const user = getCurrentUser();
    const tableBody = document.getElementById('reportsTable');
    
    if (!tableBody || !user) return;

    if (user.reports && user.reports.length > 0) {
        tableBody.innerHTML = user.reports.map(report => `
            <tr>
                <td>${new Date(report.date).toLocaleDateString()}</td>
                <td>${capitalizeFirstLetter(report.type)}</td>
                <td>${capitalizeFirstLetter(report.animal)}</td>
                <td><span class="badge ${getStatusBadgeClass(report.status)}">${report.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-success view-report" data-id="${report.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Add event listeners to view buttons
        document.querySelectorAll('.view-report').forEach(btn => {
            btn.addEventListener('click', function() {
                const reportId = parseInt(this.getAttribute('data-id'));
                viewReport(reportId);
            });
        });
    } else {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <i class="fas fa-paw fa-3x text-muted mb-3"></i>
                    <h5>No reports yet</h5>
                    <p class="text-muted">Submit your first report to help protect animals</p>
                    <a href="reports.html" class="btn btn-success mt-2">Submit Report</a>
                </td>
            </tr>
        `;
    }
}

// View a single report
function viewReport(reportId) {
    const user = getCurrentUser();
    if (!user) return;

    const report = user.reports.find(r => r.id === reportId);
    if (!report) return;

    // In a real app, you would show a detailed view or modal
    alert(`Report Details:\n\nType: ${report.type}\nAnimal: ${report.animal}\nDate: ${new Date(report.date).toLocaleString()}\nStatus: ${report.status}\n\nDescription: ${report.description}`);
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Helper function to get status badge class
function getStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
        case 'submitted': return 'bg-primary';
        case 'under review': return 'bg-warning text-dark';
        case 'resolved': return 'bg-success';
        case 'rejected': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Show alert message
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to page (you might want to create a specific container for alerts)
    const container = document.getElementById('alerts-container') || document.body;
    container.prepend(alertDiv);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 5000);
}