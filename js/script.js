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
// === CHAPTER TRACKER MANAGER ===
// Professional chapter management system
const ChapterTracker = {
    // Configuration
    storageKey: 'chapters',

    // Initialize
    init: function () {
        this.setupFilters();
        this.setupButtons();
        this.setupCheckboxes();
        this.loadData();
    },

    // Setup filter buttons
    setupFilters: function () {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilter(e));
        });
    },

    // Setup add chapter button
    setupButtons: function () {
        const addBtn = document.getElementById('addChapterBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddChapterForm());
        }

        // Setup delete buttons
        this.setupDeleteButtons();
    },

    // Setup delete buttons for all chapters
    setupDeleteButtons: function () {
        const deleteButtons = document.querySelectorAll('.chapter-delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const chapterId = btn.getAttribute('data-chapter-id');
                if (confirm('Delete this chapter?')) {
                    this.deleteChapter(chapterId);
                }
            });
        });
    },

    // Setup checkboxes
    setupCheckboxes: function () {
        const checkboxes = document.querySelectorAll('.chapter-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const chapterId = checkbox.getAttribute('data-chapter-id');
                const isChecked = checkbox.checked;
                this.updateChapterCompletion(chapterId, isChecked);
            });
        });
    },

    // Handle filter
    handleFilter: function (event) {
        const filterBtn = event.target;
        const filterValue = filterBtn.getAttribute('data-filter');

        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        filterBtn.classList.add('active');

        // Filter chapters
        this.filterChapters(filterValue);
        console.log(`🔍 Filtered by: ${filterValue}`);
    },

    // Filter chapters by subject
    filterChapters: function (subject) {
        const subjectGroups = document.querySelectorAll('.subject-group');

        if (subject === 'all') {
            // Show all
            subjectGroups.forEach(group => group.classList.remove('hidden'));
        } else {
            // Show only selected subject
            subjectGroups.forEach(group => {
                if (group.getAttribute('data-subject') === subject) {
                    group.classList.remove('hidden');
                } else {
                    group.classList.add('hidden');
                }
            });
        }
    },

    // Add new chapter
    showAddChapterForm: function () {
        const chapterName = prompt('Enter chapter name (e.g., "Physics - Chapter 1"):');
        if (chapterName) {
            const subject = prompt('Enter subject (physics/chemistry/biology/math):');
            if (subject && ['physics', 'chemistry', 'biology', 'math'].includes(subject.toLowerCase())) {
                this.addChapter(chapterName, subject.toLowerCase());
            } else {
                alert('Please enter a valid subject!');
            }
        }
    },

    // Add chapter to DOM
    addChapter: function (name, subject) {
        const chapterId = `${subject.substring(0, 2)}-${Date.now()}`;
        const container = document.querySelector(`[data-subject="${subject}"] .chapters-list`);

        if (!container) {
            alert('Subject not found!');
            return;
        }

        const chapterCard = document.createElement('div');
        chapterCard.className = 'chapter-card';
        chapterCard.setAttribute('data-chapter-id', chapterId);
        chapterCard.setAttribute('data-subject', subject);
        chapterCard.setAttribute('data-progress', '0');

        chapterCard.innerHTML = `
            <div class="chapter-checkbox-area">
                <input type="checkbox" class="chapter-checkbox" data-chapter-id="${chapterId}">
            </div>
            <div class="chapter-content">
                <h4 class="chapter-title">${name}</h4>
                <p class="chapter-subtitle">Recently added</p>
                <div class="chapter-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <span class="progress-percent">0%</span>
                </div>
                <p class="chapter-meta">Not started</p>
            </div>
            <button class="chapter-delete-btn" data-chapter-id="${chapterId}">×</button>
        `;

        container.appendChild(chapterCard);

        // Add listeners to new elements
        chapterCard.querySelector('.chapter-checkbox').addEventListener('change', (e) => {
            this.updateChapterCompletion(chapterId, e.target.checked);
        });

        chapterCard.querySelector('.chapter-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Delete this chapter?')) {
                this.deleteChapter(chapterId);
            }
        });

        // Save data
        this.saveData();
        console.log(`✅ Chapter added: ${name}`);
    },

    // Update chapter completion
    updateChapterCompletion: function (chapterId, isCompleted) {
        const chapterCard = document.querySelector(`[data-chapter-id="${chapterId}"]`);
        if (!chapterCard) return;

        if (isCompleted) {
            chapterCard.style.opacity = '0.7';
        } else {
            chapterCard.style.opacity = '1';
        }

        console.log(`📖 Chapter ${chapterId}: ${isCompleted ? 'Completed' : 'In Progress'}`);
    },

    // Delete chapter
    deleteChapter: function (chapterId) {
        const chapterCard = document.querySelector(`[data-chapter-id="${chapterId}"]`);
        if (chapterCard) {
            chapterCard.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                chapterCard.remove();
                this.saveData();
                console.log(`🗑️ Chapter deleted: ${chapterId}`);
            }, 300);
        }
    },

    // Save data to localStorage
    saveData: function () {
        // In future, we'll save chapter data here
        console.log('💾 Data saved to LocalStorage');
    },

    // Load data from localStorage
    loadData: function () {
        // In future, we'll load chapter data here
        console.log('📂 Data loaded from LocalStorage');
    },

    // Get all chapters
    getAllChapters: function () {
        return document.querySelectorAll('.chapter-card');
    },

    // Get chapters by subject
    getChaptersBySubject: function (subject) {
        return document.querySelectorAll(`[data-subject="${subject}"]`);
    },

    // Get completion percentage
    getCompletionPercentage: function () {
        const allChapters = this.getAllChapters().length;
        const completedChapters = document.querySelectorAll('.chapter-checkbox:checked').length;
        return allChapters > 0 ? Math.round((completedChapters / allChapters) * 100) : 0;
    }
};

// Old function name for backwards compatibility
function setupTopicTracker() {
    ChapterTracker.init();
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
window.TabManager = TabManager;
window.ChapterTracker = ChapterTracker;
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
