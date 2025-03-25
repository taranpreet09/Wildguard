 document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('welfare-report');
    if (!form) return;

    const steps = form.querySelectorAll('.form-step');
    const nextButtons = form.querySelectorAll('.next-step');
    const prevButtons = form.querySelectorAll('.prev-step');
    const fileUpload = document.getElementById('file-upload');
    const uploadArea = document.getElementById('upload-area');
    const uploadPreview = document.getElementById('upload-preview');
    const getLocationBtn = document.getElementById('get-location');
    const locationInput = document.getElementById('location');
    const anonymousCheckbox = document.getElementById('anonymous');
    const emailInput = document.getElementById('contact-email');

    // Form step navigation
    let currentStep = 0;

    function showStep(stepIndex) {
        steps.forEach((step, index) => {
            step.classList.toggle('active', index === stepIndex);
        });
        currentStep = stepIndex;
    }

    nextButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Validate current step before proceeding
            const currentStepForm = steps[currentStep];
            const inputs = currentStepForm.querySelectorAll('input[required], select[required], textarea[required]');
            let isValid = true;

            inputs.forEach(input => {
                if (!input.value.trim()) {
                    input.classList.add('error');
                    isValid = false;
                } else {
                    input.classList.remove('error');
                }
            });

            if (isValid) {
                showStep(currentStep + 1);
                window.scrollTo({ top: form.offsetTop - 20, behavior: 'smooth' });
            } else {
                alert('Please fill in all required fields before proceeding.');
            }
        });
    });

    prevButtons.forEach(button => {
        button.addEventListener('click', function() {
            showStep(currentStep - 1);
            window.scrollTo({ top: form.offsetTop - 20, behavior: 'smooth' });
        });
    });

    // File upload handling
    uploadArea.addEventListener('click', function() {
        fileUpload.click();
    });

    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileUpload.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        uploadPreview.innerHTML = '';
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            if (!file.type.match('image.*') && !file.type.match('video.*')) {
                continue;
            }
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const previewItem = document.createElement('div');
                
                if (file.type.match('image.*')) {
                    previewItem.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                } else {
                    previewItem.innerHTML = `
                        <video controls>
                            <source src="${e.target.result}" type="${file.type}">
                            Your browser does not support the video tag.
                        </video>
                    `;
                }
                
                uploadPreview.appendChild(previewItem);
            };
            
            reader.readAsDataURL(file);
        }
    }

    // Geolocation
    getLocationBtn.addEventListener('click', function() {
        if (navigator.geolocation) {
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
            this.disabled = true;
            
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Reverse geocoding to get address (in a real app, you'd use a geocoding service)
                    locationInput.value = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
                    getLocationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Use Current Location';
                    getLocationBtn.disabled = false;
                },
                function(error) {
                    alert('Unable to retrieve your location: ' + error.message);
                    getLocationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Use Current Location';
                    getLocationBtn.disabled = false;
                }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    });

    // Anonymous checkbox toggle
    anonymousCheckbox.addEventListener('change', function() {
        emailInput.disabled = this.checked;
        if (this.checked) {
            emailInput.value = '';
        }
    });

    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // In a real app, you would send the form data to your server here
        const formData = new FormData(form);
        console.log('Form data:', Object.fromEntries(formData.entries()));
        
        // Show success modal
        document.getElementById('report-success').style.display = 'flex';
        
        // Reset form
        form.reset();
        uploadPreview.innerHTML = '';
        showStep(0);
    });

    // Initialize date field with today's date
    const dateObserved = document.getElementById('date-observed');
    if (dateObserved) {
        const today = new Date().toISOString().split('T')[0];
        dateObserved.value = today;
        dateObserved.max = today;
    }
});