// Firebase configuration for production deployment
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyAuwhFXS3YjygWINuJ2v3db6B-YvDuzxv4",
    authDomain: "ezsociety-7ca0d.firebaseapp.com",
    databaseURL: "https://ezsociety-7ca0d-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ezsociety-7ca0d",
    storageBucket: "ezsociety-7ca0d.firebasestorage.app",
    messagingSenderId: "56624648205",
    appId: "1:56624648205:web:035e3721b886611ec40544",
    measurementId: "G-V3RJH9TBLN"
};

// Initialize Firebase using global objects from CDN
let app, database;
try {
    app = firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log('Firebase initialized successfully');
} catch (error) {
    console.warn('Firebase initialization failed, using local storage fallback:', error);
    database = null;
}

// Firebase database paths
const DB_PATHS = {
    VISITORS: 'visitors',
    RESIDENTS: 'residents',
    COMPLAINTS: 'complaints',
    NOTICES: 'notices',
    NOTIFICATIONS: 'notifications'
};

// Firebase helper functions
const firebaseHelper = {
    addItem: async (path, item) => {
        try {
            const newItem = {
                ...item,
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                createdAt: new Date().toISOString()
            };

            // Use Firebase if available, otherwise use localStorage
            if (database) {
                const itemRef = database.ref(`${path}/${newItem.id}`);
                await itemRef.set(newItem);
            } else {
                // Fallback to localStorage for testing
                const existingData = JSON.parse(localStorage.getItem(`ezSociety_${path}`) || '[]');
                existingData.push(newItem);
                localStorage.setItem(`ezSociety_${path}`, JSON.stringify(existingData));
            }
            return newItem;
        } catch (error) {
            console.error('Error adding item:', error);
            throw error;
        }
    },

    getData: async (path) => {
        try {
            // Use Firebase if available, otherwise use localStorage
            if (database) {
                const dbRef = database.ref(path);
                const snapshot = await dbRef.once('value');

                if (snapshot.exists()) {
                    const data = snapshot.val();
                    return Object.values(data);
                } else {
                    return [];
                }
            } else {
                // Fallback to localStorage for testing
                const data = JSON.parse(localStorage.getItem(`ezSociety_${path}`) || '[]');
                return data;
            }
        } catch (error) {
            console.error('Error reading data:', error);
            return [];
        }
    },

    updateItem: async (path, id, updates) => {
        try {
            const itemRef = database.ref(`${path}/${id}`);
            const snapshot = await itemRef.once('value');

            if (snapshot.exists()) {
                const existingData = snapshot.val();
                const updatedData = { ...existingData, ...updates };
                await itemRef.set(updatedData);
                return updatedData;
            } else {
                throw new Error('Item not found');
            }
        } catch (error) {
            console.error('Error updating item in Firebase:', error);
            throw error;
        }
    },

    deleteItem: async (path, id) => {
        try {
            const itemRef = database.ref(`${path}/${id}`);
            await itemRef.remove();
        } catch (error) {
            console.error('Error deleting item from Firebase:', error);
            throw error;
        }
    },

    saveData: async (path, data) => {
        try {
            const dbRef = database.ref(path);
            await dbRef.set(data);
        } catch (error) {
            console.error('Error saving data to Firebase:', error);
            throw error;
        }
    }
};

// Global variables
let currentStream = null;
let capturedPhotoBlob = null;

// Wing configuration
const wingConfig = {
    'A': { floors: 4, flatsPerFloor: 4 },
    'B': { floors: 4, flatsPerFloor: 4 },
    'C': { floors: 4, flatsPerFloor: 4 },
    'D': { floors: 6, flatsPerFloor: 4 },
    'E': { floors: 4, flatsPerFloor: 4 },
    'F': { floors: 6, flatsPerFloor: 4 }
};

// Global state management
const appState = {
    currentPage: 'login',
    activeTab: 'new-complaint',
    isLoggedIn: false,
    userType: null, // 'admin', 'guard', or 'resident'
    userInfo: null
};

// Data export tracking
const EXPORT_REMINDER_KEY = 'ezSociety_lastExport';
const EXPORT_INTERVAL_DAYS = 30;

// Navigation functionality
function showPage(pageId) {
    // Check authentication for protected pages
    if (pageId !== 'login' && !appState.isLoggedIn) {
        showPage('login');
        return;
    }

    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        appState.currentPage = pageId;
        
        // Save current page to session storage for reload persistence
        if (appState.isLoggedIn) {
            const sessionData = JSON.parse(localStorage.getItem('ezSociety_session') || '{}');
            sessionData.currentPage = pageId;
            localStorage.setItem('ezSociety_session', JSON.stringify(sessionData));
        }
    }

    // Update bottom navigation (only for authenticated users)
    if (appState.isLoggedIn) {
        updateBottomNavigation(pageId);
    }

    // Load page-specific content
    if (pageId === 'visitors') {
        // Ensure any open modals are closed first
        closeAddVisitorForm();
        loadVisitorHistory();
    } else if (pageId === 'residents') {
        loadResidents();
    } else if (pageId === 'notices') {
        loadNotices();
    } else if (pageId === 'dashboard') {
        loadRecentActivity();
    } else if (pageId === 'complaints') {
        loadComplaints(); // Load complaints when complaints page is shown
    } else if (pageId === 'myVisitors') {
        loadMyVisitors();
    }

    // Add page transition animation
    targetPage.classList.add('fade-in');
    setTimeout(() => {
        targetPage.classList.remove('fade-in');
    }, 300);
}

// Update bottom navigation active state
function updateBottomNavigation(activePageId) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === activePageId) {
            item.classList.add('active');
        }
    });
}

// Tab switching for complaints section
function switchTab(tabId) {
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        appState.activeTab = tabId;

        // Load complaints when switching to all-complaints tab
        if (tabId === 'all-complaints') {
            loadComplaints();
        }
    }
}

// Photo capture functionality (basic implementation)
function capturePhoto() {
    const photoPreview = document.getElementById('photoPreview');

    // Check if browser supports getUserMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment' // Use back camera
            } 
        })
            .then(function(stream) {
                // Create video element for preview
                const video = document.createElement('video');
                video.srcObject = stream;
                video.autoplay = true;
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'cover';
                video.style.borderRadius = '12px';

                // Clear preview and add video
                photoPreview.innerHTML = '';
                photoPreview.appendChild(video);

                // Add capture button
                const captureBtn = document.createElement('button');
                captureBtn.innerHTML = '<i class="fas fa-camera"></i> Capture';
                captureBtn.className = 'photo-btn';
                captureBtn.style.position = 'absolute';
                captureBtn.style.bottom = '10px';
                captureBtn.style.left = '50%';
                captureBtn.style.transform = 'translateX(-50%)';

                captureBtn.onclick = function() {
                    // Create canvas and capture frame
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    context.drawImage(video, 0, 0);

                    // Convert to image
                    const imageData = canvas.toDataURL('image/jpeg');
                    const img = document.createElement('img');
                    img.src = imageData;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '12px';

                    // Replace video with captured image
                    photoPreview.innerHTML = '';
                    photoPreview.appendChild(img);

                    // Stop camera
                    stream.getTracks().forEach(track => track.stop());

                    showMessage('Photo captured successfully!', 'success');
                };

                photoPreview.style.position = 'relative';
                photoPreview.appendChild(captureBtn);
            })
            .catch(function(error) {
                console.error('Error accessing camera:', error);
                showMessage('Unable to access camera. Please check permissions.', 'error');
            });
    } else {
        showMessage('Camera not supported on this device.', 'error');
    }
}

// Form submissions
document.addEventListener('DOMContentLoaded', function() {
    // Visitor form submission
    const visitorForm = document.getElementById('visitorForm');
    if (visitorForm) {
        visitorForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            try {
                let photoDataURL = null;

                // Check if photo was captured
                const photoPreviewElement = document.getElementById('photoPreview');
                const capturedImage = photoPreviewElement.querySelector('img');

                if (capturedImage) {
                    try {
                        // Store image as base64 data URL
                        photoDataURL = capturedImage.src;
                    } catch (photoError) {
                        console.error('Error processing photo:', photoError);
                        showMessage('Photo processing failed, but visitor entry was saved.', 'warning');
                    }
                }

                const formData = {
                    visitorName: document.getElementById('visitorName').value,
                    visitorPhone: document.getElementById('visitorPhone').value,
                    wing: document.getElementById('wing').value,
                    floor: document.getElementById('floor').value,
                    flatNumber: document.getElementById('flatNumber').value,
                    purpose: document.getElementById('purpose').value,
                    photoURL: photoDataURL,
                    timestamp: new Date().toISOString(),
                    date: new Date().toISOString().split('T')[0]
                };

                // Save visitor data to Firebase
                const savedVisitor = await firebaseHelper.addItem(DB_PATHS.VISITORS, formData);

                console.log('Visitor saved with ID:', savedVisitor.id);
                showMessage('Visitor entry recorded successfully!', 'success');

                // Reset form
                visitorForm.reset();

                // Reset dropdowns
                document.getElementById('floor').disabled = true;
                document.getElementById('flatNumber').disabled = true;
                document.getElementById('floor').innerHTML = '<option value="">Select Floor</option>';
                document.getElementById('flatNumber').innerHTML = '<option value="">Select Flat</option>';

                // Reset photo preview
                const photoPreviewReset = document.getElementById('photoPreview');
                photoPreviewReset.innerHTML = `
                    <i class="fas fa-camera"></i>
                    <p>Tap to capture photo</p>
                `;

                // Close modal
                closeAddVisitorForm();

                // Send SMS notification to resident
                await sendVisitorNotificationSMS(savedVisitor);

                // Refresh visitor list if on visitors page
                if (appState.currentPage === 'visitors') {
                    loadVisitorHistory();
                }

                // Refresh recent activity on dashboard
                loadRecentActivity();

            } catch (error) {
                console.error('Error saving visitor:', error);
                showMessage('Error saving visitor entry. Please try again.', 'error');
            }
        });
    }

    // Complaint form submission
    const complaintForm = document.getElementById('complaintForm');
    if (complaintForm) {
        complaintForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = {
                complaintType: document.getElementById('complaintType').value,
                complaintSubject: document.getElementById('complaintSubject').value,
                complaintDescription: document.getElementById('complaintDescription').value,
                status: 'pending',
                timestamp: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0],
                submittedBy: appState.userType === 'admin' ? 'Admin' : 
                           appState.userType === 'guard' ? `Guard (${appState.userInfo?.guardId})` :
                           (appState.userInfo?.flat || 'Resident'),
                userType: appState.userType
            };

            // Save complaint to Firebase
            try {
                await firebaseHelper.addItem(DB_PATHS.COMPLAINTS, formData);
                console.log('Complaint Data:', formData);
                showMessage('Complaint submitted successfully!', 'success');
            } catch (error) {
                console.error('Error saving complaint:', error);
                showMessage('Error submitting complaint. Please try again.', 'error');
                return;
            }

            // Reset form
            complaintForm.reset();

            // Switch to all complaints tab to show the new complaint
            switchTab('all-complaints');

            // Refresh recent activity
            loadRecentActivity();

             // Refresh complaints list on complaints page
             if (appState.currentPage === 'complaints') {
                loadComplaints();
            }
        });
    }

    // Resident form submission
    const residentForm = document.getElementById('residentForm');
    if (residentForm) {
        residentForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const newResident = {
                name: document.getElementById('residentName').value,
                phone: document.getElementById('residentPhone').value,
                wing: document.getElementById('residentWing').value,
                floor: document.getElementById('residentFloor').value,
                flat: document.getElementById('residentFlat').value
            };

            // Add to Firebase
            try {
                await firebaseHelper.addItem(DB_PATHS.RESIDENTS, newResident);
                console.log('Resident Data:', newResident);
                showMessage('Resident added successfully!', 'success');
            } catch (error) {
                console.error('Error saving resident:', error);
                showMessage('Error adding resident. Please try again.', 'error');
                return;
            }

            // Reset form and close modal
            residentForm.reset();
            closeAddResidentForm();

            // Reload residents list
            loadResidents();
        });
    }

    // Notice form submission
    const noticeForm = document.getElementById('noticeForm');
    if (noticeForm) {
        noticeForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const newNotice = {
                title: document.getElementById('noticeTitle').value,
                type: document.getElementById('noticeType').value,
                content: document.getElementById('noticeContent').value,
                author: document.getElementById('noticeAuthor').value,
                timestamp: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0]
            };

            // Create and broadcast notice to all users
            try {
                await createNoticeWithBroadcast(newNotice);
                console.log('Notice Data:', newNotice);
                showMessage('Notice posted successfully and visible to all residents!', 'success');
            } catch (error) {
                console.error('Error saving notice:', error);
                showMessage('Error posting notice. Please try again.', 'error');
                return;
            }

            // Reset form and close modal
            noticeForm.reset();
            closeAddNoticeForm();
        });
    }
});

// Resident search functionality
function filterResidents() {
    const searchTerm = document.getElementById('residentSearch').value.toLowerCase();
    const residentItems = document.querySelectorAll('.resident-item');

    residentItems.forEach(item => {
        const name = item.dataset.name.toLowerCase();
        const flat = item.dataset.flat.toLowerCase();

        if (name.includes(searchTerm) || flat.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Load My Visitors function (for residents only)
async function loadMyVisitors() {
    const myVisitorsList = document.getElementById('myVisitorsList');
    if (!myVisitorsList) return;

    // Only load if user is a resident
    if (appState.userType !== 'resident' || !appState.userInfo?.flat) {
        myVisitorsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-user-friends"></i>
                </div>
                <h4>Access Denied</h4>
                <p>This section is only available for residents.</p>
            </div>
        `;
        return;
    }

    try {
        // Show loading state
        myVisitorsList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading your visitors...</p>
            </div>
        `;

        // Fetch visitors from Firebase, filtered by resident's flat number
        const allVisitors = await firebaseHelper.getData(DB_PATHS.VISITORS);
        const myVisitors = allVisitors.filter(visitor => visitor.flatNumber === appState.userInfo.flat);
        const sortedVisitors = myVisitors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (sortedVisitors.length === 0) {
            myVisitorsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-user-friends"></i>
                    </div>
                    <h4>No Visitors Yet</h4>
                    <p>Visitors who came to meet you at ${appState.userInfo.flat} will appear here.</p>
                </div>
            `;
            return;
        }

        const visitorsHTML = [];
        sortedVisitors.forEach((visitor) => {
            const visitDate = new Date(visitor.timestamp);
            const timeAgo = getTimeAgo(visitDate);

            visitorsHTML.push(`
                <div class="visitor-item" data-name="${visitor.visitorName.toLowerCase()}" data-flat="${visitor.flatNumber.toLowerCase()}" data-date="${visitor.date}">
                    <div class="visitor-content" onclick="showVisitorDetails('${visitor.id}')">
                        <div class="visitor-avatar">
                            ${visitor.photoURL ? 
                                `<img src="${visitor.photoURL}" alt="${visitor.visitorName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` :
                                `<i class="fas fa-user"></i>`
                            }
                        </div>
                        <div class="visitor-info">
                            <h5>${visitor.visitorName}</h5>
                            <p>Phone: ${visitor.visitorPhone}</p>
                            <p>Purpose: ${visitor.purpose}</p>
                            <span class="visitor-time">${timeAgo}</span>
                        </div>
                        <div class="visitor-status">
                            <span class="status-badge visited">Visited</span>
                            <i class="fas fa-chevron-right" style="margin-left: 8px; color: var(--text-light);"></i>
                        </div>
                    </div>
                    ${appState.userType === 'admin' ? `
                        <div class="visitor-actions">
                            <button class="delete-visitor-btn-small" onclick="event.stopPropagation(); deleteVisitor('${visitor.id}')" title="Delete visitor entry">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
            `);
        });

        myVisitorsList.innerHTML = visitorsHTML.join('');

    } catch (error) {
        console.error('Error loading my visitors:', error);
        myVisitorsList.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h4>Error Loading Visitors</h4>
                <p>Please check your connection and try again.</p>
            </div>
        `;
    }
}

function filterMyVisitors() {
    const searchTerm = document.getElementById('myVisitorSearch').value.toLowerCase();
    const visitorItems = document.querySelectorAll('#myVisitorsList .visitor-item');

    visitorItems.forEach(item => {
        const name = item.dataset.name;

        if (name.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function filterMyVisitorsByStatus(filter) {
    // Update filter button states
    const filterBtns = document.querySelectorAll('#myVisitors .filter-btn');
    filterBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const visitorItems = document.querySelectorAll('#myVisitorsList .visitor-item');
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    visitorItems.forEach(item => {
        const itemDate = new Date(item.dataset.date);
        let shouldShow = false;

        switch(filter) {
            case 'all':
                shouldShow = true;
                break;
            case 'today':
                shouldShow = itemDate.toDateString() === today.toDateString();
                break;
            case 'week':
                shouldShow = itemDate >= weekAgo;
                break;
        }

        item.style.display = shouldShow ? 'flex' : 'none';
    });
}

// Utility function to show messages
function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;

    // Insert at the top of current page
    const currentPage = document.querySelector('.page.active');
    if (currentPage) {
        currentPage.insertBefore(messageDiv, currentPage.firstChild);

        // Auto remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Handle device back button (for mobile PWA)
window.addEventListener('popstate', function(event) {
    if (appState.currentPage !== 'dashboard') {
        showPage('dashboard');
    }
});

// Add touch feedback for better mobile experience
document.addEventListener('touchstart', function() {}, { passive: true });

// Contact functionality for residents
document.addEventListener('click', function(e) {
    if (e.target.closest('.contact-btn')) {
        e.stopPropagation();
        const residentItem = e.target.closest('.resident-item');
        const phone = residentItem.querySelector('.resident-phone').textContent;

        // Direct call without confirmation
        window.location.href = `tel:${phone}`;
    } else if (e.target.closest('.resident-item')) {
        const residentItem = e.target.closest('.resident-item');
        const residentId = residentItem.dataset.residentId;
        if (residentId) {
            showResidentDetails(residentId);
        }
    }
});

// Visitor management functions
function showAddVisitorForm() {
    console.log('showAddVisitorForm called'); // Debug log
    const modal = document.getElementById('addVisitorModal');
    if (modal) {
        modal.classList.add('active');
        console.log('Modal should be visible now'); // Debug log
        
        // Reset form when opening
        const form = document.getElementById('visitorForm');
        if (form) {
            form.reset();
            
            // Reset dropdowns
            document.getElementById('floor').disabled = true;
            document.getElementById('flatNumber').disabled = true;
            document.getElementById('floor').innerHTML = '<option value="">Select Floor</option>';
            document.getElementById('flatNumber').innerHTML = '<option value="">Select Flat</option>';
            
            // Reset photo preview
            const photoPreview = document.getElementById('photoPreview');
            if (photoPreview) {
                photoPreview.innerHTML = `
                    <i class="fas fa-camera"></i>
                    <p>Tap to capture photo</p>
                `;
            }
        }
    } else {
        console.error('Modal not found!'); // Debug log
    }
}

function closeAddVisitorForm() {
    const modal = document.getElementById('addVisitorModal');
    modal.classList.remove('active');

    // Reset form
    const form = document.getElementById('visitorForm');
    if (form) form.reset();

    // Reset photo preview
    const photoPreviewClose = document.getElementById('photoPreview');
    if (photoPreviewClose) {
        photoPreviewClose.innerHTML = `
            <i class="fas fa-camera"></i>
            <p>Tap to capture photo</p>
        `;
    }
}

async function loadVisitorHistory() {
    const visitorsList = document.getElementById('visitorsList');
    if (!visitorsList) return;

    try {
        // Show loading state
        visitorsList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading visitors...</p>
            </div>
        `;

        // Fetch visitors from Firebase, ordered by timestamp (newest first)
        const visitors = await firebaseHelper.getData(DB_PATHS.VISITORS);
        const sortedVisitors = visitors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (sortedVisitors.length === 0) {
            visitorsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <h4>No Visitors Yet</h4>
                    <p>Visitor history will appear here once you start adding visitors.</p>
                </div>
            `;
            return;
        }

        const visitorsHTML = [];
        sortedVisitors.forEach((visitor) => {
            const visitDate = new Date(visitor.timestamp);
            const timeAgo = getTimeAgo(visitDate);

            visitorsHTML.push(`
                <div class="visitor-item ${visitor.offline ? 'offline-item' : ''}" data-name="${visitor.visitorName.toLowerCase()}" data-flat="${visitor.flatNumber.toLowerCase()}" data-date="${visitor.date}">
                    <div class="visitor-content" onclick="showVisitorDetails('${visitor.id}')">
                        <div class="visitor-avatar">
                            ${visitor.photoURL ? 
                                `<img src="${visitor.photoURL}" alt="${visitor.visitorName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` :
                                `<i class="fas fa-user"></i>`
                            }
                        </div>
                        <div class="visitor-info">
                            <h5>${visitor.visitorName} ${visitor.offline ? '<i class="fas fa-wifi-slash offline-icon" title="Added offline"></i>' : ''}</h5>
                            <p>${visitor.flatNumber} • ${visitor.purpose}</p>
                            <span class="visitor-time">${timeAgo}${visitor.offline ? ' (Offline)' : ''}</span>
                        </div>
                        <div class="visitor-status">
                            <span class="status-badge ${visitor.offline ? 'pending-sync' : 'visited'}">${visitor.offline ? 'Pending Sync' : 'Visited'}</span>
                            <i class="fas fa-chevron-right" style="margin-left: 8px; color: var(--text-light);"></i>
                        </div>
                    </div>
                    ${appState.userType === 'admin' ? `
                        <div class="visitor-actions">
                            <button class="delete-visitor-btn-small" onclick="event.stopPropagation(); deleteVisitor('${visitor.id}')" title="Delete visitor entry" ${visitor.offline ? 'disabled' : ''}>
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
            `);
        });

        visitorsList.innerHTML = visitorsHTML.join('');

    } catch (error) {
        console.error('Error loading visitors:', error);
        visitorsList.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h4>Error Loading Visitors</h4>
                <p>Please check your connection and try again.</p>
            </div>
        `;
    }
}

function filterVisitors() {
    const searchTerm = document.getElementById('visitorSearch').value.toLowerCase();
    const visitorItems = document.querySelectorAll('.visitor-item');

    visitorItems.forEach(item => {
        const name = item.dataset.name;
        const flat = item.dataset.flat;

        if (name.includes(searchTerm) || flat.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function filterByStatus(filter) {
    // Update filter button states
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const visitorItems = document.querySelectorAll('.visitor-item');
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    visitorItems.forEach(item => {
        const itemDate = new Date(item.dataset.date);
        let shouldShow = false;

        switch(filter) {
            case 'all':
                shouldShow = true;
                break;
            case 'today':
                shouldShow = itemDate.toDateString() === today.toDateString();
                break;
            case 'week':
                shouldShow = itemDate >= weekAgo;
                break;
        }

        item.style.display = shouldShow ? 'flex' : 'none';
    });
}

// Resident management functions
function showAddResidentForm() {
    const modal = document.getElementById('addResidentModal');
    modal.classList.add('active');
    
    // Reset form state
    const form = document.getElementById('residentForm');
    if (form) {
        form.reset();
        
        // Reset dropdowns to initial state
        const wingSelect = document.getElementById('residentWing');
        const floorSelect = document.getElementById('residentFloor');
        const flatSelect = document.getElementById('residentFlat');
        
        if (wingSelect) {
            wingSelect.disabled = false; // Ensure wing is always enabled
            wingSelect.innerHTML = `
                <option value="">Select Wing</option>
                <option value="A">Wing A</option>
                <option value="B">Wing B</option>
                <option value="C">Wing C</option>
                <option value="D">Wing D</option>
                <option value="E">Wing E</option>
                <option value="F">Wing F</option>
            `;
        }
        
        if (floorSelect) {
            floorSelect.disabled = true;
            floorSelect.innerHTML = '<option value="">Select Floor</option>';
        }
        
        if (flatSelect) {
            flatSelect.disabled = true;
            flatSelect.innerHTML = '<option value="">Select Flat</option>';
        }
        
        // Focus on name field for better UX
        setTimeout(() => {
            const nameField = document.getElementById('residentName');
            if (nameField) nameField.focus();
        }, 100);
    }
}

function closeAddResidentForm() {
    const modal = document.getElementById('addResidentModal');
    modal.classList.remove('active');

    // Reset form
    const form = document.getElementById('residentForm');
    if (form) form.reset();

    // Reset dropdowns
    document.getElementById('residentFloor').disabled = true;
    document.getElementById('residentFlat').disabled = true;
    document.getElementById('residentFloor').innerHTML = '<option value="">Select Floor</option>';
    document.getElementById('residentFlat').innerHTML = '<option value="">Select Flat</option>';
}

// Resident Wing-Floor-Flat selection functions
function updateResidentFloors() {
    const wingSelect = document.getElementById('residentWing');
    const floorSelect = document.getElementById('residentFloor');
    const flatSelect = document.getElementById('residentFlat');

    if (!wingSelect || !floorSelect || !flatSelect) {
        console.error('Resident form elements not found');
        return;
    }

    const selectedWing = wingSelect.value;
    console.log('updateResidentFloors called for wing:', selectedWing);

    // Clear and reset floor and flat selects
    floorSelect.innerHTML = '<option value="">Select Floor</option>';
    flatSelect.innerHTML = '<option value="">Select Flat</option>';
    flatSelect.disabled = true;
    flatSelect.style.opacity = '0.6';
    flatSelect.style.cursor = 'not-allowed';
    flatSelect.style.backgroundColor = '#f5f5f5';
    flatSelect.style.color = '#999';

    if (selectedWing) {
        // Enable floor select and style it properly
        floorSelect.disabled = false;
        floorSelect.style.opacity = '1';
        floorSelect.style.cursor = 'pointer';
        floorSelect.style.backgroundColor = 'var(--input-bg)';
        floorSelect.style.color = 'var(--text-primary)';

        // Determine number of floors based on wing
        let maxFloors = 4;
        if (selectedWing === 'D' || selectedWing === 'F') {
            maxFloors = 6;
        }

        // Add floor options
        for (let i = 1; i <= maxFloors; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Floor ${i}`;
            floorSelect.appendChild(option);
        }
        
        console.log(`Generated ${maxFloors} floor options for Wing ${selectedWing}`);
    } else {
        floorSelect.disabled = true;
        floorSelect.style.opacity = '0.6';
        floorSelect.style.cursor = 'not-allowed';
        floorSelect.style.backgroundColor = '#f5f5f5';
        floorSelect.style.color = '#999';
    }
}

function updateResidentFlats() {
    const wingSelect = document.getElementById('residentWing');
    const floorSelect = document.getElementById('residentFloor');
    const flatSelect = document.getElementById('residentFlat');

    if (!wingSelect || !floorSelect || !flatSelect) {
        console.error('Resident form elements not found');
        return;
    }

    const selectedWing = wingSelect.value;
    const selectedFloor = floorSelect.value;

    console.log('updateResidentFlats called:', selectedWing, selectedFloor);

    // Clear flat select
    flatSelect.innerHTML = '<option value="">Select Flat</option>';

    if (selectedWing && selectedFloor) {
        // Enable flat select and ensure it's visible
        flatSelect.disabled = false;
        flatSelect.style.opacity = '1';
        flatSelect.style.cursor = 'pointer';
        flatSelect.style.backgroundColor = 'var(--input-bg)';
        flatSelect.style.color = 'var(--text-primary)';

        // Generate flat numbers (4 flats per floor)
        for (let i = 1; i <= 4; i++) {
            const flatNumber = `${selectedWing}-${selectedFloor}0${i}`;
            const option = document.createElement('option');
            option.value = flatNumber;
            option.textContent = flatNumber;
            flatSelect.appendChild(option);
        }
        
        console.log(`Generated ${flatSelect.options.length - 1} flat options for Wing ${selectedWing}, Floor ${selectedFloor}`);
        console.log('Flat dropdown should now be enabled');
    } else {
        flatSelect.disabled = true;
        flatSelect.style.opacity = '0.6';
        flatSelect.style.cursor = 'not-allowed';
        flatSelect.style.backgroundColor = '#f5f5f5';
        flatSelect.style.color = '#999';
        console.log('Flat dropdown disabled - missing wing or floor');
    }
}

async function loadResidents() {
    const residentsList = document.getElementById('residentsList');
    if (!residentsList) return;

    try {
        const residents = await firebaseHelper.getData(DB_PATHS.RESIDENTS);

    if (residents.length === 0) {
        residentsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-users"></i>
                </div>
                <h4>No Residents Yet</h4>
                <p>Add residents to build your society directory.</p>
            </div>
        `;
        return;
    }

    const residentsHTML = residents.map(resident => `
            <div class="resident-item" data-flat="${resident.flat}" data-name="${resident.name}" data-resident-id="${resident.id}">
                <div class="resident-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="resident-info">
                    <h5>${resident.name}</h5>
                    <p>${resident.flat}, Wing ${resident.flat.charAt(0)}</p>
                    <span class="resident-phone">${resident.phone}</span>
                </div>
                <div class="resident-actions">
                    <button class="contact-btn">
                        <i class="fas fa-phone"></i>
                    </button>
                    <i class="fas fa-chevron-right" style="margin-left: 8px; color: var(--text-light);"></i>
                </div>
            </div>
        `).join('');

        residentsList.innerHTML = `<div class="residents-list-wrapper">${residentsHTML}</div>`;
    } catch (error) {
        console.error('Error loading residents:', error);
        residentsList.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h4>Error Loading Residents</h4>
                <p>Please check your connection and try again.</p>
            </div>
        `;
    }
}

// Wing-Floor-Flat selection functions
function updateFloors() {
    const wingSelect = document.getElementById('wing');
    const floorSelect = document.getElementById('floor');
    const flatSelect = document.getElementById('flatNumber');

    const selectedWing = wingSelect.value;

    // Clear and disable floor and flat selects
    floorSelect.innerHTML = '<option value="">Select Floor</option>';
    flatSelect.innerHTML = '<option value="">Select Flat</option>';
    flatSelect.disabled = true;

    if (selectedWing) {
        floorSelect.disabled = false;

        // Determine number of floors based on wing
        let maxFloors = 4;
        if (selectedWing === 'D' || selectedWing === 'F') {
            maxFloors = 6;
        }

        // Add floor options
        for (let i = 1; i <= maxFloors; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Floor ${i}`;
            floorSelect.appendChild(option);
        }
    } else {
        floorSelect.disabled = true;
    }
}

function updateFlats() {
    const wingSelect = document.getElementById('wing');
    const floorSelect = document.getElementById('floor');
    const flatSelect = document.getElementById('flatNumber');

    const selectedWing = wingSelect.value;
    const selectedFloor = floorSelect.value;

    // Clear flat select
    flatSelect.innerHTML = '<option value="">Select Flat</option>';

    if (selectedWing && selectedFloor) {
        flatSelect.disabled = false;

        // Generate flat numbers (4 flats per floor)
        for (let i = 1; i <= 4; i++) {
            const flatNumber = `${selectedWing}-${selectedFloor}0${i}`;
            const option = document.createElement('option');
            option.value = flatNumber;
            option.textContent = flatNumber;
            flatSelect.appendChild(option);
        }
    } else {
        flatSelect.disabled = true;
    }
}

// Helper function to format time ago
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
}

// Show visitor details function
async function showVisitorDetails(visitorId) {
    try {
        const visitors = await firebaseHelper.getData(DB_PATHS.VISITORS);
        const visitorData = visitors.find(visitor => visitor.id === visitorId);

        if (!visitorData) {
            showMessage('Visitor details not found', 'error');
            return;
        }

        const visitDate = new Date(visitorData.timestamp);
        const formattedDate = visitDate.toLocaleDateString();
        const formattedTime = visitDate.toLocaleTimeString();

        const modalHTML = `
            <div id="visitorDetailsModal" class="modal active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Visitor Details</h3>
                        <button class="close-btn" onclick="closeVisitorDetails()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="visitor-details">
                        ${visitorData.photoURL ? 
                            `<div class="visitor-photo">
                                <img src="${visitorData.photoURL}" alt="${visitorData.visitorName}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 12px; margin: 0 auto 20px; display: block;">
                            </div>` : 
                            `<div class="visitor-photo-placeholder">
                                <i class="fas fa-user" style="font-size: 48px; color: var(--text-light);"></i>
                                <p style="color: var(--text-secondary); margin-top: 8px;">No photo captured</p>
                            </div>`
                        }
                        <div class="detail-item">
                            <label><i class="fas fa-user"></i> Name</label>
                            <span>${visitorData.visitorName}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-phone"></i> Phone</label>
                            <span>${visitorData.visitorPhone}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-home"></i> Visiting</label>
                            <span>${visitorData.flatNumber}, Wing ${visitorData.wing}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-clipboard"></i> Purpose</label>
                            <span>${visitorData.purpose}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-calendar"></i> Date</label>
                            <span>${formattedDate}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-clock"></i> Time</label>
                            <span>${formattedTime}</span>
                        </div>
                    </div>
                    ${appState.userType === 'admin' ? `
                        <div class="visitor-actions-modal">
                            <button class="delete-visitor-btn" onclick="deleteVisitor('${visitorData.id}')">
                                <i class="fas fa-trash"></i>
                                Delete Visitor Entry
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('visitorDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to document
        document.body.insertAdjacentHTML('beforeend', modalHTML);

    } catch (error) {
        console.error('Error loading visitor details:', error);
        showMessage('Error loading visitor details', 'error');
    }
}

function closeVisitorDetails() {
    const modal = document.getElementById('visitorDetailsModal');
    if (modal) {
        modal.remove();
    }
}

// Notice management functions
function showAddNoticeForm() {
    const modal = document.getElementById('addNoticeModal');
    modal.classList.add('active');
}

function closeAddNoticeForm() {
    const modal = document.getElementById('addNoticeModal');
    modal.classList.remove('active');

    // Reset form
    const form = document.getElementById('noticeForm');
    if (form) form.reset();
}

async function loadNotices() {
    const noticesList = document.getElementById('noticesList');
    if (!noticesList) return;

    try {
        // Show loading state
        noticesList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading notices...</p>
            </div>
        `;

        const notices = await firebaseHelper.getData(DB_PATHS.NOTICES);
        const sortedNotices = notices.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (sortedNotices.length === 0) {
            noticesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-bullhorn"></i>
                    </div>
                    <h4>No Notices Yet</h4>
                    <p>Society notices and announcements will appear here when posted by the management.</p>
                </div>
            `;
            return;
        }

        const noticesHTML = sortedNotices.map(notice => {
            const noticeDate = new Date(notice.timestamp);
            const timeAgo = getTimeAgo(noticeDate);
            const formattedDate = noticeDate.toLocaleDateString();

            // Check if notice is new (posted within last 24 hours)
            const isNew = (new Date() - noticeDate) < (24 * 60 * 60 * 1000);

            // Get priority class based on notice type
            const priorityClass = notice.type === 'urgent' ? 'urgent-notice' : '';

            // Truncate content for preview
            const maxLength = 100;
            const isLongContent = notice.content.length > maxLength;
            const truncatedContent = isLongContent ? notice.content.substring(0, maxLength) + '...' : notice.content;

            return `
                <div class="notice-card ${priorityClass}" data-notice-id="${notice.id}">
                    <div class="notice-header">
                        <div class="notice-badges">
                            <span class="notice-badge ${notice.type}">${notice.type.charAt(0).toUpperCase() + notice.type.slice(1)}</span>
                            ${isNew ? '<span class="new-badge">NEW</span>' : ''}
                        </div>
                        <div class="notice-header-actions">
                            <span class="notice-date">${formattedDate}</span>
                            ${appState.userType === 'admin' ? `
                                <button class="delete-notice-btn" onclick="deleteNotice('${notice.id}')" title="Delete notice">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <h4>${notice.title}</h4>
                    <div class="notice-content">
                        <p class="notice-preview">${truncatedContent}</p>
                        ${isLongContent ? `<p class="notice-full hidden">${notice.content}</p>` : ''}
                    </div>
                    ${isLongContent ? `
                        <button class="expand-btn" onclick="toggleNoticeExpansion('${notice.id}')">
                            <span class="expand-text">Read More</span>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    ` : ''}
                    <div class="notice-footer">
                        <span class="notice-author">
                            <i class="fas fa-user-shield"></i>
                            Posted by: ${notice.author}
                        </span>
                        <span class="notice-time">${timeAgo}</span>
                    </div>
                </div>
            `;
        }).join('');

        noticesList.innerHTML = noticesHTML;

        // Update notification badge count
        updateNotificationBadge(sortedNotices);

    } catch (error) {
        console.error('Error loading notices:', error);
        noticesList.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h4>Error Loading Notices</h4>
                <p>Please check your connection and try again.</p>
            </div>
        `;
    }
}

// Load complaints function
async function loadComplaints() {
    const complaintsListContainer = document.getElementById('complaintsListContainer');
    if (!complaintsListContainer) return;

    try {
        // Get complaints from Firebase
        const complaints = await firebaseHelper.getData(DB_PATHS.COMPLAINTS);
        const sortedComplaints = complaints.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (sortedComplaints.length === 0) {
            complaintsListContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h4>No Complaints Yet</h4>
                    <p>Complaints submitted will appear here for tracking and status updates.</p>
                </div>
            `;
            return;
        }

        const complaintsHTML = sortedComplaints.map(complaint => {
            const complaintDate = new Date(complaint.timestamp);
            const timeAgo = getTimeAgo(complaintDate);
            const formattedDate = complaintDate.toLocaleDateString();

            // Initialize reactions if not present
            const thumbsUp = complaint.reactions?.thumbsUp || 0;
            const thumbsDown = complaint.reactions?.thumbsDown || 0;
            const userReacted = complaint.userReactions?.[appState.userInfo?.flat || 'anonymous'] || null;

            // Truncate description for preview
            const maxLength = 150;
            const isLongDescription = complaint.complaintDescription.length > maxLength;
            const truncatedDescription = isLongDescription ? 
                complaint.complaintDescription.substring(0, maxLength) + '...' : 
                complaint.complaintDescription;

            return `
                <div class="complaint-card" data-complaint-id="${complaint.id}">
                    <div class="complaint-header">
                        <div class="complaint-meta">
                            <span class="complaint-subject">${complaint.complaintSubject}</span>
                            <span class="complaint-type-badge ${complaint.complaintType}">${complaint.complaintType}</span>
                        </div>
                        <span class="complaint-date">${formattedDate}</span>
                    </div>

                    <div class="complaint-content">
                        <div class="complaint-description">
                            <p class="description-preview">${truncatedDescription}</p>
                            ${isLongDescription ? `<p class="description-full hidden">${complaint.complaintDescription}</p>` : ''}
                        </div>

                        ${isLongDescription ? `
                            <button class="expand-complaint-btn" onclick="toggleComplaintExpansion('${complaint.id}')">
                                <span class="expand-text">Read More</span>
                                <i class="fas fa-chevron-down"></i>
                            </button>
                        ` : ''}
                    </div>

                    <div class="complaint-footer">
                        <div class="complaint-status-info">
                            <span class="complaint-status status-${complaint.status}">${complaint.status}</span>
                            <span class="complaint-time">${timeAgo}</span>
                            ${appState.userType === 'admin' && complaint.submittedBy ? `<span class="submitted-by">by ${complaint.submittedBy}</span>` : 
                              appState.userType === 'resident' ? `<span class="submitted-by">by Resident</span>` : ''}
                        </div>

                        ${(appState.userType === 'resident' || appState.userType === 'guard') ? `
                            <div class="complaint-reactions">
                                <button class="reaction-btn thumbs-up ${userReacted === 'up' ? 'active' : ''}" 
                                        onclick="toggleComplaintReaction('${complaint.id}', 'up')" 
                                        ${userReacted === 'up' ? 'disabled' : ''}>
                                    <i class="fas fa-thumbs-up"></i>
                                    <span>${thumbsUp}</span>
                                </button>
                                <button class="reaction-btn thumbs-down ${userReacted === 'down' ? 'active' : ''}" 
                                        onclick="toggleComplaintReaction('${complaint.id}', 'down')" 
                                        ${userReacted === 'down' ? 'disabled' : ''}>
                                    <i class="fas fa-thumbs-down"></i>
                                    <span>${thumbsDown}</span>
                                </button>
                            </div>
                        ` : `
                            <div class="complaint-admin-actions">
                                <div class="reaction-display">
                                    <span class="reaction-count">
                                        <i class="fas fa-thumbs-up"></i> ${thumbsUp}
                                    </span>
                                    <span class="reaction-count">
                                        <i class="fas fa-thumbs-down"></i> ${thumbsDown}
                                    </span>
                                </div>
                                <div class="admin-buttons">
                                    ${complaint.status === 'pending' ? `
                                        <button class="admin-action-btn mark-reviewed" onclick="markComplaintAsReviewed('${complaint.id}')">
                                            <i class="fas fa-check"></i>
                                            Mark Reviewed
                                        </button>
                                    ` : ''}
                                    <button class="admin-action-btn delete-complaint" onclick="deleteComplaint('${complaint.id}')">
                                        <i class="fas fa-trash"></i>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        `}
                    </div>
                </div>
            `;
        }).join('');

        complaintsListContainer.innerHTML = complaintsHTML;
    } catch (error) {
        console.error('Error loading complaints:', error);
        complaintsListContainer.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h4>Error Loading Complaints</h4>
                <p>Please check your connection and try again.</p>
            </div>
        `;
    }
}

// Update notification badge count
function updateNotificationBadge(notices) {
    const notificationBadge = document.querySelector('.notification-badge');
    if (!notificationBadge) return;

    // Count new notices (posted within last 24 hours)
    const newNoticesCount = notices.filter(notice => {
        const noticeDate = new Date(notice.timestamp);
        return (new Date() - noticeDate) < (24 * 60 * 60 * 1000);
    }).length;

    if (newNoticesCount > 0) {
        notificationBadge.textContent = newNoticesCount;
        notificationBadge.style.display = 'block';
    } else {
        notificationBadge.style.display = 'none';
    }
}

// Manual refresh only - removed auto-refresh to prevent excessive Firebase reads
function refreshCurrentPage() {
    if (appState.currentPage === 'notices') {
        loadNotices();
    } else if (appState.currentPage === 'dashboard') {
        loadRecentActivity();
    } else if (appState.currentPage === 'visitors') {
        loadVisitorHistory();
    } else if (appState.currentPage === 'residents') {
        loadResidents();
    } else if (appState.currentPage === 'complaints') {
        loadComplaints();
    } else if (appState.currentPage === 'myVisitors') {
        loadMyVisitors();
    }
}

// Enhanced notice creation with immediate visibility
async function createNoticeWithBroadcast(noticeData) {
    try {
        // Save notice to Firebase
        const savedNotice = await firebaseHelper.addItem(DB_PATHS.NOTICES, noticeData);

        // Immediately refresh notices on current page if applicable
        if (appState.currentPage === 'notices') {
            await loadNotices();
        }

        // Update recent activity
        await loadRecentActivity();

        console.log('Notice created and broadcasted:', savedNotice);
        return savedNotice;
    } catch (error) {
        console.error('Error creating notice:', error);
        throw error;
    }
}

// Toggle notice expansion function
function toggleNoticeExpansion(noticeId) {
    const noticeCard = document.querySelector(`[data-notice-id="${noticeId}"]`);
    if (!noticeCard) return;

    const preview = noticeCard.querySelector('.notice-preview');
    const fullContent = noticeCard.querySelector('.notice-full');
    const expandBtn = noticeCard.querySelector('.expand-btn');
    const expandText = expandBtn.querySelector('.expand-text');
    const expandIcon = expandBtn.querySelector('i');

    if (fullContent.classList.contains('hidden')) {
        // Expand
        preview.classList.add('hidden');
        fullContent.classList.remove('hidden');
        expandText.textContent = 'Read Less';
        expandIcon.classList.remove('fa-chevron-down');
        expandIcon.classList.add('fa-chevron-up');
        noticeCard.classList.add('expanded');
    } else {
        // Collapse
        preview.classList.remove('hidden');
        fullContent.classList.add('hidden');
        expandText.textContent = 'Read More';
        expandIcon.classList.remove('fa-chevron-up');
        expandIcon.classList.add('fa-chevron-down');
        noticeCard.classList.remove('expanded');
    }
}

// Notification panel state
let notificationPanelOpen = false;
let allNotifications = [];

// Notification panel functions
function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    const overlay = document.getElementById('notificationOverlay') || createNotificationOverlay();

    if (notificationPanelOpen) {
        closeNotificationPanel();
    } else {
        openNotificationPanel();
    }
}

function createNotificationOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'notificationOverlay';
    overlay.className = 'notification-overlay';
    overlay.onclick = closeNotificationPanel;
    document.body.appendChild(overlay);
    return overlay;
}

function openNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    const overlay = document.getElementById('notificationOverlay') || createNotificationOverlay();

    panel.classList.add('active');
    overlay.classList.add('active');
    notificationPanelOpen = true;

    // Load notifications when panel opens
    loadAllNotifications();
}

function closeNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    const overlay = document.getElementById('notificationOverlay');

    panel.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    notificationPanelOpen = false;
}

async function loadAllNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;

    try {
        // Show loading state
        notificationsList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading notifications...</p>
            </div>
        `;

        // Get all data from Firebase
        const visitors = await firebaseHelper.getData(DB_PATHS.VISITORS);
        const complaints = await firebaseHelper.getData(DB_PATHS.COMPLAINTS);
        const notices = await firebaseHelper.getData(DB_PATHS.NOTICES);

        // Get read notifications for current user
        const readNotificationIds = await getUserReadNotifications();

        // Filter visitor notifications based on user type
        let filteredVisitors = [];
        if (appState.userType === 'resident') {
            // Residents only see notifications for visitors to their flat
            filteredVisitors = visitors.filter(visitor => visitor.flatNumber === appState.userInfo?.flat);
        } else if (appState.userType === 'guard') {
            // Guards see all visitor notifications
            filteredVisitors = visitors;
        }
        // Admin does NOT see visitor notifications at all

        // Combine all notifications and filter out read ones
        allNotifications = [
            ...filteredVisitors.map(visitor => ({
                id: `visitor_${visitor.id}`,
                type: 'visitor',
                title: 'New Visitor Entry',
                description: `${visitor.visitorName} visited ${visitor.flatNumber}`,
                timestamp: new Date(visitor.timestamp),
                icon: 'fas fa-user-check',
                isRead: readNotificationIds.includes(`visitor_${visitor.id}`),
                data: visitor
            })),
            ...complaints.map(complaint => ({
                id: `complaint_${complaint.id}`,
                type: 'complaint',
                title: 'New Complaint Submitted',
                description: complaint.complaintSubject,
                timestamp: new Date(complaint.timestamp),
                icon: 'fas fa-exclamation-triangle',
                isRead: readNotificationIds.includes(`complaint_${complaint.id}`),
                data: complaint
            })),
            ...notices.map(notice => ({
                id: `notice_${notice.id}`,
                type: notice.type === 'urgent' ? 'urgent' : 'notice',
                title: notice.type === 'urgent' ? 'Urgent Notice' : 'New Notice',
                description: notice.title,
                timestamp: new Date(notice.timestamp),
                icon: notice.type === 'urgent' ? 'fas fa-exclamation-circle' : 'fas fa-bullhorn',
                isRead: readNotificationIds.includes(`notice_${notice.id}`),
                data: notice
            }))
        ]
        .filter(notification => !notification.isRead) // Filter out read notifications
        .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first

        if (allNotifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="notification-empty">
                    <div class="empty-icon">
                        <i class="fas fa-bell"></i>
                    </div>
                    <h4>No Notifications</h4>
                    <p>You'll see notifications here when there are new visitors, complaints, or notices.</p>
                </div>
            `;
            return;
        }

        // Generate notifications HTML
        const notificationsHTML = allNotifications.map(notification => {
            const timeAgo = getTimeAgo(notification.timestamp);
            const isNew = (new Date() - notification.timestamp) < (24 * 60 * 60 * 1000); // New if within 24 hours

            return `
                <div class="notification-item ${isNew ? 'unread' : ''}" onclick="handleNotificationClick('${notification.id}', '${notification.type}')">
                    <div class="notification-meta">
                        <div class="notification-icon ${notification.type}">
                            <i class="${notification.icon}"></i>
                        </div>
                        <span class="notification-type">${notification.type}</span>
                        <span class="notification-time">${timeAgo}</span>
                    </div>
                    <div class="notification-title">${notification.title}</div>
                    <p class="notification-description">${notification.description}</p>
                </div>
            `;
        }).join('');

        const hasUnread = allNotifications.length > 0;

        notificationsList.innerHTML = `
            ${hasUnread ? `
                <button class="mark-all-read-btn" onclick="markAllAsRead()">
                    <i class="fas fa-check-double"></i>
                    Mark All as Read
                </button>
            ` : ''}
            ${notificationsHTML}
        `;

        // Update badge count
        updateNotificationBadgeCount();

    } catch (error) {
        console.error('Error loading notifications:', error);
        notificationsList.innerHTML = `
            <div class="notification-empty">
                <div class="empty-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h4>Error Loading Notifications</h4>
                <p>Please check your connection and try again.</p>
            </div>
        `;
    }
}

async function handleNotificationClick(notificationId, type) {
    const notification = allNotifications.find(n => n.id === notificationId);
    if (!notification) return;

    // Mark this notification as read and save to Firebase
    const notificationElement = document.querySelector(`[onclick*="${notificationId}"]`);
    if (notificationElement && notificationElement.classList.contains('unread')) {
        notificationElement.classList.remove('unread');
        notificationElement.dataset.readAt = Date.now();
        
        // Save read status to Firebase
        await saveNotificationReadStatus(notificationId);
        
        updateNotificationBadgeCount();
        
        // Show visual feedback that it's been read
        notificationElement.style.transition = 'all 0.3s ease';
        notificationElement.style.opacity = '0.6';
        notificationElement.style.transform = 'translateX(-5px)';
        
        // Auto-delete this specific notification after 2 seconds
        setTimeout(() => {
            if (notificationElement.parentElement) {
                notificationElement.style.transition = 'all 0.4s ease';
                notificationElement.style.opacity = '0';
                notificationElement.style.transform = 'translateX(100%)';
                notificationElement.style.height = '0';
                notificationElement.style.padding = '0';
                notificationElement.style.margin = '0';
                setTimeout(() => {
                    if (notificationElement.parentElement) {
                        notificationElement.remove();
                        checkIfNotificationsEmpty();
                    }
                }, 400);
            }
        }, 2000);
    }

    // Close notification panel
    closeNotificationPanel();

    // Navigate to relevant page based on notification type
    switch (type) {
        case 'visitor':
            showPage('visitors');
            // If possible, highlight the specific visitor
            setTimeout(() => {
                const visitorItem = document.querySelector(`[onclick="showVisitorDetails('${notification.data.id}')"]`);
                if (visitorItem) {
                    visitorItem.scrollIntoView({ behavior: 'smooth' });
                    visitorItem.style.background = 'rgba(25, 118, 210, 0.1)';
                    setTimeout(() => {
                        visitorItem.style.background = '';
                    }, 3000);
                }
            }, 500);
            break;
        case 'complaint':
            showPage('complaints');
            switchTab('all-complaints');
            break;
        case 'notice':
        case 'urgent':
            showPage('notices');
            break;
    }
}

async function markAllAsRead() {
    const notificationItems = document.querySelectorAll('.notification-item.unread');
    
    // Save all read statuses to Firebase
    const promises = [];
    notificationItems.forEach(item => {
        const notificationId = extractNotificationIdFromElement(item);
        if (notificationId) {
            promises.push(saveNotificationReadStatus(notificationId));
        }
        
        item.classList.remove('unread');
        // Mark with timestamp for auto-deletion
        item.dataset.readAt = Date.now();
        
        // Start fade out animation immediately
        item.style.transition = 'all 0.5s ease';
        item.style.opacity = '0.6';
        item.style.transform = 'translateX(-10px)';
    });

    // Wait for all Firebase updates to complete
    await Promise.all(promises);

    const markAllBtn = document.querySelector('.mark-all-read-btn');
    if (markAllBtn) {
        markAllBtn.remove();
    }

    updateNotificationBadgeCount();
    showMessage('All notifications marked as read and will be auto-deleted', 'success');
    
    // Auto-delete all read notifications after 3 seconds
    setTimeout(() => {
        notificationItems.forEach(item => {
            if (item.parentElement) {
                item.style.transition = 'all 0.3s ease';
                item.style.opacity = '0';
                item.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (item.parentElement) {
                        item.remove();
                        checkIfNotificationsEmpty();
                    }
                }, 300);
            }
        });
    }, 3000);
}

function updateNotificationBadgeCount() {
    const badge = document.querySelector('.notification-badge');
    if (!badge) return;

    // Only count unread notifications if the notification panel has been loaded
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList || !allNotifications) {
        badge.style.display = 'none';
        return;
    }

    // Count unread notifications from the actual data, not DOM elements
    const unreadCount = allNotifications.filter(notification => {
        const notificationElement = document.querySelector(`[onclick*="${notification.id}"]`);
        return notificationElement && notificationElement.classList.contains('unread');
    }).length;

    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

// Auto-delete read notifications after a certain time
function autoDeleteReadNotifications() {
    const readNotifications = document.querySelectorAll('.notification-item:not(.unread)');
    const currentTime = Date.now();
    
    readNotifications.forEach(notification => {
        const readAt = notification.dataset.readAt;
        if (readAt && (currentTime - parseInt(readAt)) > 5000) { // 5 seconds after read
            notification.style.transition = 'all 0.4s ease';
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            notification.style.height = '0';
            notification.style.padding = '0';
            notification.style.margin = '0';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                    checkIfNotificationsEmpty();
                }
            }, 400);
        }
    });
}

// Save notification read status to Firebase
async function saveNotificationReadStatus(notificationId) {
    if (!appState.isLoggedIn || !database) return;

    try {
        const userKey = appState.userType === 'admin' ? 'admin' : appState.userInfo?.flat || 'unknown';
        const readNotificationData = {
            notificationId: notificationId,
            userId: userKey,
            readAt: new Date().toISOString(),
            userType: appState.userType
        };

        await firebaseHelper.addItem(DB_PATHS.NOTIFICATIONS, readNotificationData);
        console.log('Notification read status saved:', notificationId);
    } catch (error) {
        console.error('Error saving notification read status:', error);
    }
}

// Get read notifications for current user
async function getUserReadNotifications() {
    if (!appState.isLoggedIn || !database) return [];

    try {
        const readNotifications = await firebaseHelper.getData(DB_PATHS.NOTIFICATIONS);
        const userKey = appState.userType === 'admin' ? 'admin' : appState.userInfo?.flat || 'unknown';
        
        return readNotifications
            .filter(notification => notification.userId === userKey)
            .map(notification => notification.notificationId);
    } catch (error) {
        console.error('Error getting user read notifications:', error);
        return [];
    }
}

// Extract notification ID from DOM element
function extractNotificationIdFromElement(element) {
    const onclickAttr = element.getAttribute('onclick');
    if (onclickAttr) {
        const match = onclickAttr.match(/handleNotificationClick\('([^']+)'/);
        return match ? match[1] : null;
    }
    return null;
}

// Check if notifications list is empty and show appropriate message
function checkIfNotificationsEmpty() {
    const notificationsList = document.getElementById('notificationsList');
    const remainingNotifications = notificationsList.querySelectorAll('.notification-item');
    
    if (remainingNotifications.length === 0) {
        notificationsList.innerHTML = `
            <div class="notification-empty">
                <div class="empty-icon">
                    <i class="fas fa-bell"></i>
                </div>
                <h4>No Notifications</h4>
                <p>You're all caught up! New notifications will appear here.</p>
            </div>
        `;
    }
}

// Periodically clean up old read notifications
function startNotificationCleanup() {
    // Run cleanup every 10 seconds for faster deletion
    setInterval(autoDeleteReadNotifications, 10000);
}

// Real-time notification listener
let notificationListeners = [];

function setupRealtimeNotifications() {
    if (!appState.isLoggedIn || !database) return;

    try {
        // Clear existing listeners
        cleanupNotificationListeners();

        // Only listen for new data additions using child_added
        const visitorsRef = database.ref(DB_PATHS.VISITORS);
        const complaintsRef = database.ref(DB_PATHS.COMPLAINTS);
        const noticesRef = database.ref(DB_PATHS.NOTICES);

        // Listen for new visitors only
        const visitorsListener = visitorsRef.on('child_added', (snapshot) => {
            if (snapshot.exists()) {
                const visitor = snapshot.val();
                // Only show notification if added after current session
                if (new Date(visitor.timestamp || visitor.createdAt).getTime() > lastNotificationCheck) {
                    showNewItemNotification(visitor, 'visitor');
                }
            }
        });

        // Listen for new complaints only
        const complaintsListener = complaintsRef.on('child_added', (snapshot) => {
            if (snapshot.exists()) {
                const complaint = snapshot.val();
                // Only show notification if added after current session
                if (new Date(complaint.timestamp || complaint.createdAt).getTime() > lastNotificationCheck) {
                    showNewItemNotification(complaint, 'complaint');
                }
            }
        });

        // Listen for new notices only
        const noticesListener = noticesRef.on('child_added', (snapshot) => {
            if (snapshot.exists()) {
                const notice = snapshot.val();
                // Only show notification if added after current session
                if (new Date(notice.timestamp || notice.createdAt).getTime() > lastNotificationCheck) {
                    showNewItemNotification(notice, 'notice');
                }
            }
        });

        // Store listeners for cleanup
        notificationListeners = [
            { ref: visitorsRef, unsubscribe: () => visitorsRef.off('child_added', visitorsListener) },
            { ref: complaintsRef, unsubscribe: () => complaintsRef.off('child_added', complaintsListener) },
            { ref: noticesRef, unsubscribe: () => noticesRef.off('child_added', noticesListener) }
        ];

        console.log('Real-time notifications enabled with child_added listeners');
    } catch (error) {
        console.error('Error setting up real-time notifications:', error);
    }
}

function cleanupNotificationListeners() {
    if (notificationListeners.length === 0) return;
    
    console.log('Cleaning up Firebase listeners...');
    notificationListeners.forEach(listener => {
        try {
            listener.unsubscribe();
        } catch (error) {
            console.error('Error cleaning up listener:', error);
        }
    });
    notificationListeners = [];
    console.log('Firebase listeners cleaned up');
}

// Auto cleanup on page unload/reload
window.addEventListener('beforeunload', cleanupNotificationListeners);

// Auto cleanup on visibility change (when tab becomes hidden)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        cleanupNotificationListeners();
    } else if (appState.isLoggedIn && notificationListeners.length === 0) {
        // Re-setup listeners when tab becomes visible again
        setTimeout(setupRealtimeNotifications, 1000);
    }
});

let lastNotificationCheck = Date.now();

function showNewItemNotification(item, type) {
    // Filter visitor notifications properly
    if (type === 'visitor') {
        // Only show visitor notifications to the specific resident being visited or guards
        // Admin should NOT get visitor notifications
        if (appState.userType === 'admin') {
            return; // Don't show visitor notifications to admin
        }
        if (appState.userType === 'resident' && item.flatNumber !== appState.userInfo?.flat) {
            return; // Don't show visitor notifications for other residents
        }
        // Guards see all visitor notifications (no return here)
    }

    // Update notification badge
    updateNotificationBadgeFromData();
    
    // Show in-app notification
    showInAppNotification(item, type);
    
    console.log('New item notification:', type, item);
}

function showInAppNotification(item, type) {
    // Filter visitor notifications properly
    if (type === 'visitor') {
        // Only show visitor notifications to the specific resident being visited or guards
        // Admin should NOT get visitor notifications
        if (appState.userType === 'admin') {
            return; // Don't show visitor notifications to admin
        }
        if (appState.userType === 'resident' && item.flatNumber !== appState.userInfo?.flat) {
            return; // Don't show visitor notifications for other residents
        }
        // Guards see all visitor notifications (no return here)
    }

    let title, message, icon;
    
    switch (type) {
        case 'visitor':
            title = 'New Visitor';
            message = `${item.visitorName} visited ${item.flatNumber}`;
            icon = 'fas fa-user-check';
            break;
        case 'complaint':
            title = 'New Complaint';
            message = item.complaintSubject;
            icon = 'fas fa-exclamation-triangle';
            break;
        case 'notice':
            title = item.type === 'urgent' ? 'Urgent Notice' : 'New Notice';
            message = item.title;
            icon = item.type === 'urgent' ? 'fas fa-exclamation-circle' : 'fas fa-bullhorn';
            break;
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'realtime-notification';
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="${icon}"></i>
        </div>
        <div class="notification-content">
            <h5>${title}</h5>
            <p>${message}</p>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);

    // Play notification sound (if supported)
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+H');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore if audio fails
    } catch (error) {
        // Ignore audio errors
    }
}

// Manual badge update only - call this when needed, not continuously  
function updateNotificationBadgeFromData() {
    if (!appState.isLoggedIn) return;

    // Only update badge when user performs an action, not continuously
    Promise.all([
        firebaseHelper.getData(DB_PATHS.VISITORS),
        firebaseHelper.getData(DB_PATHS.COMPLAINTS), 
        firebaseHelper.getData(DB_PATHS.NOTICES),
        getUserReadNotifications() // Get read notifications to filter them out
    ]).then(([visitors, complaints, notices, readNotificationIds]) => {
        // Count unread items from last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Filter visitor notifications based on user type
        let filteredVisitors = [];
        if (appState.userType === 'resident') {
            // Residents only see notifications for visitors to their flat
            filteredVisitors = visitors.filter(v => new Date(v.timestamp) > oneDayAgo && v.flatNumber === appState.userInfo?.flat);
        } else if (appState.userType === 'guard') {
            // Guards see all visitor notifications
            filteredVisitors = visitors.filter(v => new Date(v.timestamp) > oneDayAgo);
        }
        // Admin does NOT see visitor notifications at all

        const allNewItems = [
            ...filteredVisitors.map(v => `visitor_${v.id}`),
            ...complaints.filter(c => new Date(c.timestamp) > oneDayAgo).map(c => `complaint_${c.id}`),
            ...notices.filter(n => new Date(n.timestamp) > oneDayAgo).map(n => `notice_${n.id}`)
        ];

        // Filter out read notifications
        const unreadCount = allNewItems.filter(itemId => !readNotificationIds.includes(itemId)).length;

        const badge = document.querySelector('.notification-badge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
        
        // Update last check time
        lastNotificationCheck = Date.now();
    }).catch(error => {
        console.error('Error updating notification badge:', error);
        // Hide badge on error to prevent false positives
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.style.display = 'none';
        }
    });
}

// Toggle complaint expansion function
function toggleComplaintExpansion(complaintId) {
    const complaintCard = document.querySelector(`[data-complaint-id="${complaintId}"]`);
    if (!complaintCard) return;

    const preview = complaintCard.querySelector('.description-preview');
    const fullContent = complaintCard.querySelector('.description-full');
    const expandBtn = complaintCard.querySelector('.expand-complaint-btn');
    const expandText = expandBtn.querySelector('.expand-text');
    const expandIcon = expandBtn.querySelector('i');

    if (fullContent.classList.contains('hidden')) {
        // Expand
        preview.classList.add('hidden');
        fullContent.classList.remove('hidden');
        expandText.textContent = 'Read Less';
        expandIcon.classList.remove('fa-chevron-down');
        expandIcon.classList.add('fa-chevron-up');
        complaintCard.classList.add('expanded');
    } else {
        // Collapse
        preview.classList.remove('hidden');
        fullContent.classList.add('hidden');
        expandText.textContent = 'Read More';
        expandIcon.classList.remove('fa-chevron-up');
        expandIcon.classList.add('fa-chevron-down');
        complaintCard.classList.remove('expanded');
    }
}

// Toggle complaint reaction function
async function toggleComplaintReaction(complaintId, reactionType) {
    if (appState.userType !== 'resident' && appState.userType !== 'guard') return;

    try {
        const complaints = await firebaseHelper.getData(DB_PATHS.COMPLAINTS);
        const complaint = complaints.find(c => c.id === complaintId);

        if (!complaint) {
            showMessage('Complaint not found', 'error');
            return;
        }

        // Initialize reactions if not present
        if (!complaint.reactions) {
            complaint.reactions = { thumbsUp: 0, thumbsDown: 0 };
        }
        if (!complaint.userReactions) {
            complaint.userReactions = {};
        }

        const userKey = appState.userType === 'guard' ? 
                        `guard_${appState.userInfo?.guardId}` : 
                        (appState.userInfo?.flat || 'anonymous');
        const currentReaction = complaint.userReactions[userKey];

        // Remove previous reaction if exists
        if (currentReaction === 'up') {
            complaint.reactions.thumbsUp = Math.max(0, complaint.reactions.thumbsUp - 1);
        } else if (currentReaction === 'down') {
            complaint.reactions.thumbsDown = Math.max(0, complaint.reactions.thumbsDown - 1);
        }

        // Add new reaction if different from current
        if (currentReaction !== reactionType) {
            if (reactionType === 'up') {
                complaint.reactions.thumbsUp++;
            } else if (reactionType === 'down') {
                complaint.reactions.thumbsDown++;
            }
            complaint.userReactions[userKey] = reactionType;
        } else {
            // Remove reaction if clicking the same button
            delete complaint.userReactions[userKey];
        }

        // Update in Firebase
        await firebaseHelper.updateItem(DB_PATHS.COMPLAINTS, complaintId, {
            reactions: complaint.reactions,
            userReactions: complaint.userReactions
        });

        // Refresh complaints display
        loadComplaints();

        showMessage('Reaction updated!', 'success');
    } catch (error) {
        console.error('Error updating reaction:', error);
        showMessage('Error updating reaction', 'error');
    }
}

// Dark Mode Toggle Functionality
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Update all theme icons
    const themeIcon = document.getElementById('themeIcon');
    const footerThemeIcon = document.getElementById('footerThemeIcon');
    const welcomeThemeIcon = document.getElementById('welcomeThemeIcon');
    
    if (newTheme === 'dark') {
        if (themeIcon) {
            themeIcon.className = 'fas fa-sun';
            themeIcon.parentElement.title = 'Switch to Light Mode';
        }
        if (footerThemeIcon) {
            footerThemeIcon.className = 'fas fa-sun';
            footerThemeIcon.parentElement.title = 'Switch to Light Mode';
        }
        if (welcomeThemeIcon) {
            welcomeThemeIcon.className = 'fas fa-sun';
            welcomeThemeIcon.parentElement.title = 'Switch to Light Mode';
        }
    } else {
        if (themeIcon) {
            themeIcon.className = 'fas fa-moon';
            themeIcon.parentElement.title = 'Switch to Dark Mode';
        }
        if (footerThemeIcon) {
            footerThemeIcon.className = 'fas fa-moon';
            footerThemeIcon.parentElement.title = 'Switch to Dark Mode';
        }
        if (welcomeThemeIcon) {
            welcomeThemeIcon.className = 'fas fa-moon';
            welcomeThemeIcon.parentElement.title = 'Switch to Dark Mode';
        }
    }
    
    // Save theme preference
    localStorage.setItem('ezSociety_theme', newTheme);
    
    // Add visual feedback to the clicked button
    const activeButton = event ? event.target.closest('button') : (welcomeThemeIcon ? welcomeThemeIcon.parentElement : (themeIcon ? themeIcon.parentElement : footerThemeIcon?.parentElement));
    if (activeButton) {
        activeButton.style.transform = 'scale(0.9)';
        setTimeout(() => {
            activeButton.style.transform = '';
        }, 150);
    }
}

function initializeTheme() {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('ezSociety_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Update all theme icons based on current theme
    const themeIcon = document.getElementById('themeIcon');
    const footerThemeIcon = document.getElementById('footerThemeIcon');
    const welcomeThemeIcon = document.getElementById('welcomeThemeIcon');
    
    if (savedTheme === 'dark') {
        if (themeIcon) {
            themeIcon.className = 'fas fa-sun';
            themeIcon.parentElement.title = 'Switch to Light Mode';
        }
        if (footerThemeIcon) {
            footerThemeIcon.className = 'fas fa-sun';
            footerThemeIcon.parentElement.title = 'Switch to Light Mode';
        }
        if (welcomeThemeIcon) {
            welcomeThemeIcon.className = 'fas fa-sun';
            welcomeThemeIcon.parentElement.title = 'Switch to Light Mode';
        }
    } else {
        if (themeIcon) {
            themeIcon.className = 'fas fa-moon';
            themeIcon.parentElement.title = 'Switch to Dark Mode';
        }
        if (footerThemeIcon) {
            footerThemeIcon.className = 'fas fa-moon';
            footerThemeIcon.parentElement.title = 'Switch to Dark Mode';
        }
        if (welcomeThemeIcon) {
            welcomeThemeIcon.className = 'fas fa-moon';
            welcomeThemeIcon.parentElement.title = 'Switch to Dark Mode';
        }
    }
}

// Ensure all functions are available globally immediately
if (typeof window !== 'undefined') {
    // Make sure all functions are properly exposed
    window.showPage = showPage;
    window.toggleTheme = toggleTheme;
    window.initializeTheme = initializeTheme;
    window.showAdminLogin = showAdminLogin;
    window.showGuardLogin = showGuardLogin;
    window.showResidentLogin = showResidentLogin;
    window.closeLoginModal = closeLoginModal;
    window.logout = logout;
    window.toggleNotificationPanel = toggleNotificationPanel;
    window.closeNotificationPanel = closeNotificationPanel;
    window.handleNotificationClick = handleNotificationClick;
    window.markAllAsRead = markAllAsRead;
    window.switchTab = switchTab;
    window.capturePhoto = capturePhoto;
    window.filterResidents = filterResidents;
    window.showAddVisitorForm = showAddVisitorForm;
    window.closeAddVisitorForm = closeAddVisitorForm;
    window.filterVisitors = filterVisitors;
    window.filterByStatus = filterByStatus;
    window.showAddResidentForm = showAddResidentForm;
    window.closeAddResidentForm = closeAddResidentForm;
    window.updateFloors = updateFloors;
    window.updateFlats = updateFlats;
    window.updateResidentFloors = updateResidentFloors;
    window.updateResidentFlats = updateResidentFlats;
    window.showVisitorDetails = showVisitorDetails;
    window.closeVisitorDetails = closeVisitorDetails;
    window.showAddNoticeForm = showAddNoticeForm;
    window.closeAddNoticeForm = closeAddNoticeForm;
    window.showResidentDetails = showResidentDetails;
    window.closeResidentDetails = closeResidentDetails;
    window.editResident = editResident;
    window.deleteResident = deleteResident;
    window.saveResidentEdit = saveResidentEdit;
    window.cancelResidentEdit = cancelResidentEdit;
    window.toggleNoticeExpansion = toggleNoticeExpansion;
    window.toggleComplaintExpansion = toggleComplaintExpansion;
    window.toggleComplaintReaction = toggleComplaintReaction;
    window.markComplaintAsReviewed = markComplaintAsReviewed;
    window.deleteComplaint = deleteComplaint;
    window.updateEditResidentFloors = updateEditResidentFloors;
    window.updateEditResidentFlats = updateEditResidentFlats;
    window.loadMyVisitors = loadMyVisitors;
    window.filterMyVisitors = filterMyVisitors;
    window.filterMyVisitorsByStatus = filterMyVisitorsByStatus;
}

// Resident details, edit, and delete functions
async function showResidentDetails(residentId) {
    try {
        const residents = await firebaseHelper.getData(DB_PATHS.RESIDENTS);
        const resident = residents.find(r => r.id === residentId);

        if (!resident) {
            showMessage('Resident details not found', 'error');
            return;
        }

        const modalHTML = `
            <div id="residentDetailsModal" class="modal active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Resident Details</h3>
                        <button class="close-btn" onclick="closeResidentDetails()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="resident-details">
                        <div class="resident-photo-placeholder">
                            <i class="fas fa-user" style="font-size: 48px; color: var(--primary-blue);"></i>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-user"></i> Name</label>
                            <span>${resident.name}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-phone"></i> Mobile Number</label>
                            <span>${resident.phone}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-building"></i> Wing</label>
                            <span>${resident.wing}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-layer-group"></i> Floor</label>
                            <span>${resident.floor}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-home"></i> Flat Number</label>
                            <span>${resident.flat}</span>
                        </div>
                    </div>
                    <div class="resident-actions-modal">
                        ${appState.userType === 'admin' ? `
                            <button class="edit-btn" onclick="editResident('${resident.id}')">
                                <i class="fas fa-edit"></i>
                                Edit Details
                            </button>
                            <button class="delete-btn" onclick="deleteResident('${resident.id}')">
                                <i class="fas fa-trash"></i>
                                Delete Resident
                            </button>
                        ` : ''}
                        <button class="call-btn" onclick="window.location.href='tel:${resident.phone}'">
                            <i class="fas fa-phone"></i>
                            Call Resident
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('residentDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to document
        document.body.insertAdjacentHTML('beforeend', modalHTML);

    } catch (error) {
        console.error('Error loading resident details:', error);
        showMessage('Error loading resident details', 'error');
    }
}

function closeResidentDetails() {
    const modal = document.getElementById('residentDetailsModal');
    if (modal) {
        modal.remove();
    }
}

async function editResident(residentId) {
    if (appState.userType !== 'admin') {
        showMessage('Only admins can edit resident details', 'error');
        return;
    }

    try {
        const residents = await firebaseHelper.getData(DB_PATHS.RESIDENTS);
        const resident = residents.find(r => r.id === residentId);

        if (!resident) {
            showMessage('Resident not found', 'error');
            return;
        }

        const editModalHTML = `
            <div id="editResidentModal" class="modal active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit Resident</h3>
                        <button class="close-btn" onclick="cancelResidentEdit()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="editResidentForm">
                        <div class="form-group">
                            <label for="editResidentName">
                                <i class="fas fa-user"></i>
                                Resident Name
                            </label>
                            <input type="text" id="editResidentName" value="${resident.name}" required>
                        </div>

                        <div class="form-group">
                            <label for="editResidentPhone">
                                <i class="fas fa-phone"></i>
                                Mobile Number
                            </label>
                            <input type="tel" id="editResidentPhone" value="${resident.phone}" required>
                        </div>

                        <div class="form-group">
                            <label for="editResidentWing">
                                <i class="fas fa-building"></i>
                                Wing
                            </label>
                            <select id="editResidentWing" required onchange="updateEditResidentFloors()">
                                <option value="">Select Wing</option>
                                <option value="A" ${resident.wing === 'A' ? 'selected' : ''}>Wing A</option>
                                <option value="B" ${resident.wing === 'B' ? 'selected' : ''}>Wing B</option>
                                <option value="C" ${resident.wing === 'C' ? 'selected' : ''}>Wing C</option>
                                <option value="D" ${resident.wing === 'D' ? 'selected' : ''}>Wing D</option>
                                <option value="E" ${resident.wing === 'E' ? 'selected' : ''}>Wing E</option>
                                <option value="F" ${resident.wing === 'F' ? 'selected' : ''}>Wing F</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="editResidentFloor">
                                <i class="fas fa-layer-group"></i>
                                Floor
                            </label>
                            <select id="editResidentFloor" required onchange="updateEditResidentFlats()">
                                <option value="">Select Floor</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="editResidentFlat">
                                <i class="fas fa-home"></i>
                                Flat Number
                            </label>
                            <select id="editResidentFlat" required>
                                <option value="">Select Flat</option>
                            </select>
                        </div>

                        <div class="modal-actions">
                            <button type="button" class="cancel-btn" onclick="cancelResidentEdit()">Cancel</button>
                            <button type="submit" class="submit-btn">
                                <i class="fas fa-save"></i>
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Remove existing modals
        closeResidentDetails();
        const existingEditModal = document.getElementById('editResidentModal');
        if (existingEditModal) {
            existingEditModal.remove();
        }

        // Add edit modal to document
        document.body.insertAdjacentHTML('beforeend', editModalHTML);

        // Populate floor and flat dropdowns
        setTimeout(() => {
            updateEditResidentFloors();
            setTimeout(() => {
                document.getElementById('editResidentFloor').value = resident.floor;
                updateEditResidentFlats();
                setTimeout(() => {
                    document.getElementById('editResidentFlat').value = resident.flat;
                }, 100);
            }, 100);
        }, 100);

        // Add form submission handler
        document.getElementById('editResidentForm').addEventListener('submit', function(e) {
            e.preventDefault();
            saveResidentEdit(residentId);
        });

    } catch (error) {
        console.error('Error opening edit form:', error);
        showMessage('Error opening edit form', 'error');
    }
}

function updateEditResidentFloors() {
    const wingSelect = document.getElementById('editResidentWing');
    const floorSelect = document.getElementById('editResidentFloor');
    const flatSelect = document.getElementById('editResidentFlat');

    const selectedWing = wingSelect.value;

    // Clear and disable floor and flat selects
    floorSelect.innerHTML = '<option value="">Select Floor</option>';
    flatSelect.innerHTML = '<option value="">Select Flat</option>';
    flatSelect.disabled = true;

    if (selectedWing) {
        floorSelect.disabled = false;

        // Determine number of floors based on wing
        let maxFloors = 4;
        if (selectedWing === 'D' || selectedWing === 'F') {
            maxFloors = 6;
        }

        // Add floor options
        for (let i = 1; i <= maxFloors; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Floor ${i}`;
            floorSelect.appendChild(option);
        }
    } else {
        floorSelect.disabled = true;
    }
}

function updateEditResidentFlats() {
    const wingSelect = document.getElementById('editResidentWing');
    const floorSelect = document.getElementById('editResidentFloor');
    const flatSelect = document.getElementById('editResidentFlat');

    const selectedWing = wingSelect.value;
    const selectedFloor = floorSelect.value;

    // Clear flat select
    flatSelect.innerHTML = '<option value="">Select Flat</option>';

    if (selectedWing && selectedFloor) {
        flatSelect.disabled = false;

        // Generate flat numbers (4 flats per floor)
        for (let i = 1; i <= 4; i++) {
            const flatNumber = `${selectedWing}-${selectedFloor}0${i}`;
            const option = document.createElement('option');
            option.value = flatNumber;
            option.textContent = flatNumber;
            flatSelect.appendChild(option);
        }
    } else {
        flatSelect.disabled = true;
    }
}

async function saveResidentEdit(residentId) {
    try {
        const updatedResident = {
            name: document.getElementById('editResidentName').value,
            phone: document.getElementById('editResidentPhone').value,
            wing: document.getElementById('editResidentWing').value,
            floor: document.getElementById('editResidentFloor').value,
            flat: document.getElementById('editResidentFlat').value
        };

        // Update resident data in Firebase
        await firebaseHelper.updateItem(DB_PATHS.RESIDENTS, residentId, updatedResident);

        showMessage('Resident updated successfully!', 'success');
        cancelResidentEdit();
        loadResidents();

    } catch (error) {
        console.error('Error saving resident:', error);
        showMessage('Error updating resident', 'error');
    }
}

function cancelResidentEdit() {
    const modal = document.getElementById('editResidentModal');
    if (modal) {
        modal.remove();
    }
}

async function deleteResident(residentId) {
    if (appState.userType !== 'admin') {
        showMessage('Only admins can delete residents', 'error');
        return;
    }

    if (confirm('Are you sure you want to delete this resident? This action cannot be undone.')) {
        try {
            // Delete resident from Firebase
            await firebaseHelper.deleteItem(DB_PATHS.RESIDENTS, residentId);

            console.log('Resident deleted:', residentId);
            showMessage('Resident deleted successfully!', 'success');
            closeResidentDetails();

            // Force reload the residents list
            setTimeout(() => {
                loadResidents();
            }, 100);

        } catch (error) {
            console.error('Error deleting resident:', error);
            showMessage('Error deleting resident', 'error');
        }
    }
}

// Admin complaint management functions
async function markComplaintAsReviewed(complaintId) {
    if (appState.userType !== 'admin') {
        showMessage('Only admins can mark complaints as reviewed', 'error');
        return;
    }

    try {
        await firebaseHelper.updateItem(DB_PATHS.COMPLAINTS, complaintId, {
            status: 'reviewed',
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'Admin'
        });

        showMessage('Complaint marked as reviewed!', 'success');
        loadComplaints();
    } catch (error) {
        console.error('Error marking complaint as reviewed:', error);
        showMessage('Error updating complaint status', 'error');
    }
}

async function deleteComplaint(complaintId) {
    if (appState.userType !== 'admin') {
        showMessage('Only admins can delete complaints', 'error');
        return;
    }

    if (confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) {
        try {
            await firebaseHelper.deleteItem(DB_PATHS.COMPLAINTS, complaintId);
            showMessage('Complaint deleted successfully!', 'success');
            loadComplaints();
        } catch (error) {
            console.error('Error deleting complaint:', error);
            showMessage('Error deleting complaint', 'error');
        }
    }
}

// Send SMS notification to resident when visitor arrives
async function sendVisitorNotificationSMS(visitorData) {
    try {
        // Get resident's phone number for the flat
        const residents = await firebaseHelper.getData(DB_PATHS.RESIDENTS);
        const resident = residents.find(r => r.flat === visitorData.flatNumber);

        if (!resident || !resident.phone) {
            showMessage(`Visitor entry saved, but no phone number found for ${visitorData.flatNumber}`, 'warning');
            return;
        }

        // Create SMS message
        const message = `${visitorData.visitorName} came to meet you at ${visitorData.flatNumber}. Purpose: ${visitorData.purpose}. Time: ${new Date().toLocaleTimeString()}`;
        
        // URL encode the message for proper formatting
        const encodedMessage = encodeURIComponent(message);
        
        // Create SMS URL for mobile devices
        const smsUrl = `sms:${resident.phone}?body=${encodedMessage}`;
        
        // Directly open SMS app without confirmation
        try {
            window.open(smsUrl, '_self');
            showMessage(`SMS app opened for ${resident.name} (${resident.phone})`, 'success');
        } catch (error) {
            // Fallback: Copy message to clipboard
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(message);
                showMessage(`SMS app not available. Message copied to clipboard: ${resident.phone}`, 'warning');
            } else {
                // Manual copy fallback
                showMessage(`SMS: ${resident.phone} - Message: ${message}`, 'warning');
            }
        }

    } catch (error) {
        console.error('Error sending SMS notification:', error);
        showMessage('Visitor saved, but SMS notification failed', 'warning');
    }
}

// Auto-create resident contact function
async function autoCreateResidentContact(residentName, flatNumber, mobileNumber) {
    try {
        // Check if resident already exists
        const existingResidents = await firebaseHelper.getData(DB_PATHS.RESIDENTS);
        const existingResident = existingResidents.find(resident => 
            resident.flat === flatNumber || resident.phone === mobileNumber
        );

        if (existingResident) {
            // Resident already exists, don't create duplicate
            console.log('Resident contact already exists:', flatNumber);
            return;
        }

        // Extract wing and floor from flat number (e.g., A-101 -> Wing: A, Floor: 1)
        const wingLetter = flatNumber.charAt(0);
        const floorNumber = flatNumber.charAt(2);

        const newResident = {
            name: residentName,
            phone: mobileNumber,
            wing: wingLetter,
            floor: floorNumber,
            flat: flatNumber,
            autoCreated: true, // Flag to indicate this was auto-created
            createdAt: new Date().toISOString()
        };

        // Add to Firebase
        await firebaseHelper.addItem(DB_PATHS.RESIDENTS, newResident);
        console.log('Auto-created resident contact:', newResident);

    } catch (error) {
        console.error('Error auto-creating resident contact:', error);
        // Don't show error to user as this is a background operation
    }
}

// Data Export and Management Functions
async function exportAllData() {
    try {
        showMessage('Exporting data... Please wait', 'success');

        if (appState.userType === 'admin') {
            // Admin can export all data
            const [visitors, residents, complaints, notices] = await Promise.all([
                firebaseHelper.getData(DB_PATHS.VISITORS),
                firebaseHelper.getData(DB_PATHS.RESIDENTS),
                firebaseHelper.getData(DB_PATHS.COMPLAINTS),
                firebaseHelper.getData(DB_PATHS.NOTICES)
            ]);

            // Format data in simple text format
            let exportText = `EZSOCIETY DATA EXPORT - ADMIN\n`;
            exportText += `=======================================\n`;
            exportText += `Export Date: ${new Date().toLocaleString()}\n`;
            exportText += `Exported By: Admin\n\n`;

            // Statistics
            exportText += `STATISTICS:\n`;
            exportText += `- Total Visitors: ${visitors.length}\n`;
            exportText += `- Total Residents: ${residents.length}\n`;
            exportText += `- Total Complaints: ${complaints.length}\n`;
            exportText += `- Total Notices: ${notices.length}\n\n`;

            // Visitors Data
            exportText += `VISITORS DATA:\n`;
            exportText += `==============\n\n`;
            visitors.forEach((visitor, index) => {
                exportText += `${index + 1}. Name of visitor: ${visitor.visitorName}\n`;
                exportText += `   Purpose: ${visitor.purpose}\n`;
                exportText += `   Phone no.: ${visitor.visitorPhone}\n`;
                exportText += `   Visitor photo: ${visitor.photoURL ? 'Photo captured and included in export' : 'No photo captured'}\n`;
                exportText += `   Visiting: ${visitor.flatNumber}, Wing ${visitor.wing}\n`;
                exportText += `   Date & Time: ${new Date(visitor.timestamp).toLocaleString()}\n\n`;
            });

            // Residents Data
            exportText += `RESIDENTS DATA:\n`;
            exportText += `===============\n\n`;
            residents.forEach((resident, index) => {
                exportText += `${index + 1}. Name: ${resident.name}\n`;
                exportText += `   Phone: ${resident.phone}\n`;
                exportText += `   Flat: ${resident.flat}\n`;
                exportText += `   Wing: ${resident.wing}, Floor: ${resident.floor}\n\n`;
            });

            // Complaints Data
            exportText += `COMPLAINTS DATA:\n`;
            exportText += `================\n\n`;
            complaints.forEach((complaint, index) => {
                exportText += `${index + 1}. Subject: ${complaint.complaintSubject}\n`;
                exportText += `   Type: ${complaint.complaintType}\n`;
                exportText += `   Description: ${complaint.complaintDescription}\n`;
                exportText += `   Status: ${complaint.status}\n`;
                exportText += `   Submitted by: ${complaint.submittedBy}\n`;
                exportText += `   Date: ${new Date(complaint.timestamp).toLocaleString()}\n\n`;
            });

            // Notices Data
            exportText += `NOTICES DATA:\n`;
            exportText += `=============\n\n`;
            notices.forEach((notice, index) => {
                exportText += `${index + 1}. Title: ${notice.title}\n`;
                exportText += `   Type: ${notice.type}\n`;
                exportText += `   Content: ${notice.content}\n`;
                exportText += `   Author: ${notice.author}\n`;
                exportText += `   Date: ${new Date(notice.timestamp).toLocaleString()}\n\n`;
            });

            // Create complete ZIP export with data and photos
            try {
                const photoCount = await createCompleteDataExport(exportText, visitors, 'admin');
                showMessage(`All data exported successfully! ZIP includes data file and ${photoCount} photos.`, 'success');
            } catch (zipError) {
                console.error('ZIP creation failed, falling back to separate downloads:', zipError);
                
                // Fallback: Create text export
                const dataBlob = new Blob([exportText], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(dataBlob);
                link.download = `ezsociety-admin-export-${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Extract and download photos if any exist
                await extractAndDownloadPhotos(visitors, 'admin');
                showMessage('Data exported successfully (separate files due to ZIP error)', 'success');
            }

        } else if (appState.userType === 'resident') {
            // Resident can only export their own data
            const userFlat = appState.userInfo?.flat;
            if (!userFlat) {
                showMessage('Unable to identify your flat. Please login again.', 'error');
                return;
            }

            const [visitors, complaints, notices] = await Promise.all([
                firebaseHelper.getData(DB_PATHS.VISITORS),
                firebaseHelper.getData(DB_PATHS.COMPLAINTS),
                firebaseHelper.getData(DB_PATHS.NOTICES)
            ]);

            // Filter data related to the resident
            const myVisitors = visitors.filter(visitor => visitor.flatNumber === userFlat);
            const myComplaints = complaints.filter(complaint => 
                complaint.submittedBy === userFlat || 
                (complaint.userType === 'resident' && complaint.submittedBy === 'Resident')
            );

            // Format data in simple text format
            let exportText = `EZSOCIETY DATA EXPORT - RESIDENT\n`;
            exportText += `=================================\n`;
            exportText += `Export Date: ${new Date().toLocaleString()}\n`;
            exportText += `Exported By: Resident ${userFlat}\n`;
            exportText += `Flat: ${userFlat}\n\n`;

            // Statistics
            exportText += `MY DATA STATISTICS:\n`;
            exportText += `- My Visitors: ${myVisitors.length}\n`;
            exportText += `- My Complaints: ${myComplaints.length}\n`;
            exportText += `- Society Notices: ${notices.length}\n\n`;

            // My Visitors Data
            exportText += `MY VISITORS DATA:\n`;
            exportText += `=================\n\n`;
            myVisitors.forEach((visitor, index) => {
                exportText += `${index + 1}. Name of visitor: ${visitor.visitorName}\n`;
                exportText += `   Purpose: ${visitor.purpose}\n`;
                exportText += `   Phone no.: ${visitor.visitorPhone}\n`;
                exportText += `   Visitor photo: ${visitor.photoURL ? 'Photo captured and included in export' : 'No photo captured'}\n`;
                exportText += `   Date & Time: ${new Date(visitor.timestamp).toLocaleString()}\n\n`;
            });

            // My Complaints Data
            exportText += `MY COMPLAINTS DATA:\n`;
            exportText += `===================\n\n`;
            myComplaints.forEach((complaint, index) => {
                exportText += `${index + 1}. Subject: ${complaint.complaintSubject}\n`;
                exportText += `   Type: ${complaint.complaintType}\n`;
                exportText += `   Description: ${complaint.complaintDescription}\n`;
                exportText += `   Status: ${complaint.status}\n`;
                exportText += `   Date: ${new Date(complaint.timestamp).toLocaleString()}\n\n`;
            });

            // Society Notices Data
            exportText += `SOCIETY NOTICES:\n`;
            exportText += `================\n\n`;
            notices.forEach((notice, index) => {
                exportText += `${index + 1}. Title: ${notice.title}\n`;
                exportText += `   Type: ${notice.type}\n`;
                exportText += `   Content: ${notice.content}\n`;
                exportText += `   Author: ${notice.author}\n`;
                exportText += `   Date: ${new Date(notice.timestamp).toLocaleString()}\n\n`;
            });

            // Create complete ZIP export with data and photos
            try {
                const photoCount = await createCompleteDataExport(exportText, myVisitors, 'resident', userFlat);
                showMessage(`Your data exported successfully! ZIP includes data file and ${photoCount} photos.`, 'success');
            } catch (zipError) {
                console.error('ZIP creation failed, falling back to separate downloads:', zipError);
                
                // Fallback: Create text export
                const dataBlob = new Blob([exportText], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(dataBlob);
                link.download = `my-data-${userFlat}-${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Extract and download photos if any exist
                await extractAndDownloadPhotos(myVisitors, 'resident', userFlat);
                showMessage('Your data exported successfully (separate files due to ZIP error)', 'success');
            }
        } else {
            showMessage('Please login to export data', 'error');
        }

        // Record export completion for admin users
        if (appState.userType === 'admin') {
            recordManualExport();
        }

    } catch (error) {
        console.error('Error exporting data:', error);
        showMessage('Error exporting data. Please try again.', 'error');
    }
}

async function clearAllData() {
    if (appState.userType !== 'admin') {
        showMessage('Only admins can clear data', 'error');
        return;
    }

    const confirmation = confirm(
        'WARNING: This will permanently delete most data from the database!\n\n' +
        'This includes:\n' +
        '• All visitor records\n' +
        '• All complaints\n' +
        '• All notices\n' +
        '• All notifications\n\n' +
        'NOTE: Resident information will be preserved.\n\n' +
        'Are you sure you want to continue?'
    );

    if (!confirmation) return;

    const finalConfirmation = confirm(
        'FINAL WARNING: This action CANNOT be undone!\n\n' +
        'Click OK to proceed with clearing all data except residents:'
    );

    if (!finalConfirmation) return;

    try {
        showMessage('Clearing data... Please wait', 'success');

        // Clear all data from Firebase except residents
        await Promise.all([
            firebaseHelper.saveData(DB_PATHS.VISITORS, {}),
            firebaseHelper.saveData(DB_PATHS.COMPLAINTS, {}),
            firebaseHelper.saveData(DB_PATHS.NOTICES, {}),
            firebaseHelper.saveData(DB_PATHS.NOTIFICATIONS, {})
        ]);

        showMessage('Data cleared successfully! Residents data has been preserved.', 'success');

        // Refresh current page to show empty state
        if (appState.currentPage === 'visitors') {
            loadVisitorHistory();
        } else if (appState.currentPage === 'complaints') {
            loadComplaints();
        } else if (appState.currentPage === 'notices') {
            loadNotices();
        } else if (appState.currentPage === 'dashboard') {
            loadRecentActivity();
        }
        // Don't refresh residents page since data is preserved

    } catch (error) {
        console.error('Error clearing data:', error);
        showMessage('Error clearing data. Please try again.', 'error');
    }
}

// Only show export reminder for admins after 30 days
function showScheduledDataExportModal() {
    if (appState.userType !== 'admin') return;

    const lastExportData = localStorage.getItem(EXPORT_REMINDER_KEY);
    const currentDate = new Date();
    let daysSinceLastExport = 999; // Default to show reminder on first time

    if (lastExportData) {
        const lastExportDate = new Date(lastExportData);
        const timeDiff = currentDate.getTime() - lastExportDate.getTime();
        daysSinceLastExport = Math.floor(timeDiff / (1000 * 3600 * 24));
    }

    // Only show if it's been 30+ days
    if (daysSinceLastExport >= EXPORT_INTERVAL_DAYS) {
        showDataManagementModal();
    }
}

function showDataManagementModal() {
    if (!appState.isLoggedIn) {
        showMessage('Please login to access data management', 'error');
        return;
    }

    const lastExportData = localStorage.getItem(EXPORT_REMINDER_KEY);
    const currentDate = new Date();
    let daysSinceLastExport = 999;

    if (lastExportData) {
        const lastExportDate = new Date(lastExportData);
        const timeDiff = currentDate.getTime() - lastExportDate.getTime();
        daysSinceLastExport = Math.floor(timeDiff / (1000 * 3600 * 24));
    }

    let modalHTML = '';

    if (appState.userType === 'admin') {
        // Enhanced admin export modal with better design
        modalHTML = `
            <div id="dataManagementModal" class="modal active">
                <div class="modal-content export-modal">
                    <div class="modal-header export-header">
                        <div class="export-header-content">
                            <div class="export-icon">
                                <i class="fas fa-database"></i>
                            </div>
                            <div>
                                <h3>Monthly Data Export</h3>
                                <p class="export-subtitle">Recommended every 30 days for optimal performance</p>
                            </div>
                        </div>
                        <button class="close-btn" onclick="closeDataManagementModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="data-management-content">
                        <div class="export-status-card">
                            <div class="status-icon ${daysSinceLastExport >= EXPORT_INTERVAL_DAYS ? 'overdue' : 'upcoming'}">
                                <i class="fas ${daysSinceLastExport >= EXPORT_INTERVAL_DAYS ? 'fa-exclamation-triangle' : 'fa-clock'}"></i>
                            </div>
                            <div class="status-info">
                                <h4>${daysSinceLastExport >= EXPORT_INTERVAL_DAYS ? 'Export Overdue' : 'Export Status'}</h4>
                                <p>${daysSinceLastExport >= EXPORT_INTERVAL_DAYS ? 
                                    `It's been ${daysSinceLastExport} days since your last export.` : 
                                    `Last export was ${daysSinceLastExport} days ago.`}</p>
                            </div>
                        </div>

                        <div class="management-section featured">
                            <div class="section-icon export">
                                <i class="fas fa-download"></i>
                            </div>
                            <h4>Export All Data</h4>
                            <p>Download a complete backup including all visitors, residents, complaints, and notices with photos.</p>
                            <div class="benefits-list">
                                <div class="benefit-item">
                                    <i class="fas fa-shield-alt"></i>
                                    <span>Secure backup & data protection</span>
                                </div>
                                <div class="benefit-item">
                                    <i class="fas fa-tachometer-alt"></i>
                                    <span>Improved app performance</span>
                                </div>
                                <div class="benefit-item">
                                    <i class="fas fa-file-archive"></i>
                                    <span>Complete ZIP archive with photos</span>
                                </div>
                            </div>
                            <button class="management-btn export-btn primary" onclick="exportAllData()">
                                <i class="fas fa-download"></i>
                                Export Data Now
                            </button>
                        </div>

                        <div class="management-section">
                            <div class="section-icon info">
                                <i class="fas fa-chart-bar"></i>
                            </div>
                            <h4>Data Overview</h4>
                            <div id="dataStats" class="data-stats">
                                <div class="loading-state">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <p>Loading statistics...</p>
                                </div>
                            </div>
                        </div>

                        <div class="management-section danger">
                            <div class="section-icon clear">
                                <i class="fas fa-trash-alt"></i>
                            </div>
                            <h4>Clear All Data</h4>
                            <p class="warning-text">⚠️ <strong>Danger Zone:</strong> This will permanently delete ALL data from the database. Export data first!</p>
                            <button class="management-btn clear-btn" onclick="clearAllData()">
                                <i class="fas fa-trash-alt"></i>
                                Clear All Data
                            </button>
                        </div>
                    </div>
                    <div class="export-footer">
                        <div class="footer-actions">
                            <button class="secondary-btn" onclick="remindLater()">
                                <i class="fas fa-bell"></i>
                                Remind in 7 days
                            </button>
                            <button class="secondary-btn" onclick="dismissReminder()">
                                <i class="fas fa-times"></i>
                                Dismiss for 30 days
                            </button>
                        </div>
                        <p class="footer-note">
                            <i class="fas fa-info-circle"></i>
                            Regular exports help maintain optimal performance and data security
                        </p>
                    </div>
                </div>
            </div>
        `;
    } else if (appState.userType === 'resident') {
        // Resident gets limited access - only export their own data
        modalHTML = `
            <div id="dataManagementModal" class="modal active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>My Data Export - ${appState.userInfo?.flat}</h3>
                        <button class="close-btn" onclick="closeDataManagementModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="data-management-content">
                        <div class="management-section">
                            <div class="section-icon export">
                                <i class="fas fa-download"></i>
                            </div>
                            <h4>Export My Data</h4>
                            <p>Download your personal data including visitors who came to meet you, complaints you submitted, and all society notices.</p>
                            <button class="management-btn export-btn" onclick="exportAllData()">
                                <i class="fas fa-download"></i>
                                Export My Data
                            </button>
                        </div>

                        <div class="management-section">
                            <div class="section-icon info">
                                <i class="fas fa-info-circle"></i>
                            </div>
                            <h4>My Data Overview</h4>
                            <div id="dataStats" class="data-stats">
                                <div class="loading-state">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <p>Loading your data statistics...</p>
                                </div>
                            </div>
                        </div>

                        <div class="management-section">
                            <div class="section-icon">
                                <i class="fas fa-shield-alt" style="color: #4CAF50;"></i>
                            </div>
                            <h4>Data Privacy</h4>
                            <p>Your exported data includes only information related to you. Admin data and other residents' private information are not included for privacy protection.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Remove existing modal if any
    const existingModal = document.getElementById('dataManagementModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Load data statistics
    loadDataStatistics();
}

function closeDataManagementModal() {
    const modal = document.getElementById('dataManagementModal');
    if (modal) {
        modal.remove();
    }
}

async function loadDataStatistics() {
    const statsContainer = document.getElementById('dataStats');
    if (!statsContainer) return;

    try {
        if (appState.userType === 'admin') {
            // Admin gets all data counts
            const [visitors, residents, complaints, notices] = await Promise.all([
                firebaseHelper.getData(DB_PATHS.VISITORS),
                firebaseHelper.getData(DB_PATHS.RESIDENTS),
                firebaseHelper.getData(DB_PATHS.COMPLAINTS),
                firebaseHelper.getData(DB_PATHS.NOTICES)
            ]);

            const statsHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number">${visitors.length}</div>
                        <div class="stat-label">Visitors</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${residents.length}</div>
                        <div class="stat-label">Residents</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${complaints.length}</div>
                        <div class="stat-label">Complaints</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${notices.length}</div>
                        <div class="stat-label">Notices</div>
                    </div>
                </div>
                <div class="total-records">
                    <strong>Total Records: ${visitors.length + residents.length + complaints.length + notices.length}</strong>
                </div>
            `;

            statsContainer.innerHTML = statsHTML;

        } else if (appState.userType === 'resident') {
            // Resident gets only their data counts
            const userFlat = appState.userInfo?.flat;
            const [visitors, complaints, notices] = await Promise.all([
                firebaseHelper.getData(DB_PATHS.VISITORS),
                firebaseHelper.getData(DB_PATHS.COMPLAINTS),
                firebaseHelper.getData(DB_PATHS.NOTICES)
            ]);

            const myVisitors = visitors.filter(visitor => visitor.flatNumber === userFlat);
            const myComplaints = complaints.filter(complaint => 
                complaint.submittedBy === userFlat || 
                (complaint.userType === 'resident' && complaint.submittedBy === 'Resident')
            );

            const statsHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number">${myVisitors.length}</div>
                        <div class="stat-label">My Visitors</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${myComplaints.length}</div>
                        <div class="stat-label">My Complaints</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${notices.length}</div>
                        <div class="stat-label">Society Notices</div>
                    </div>
                </div>
                <div class="total-records">
                    <strong>My Records: ${myVisitors.length + myComplaints.length + notices.length}</strong>
                </div>
            `;

            statsContainer.innerHTML = statsHTML;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        statsContainer.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading statistics</p>
            </div>
        `;
    }
}

// Create complete data export as ZIP file
async function createCompleteDataExport(exportText, visitors, userType, userFlat = null) {
    try {
        // Use CDN JSZip since import might fail
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        document.head.appendChild(script);

        return new Promise((resolve, reject) => {
            script.onload = async () => {
                try {
                    const zip = new JSZip();

                    // Add main data file
                    const timestamp = new Date().toISOString().split('T')[0];
                    const dataFileName = userType === 'admin' ? 
                        `ezsociety-data-export-${timestamp}.txt` : 
                        `my-data-export-${userFlat}-${timestamp}.txt`;
                    
                    zip.file(dataFileName, exportText);

                    // Add photos if any exist
                    const visitorsWithPhotos = visitors.filter(visitor => 
                        visitor.photoURL && visitor.photoURL.startsWith('data:image/')
                    );

                    if (visitorsWithPhotos.length > 0) {
                        const photosFolder = zip.folder('visitor-photos');
                        
                        visitorsWithPhotos.forEach((visitor, index) => {
                            try {
                                // Extract base64 data from data URL
                                const base64Data = visitor.photoURL.split(',')[1];
                                const mimeType = visitor.photoURL.split(';')[0].split(':')[1];
                                const extension = mimeType.split('/')[1] || 'jpg';
                                
                                // Create filename with visitor details
                                const safeVisitorName = visitor.visitorName.replace(/[^a-zA-Z0-9]/g, '_');
                                const dateStr = new Date(visitor.timestamp).toISOString().split('T')[0];
                                const filename = `${index + 1}_${safeVisitorName}_${visitor.flatNumber}_${dateStr}.${extension}`;
                                
                                // Add photo to photos folder in ZIP
                                photosFolder.file(filename, base64Data, { base64: true });
                            } catch (photoError) {
                                console.error('Error processing photo for visitor:', visitor.visitorName, photoError);
                            }
                        });

                        
                    }

                    // Generate ZIP file and download
                    const content = await zip.generateAsync({ 
                        type: 'blob',
                        compression: 'DEFLATE',
                        compressionOptions: { level: 6 }
                    });
                    
                    const zipLink = document.createElement('a');
                    zipLink.href = URL.createObjectURL(content);
                    
                    if (userType === 'admin') {
                        zipLink.download = `ezsociety-complete-export-${timestamp}.zip`;
                    } else {
                        zipLink.download = `my-complete-data-${userFlat}-${timestamp}.zip`;
                    }
                    
                    document.body.appendChild(zipLink);
                    zipLink.click();
                    document.body.removeChild(zipLink);

                    // Clean up
                    setTimeout(() => URL.revokeObjectURL(zipLink.href), 100);
                    document.head.removeChild(script);

                    resolve(visitorsWithPhotos.length);
                } catch (error) {
                    console.error('Error creating ZIP file:', error);
                    document.head.removeChild(script);
                    reject(error);
                }
            };

            script.onerror = () => {
                document.head.removeChild(script);
                reject(new Error('Failed to load JSZip library'));
            };
        });
    } catch (error) {
        console.error('Error setting up ZIP creation:', error);
        throw error;
    }
}

// Photo extraction function (fallback)
async function extractAndDownloadPhotos(visitors, userType, userFlat = null) {
    const visitorsWithPhotos = visitors.filter(visitor => visitor.photoURL && visitor.photoURL.startsWith('data:image/'));
    
    if (visitorsWithPhotos.length === 0) {
        console.log('No photos to extract');
        return;
    }

    // This is now a fallback - the main function creates a complete ZIP
    await downloadPhotosIndividually(visitorsWithPhotos, userType, userFlat);
}

// Fallback function to download photos individually
async function downloadPhotosIndividually(visitors, userType, userFlat = null) {
    for (let i = 0; i < visitors.length; i++) {
        const visitor = visitors[i];
        if (!visitor.photoURL || !visitor.photoURL.startsWith('data:image/')) continue;

        try {
            // Extract photo data
            const mimeType = visitor.photoURL.split(';')[0].split(':')[1];
            const extension = mimeType.split('/')[1] || 'jpg';
            
            // Create filename
            const safeVisitorName = visitor.visitorName.replace(/[^a-zA-Z0-9]/g, '_');
            const dateStr = new Date(visitor.timestamp).toISOString().split('T')[0];
            const filename = `${i + 1}_${safeVisitorName}_${visitor.flatNumber}_${dateStr}.${extension}`;
            
            // Convert data URL to blob
            const response = await fetch(visitor.photoURL);
            const blob = await response.blob();
            
            // Download
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Add small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error('Error downloading photo for visitor:', visitor.visitorName, error);
        }
    }
}

// Expose admin functions to global scope
window.markComplaintAsReviewed = markComplaintAsReviewed;
window.deleteComplaint = deleteComplaint;
window.exportAllData = exportAllData;
window.clearAllData = clearAllData;
window.showDataManagementModal = showDataManagementModal;
window.showScheduledDataExportModal = showScheduledDataExportModal;
window.closeDataManagementModal = closeDataManagementModal;
window.loadDataStatistics = loadDataStatistics;
window.extractAndDownloadPhotos = extractAndDownloadPhotos;
window.refreshCurrentPage = refreshCurrentPage;
window.checkExportReminder = checkExportReminder;
window.closeExportReminderModal = closeExportReminderModal;
window.remindLater = remindLater;
window.dismissReminder = dismissReminder;
window.dismissExportWarning = dismissExportWarning;

// Delete visitor function (admin only)
async function deleteVisitor(visitorId) {
    if (appState.userType !== 'admin') {
        showMessage('Only admins can delete visitor entries', 'error');
        return;
    }

    if (confirm('Are you sure you want to delete this visitor entry? This action cannot be undone.')) {
        try {
            // Delete visitor from Firebase
            await firebaseHelper.deleteItem(DB_PATHS.VISITORS, visitorId);

            console.log('Visitor deleted:', visitorId);
            showMessage('Visitor entry deleted successfully!', 'success');
            
            // Close visitor details modal if open
            closeVisitorDetails();

            // Refresh visitor list if on visitors page
            if (appState.currentPage === 'visitors') {
                loadVisitorHistory();
            }

            // Refresh recent activity on dashboard
            loadRecentActivity();

        } catch (error) {
            console.error('Error deleting visitor:', error);
            showMessage('Error deleting visitor entry', 'error');
        }
    }
}

// Expose logout modal functions to global scope
window.closeLogoutConfirmModal = closeLogoutConfirmModal;
window.confirmLogout = confirmLogout;

// Expose SMS notification function to global scope
window.sendVisitorNotificationSMS = sendVisitorNotificationSMS;

// Delete notice function (admin only)
async function deleteNotice(noticeId) {
    if (appState.userType !== 'admin') {
        showMessage('Only admins can delete notices', 'error');
        return;
    }

    if (confirm('Are you sure you want to delete this notice? This action cannot be undone.')) {
        try {
            // Delete notice from Firebase
            await firebaseHelper.deleteItem(DB_PATHS.NOTICES, noticeId);

            console.log('Notice deleted:', noticeId);
            showMessage('Notice deleted successfully!', 'success');
            
            // Refresh notices list
            loadNotices();

            // Refresh recent activity on dashboard
            loadRecentActivity();

        } catch (error) {
            console.error('Error deleting notice:', error);
            showMessage('Error deleting notice', 'error');
        }
    }
}

// Expose delete functions to global scope
window.deleteVisitor = deleteVisitor;
window.deleteNotice = deleteNotice;

// Expose edit functions to global scope
window.updateEditResidentFloors = updateEditResidentFloors;
window.updateEditResidentFlats = updateEditResidentFlats;

// Load recent activity data
async function loadRecentActivity() {
    const activityList = document.querySelector('.activity-list');
    if (!activityList) return;

    try {
        // Get recent visitors, complaints, and notices
        const visitors = await firebaseHelper.getData(DB_PATHS.VISITORS);
        const complaints = await firebaseHelper.getData(DB_PATHS.COMPLAINTS);
        const notices = await firebaseHelper.getData(DB_PATHS.NOTICES);

    // Get current time and 24 hours ago timestamp
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Filter out activities older than 24 hours and combine
    const allActivities = [
        ...visitors
            .filter(visitor => new Date(visitor.timestamp) > twentyFourHoursAgo)
            .map(visitor => ({
                type: 'visitor',
                title: 'Visitor Entry',
                description: `${visitor.visitorName} visited ${visitor.flatNumber}`,
                timestamp: new Date(visitor.timestamp),
                icon: 'fas fa-user-check'
            })),
        ...complaints
            .filter(complaint => new Date(complaint.timestamp) > twentyFourHoursAgo)
            .map(complaint => ({
                type: 'complaint',
                title: 'New Complaint',
                description: complaint.complaintSubject,
                timestamp: new Date(complaint.timestamp),
                icon: 'fas fa-exclamation-triangle'
            })),
        ...notices
            .filter(notice => new Date(notice.timestamp) > twentyFourHoursAgo)
            .map(notice => ({
                type: 'notice',
                title: 'New Notice',
                description: notice.title,
                timestamp: new Date(notice.timestamp),
                icon: 'fas fa-bullhorn'
            }))
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5); // Show only last 5 activities

    if (allActivities.length === 0) {
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="activity-content">
                    <h5>No Recent Activity</h5>
                    <p>Start using the app to see recent activities here</p>
                    <span class="activity-time">-</span>
                </div>
            </div>
        `;
        return;
    }

    const activitiesHTML = allActivities.map(activity => {
        const timeAgo = getTimeAgo(activity.timestamp);
        return `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <h5>${activity.title}</h5>
                    <p>${activity.description}</p>
                    <span class="activity-time">${timeAgo}</span>
                </div>
            </div>
        `;
    }).join('');

    activityList.innerHTML = activitiesHTML;
    } catch (error) {
        console.error('Error loading recent activity:', error);
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="activity-content">
                    <h5>Error Loading Activity</h5>
                    <p>Please check your connection and try again</p>
                    <span class="activity-time">-</span>
                </div>
            </div>
        `;
    }
}

// Login functionality
function showAdminLogin() {
    const modal = document.getElementById('adminLoginModal');
    modal.classList.add('active');
}

function showGuardLogin() {
    const modal = document.getElementById('guardLoginModal');
    modal.classList.add('active');
}

function showResidentLogin() {
    const modal = document.getElementById('residentLoginModal');
    modal.classList.add('active');
}

function closeLoginModal() {
    const adminModal = document.getElementById('adminLoginModal');
    const guardModal = document.getElementById('guardLoginModal');
    const residentModal = document.getElementById('residentLoginModal');
    adminModal.classList.remove('active');
    guardModal.classList.remove('active');
    residentModal.classList.remove('active');
}

function checkSession() {
    const sessionData = localStorage.getItem('ezSociety_session');
    if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.isLoggedIn && session.userType) {
            appState.isLoggedIn = true;
            appState.userType = session.userType;
            appState.userInfo = session.userInfo;
            
            // Restore the last page the user was on, or default to dashboard
            const lastPage = session.currentPage || 'dashboard';
            showPage(lastPage);
            updateUIForUserType();
            return true;
        }
    }
    return false;
}

function saveSession(userType, userInfo) {
    const sessionData = {
        isLoggedIn: true,
        userType: userType,
        userInfo: userInfo,
        currentPage: appState.currentPage || 'dashboard',
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('ezSociety_session', JSON.stringify(sessionData));
    appState.isLoggedIn = true;
    appState.userType = userType;
    appState.userInfo = userInfo;
    
    // Set notification check time to current time to avoid old notifications
    lastNotificationCheck = Date.now();
    
    // Enable real-time notifications with delay to ensure UI is ready
    setTimeout(() => {
        setupRealtimeNotifications();
        startNotificationCleanup();
    }, 1000);
}

function logout() {
    // Show confirmation modal instead of logging out directly
    const modal = document.getElementById('logoutConfirmModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeLogoutConfirmModal() {
    const modal = document.getElementById('logoutConfirmModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function confirmLogout() {
    // Close the modal first
    closeLogoutConfirmModal();
    
    // Cleanup real-time listeners first
    cleanupNotificationListeners();
    
    // Reset notification check time
    lastNotificationCheck = Date.now();
    
    // Hide notification badge
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        badge.style.display = 'none';
    }
    
    // Clear notifications data
    allNotifications = [];
    
    localStorage.removeItem('ezSociety_session');
    appState.isLoggedIn = false;
    appState.userType = null;
    appState.userInfo = null;
    showPage('login');
    showMessage('Logged out successfully!', 'success');
    
    console.log('User logged out and all Firebase listeners cleaned up');
}

function updateUIForUserType() {
    const headerTitle = document.querySelector('.header h1');
    const welcomeSection = document.querySelector('.welcome-section h2');
    const logoutBtn = document.querySelector('.logout-btn');
    const bottomNav = document.querySelector('.bottom-nav');
    const headerThemeToggle = document.querySelector('.theme-toggle-btn');
    const footerThemeToggle = document.querySelector('.footer-theme-toggle-btn');

    if (appState.isLoggedIn) {
        // Show logout button and bottom navigation
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (bottomNav) bottomNav.style.display = 'flex';
        
        // Hide header and footer theme toggles when logged in (welcome toggle is now shown)
        if (headerThemeToggle) headerThemeToggle.style.display = 'none';
        if (footerThemeToggle) footerThemeToggle.style.display = 'none';

        if (appState.userType === 'admin') {
            headerTitle.innerHTML = '<img src="attached_assets/logo.png" alt="EzSociety Logo" class="app-logo-img"> EzSociety - Admin';
            if (welcomeSection) {
                welcomeSection.textContent = 'Welcome Admin!';
            }
            
            // Show all features for admin
            showAllFeatures();
            
            // Check for 30-day export reminder
            setTimeout(checkExportReminder, 2000);
        } else if (appState.userType === 'guard') {
            headerTitle.innerHTML = '<img src="attached_assets/logo.png" alt="EzSociety Logo" class="app-logo-img"> EzSociety - Security';
            if (welcomeSection) {
                welcomeSection.textContent = `Welcome ${appState.userInfo.guardId}!`;
            }
            
            // Show guard-specific features
            showGuardFeatures();
        } else if (appState.userType === 'resident') {
            headerTitle.innerHTML = '<img src="attached_assets/logo.png" alt="EzSociety Logo" class="app-logo-img"> EzSociety';
            if (welcomeSection) {
                welcomeSection.textContent = `Welcome ${appState.userInfo.flat}!`;
            }
            
            // Hide admin-only features and show only resident features
            hideAdminFeatures();
            showResidentFeatures();
        }
    } else {
        // Hide logout button and bottom navigation
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'none';
        // Show theme toggle in header for login page
        if (headerThemeToggle) headerThemeToggle.style.display = 'flex';
        if (footerThemeToggle) footerThemeToggle.style.display = 'none';
        headerTitle.innerHTML = '<img src="attached_assets/logo.png" alt="EzSociety Logo" class="app-logo-img"> EzSociety';
    }
}

// Check if admin should be reminded about 30-day export
function checkExportReminder() {
    if (appState.userType !== 'admin') return;

    const lastExportData = localStorage.getItem(EXPORT_REMINDER_KEY);
    const currentDate = new Date();
    let daysSinceLastExport = 999; // Default to show reminder on first time

    if (lastExportData) {
        const lastExportDate = new Date(lastExportData);
        const timeDiff = currentDate.getTime() - lastExportDate.getTime();
        daysSinceLastExport = Math.floor(timeDiff / (1000 * 3600 * 24));
    }

    // Only show reminder exactly at 30 days or more, no advance warnings
    if (daysSinceLastExport >= EXPORT_INTERVAL_DAYS) {
        showExportReminderModal(daysSinceLastExport);
    }
}

// Show export reminder modal (non-blocking) - now calls the improved data management modal
function showExportReminderModal(daysSinceLastExport) {
    // Just show the enhanced data management modal directly
    showDataManagementModal();
}

// Show warning before recommended export time
function showExportWarning(daysRemaining) {
    const warningBanner = document.getElementById('exportWarningBanner');
    if (warningBanner) return; // Don't show multiple warnings

    const bannerHTML = `
        <div id="exportWarningBanner" class="export-warning-banner">
            <div class="warning-content">
                <i class="fas fa-clock"></i>
                <span>
                    <strong>Reminder:</strong> Regular data export recommended in ${daysRemaining} days
                </span>
                <button class="warning-action-btn" onclick="showDataManagementModal()">
                    Export Now
                </button>
                <button class="close-warning-btn" onclick="dismissExportWarning()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;

    // Add banner to the top of the current page
    const currentPage = document.querySelector('.page.active');
    if (currentPage) {
        currentPage.insertAdjacentHTML('afterbegin', bannerHTML);
    }
}

// Dismiss export warning banner
function dismissExportWarning() {
    const banner = document.getElementById('exportWarningBanner');
    if (banner) {
        banner.remove();
    }
}

// Close export reminder modal
function closeExportReminderModal() {
    const modal = document.getElementById('exportReminderModal');
    if (modal) {
        modal.remove();
    }
}

// Remind later - snooze for 7 days
function remindLater() {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() - 23); // Set as if export was done 23 days ago (will remind in 7 days)
    localStorage.setItem(EXPORT_REMINDER_KEY, snoozeDate.toISOString());
    
    closeExportReminderModal();
    showMessage('Export reminder snoozed for 7 days', 'success');
}

// Dismiss reminder - snooze for 30 days
function dismissReminder() {
    const dismissDate = new Date();
    localStorage.setItem(EXPORT_REMINDER_KEY, dismissDate.toISOString());
    
    closeExportReminderModal();
    showMessage('Export reminder dismissed for 30 days', 'success');
}

// Update export tracking when admin manually exports
function recordManualExport() {
    if (appState.userType === 'admin') {
        localStorage.setItem(EXPORT_REMINDER_KEY, new Date().toISOString());
        console.log('Manual export recorded');
    }
}

function showAllFeatures() {
    // Show all dashboard cards except My Visitors (which is for residents only)
    const dashboardCards = document.querySelectorAll('.action-card');
    dashboardCards.forEach(card => {
        card.style.display = 'block';
    });

    // Hide My Visitors card for admins
    const myVisitorsCard = document.querySelector('.action-card[onclick="showPage(\'myVisitors\')"]');
    if (myVisitorsCard) {
        myVisitorsCard.style.display = 'none';
    }

    // Show data management card for admins only
    const dataManagementCard = document.querySelector('.action-card[onclick="showDataManagementModal()"]');
    if (dataManagementCard) {
        dataManagementCard.style.display = 'block';
    }

    // Show all navigation items except My Visitors
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.style.display = 'flex';
    });

    // Hide My Visitors nav item for admins
    const myVisitorsNavItem = document.querySelector('.nav-item[data-page="myVisitors"]');
    if (myVisitorsNavItem) {
        myVisitorsNavItem.style.display = 'none';
    }

    // Show admin buttons
    const addButtons = document.querySelectorAll('.add-resident-btn, .add-visitor-btn, .add-notice-btn');
    addButtons.forEach(btn => {
        if (btn) btn.style.display = 'block';
    });

    // Configure complaints page for admin - only show complaints management tab
    const complaintsPage = document.getElementById('complaints');
    if (complaintsPage) {
        const tabButtons = complaintsPage.querySelector('.tab-buttons');
        if (tabButtons) {
            tabButtons.innerHTML = `
                <button class="tab-btn active" onclick="switchTab('all-complaints')">Manage Complaints</button>
            `;
        }

        // Hide the new complaint form for admins
        const newComplaintTab = document.getElementById('new-complaint');
        if (newComplaintTab) {
            newComplaintTab.style.display = 'none';
        }

        // Ensure all complaints tab is visible
        const allComplaintsTab = document.getElementById('my-complaints');
        if (allComplaintsTab) {
            allComplaintsTab.id = 'all-complaints';
            allComplaintsTab.style.display = 'block';
        }
    }
}

function showGuardFeatures() {
    // Show specific dashboard cards for guards
    const dashboardCards = document.querySelectorAll('.action-card');
    dashboardCards.forEach(card => {
        card.style.display = 'none'; // Hide all first
    });

    // Show only relevant cards for guards
    const visitorsCard = document.querySelector('.action-card[onclick="showPage(\'visitors\')"]');
    const noticesCard = document.querySelector('.action-card[onclick="showPage(\'notices\')"]');
    const complaintsCard = document.querySelector('.action-card[onclick="showPage(\'complaints\')"]');
    const residentsCard = document.querySelector('.action-card[onclick="showPage(\'residents\')"]');

    if (visitorsCard) visitorsCard.style.display = 'block';
    if (noticesCard) noticesCard.style.display = 'block';
    if (complaintsCard) complaintsCard.style.display = 'block';
    if (residentsCard) residentsCard.style.display = 'block';

    // Hide data management card for guards (no export/delete permissions)
    const dataManagementCard = document.querySelector('.action-card[onclick="showDataManagementModal()"]');
    if (dataManagementCard) {
        dataManagementCard.style.display = 'none';
    }

    // Show navigation items for guards
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.style.display = 'none'; // Hide all first
    });

    // Show only relevant nav items for guards
    const homeNav = document.querySelector('.nav-item[data-page="dashboard"]');
    const visitorsNav = document.querySelector('.nav-item[onclick="showAddVisitorForm()"]'); // Add visitor button
    const noticesNav = document.querySelector('.nav-item[data-page="notices"]');
    const complaintsNav = document.querySelector('.nav-item[data-page="complaints"]');
    const residentsNav = document.querySelector('.nav-item[data-page="residents"]');

    if (homeNav) homeNav.style.display = 'flex';
    if (visitorsNav) visitorsNav.style.display = 'flex';
    if (noticesNav) noticesNav.style.display = 'flex';
    if (complaintsNav) complaintsNav.style.display = 'flex';
    if (residentsNav) residentsNav.style.display = 'flex';

    // Show add visitor button but hide other add buttons
    const addVisitorBtn = document.querySelector('.add-visitor-btn');
    if (addVisitorBtn) addVisitorBtn.style.display = 'block';

    // Hide add resident and add notice buttons for guards
    const addResidentBtn = document.querySelector('.add-resident-btn');
    const addNoticeBtn = document.querySelector('.add-notice-btn');
    if (addResidentBtn) addResidentBtn.style.display = 'none';
    if (addNoticeBtn) addNoticeBtn.style.display = 'none';

    // Configure complaints page for guards - only show viewing tab, no form
    const complaintsPage = document.getElementById('complaints');
    if (complaintsPage) {
        const tabButtons = complaintsPage.querySelector('.tab-buttons');
        if (tabButtons) {
            tabButtons.innerHTML = `
                <button class="tab-btn active" onclick="switchTab('all-complaints')">View All Complaints</button>
            `;
        }

        // Hide new complaint tab for guards
        const newComplaintTab = document.getElementById('new-complaint');
        if (newComplaintTab) {
            newComplaintTab.style.display = 'none';
        }

        // Ensure all complaints tab is visible and properly configured
        const allComplaintsTab = document.getElementById('my-complaints');
        if (allComplaintsTab) {
            allComplaintsTab.id = 'all-complaints';
            allComplaintsTab.style.display = 'block';
        }
    }
}

function hideAdminFeatures() {
    // Hide residents management card from dashboard
    const residentsCard = document.querySelector('.action-card[onclick="showPage(\'residents\')"]');
    if (residentsCard) {
        residentsCard.style.display = 'none';
    }

    // Hide residents nav item
    const residentsNavItem = document.querySelector('.nav-item[data-page="residents"]');
    if (residentsNavItem) {
        residentsNavItem.style.display = 'none';
    }

    // Hide add visitor button and nav item
    const addVisitorBtn = document.querySelector('.add-visitor-btn');
    const addVisitorNavItem = document.querySelector('.nav-item[data-page="visitors"]');
    if (addVisitorBtn) addVisitorBtn.style.display = 'none';
    if (addVisitorNavItem) addVisitorNavItem.style.display = 'none';

    // Hide add notice button
    const addNoticeBtn = document.querySelector('.add-notice-btn');
    if (addNoticeBtn) addNoticeBtn.style.display = 'none';

    // Hide visitors card from dashboard
    const visitorsCard = document.querySelector('.action-card[onclick="showPage(\'visitors\')"]');
    if (visitorsCard) {
        visitorsCard.style.display = 'none';
    }
}

function showResidentFeatures() {
    // Update complaints page for residents - show both tabs
    const complaintsPage = document.getElementById('complaints');
    if (complaintsPage) {
        // Ensure both tabs are visible for residents
        const tabButtons = complaintsPage.querySelector('.tab-buttons');
        if (tabButtons) {
            tabButtons.innerHTML = `
                <button class="tab-btn active" onclick="switchTab('new-complaint')">New Complaint</button>
                <button class="tab-btn" onclick="switchTab('all-complaints')">All Complaints</button>
            `;
        }

        // Update all complaints tab content
        const myComplaintsContent = document.getElementById('my-complaints');
        if (myComplaintsContent) {
            myComplaintsContent.id = 'all-complaints';
            myComplaintsContent.innerHTML = `
                <div id="complaintsListContainer">
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h4>No Complaints Yet</h4>
                        <p>Society complaints will appear here once submitted by residents.</p>
                    </div>
                </div>
            `;
        }
    }

    // Update notices card text for residents
    const noticesCard = document.querySelector('.action-card[onclick="showPage(\'notices\')"]');
    if (noticesCard) {
        const noticesCardContent = noticesCard.querySelector('p');
        if (noticesCardContent) {
            noticesCardContent.textContent = 'View society notices';
        }
    }

    // Show My Visitors card for residents
    const myVisitorsCard = document.querySelector('.action-card[onclick="showPage(\'myVisitors\')"]');
    if (myVisitorsCard) {
        myVisitorsCard.style.display = 'block';
    }

    // Show navigation items for residents (Home, Notices, Complaints, My Visitors)
    const homeNav = document.querySelector('.nav-item[data-page="dashboard"]');
    const noticesNav = document.querySelector('.nav-item[data-page="notices"]');
    const complaintsNav = document.querySelector('.nav-item[data-page="complaints"]');
    const myVisitorsNav = document.querySelector('.nav-item[data-page="myVisitors"]');

    // Hide all nav items first
    const allNavItems = document.querySelectorAll('.nav-item');
    allNavItems.forEach(item => {
        item.style.display = 'none';
    });

    // Show only resident nav items
    if (homeNav) homeNav.style.display = 'flex';
    if (noticesNav) noticesNav.style.display = 'flex';
    if (complaintsNav) complaintsNav.style.display = 'flex';
    if (myVisitorsNav) myVisitorsNav.style.display = 'flex';
}

// Add login form event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Admin login form
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const username = document.getElementById('adminUsername').value;
            const password = document.getElementById('adminPassword').value;

            // Demo credentials check
            if (username === 'admin' && password === 'admin123') {
                const adminInfo = {
                    username: username,
                    role: 'admin',
                    loginTime: new Date().toISOString()
                };

                saveSession('admin', adminInfo);
                closeLoginModal();
                showPage('dashboard');
                updateUIForUserType();
                showMessage('Admin login successful!', 'success');
            } else {
                showMessage('Invalid admin credentials! Use: admin / admin123', 'error');
            }
        });
    }

    // Guard login form
    const guardLoginForm = document.getElementById('guardLoginForm');
    if (guardLoginForm) {
        guardLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const guardId = document.getElementById('guardUsername').value;
            const password = document.getElementById('guardPassword').value;

            // Demo guard credentials
            const guardCredentials = {
                'guard001': 'security123',
                'guard002': 'safety456'
            };

            if (guardCredentials[guardId] && guardCredentials[guardId] === password) {
                const guardInfo = {
                    guardId: guardId,
                    role: 'guard',
                    loginTime: new Date().toISOString()
                };

                saveSession('guard', guardInfo);
                closeLoginModal();
                showPage('dashboard');
                updateUIForUserType();
                showMessage('Guard login successful!', 'success');
            } else {
                showMessage('Invalid guard credentials! Use: guard001/security123 or guard002/safety456', 'error');
            }
        });
    }

    // Resident login form
    const residentLoginForm = document.getElementById('residentLoginForm');
    if (residentLoginForm) {
        residentLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const name = document.getElementById('residentName').value;
            const flat = document.getElementById('residentFlat').value;
            const password = document.getElementById('residentPassword').value;
            const mobile = document.getElementById('residentMobile').value;

            // Define all 112 resident credentials
            const residentCredentials = {
                // Wing A (16 flats)
                'A-101': 'apple101', 'A-102': 'banana102', 'A-103': 'cherry103', 'A-104': 'orange104',
                'A-201': 'mango201', 'A-202': 'grape202', 'A-203': 'peach203', 'A-204': 'lemon204',
                'A-301': 'berry301', 'A-302': 'melon302', 'A-303': 'kiwi303', 'A-304': 'plum304',
                'A-401': 'lime401', 'A-402': 'pear402', 'A-403': 'fig403', 'A-404': 'date404',

                // Wing B (16 flats)
                'B-101': 'blue101', 'B-102': 'green102', 'B-103': 'red103', 'B-104': 'yellow104',
                'B-201': 'purple201', 'B-202': 'pink202', 'B-203': 'orange203', 'B-204': 'white204',
                'B-301': 'black301', 'B-302': 'silver302', 'B-303': 'gold303', 'B-304': 'brown304',
                'B-401': 'gray401', 'B-402': 'navy402', 'B-403': 'cream403', 'B-404': 'coral404',

                // Wing C (16 flats)
                'C-101': 'cat101', 'C-102': 'dog102', 'C-103': 'bird103', 'C-104': 'fish104',
                'C-201': 'lion201', 'C-202': 'tiger202', 'C-203': 'bear203', 'C-204': 'wolf204',
                'C-301': 'eagle301', 'C-302': 'owl302', 'C-303': 'deer303', 'C-304': 'fox304',
                'C-401': 'rabbit401', 'C-402': 'mouse402', 'C-403': 'horse403', 'C-404': 'zebra404',

                // Wing D (24 flats)
                'D-101': 'sun101', 'D-102': 'moon102', 'D-103': 'star103', 'D-104': 'sky104',
                'D-201': 'cloud201', 'D-202': 'rain202', 'D-203': 'snow203', 'D-204': 'wind204',
                'D-301': 'earth301', 'D-302': 'fire302', 'D-303': 'water303', 'D-304': 'air304',
                'D-401': 'hill401', 'D-402': 'river402', 'D-403': 'ocean403', 'D-404': 'lake404',
                'D-501': 'tree501', 'D-502': 'flower502', 'D-503': 'grass503', 'D-504': 'leaf504',
                'D-601': 'rock601', 'D-602': 'sand602', 'D-603': 'stone603', 'D-604': 'coral604',

                // Wing E (16 flats)
                'E-101': 'book101', 'E-102': 'pen102', 'E-103': 'paper103', 'E-104': 'desk104',
                'E-201': 'chair201', 'E-202': 'table202', 'E-203': 'lamp203', 'E-204': 'clock204',
                'E-301': 'phone301', 'E-302': 'music302', 'E-303': 'game303', 'E-304': 'movie304',
                'E-401': 'coffee401', 'E-402': 'tea402', 'E-403': 'bread403', 'E-404': 'cake404',

                // Wing F (24 flats)
                'F-101': 'happy101', 'F-102': 'smile102', 'F-103': 'joy103', 'F-104': 'peace104',
                'F-201': 'love201', 'F-202': 'hope202', 'F-203': 'dream203', 'F-204': 'wish204',
                'F-301': 'light301', 'F-302': 'bright302', 'F-303': 'shine303', 'F-304': 'glow304',
                'F-401': 'safe401', 'F-402': 'warm402', 'F-403': 'cool403', 'F-404': 'fresh404',
                'F-501': 'clean501', 'F-502': 'clear502', 'F-503': 'pure503', 'F-504': 'soft504',
                'F-601': 'sweet601', 'F-602': 'nice602', 'F-603': 'good603', 'F-604': 'best604'
            };

            // Check credentials
            if (residentCredentials[flat] && residentCredentials[flat] === password) {
                const residentInfo = {
                    name: name,
                    flat: flat,
                    password: password,
                    mobile: mobile,
                    role: 'resident',
                    loginTime: new Date().toISOString()
                };

                // Auto-create resident contact in admin section if not already exists
                await autoCreateResidentContact(name, flat, mobile);

                saveSession('resident', residentInfo);
                closeLoginModal();
                showPage('dashboard');
                updateUIForUserType();
                showMessage('Resident login successful!', 'success');
            } else {
                showMessage('Invalid credentials! Check the residents-credentials.md file for valid login details.', 'error');
            }
        });
    }
});



// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('EzSociety loaded');
    
    // Initialize theme
    initializeTheme();

    // Check for existing session
    if (!checkSession()) {
        // No valid session, show login page
        showPage('login');
    }

    // Add keyboard navigation support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && appState.currentPage !== 'dashboard' && appState.currentPage !== 'login') {
            showPage('dashboard');
        }
    });

     // Firebase is ready to use
    console.log('Firebase database connection established');

    // Manual refresh only - no auto-refresh to save Firebase bandwidth
    if (appState.isLoggedIn) {
        // Initial notification badge update only after ensuring user is properly logged in
        setTimeout(() => {
            if (appState.isLoggedIn) {
                updateNotificationBadgeFromData();
            }
        }, 2000);
        // Start notification cleanup
        startNotificationCleanup();
    } else {
        // Ensure badge is hidden when not logged in
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.style.display = 'none';
        }
    }
});



// Firebase is initialized and ready to use
console.log('EzSociety - Firebase Realtime Database initialized successfully');