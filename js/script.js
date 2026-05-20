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
    AnalyticsEngine.init();
    setupTopicTracker();
    loadDashboardData();
    updateDashboardDisplay();
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

// ============================================
// === ANALYTICS ENGINE ===
// ============================================
// Calculates all metrics for the NEET operating system

const AnalyticsEngine = {
    // Configuration
    storageKey: 'neetAnalytics',
    daysLeft: 31,
    currentPhase: 'PHASE 3',

    // Initialize analytics
    init: function () {
        this.loadOrCreateAnalytics();
        this.updateDashboard();
        console.log('📊 Analytics Engine initialized');
    },

    // Load or create analytics data
    loadOrCreateAnalytics: function () {
        const saved = localStorage.getItem(this.storageKey);
        if (!saved) {
            this.createDefaultAnalytics();
        } else {
            this.data = JSON.parse(saved);
        }
    },

    // Create default analytics structure
    createDefaultAnalytics: function () {
        this.data = {
            metadata: {
                daysLeft: this.daysLeft,
                phase: this.currentPhase,
                totalMarks: 720,
                targetScore: 600,
                createdDate: new Date().toISOString()
            },
            subjects: {
                biology: { progress: 0, completed: 0, total: 20, marks: 0 },
                chemistry: { progress: 0, completed: 0, total: 25, marks: 0 },
                physics: { progress: 0, completed: 0, total: 15, marks: 0 }
            },
            phases: {
                'PHASE 1': { progress: 0, status: 'pending' },
                'PHASE 2': { progress: 0, status: 'pending' },
                'PHASE 3': { progress: 0, status: 'pending' },
                'PHASE 4': { progress: 0, status: 'pending' }
            },
            mocks: [],
            dailyProgress: [],
            errorLog: [],
            revisions: []
        };
        this.save();
    },

    // Save analytics to localStorage
    save: function () {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    },

    // ============================================
    // OVERALL STATISTICS
    // ============================================

    getOverallProgress: function () {
        const allChapters = ChapterDatabase.getAllChapters();
        const totalProgress = allChapters.reduce((sum, ch) => sum + ch.progress, 0);
        return Math.round(totalProgress / allChapters.length);
    },

    getOverallCompletion: function () {
        const allChapters = ChapterDatabase.getAllChapters();
        const completed = allChapters.filter(ch => ch.progress === 100).length;
        return Math.round((completed / allChapters.length) * 100);
    },

    getExpectedMarks: function () {
        const allChapters = ChapterDatabase.getAllChapters();
        let expectedMarks = 0;
        allChapters.forEach(ch => {
            expectedMarks += (ch.marks * ch.progress) / 100;
        });
        return Math.round(expectedMarks);
    },

    getReadinessScore: function () {
        // Readiness = (Overall Progress % + Completion % + Confidence %) / 3
        const overall = this.getOverallProgress();
        const completion = this.getOverallCompletion();

        const allChapters = ChapterDatabase.getAllChapters();
        const avgConfidence = Math.round(
            allChapters.reduce((sum, ch) => sum + ch.confidence, 0) / allChapters.length
        );

        return Math.round((overall + completion + avgConfidence) / 3);
    },

    // ============================================
    // SUBJECT STATISTICS
    // ============================================

    getSubjectProgress: function (subject) {
        const chapters = ChapterDatabase.getChaptersBySubject(subject);
        const totalProgress = chapters.reduce((sum, ch) => sum + ch.progress, 0);
        return Math.round(totalProgress / chapters.length);
    },

    getSubjectCompletion: function (subject) {
        const chapters = ChapterDatabase.getChaptersBySubject(subject);
        const completed = chapters.filter(ch => ch.progress === 100).length;
        return Math.round((completed / chapters.length) * 100);
    },

    getSubjectStats: function (subject) {
        const chapters = ChapterDatabase.getChaptersBySubject(subject);
        const totalMarks = ChapterDatabase.getTotalMarksBySubject(subject);
        const completed = chapters.filter(ch => ch.progress === 100).length;
        const weak = chapters.filter(ch => ch.status === 'weak').length;
        const strong = chapters.filter(ch => ch.status === 'strong').length;

        let expectedMarks = 0;
        chapters.forEach(ch => {
            expectedMarks += (ch.marks * ch.progress) / 100;
        });

        return {
            subject,
            totalChapters: chapters.length,
            completedChapters: completed,
            completionPercent: this.getSubjectCompletion(subject),
            progress: this.getSubjectProgress(subject),
            totalMarks,
            expectedMarks: Math.round(expectedMarks),
            weakChapters: weak,
            strongChapters: strong,
            avgConfidence: Math.round(
                chapters.reduce((sum, ch) => sum + ch.confidence, 0) / chapters.length
            )
        };
    },

    // ============================================
    // WEAK AREAS & FOCUS
    // ============================================

    getWeakChapters: function (limit = 10) {
        return ChapterDatabase.getAllChapters()
            .filter(ch => ch.status === 'weak')
            .sort((a, b) => b.marks - a.marks)
            .slice(0, limit);
    },

    getHighPriorityWeak: function () {
        return ChapterDatabase.getAllChapters()
            .filter(ch => ch.status === 'weak' && ch.priority === 'high');
    },

    getNotStartedChapters: function () {
        return ChapterDatabase.getAllChapters()
            .filter(ch => ch.progress === 0);
    },

    getPartialChapters: function () {
        return ChapterDatabase.getAllChapters()
            .filter(ch => ch.progress > 0 && ch.progress < 100);
    },

    // ============================================
    // PHASE TRACKING
    // ============================================

    getPhaseProgress: function (phase) {
        // Calculate which chapters belong to this phase
        // This is simplified - can be enhanced with actual phase data
        const phases = {
            'PHASE 1': { type: 'foundation', percent: 0.30 },
            'PHASE 2': { type: 'comprehensive', percent: 0.50 },
            'PHASE 3': { type: 'mocks', percent: 0.80 },
            'PHASE 4': { type: 'final', percent: 1.0 }
        };

        return phases[phase] || { type: 'unknown', percent: 0 };
    },

    // ============================================
    // MOCK ANALYTICS
    // ============================================

    addMockScore: function (mockNumber, score, totalMarks = 720) {
        this.data.mocks.push({
            mockNumber,
            score,
            totalMarks,
            percentage: Math.round((score / totalMarks) * 100),
            date: new Date().toISOString()
        });
        this.save();
    },

    getMockTrend: function () {
        return this.data.mocks.sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );
    },

    getAverageMockScore: function () {
        if (this.data.mocks.length === 0) return 0;
        const total = this.data.mocks.reduce((sum, m) => sum + m.score, 0);
        return Math.round(total / this.data.mocks.length);
    },

    // ============================================
    // DASHBOARD UPDATE
    // ============================================

    updateDashboard: function () {
        const overallProgress = this.getOverallProgress();
        const readiness = this.getReadinessScore();
        const expected = this.getExpectedMarks();

        // Update dashboard elements
        const dashboardElement = document.getElementById('overview');
        if (dashboardElement) {
            // Stats will update in real-time
            console.log(`📊 Dashboard: ${overallProgress}% progress, ${readiness}% readiness, ${expected} expected marks`);
        }
    }
};

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
                const priority = prompt('Enter priority (high/medium/low):', 'medium');
                const marks = prompt('Enter estimated marks (e.g., 45):', '35');
                const status = prompt('Enter status (strong/neutral/weak):', 'neutral');

                if (priority && marks && status) {
                    this.addChapter(chapterName, subject.toLowerCase(), priority.toLowerCase(), parseInt(marks), status.toLowerCase());
                }
            } else {
                alert('Please enter a valid subject!');
            }
        }
    },

    // Add chapter to DOM
    addChapter: function (name, subject, priority = 'medium', marks = 35, status = 'neutral') {
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
        chapterCard.setAttribute('data-priority', priority);
        chapterCard.setAttribute('data-marks', marks);
        chapterCard.setAttribute('data-revisions', '0');
        chapterCard.setAttribute('data-status', status);
        chapterCard.setAttribute('data-last-studied', Date.now().toString());

        const priorityColors = {
            'high': 'priority-high',
            'medium': 'priority-medium',
            'low': 'priority-low'
        };

        const statusEmojis = {
            'strong': '💪 Strong',
            'neutral': '➡️ Neutral',
            'weak': '⚠️ Weak'
        };

        chapterCard.innerHTML = `
            <div class="chapter-header">
                <span class="priority-badge ${priorityColors[priority]}">${priority.toUpperCase()}</span>
                <span class="marks-badge">${marks}/100</span>
            </div>
            <div class="chapter-checkbox-area">
                <input type="checkbox" class="chapter-checkbox" data-chapter-id="${chapterId}">
            </div>
            <div class="chapter-content">
                <h4 class="chapter-title">${name}</h4>
                <p class="chapter-subtitle">Recently added</p>
                <div class="status-label ${status}">${statusEmojis[status]}</div>
                <div class="chapter-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <span class="progress-percent">0%</span>
                </div>
                <p class="chapter-meta"><span class="revision-count">🔄 Not started</span> • <span class="last-studied">Just now</span></p>
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
        console.log(`✅ Chapter added: ${name} (${priority} priority, ${marks} marks)`);
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

        // Save data when completion changes
        this.saveData();
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
        try {
            const chaptersData = {};

            // Get all chapter cards and extract their data
            document.querySelectorAll('.chapter-card').forEach(card => {
                const id = card.getAttribute('data-chapter-id');
                const title = card.querySelector('.chapter-title').textContent;
                const subtitle = card.querySelector('.chapter-subtitle').textContent;
                const progress = card.getAttribute('data-progress');
                const priority = card.getAttribute('data-priority');
                const marks = card.getAttribute('data-marks');
                const revisions = card.getAttribute('data-revisions');
                const status = card.getAttribute('data-status');
                const subject = card.getAttribute('data-subject');
                const isCompleted = card.querySelector('.chapter-checkbox').checked;

                chaptersData[id] = {
                    id,
                    title,
                    subtitle,
                    subject,
                    progress: parseInt(progress),
                    priority,
                    marks: parseInt(marks),
                    revisions: parseInt(revisions),
                    status,
                    completed: isCompleted,
                    lastStudied: card.getAttribute('data-last-studied')
                };
            });

            localStorage.setItem(this.storageKey, JSON.stringify(chaptersData));
            console.log('💾 All chapter data saved to LocalStorage:', Object.keys(chaptersData).length, 'chapters');
            return true;
        } catch (error) {
            console.error('❌ Error saving data:', error);
            return false;
        }
    },

    // Load data from localStorage
    loadData: function () {
        try {
            const saved = localStorage.getItem(this.storageKey);

            if (!saved) {
                console.log('📂 No saved data found in LocalStorage (first visit)');
                return false;
            }

            const chaptersData = JSON.parse(saved);
            console.log('📂 Loading', Object.keys(chaptersData).length, 'chapters from LocalStorage');

            // Restore state for each saved chapter
            Object.values(chaptersData).forEach(data => {
                const card = document.querySelector(`[data-chapter-id="${data.id}"]`);
                if (card) {
                    // Update progress
                    card.setAttribute('data-progress', data.progress);
                    const progressFill = card.querySelector('.progress-fill');
                    if (progressFill) {
                        progressFill.style.width = data.progress + '%';
                    }
                    const progressPercent = card.querySelector('.progress-percent');
                    if (progressPercent) {
                        progressPercent.textContent = data.progress + '%';
                    }

                    // Update completion status
                    const checkbox = card.querySelector('.chapter-checkbox');
                    if (checkbox) {
                        checkbox.checked = data.completed;
                        if (data.completed) {
                            card.style.opacity = '0.7';
                        }
                    }

                    // Update revisions count
                    const revisionSpan = card.querySelector('.revision-count');
                    if (revisionSpan) {
                        if (data.revisions === 0) {
                            revisionSpan.textContent = '🔄 Not started';
                        } else {
                            revisionSpan.textContent = `🔄 Revised ${data.revisions}x`;
                        }
                    }
                }
            });

            console.log('✅ Chapter data restored successfully');
            return true;
        } catch (error) {
            console.error('❌ Error loading data:', error);
            return false;
        }
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
    },

    // Get subject-wise progress
    getSubjectProgress: function (subject) {
        const chapters = this.getChaptersBySubject(subject);
        if (chapters.length === 0) return 0;

        let totalProgress = 0;
        chapters.forEach(chapter => {
            const progress = parseInt(chapter.getAttribute('data-progress')) || 0;
            totalProgress += progress;
        });

        return Math.round(totalProgress / chapters.length);
    },

    // Get subject statistics
    getSubjectStats: function (subject) {
        const chapters = this.getChaptersBySubject(subject);
        const completed = Array.from(chapters).filter(ch => ch.querySelector('.chapter-checkbox').checked).length;
        const totalMarks = Array.from(chapters).reduce((sum, ch) => {
            return sum + (parseInt(ch.getAttribute('data-marks')) || 0);
        }, 0);
        const weakCount = Array.from(chapters).filter(ch => ch.getAttribute('data-status') === 'weak').length;

        return {
            total: chapters.length,
            completed,
            progress: this.getSubjectProgress(subject),
            totalMarks,
            weakCount,
            completion: chapters.length > 0 ? Math.round((completed / chapters.length) * 100) : 0
        };
    },

    // Get all weak chapters
    getWeakChapters: function () {
        return document.querySelectorAll('[data-status="weak"]');
    },

    // Get high priority chapters
    getHighPriorityChapters: function () {
        return document.querySelectorAll('[data-priority="high"]');
    },

    // Get total marks
    getTotalMarks: function () {
        let total = 0;
        document.querySelectorAll('.chapter-card').forEach(chapter => {
            const marks = parseInt(chapter.getAttribute('data-marks')) || 0;
            total += marks;
        });
        return total;
    },

    // Update chapter progress (0-100%)
    updateProgress: function (chapterId, progressValue) {
        const chapter = document.querySelector(`[data-chapter-id="${chapterId}"]`);
        if (!chapter) return false;

        // Validate progress value
        progressValue = Math.max(0, Math.min(100, parseInt(progressValue)));

        // Update data attribute
        chapter.setAttribute('data-progress', progressValue);

        // Update progress bar
        const progressFill = chapter.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = progressValue + '%';
        }

        // Update progress percent text
        const progressPercent = chapter.querySelector('.progress-percent');
        if (progressPercent) {
            progressPercent.textContent = progressValue + '%';
        }

        // Update revision count if completed (100%)
        if (progressValue === 100) {
            let revisions = parseInt(chapter.getAttribute('data-revisions')) || 0;
            revisions++;
            chapter.setAttribute('data-revisions', revisions);

            const revisionSpan = chapter.querySelector('.revision-count');
            if (revisionSpan) {
                revisionSpan.textContent = `🔄 Revised ${revisions}x`;
            }
        }

        // Save data
        this.saveData();
        console.log(`📈 Chapter ${chapterId} progress updated to ${progressValue}%`);
        return true;
    },

    // Get dashboard summary
    getDashboardSummary: function () {
        const allChapters = this.getAllChapters().length;
        const completed = document.querySelectorAll('.chapter-checkbox:checked').length;
        const weakChapters = this.getWeakChapters().length;
        const highPriority = this.getHighPriorityChapters().length;
        const totalMarks = this.getTotalMarks();

        return {
            totalChapters: allChapters,
            completedChapters: completed,
            overallProgress: this.getCompletionPercentage(),
            weakChapters,
            highPriorityChapters: highPriority,
            totalMarks,
            physicsStats: this.getSubjectStats('physics'),
            chemistryStats: this.getSubjectStats('chemistry'),
            biologyStats: this.getSubjectStats('biology'),
            mathStats: this.getSubjectStats('math')
        };
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

// ============================================
// === UPDATE DASHBOARD DISPLAY ===
// ============================================
// Updates dashboard with real-time analytics data

function updateDashboardDisplay() {
    try {
        // Get analytics data
        const overallProgress = AnalyticsEngine.getOverallProgress();
        const readiness = AnalyticsEngine.getReadinessScore();
        const expected = AnalyticsEngine.getExpectedMarks();
        const biologyStats = AnalyticsEngine.getSubjectStats('biology');
        const chemistryStats = AnalyticsEngine.getSubjectStats('chemistry');
        const physicsStats = AnalyticsEngine.getSubjectStats('physics');
        const weakChapters = AnalyticsEngine.getWeakChapters(5);
        const notStarted = AnalyticsEngine.getNotStartedChapters().length;

        // Log dashboard data
        console.log('📊 Dashboard Updated:');
        console.log(`  Overall Progress: ${overallProgress}%`);
        console.log(`  Readiness Score: ${readiness}%`);
        console.log(`  Expected Marks: ${expected}/720`);
        console.log(`  Biology: ${biologyStats.completionPercent}% (${biologyStats.expectedMarks}/${biologyStats.totalMarks})`);
        console.log(`  Chemistry: ${chemistryStats.completionPercent}% (${chemistryStats.expectedMarks}/${chemistryStats.totalMarks})`);
        console.log(`  Physics: ${physicsStats.completionPercent}% (${physicsStats.expectedMarks}/${physicsStats.totalMarks})`);
        console.log(`  Weak Chapters: ${weakChapters.length}`);
        console.log(`  Not Started: ${notStarted} chapters`);

        // Update dashboard stats (if elements exist)
        updateDashboardStats({
            overallProgress,
            readiness,
            expectedMarks: expected,
            biologyStats,
            chemistryStats,
            physicsStats,
            weakChapters,
            daysLeft: AnalyticsEngine.daysLeft,
            currentPhase: AnalyticsEngine.currentPhase
        });

    } catch (error) {
        console.error('❌ Error updating dashboard:', error);
    }
}

// Helper function to update specific dashboard elements
function updateDashboardStats(stats) {
    // This function will update HTML elements with real data
    // Implement as needed based on your dashboard HTML structure

    // Example: Update progress elements
    const progressElements = document.querySelectorAll('[data-stat="progress"]');
    progressElements.forEach(el => {
        if (el) el.textContent = `${stats.overallProgress}%`;
    });

    // Example: Update readiness
    const readinessElements = document.querySelectorAll('[data-stat="readiness"]');
    readinessElements.forEach(el => {
        if (el) el.textContent = `${stats.readiness}%`;
    });

    // Example: Update expected marks
    const expectedElements = document.querySelectorAll('[data-stat="expected"]');
    expectedElements.forEach(el => {
        if (el) el.textContent = stats.expectedMarks;
    });
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
