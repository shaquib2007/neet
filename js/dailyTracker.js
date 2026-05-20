/*
   NEET Daily Tracker System
   ─────────────────────────
   Feature: Complete productivity + study day tracker
   Persists everything to localStorage.
   Integrates with existing AnalyticsEngine & ChapterDatabase.

   AUTO-INITIALIZES on DOMContentLoaded.
*/

// ============================================
// === DAILY TRACKER ENGINE ===
// ============================================

const DailyTracker = {

    // ── Storage key
    storageKey: 'neetDailyTracker',

    // ── NEET exam target date (update as needed)
    // Default: 31 days from first launch
    examDate: null,

    // ── Internal state (loaded from / saved to localStorage)
    data: null,

    // ── Default daily checklist items
    defaultChecklist: [
        { id: 'c1', text: 'Read Biology chapter / NCERT pages', done: false },
        { id: 'c2', text: 'Read Chemistry chapter / NCERT pages', done: false },
        { id: 'c3', text: 'Read Physics chapter / NCERT pages', done: false },
        { id: 'c4', text: 'Solve PYQ questions (min 30)', done: false },
        { id: 'c5', text: 'Complete 1 full revision topic', done: false },
        { id: 'c6', text: 'Record mistakes in error log', done: false },
        { id: 'c7', text: 'Update chapter progress sliders', done: false },
        { id: 'c8', text: 'Review weak chapters (at least 1)', done: false },
    ],

    // ── Initialize
    init: function () {
        this.loadOrCreate();
        this.checkDayRollover();
        this.render();
        this.attachListeners();
        this.startClock();
        console.log('📅 Daily Tracker initialized');
    },

    // ── Load saved data or create fresh structure
    loadOrCreate: function () {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            this.data = JSON.parse(saved);
            // Migrate: add missing fields for old saves
            if (!this.data.sessions) this.data.sessions = [];
            if (!this.data.mistakes) this.data.mistakes = [];
            if (!this.data.dailyNotes) this.data.dailyNotes = '';
            if (!this.data.examDate) {
                this.data.examDate = this._defaultExamDate();
            }
        } else {
            this.data = this._createFreshData();
        }
    },

    // ── Create brand-new data structure
    _createFreshData: function () {
        return {
            examDate: this._defaultExamDate(),
            startDate: new Date().toDateString(),
            currentDay: 1,
            streak: 0,
            longestStreak: 0,
            lastStudyDate: null,         // ISO date string
            totalStudyHours: 0,          // cumulative across all days
            history: [],                 // [{ date, hours, productivity, checklistDone }]

            // Today's data
            today: {
                date: new Date().toDateString(),
                checklist: JSON.parse(JSON.stringify(this.defaultChecklist)),
                sessions: [],            // [{ start, end, duration, subject, label }]
                studyHours: 0,
                mistakeCount: 0,
                productivityPct: 0,
            },

            // Persistent across days
            sessions: [],               // all-time session log
            mistakes: [],               // all-time mistake log
            dailyNotes: '',
        };
    },

    // ── Default exam date: 31 days from today
    _defaultExamDate: function () {
        const d = new Date();
        d.setDate(d.getDate() + 31);
        return d.toISOString();
    },

    // ── Save to localStorage
    save: function () {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    },

    // ── Rollover: if it's a new calendar day, archive yesterday and reset today
    checkDayRollover: function () {
        const todayStr = new Date().toDateString();
        if (this.data.today.date !== todayStr) {
            // Archive yesterday
            const yesterday = { ...this.data.today };
            yesterday.productivityPct = this._calcProductivity(yesterday);
            this.data.history.push(yesterday);
            this.data.totalStudyHours += yesterday.studyHours;

            // Streak logic
            const prevDate = new Date(this.data.lastStudyDate);
            const nowDate  = new Date();
            const diffDays = Math.round((nowDate - prevDate) / 86400000);
            if (diffDays === 1) {
                this.data.streak++;
            } else if (diffDays > 1) {
                this.data.streak = 1; // broken
            } else {
                this.data.streak++;
            }
            if (this.data.streak > this.data.longestStreak) {
                this.data.longestStreak = this.data.streak;
            }

            // Reset today
            this.data.today = {
                date: todayStr,
                checklist: JSON.parse(JSON.stringify(this.defaultChecklist)),
                sessions: [],
                studyHours: 0,
                mistakeCount: 0,
                productivityPct: 0,
            };
            this.data.currentDay++;
            this.data.dailyNotes = '';
            this.save();
            console.log('🌅 Day rolled over. New day:', this.data.currentDay);
        }
    },

    // ── Calculate productivity %
    _calcProductivity: function (todayObj) {
        if (!todayObj || !todayObj.checklist) return 0;
        const done = todayObj.checklist.filter(c => c.done).length;
        const total = todayObj.checklist.length;
        const checklistPct = total > 0 ? (done / total) * 60 : 0;
        const hoursPct = Math.min((todayObj.studyHours / 8) * 40, 40);
        return Math.round(checklistPct + hoursPct);
    },

    // ── Days left to exam
    getDaysLeft: function () {
        const exam = new Date(this.data.examDate);
        const now  = new Date();
        const diff = Math.ceil((exam - now) / 86400000);
        return Math.max(0, diff);
    },

    // ── Active session tracking
    _activeSession: null,
    _sessionTimer: null,
    _sessionElapsed: 0,

    startSession: function (subject, label) {
        if (this._activeSession) {
            alert('A session is already running! Please stop it first.');
            return;
        }
        this._activeSession = {
            start: new Date().toISOString(),
            subject: subject || 'General',
            label: label || 'Study Session',
        };
        this._sessionElapsed = 0;
        this._sessionTimer = setInterval(() => {
            this._sessionElapsed++;
            this._updateTimerDisplay();
        }, 1000);
        this._updateSessionUI(true);
        console.log('▶️ Session started:', this._activeSession.label);
    },

    stopSession: function () {
        if (!this._activeSession) return;
        clearInterval(this._sessionTimer);
        this._sessionTimer = null;

        const end = new Date().toISOString();
        const durationHours = this._sessionElapsed / 3600;

        const session = {
            ...this._activeSession,
            end,
            duration: this._sessionElapsed,
            durationLabel: this._formatDuration(this._sessionElapsed),
        };

        this.data.today.sessions.push(session);
        this.data.sessions.push(session);
        this.data.today.studyHours = parseFloat(
            (this.data.today.studyHours + durationHours).toFixed(2)
        );
        this.data.lastStudyDate = new Date().toISOString();

        // Recalculate productivity
        this.data.today.productivityPct = this._calcProductivity(this.data.today);

        this._activeSession = null;
        this._sessionElapsed = 0;
        this.save();
        this.renderStats();
        this.renderSessions();
        this._updateSessionUI(false);
        console.log('⏹️ Session stopped. Total hours today:', this.data.today.studyHours);
    },

    _formatDuration: function (seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    },

    _updateTimerDisplay: function () {
        const el = document.getElementById('dt-session-timer');
        if (el) el.textContent = this._formatDuration(this._sessionElapsed);
    },

    _updateSessionUI: function (running) {
        const startBtn = document.getElementById('dt-start-session');
        const stopBtn  = document.getElementById('dt-stop-session');
        const timerBox = document.getElementById('dt-timer-box');
        if (startBtn) startBtn.style.display = running ? 'none' : 'flex';
        if (stopBtn)  stopBtn.style.display  = running ? 'flex' : 'none';
        if (timerBox) timerBox.classList.toggle('running', running);
    },

    // ── Checklist
    toggleChecklist: function (id) {
        const item = this.data.today.checklist.find(c => c.id === id);
        if (item) {
            item.done = !item.done;
            this.data.today.productivityPct = this._calcProductivity(this.data.today);
            this.save();
            this.renderChecklist();
            this.renderStats();
        }
    },

    // ── Mistake log
    addMistake: function (text, type) {
        const mistake = {
            id: Date.now(),
            text,
            type: type || 'conceptual',
            date: new Date().toDateString(),
            resolved: false,
        };
        this.data.mistakes.unshift(mistake);
        this.data.today.mistakeCount++;
        this.save();
        this.renderMistakes();
        this.renderStats();
    },

    toggleMistakeResolved: function (id) {
        const m = this.data.mistakes.find(x => x.id === id);
        if (m) {
            m.resolved = !m.resolved;
            this.save();
            this.renderMistakes();
        }
    },

    // ── Delete a mistake permanently
    deleteMistake: function (id) {
        const idx = this.data.mistakes.findIndex(x => x.id === id);
        if (idx === -1) return;
        // Decrement today's count only if it was logged today
        const m = this.data.mistakes[idx];
        if (m.date === new Date().toDateString() && this.data.today.mistakeCount > 0) {
            this.data.today.mistakeCount--;
        }
        this.data.mistakes.splice(idx, 1);
        this.save();
        this.renderMistakes();
        this.renderStats();
    },

    // ── Daily notes
    saveNotes: function (text) {
        this.data.dailyNotes = text;
        this.save();
    },

    // ── Live clock
    startClock: function () {
        this._updateClock();
        setInterval(() => this._updateClock(), 1000);
    },

    _updateClock: function () {
        const el = document.getElementById('dt-live-clock');
        if (!el) return;
        const now = new Date();
        el.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    },

    // ────────────────────────────────────────
    // RENDER ENGINE
    // ────────────────────────────────────────

    render: function () {
        this.renderHeader();
        this.renderStats();
        this.renderChecklist();
        this.renderSessions();
        this.renderMistakes();
        this.renderNotes();
        this.renderHistory();
        this.renderStreakRings();
    },

    renderHeader: function () {
        const daysLeft = this.getDaysLeft();
        const day = this.data.currentDay;

        const el = id => document.getElementById(id);
        setT('dt-day-counter',  `Day ${day}`);
        setT('dt-days-left',    `${daysLeft} days to NEET`);
        setT('dt-streak-val',   `🔥 ${this.data.streak} day streak`);
        setT('dt-longest-streak', `Best: ${this.data.longestStreak} days`);

        // Countdown urgency colour
        const daysLeftEl = document.getElementById('dt-days-left');
        if (daysLeftEl) {
            daysLeftEl.className = 'dt-days-left ' + (daysLeft <= 7 ? 'urgent' : daysLeft <= 14 ? 'warning' : '');
        }
    },

    renderStats: function () {
        const t = this.data.today;
        const prod = this._calcProductivity(t);
        this.data.today.productivityPct = prod;

        setT('dt-study-hours',   t.studyHours.toFixed(1) + 'h');
        setT('dt-productivity',  prod + '%');
        setT('dt-mistakes-today', t.mistakeCount);
        setT('dt-total-hours',   (this.data.totalStudyHours + t.studyHours).toFixed(1) + 'h');

        // Productivity ring
        const ring = document.getElementById('dt-prod-ring-fill');
        if (ring) {
            const circumference = 2 * Math.PI * 36; // r=36
            const offset = circumference - (prod / 100) * circumference;
            ring.style.strokeDasharray  = circumference;
            ring.style.strokeDashoffset = offset;
            ring.style.stroke = prod >= 80 ? '#22c55e' : prod >= 50 ? '#f59e0b' : '#ef4444';
        }

        // Productivity label colour
        const prodEl = document.getElementById('dt-productivity');
        if (prodEl) {
            prodEl.className = 'dt-stat-value ' + (prod >= 80 ? 'green' : prod >= 50 ? 'amber' : 'red');
        }
    },

    renderChecklist: function () {
        const container = document.getElementById('dt-checklist');
        if (!container) return;
        const done = this.data.today.checklist.filter(c => c.done).length;
        const total = this.data.today.checklist.length;

        container.innerHTML = this.data.today.checklist.map(item => `
            <label class="dt-check-item ${item.done ? 'done' : ''}" data-id="${item.id}">
                <input type="checkbox" class="dt-checkbox" data-id="${item.id}" ${item.done ? 'checked' : ''}>
                <span class="dt-check-icon">${item.done ? '✅' : '⬜'}</span>
                <span class="dt-check-text">${item.text}</span>
            </label>
        `).join('');

        // Checklist progress bar
        const fill = document.getElementById('dt-checklist-fill');
        const label = document.getElementById('dt-checklist-label');
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        if (fill)  fill.style.width = pct + '%';
        if (label) label.textContent = `${done}/${total} done`;

        // Re-attach listeners
        container.querySelectorAll('.dt-checkbox').forEach(cb => {
            cb.addEventListener('change', e => {
                this.toggleChecklist(e.target.getAttribute('data-id'));
            });
        });
    },

    renderSessions: function () {
        const container = document.getElementById('dt-sessions-list');
        if (!container) return;
        const sessions = this.data.today.sessions;

        if (sessions.length === 0) {
            container.innerHTML = '<p class="dt-empty">No sessions logged today. Start one above!</p>';
            return;
        }

        container.innerHTML = sessions.map((s, i) => `
            <div class="dt-session-item">
                <span class="dt-session-num">#${i + 1}</span>
                <span class="dt-session-label">${s.label}</span>
                <span class="dt-session-subject dt-badge-${s.subject.toLowerCase()}">${s.subject}</span>
                <span class="dt-session-duration">⏱ ${s.durationLabel}</span>
                <span class="dt-session-time">${new Date(s.start).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})}</span>
            </div>
        `).join('');
    },

    renderMistakes: function () {
        const container = document.getElementById('dt-mistakes-list');
        if (!container) return;
        const all = this.data.mistakes.slice(0, 20); // show last 20

        if (all.length === 0) {
            container.innerHTML = '<p class="dt-empty">No mistakes logged yet. Keep it up! 💪</p>';
            return;
        }

        container.innerHTML = all.map(m => `
            <div class="dt-mistake-item ${m.resolved ? 'resolved' : ''}" data-id="${m.id}">
                <div class="dt-mistake-main">
                    <span class="dt-mistake-type dt-type-${m.type}">${m.type}</span>
                    <span class="dt-mistake-text">${m.text}</span>
                </div>
                <div class="dt-mistake-meta">
                    <span class="dt-mistake-date">${m.date}</span>
                    <div class="dt-mistake-actions">
                        <button class="dt-btn-resolve" data-id="${m.id}">${m.resolved ? '↩ Reopen' : '✓ Fixed'}</button>
                        <button class="dt-btn-delete" data-id="${m.id}" title="Delete this mistake">🗑️</button>
                    </div>
                </div>
            </div>
        `).join('');

        // Listeners — resolve
        container.querySelectorAll('.dt-btn-resolve').forEach(btn => {
            btn.addEventListener('click', e => {
                this.toggleMistakeResolved(parseInt(e.target.getAttribute('data-id')));
            });
        });

        // Listeners — delete
        container.querySelectorAll('.dt-btn-delete').forEach(btn => {
            btn.addEventListener('click', e => {
                this.deleteMistake(parseInt(e.target.getAttribute('data-id')));
            });
        });
    },

    renderNotes: function () {
        const area = document.getElementById('dt-notes-area');
        if (area) area.value = this.data.dailyNotes || '';
    },

    renderHistory: function () {
        const container = document.getElementById('dt-history-list');
        if (!container) return;
        const history = [...this.data.history].reverse().slice(0, 7);

        if (history.length === 0) {
            container.innerHTML = '<p class="dt-empty">No history yet. Complete today to see stats here!</p>';
            return;
        }

        container.innerHTML = history.map(day => {
            const pct = day.productivityPct || 0;
            const done = day.checklist ? day.checklist.filter(c => c.done).length : 0;
            const total = day.checklist ? day.checklist.length : 8;
            return `
                <div class="dt-history-row">
                    <span class="dt-hist-date">${day.date}</span>
                    <span class="dt-hist-hours">📚 ${(day.studyHours || 0).toFixed(1)}h</span>
                    <span class="dt-hist-check">✅ ${done}/${total}</span>
                    <div class="dt-hist-bar-wrap">
                        <div class="dt-hist-bar" style="width:${pct}%" title="${pct}% productive"></div>
                    </div>
                    <span class="dt-hist-pct">${pct}%</span>
                </div>
            `;
        }).join('');
    },

    renderStreakRings: function () {
        const container = document.getElementById('dt-streak-rings');
        if (!container) return;
        // Show last 7 days activity
        const today = new Date().toDateString();
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toDateString());
        }

        container.innerHTML = days.map(d => {
            const isToday = d === today;
            const inHistory = this.data.history.find(h => h.date === d);
            const active = isToday ? (this.data.today.studyHours > 0) : !!inHistory;
            const dayLabel = new Date(d).toLocaleDateString('en-IN', { weekday: 'short' });
            return `
                <div class="dt-ring ${active ? 'active' : ''} ${isToday ? 'today' : ''}">
                    <div class="dt-ring-dot"></div>
                    <span class="dt-ring-label">${dayLabel}</span>
                </div>
            `;
        }).join('');
    },

    // ── Attach all event listeners
    attachListeners: function () {
        // Start / Stop session
        const startBtn = document.getElementById('dt-start-session');
        const stopBtn  = document.getElementById('dt-stop-session');

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                const subject = document.getElementById('dt-session-subject')?.value || 'General';
                const label   = document.getElementById('dt-session-label')?.value || 'Study Session';
                this.startSession(subject, label);
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopSession());
        }

        // Add mistake
        const addMistakeBtn = document.getElementById('dt-add-mistake-btn');
        if (addMistakeBtn) {
            addMistakeBtn.addEventListener('click', () => {
                const text = document.getElementById('dt-mistake-input')?.value?.trim();
                const type = document.getElementById('dt-mistake-type')?.value || 'conceptual';
                if (!text) return;
                this.addMistake(text, type);
                const inp = document.getElementById('dt-mistake-input');
                if (inp) inp.value = '';
            });
        }

        // Notes autosave
        const notesArea = document.getElementById('dt-notes-area');
        if (notesArea) {
            notesArea.addEventListener('input', e => {
                clearTimeout(this._notesSaveTimer);
                this._notesSaveTimer = setTimeout(() => {
                    this.saveNotes(e.target.value);
                    const saved = document.getElementById('dt-notes-saved');
                    if (saved) { saved.style.opacity = 1; setTimeout(() => saved.style.opacity = 0, 1500); }
                }, 800);
            });
        }

        // Reset today (dev helper – only shown in reset button)
        const resetBtn = document.getElementById('dt-reset-today');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Reset today\'s progress? (History is preserved)')) {
                    this.data.today = {
                        date: new Date().toDateString(),
                        checklist: JSON.parse(JSON.stringify(this.defaultChecklist)),
                        sessions: [],
                        studyHours: 0,
                        mistakeCount: 0,
                        productivityPct: 0,
                    };
                    this._activeSession = null;
                    this._sessionElapsed = 0;
                    clearInterval(this._sessionTimer);
                    this.save();
                    this.render();
                }
            });
        }
    },

};

// ── Tiny helper
function setT(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ── Expose to global for console debugging
window.DailyTracker = DailyTracker;

// ── Auto-initialize when DOM is ready
// (script.js may have already fired DOMContentLoaded, so we check document.readyState)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DailyTracker.init());
} else {
    DailyTracker.init();
}
