/*
   NEET Dashboard JavaScript
   This file contains all interactive functionality
*/

// Example: Log when page loads
document.addEventListener('DOMContentLoaded', function () {
    console.log('✅ Dashboard loaded successfully!');
    initializeDashboard();
});

// Initialize dashboard
function initializeDashboard() {
    setupTabNavigation();
    setupTopicTracker();
    loadDashboardData();
}

// === TAB MANAGER ===
// Clean, modular tab switching system
const TabManager = {
    // Configuration
    navButtonSelector: '.nav-btn',
    tabContentSelector: '.tab-content',
    activeClass: 'active',
    storageKey: 'activeTab',
    defaultTab: 'overview',

    // Initialize tabs
    init: function () {
        this.cacheDOM();
        this.attachEventListeners();
        this.restoreLastTab();
    },

    // Cache DOM elements for performance
    cacheDOM: function () {
        this.navButtons = document.querySelectorAll(this.navButtonSelector);
        this.tabContents = document.querySelectorAll(this.tabContentSelector);
    },

    // Attach click listeners to nav buttons
    attachEventListeners: function () {
        this.navButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleTabClick(e));
        });
    },

    // Handle tab click
    handleTabClick: function (event) {
        const button = event.target;
        const tabName = button.getAttribute('data-tab');

        // Only switch if valid tab
        if (tabName) {
            this.switchTab(tabName);
        }
    },

    // Switch to specific tab
    switchTab: function (tabName) {
        // Remove active from all
        this.navButtons.forEach(btn => btn.classList.remove(this.activeClass));
        this.tabContents.forEach(tab => tab.classList.remove(this.activeClass));

        // Add active to selected
        const button = document.querySelector(`[data-tab="${tabName}"]`);
        const content = document.getElementById(tabName);

        if (button && content) {
            button.classList.add(this.activeClass);
            content.classList.add(this.activeClass);

            // Save preference
            localStorage.setItem(this.storageKey, tabName);

            // Optional: Log for debugging
            console.log(`📑 Switched to: ${tabName}`);
        }
    },

    // Restore last viewed tab
    restoreLastTab: function () {
        const savedTab = localStorage.getItem(this.storageKey) || this.defaultTab;
        this.switchTab(savedTab);
    },

    // Get current active tab
    getCurrentTab: function () {
        return localStorage.getItem(this.storageKey) || this.defaultTab;
    }
};

// Old function name for backwards compatibility
function setupTabNavigation() {
    TabManager.init();
}

// === TOPIC TRACKER ===
function setupTopicTracker() {
    const addBtn = document.getElementById('addTopicBtn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddTopicForm);
    }

    // Setup checkbox listeners
    document.querySelectorAll('.topic-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const topicCard = this.closest('.topic-card');
            if (this.checked) {
                topicCard.style.opacity = '0.7';
            } else {
                topicCard.style.opacity = '1';
            }
        });
    });
}

function showAddTopicForm() {
    const topicName = prompt('Enter topic name:');
    if (topicName) {
        addTopic(topicName);
    }
}

function addTopic(name) {
    const topicsList = document.getElementById('topicsList');
    const newTopic = document.createElement('div');
    newTopic.className = 'topic-card';
    newTopic.innerHTML = `
        <div class="topic-header">
            <input type="checkbox" class="topic-checkbox">
            <h3>${name}</h3>
        </div>
        <div class="topic-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <span>0%</span>
        </div>
        <p class="topic-date">Last studied: Just now</p>
    `;

    topicsList.appendChild(newTopic);

    // Add listener to new checkbox
    newTopic.querySelector('.topic-checkbox').addEventListener('change', function () {
        if (this.checked) {
            newTopic.style.opacity = '0.7';
        } else {
            newTopic.style.opacity = '1';
        }
    });

    // Save to localStorage
    saveTopicsToStorage();
}

// === LOAD DATA ===
function loadDashboardData() {
    // In a real app, this would fetch data from a server
    // For now, we'll use mock data stored in localStorage
    loadTopicsFromStorage();
}

// === LOCAL STORAGE ===
function saveTopicsToStorage() {
    const topics = [];
    document.querySelectorAll('.topic-card').forEach(card => {
        topics.push({
            name: card.querySelector('h3').textContent,
            progress: card.querySelector('.progress-fill').style.width
        });
    });
    localStorage.setItem('neetTopics', JSON.stringify(topics));
    console.log('✅ Topics saved to storage');
}

function loadTopicsFromStorage() {
    const saved = localStorage.getItem('neetTopics');
    if (saved) {
        try {
            const topics = JSON.parse(saved);
            console.log('✅ Topics loaded from storage:', topics);
        } catch (e) {
            console.log('Could not load topics from storage');
        }
    }
}

// === ANIMATIONS ===
// Animate progress bars on load
window.addEventListener('load', function () {
    animateProgressBars();
});

function animateProgressBars() {
    const progressFills = document.querySelectorAll('.progress-fill');
    progressFills.forEach((fill, index) => {
        const finalWidth = fill.style.width;
        fill.style.width = '0%';

        setTimeout(() => {
            fill.style.width = finalWidth;
        }, index * 100);
    });
}

// === KEYBOARD SHORTCUTS ===
document.addEventListener('keydown', function (e) {
    // Ctrl+1 = Overview, Ctrl+2 = Tracker, etc.
    if (e.ctrlKey || e.metaKey) {
        const tabMap = {
            '1': 'overview',
            '2': 'tracker',
            '3': 'schedule',
            '4': 'analytics'
        };

        if (tabMap[e.key]) {
            const btn = document.querySelector(`[data-tab="${tabMap[e.key]}"]`);
            if (btn) btn.click();
        }
    }
});

// === HELPER FUNCTIONS ===
function updateDashboard() {
    console.log('Dashboard updated');
    animateProgressBars();
}

// === ADVANCED FEATURES ===

// Data Management System
const DashboardData = {
    getStats: function () {
        return {
            daysStudied: 45,
            topicsCovered: 28,
            totalTopics: 50,
            accuracy: 78,
            totalHours: 245
        };
    },

    getPerformance: function () {
        return {
            physics: 85,
            chemistry: 78,
            biology: 72,
            math: 88
        };
    },

    getMockTestScores: function () {
        return [
            { test: 1, score: 680, total: 720 },
            { test: 2, score: 695, total: 720 },
            { test: 3, score: 710, total: 720 }
        ];
    }
};

// Progress Update Function
function updateProgressBar(element, newWidth) {
    if (!element) return;
    element.style.transition = 'width 0.5s ease';
    element.style.width = newWidth + '%';
}

// Stats Update Function
function updateStatCard(cardElement, newValue) {
    if (!cardElement) return;
    const valueElement = cardElement.querySelector('.stat-value');
    if (valueElement) {
        valueElement.textContent = newValue;
    }
}

// Quick Study Session Timer
function startStudySession(minutes) {
    console.log(`📚 Study session started for ${minutes} minutes`);
    const endTime = Date.now() + (minutes * 60 * 1000);

    const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        if (remaining === 0) {
            clearInterval(interval);
            alert('✅ Study session complete! Take a break!');
        }
    }, 1000);
}

// Export functions for console access
window.addTopic = addTopic;
window.saveTopicsToStorage = saveTopicsToStorage;
window.updateDashboard = updateDashboard;
window.DashboardData = DashboardData;
window.startStudySession = startStudySession;
window.updateProgressBar = updateProgressBar;
window.updateStatCard = updateStatCard;

// Development Mode Helpers
if (localStorage.getItem('devMode')) {
    console.log('🔧 Developer Mode Enabled');
    console.log('Available commands:');
    console.log('- addTopic("Topic Name")');
    console.log('- startStudySession(30) // 30 minutes');
    console.log('- DashboardData.getStats()');
    console.log('- saveTopicsToStorage()');
}
