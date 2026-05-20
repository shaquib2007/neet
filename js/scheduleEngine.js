/*
   31-Day NEET Schedule Engine
   ────────────────────────────
   Manages:
   - 31-day timeline with day completion
   - Phase tracking (4 phases)
   - Daily timetable blocks
   - Daily checklist persistence
   - Study hours logger + weekly bar chart
   - Streak system
   - Phase focus topics
   - Daily notes (auto-save)
   All data stored in localStorage key: 'neetSchedule'
*/

const ScheduleEngine = {

    storageKey: 'neetSchedule',
    data: null,

    // ─────────────────────────────────────────
    // DATA SCHEMA
    // ─────────────────────────────────────────

    _fresh: function () {
        return {
            startDate:     new Date().toDateString(),
            completedDays: [],
            streak:        0,
            lastDoneDate:  null,
            hoursLog:      {},
            checklist:     {},
            notes:         {},
            reminders:     [],  // [{ id, text, date, done }]
        };
    },

    // ─────────────────────────────────────────
    // 31-DAY PHASE DEFINITIONS
    // ─────────────────────────────────────────

    phases: [
        {
            id: 1, name: 'Phase 1', label: 'Foundation Revision',
            days: [1, 10],
            color: '#667eea',
            topics: [
                { icon: '🧬', name: 'Human Physiology', tag: 'Bio' },
                { icon: '🧬', name: 'Genetics',          tag: 'Bio' },
                { icon: '🔬', name: 'Cell Biology',      tag: 'Bio' },
                { icon: '⚗️', name: 'Chemical Bonding',  tag: 'Chem' },
                { icon: '⚗️', name: 'GOC',               tag: 'Chem' },
                { icon: '⚡', name: 'Electrostatics',    tag: 'Phy' },
                { icon: '⚡', name: 'Current Electricity',tag: 'Phy' },
                { icon: '🔭', name: 'Optics',            tag: 'Phy' },
            ],
            daily: ['30 Chapter MCQs', 'NCERT Revision', 'Short Notes']
        },
        {
            id: 2, name: 'Phase 2', label: 'Full Syllabus Sweep',
            days: [11, 20],
            color: '#10b981',
            topics: [
                { icon: '🌿', name: 'Ecology',           tag: 'Bio' },
                { icon: '🌱', name: 'Reproduction',      tag: 'Bio' },
                { icon: '🧬', name: 'Biotechnology',     tag: 'Bio' },
                { icon: '⚗️', name: 'Electrochemistry',  tag: 'Chem' },
                { icon: '⚗️', name: 'Coordination',      tag: 'Chem' },
                { icon: '⚛️', name: 'Modern Physics',    tag: 'Phy' },
                { icon: '🔥', name: 'Thermodynamics',    tag: 'Phy' },
                { icon: '🧲', name: 'Magnetism',         tag: 'Phy' },
                { icon: '〰️', name: 'SHM & Waves',      tag: 'Phy' },
            ],
            daily: ['50 Mixed MCQs', 'Error Log', 'Spaced Repetition']
        },
        {
            id: 3, name: 'Phase 3', label: 'Mock Tests + Deep Analysis',
            days: [21, 28],
            color: '#f59e0b',
            topics: [
                { icon: '📝', name: 'Full 720-Mark Mock',    tag: 'Test' },
                { icon: '📊', name: 'Score Tracking',        tag: 'Ana' },
                { icon: '🔍', name: 'Weak Topic Analysis',   tag: 'Ana' },
                { icon: '❌', name: 'Mistake Analysis',      tag: 'Ana' },
                { icon: '📐', name: 'Formula Revision',      tag: 'Rev' },
            ],
            daily: ['Full Mock Test', 'Score Analysis', 'Mistake Review']
        },
        {
            id: 4, name: 'Phase 4', label: 'Final Sprint',
            days: [29, 31],
            color: '#ef4444',
            topics: [
                { icon: '📋', name: 'Short Notes',       tag: 'Rev' },
                { icon: '🧠', name: 'Mnemonics',         tag: 'Rev' },
                { icon: '🖼️', name: 'Diagrams',          tag: 'Rev' },
                { icon: '💪', name: 'Confidence Build',  tag: 'Mind' },
                { icon: '🚫', name: 'No New Topics',     tag: 'Rule' },
            ],
            daily: ['Short Notes Review', 'Diagram Practice', 'Confidence Drill']
        },
    ],

    // ─────────────────────────────────────────
    // TIMETABLE BLOCKS (fixed daily structure)
    // ─────────────────────────────────────────

    timetable: [
        { time: '7:00 – 9:00',  label: 'Biology Slot 1',      subject: 'biology',   hours: 2 },
        { time: '9:15 – 11:15', label: 'Chemistry',            subject: 'chemistry', hours: 2 },
        { time: '11:30 – 1:00', label: 'Physics',              subject: 'physics',   hours: 1.5 },
        { time: '2:00 – 3:30',  label: 'PYQ Practice',         subject: 'pyq',       hours: 1.5 },
        { time: '3:45 – 5:45',  label: 'Biology Slot 2',       subject: 'biology',   hours: 2 },
        { time: '6:30 – 8:00',  label: 'Weak Topic Revision',  subject: 'revision',  hours: 1.5 },
        { time: '9:00 – 10:00', label: 'Quick Revision',       subject: 'revision',  hours: 1 },
    ],

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────

    init: function () {
        this._load();
        this.render();
        this._attachListeners();
        console.log('📅 ScheduleEngine initialized');
    },

    _load: function () {
        const saved = localStorage.getItem(this.storageKey);
        this.data = saved ? JSON.parse(saved) : this._fresh();
        if (!this.data.notes)     this.data.notes = {};
        if (!this.data.checklist) this.data.checklist = {};
        if (!this.data.reminders) this.data.reminders = [];
    },

    _save: function () {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    },

    // ─────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────

    _todayStr: function () { return new Date().toDateString(); },

    // Day number since startDate (1-indexed, capped at 31)
    _currentDay: function () {
        const start = new Date(this.data.startDate);
        const now   = new Date();
        const diff  = Math.floor((now - start) / 86400000) + 1;
        return Math.min(Math.max(diff, 1), 31);
    },

    // Which phase owns a day number
    _phaseForDay: function (dayNum) {
        return this.phases.find(p => dayNum >= p.days[0] && dayNum <= p.days[1]) || this.phases[0];
    },

    // Completed days per phase
    _phasePct: function (phaseId) {
        const p = this.phases.find(x => x.id === phaseId);
        const total = p.days[1] - p.days[0] + 1;
        const done  = this.data.completedDays.filter(d => d >= p.days[0] && d <= p.days[1]).length;
        return total > 0 ? Math.round((done / total) * 100) : 0;
    },

    // Today's checklist (7 items)
    _todayChecklist: function () {
        const key = this._todayStr();
        if (!this.data.checklist[key] || this.data.checklist[key].length !== this.timetable.length) {
            this.data.checklist[key] = new Array(this.timetable.length).fill(false);
        }
        return this.data.checklist[key];
    },

    // Productivity % = (checklist done / total) * 70 + (hours / 8) * 30
    _productivity: function () {
        const cl    = this._todayChecklist();
        const done  = cl.filter(Boolean).length;
        const total = cl.length;
        const clPct = total > 0 ? (done / total) * 70 : 0;
        const h     = this.data.hoursLog[this._todayStr()] || 0;
        const hPct  = Math.min((h / 8) * 30, 30);
        return Math.round(clPct + hPct);
    },

    // ─────────────────────────────────────────
    // ACTIONS
    // ─────────────────────────────────────────

    toggleDay: function (dayNum) {
        const idx = this.data.completedDays.indexOf(dayNum);
        if (idx > -1) {
            this.data.completedDays.splice(idx, 1);
        } else {
            this.data.completedDays.push(dayNum);
            this.data.completedDays.sort((a, b) => a - b);
        }
        this._updateStreak();
        this._save();
        this.render();
    },

    toggleChecklist: function (idx) {
        const cl = this._todayChecklist();
        cl[idx] = !cl[idx];
        this._save();
        this._renderChecklist();
        this._renderStats();
    },

    saveHours: function (val) {
        const h = parseFloat(val);
        if (isNaN(h) || h < 0) return;
        this.data.hoursLog[this._todayStr()] = Math.min(h, 16);
        this._save();
        this._renderStats();
        this._renderWeekBars();
    },

    saveNotes: function (text) {
        this.data.notes[this._todayStr()] = text;
        this._save();
    },

    addReminder: function (text) {
        if (!text || !text.trim()) return;
        this.data.reminders.unshift({
            id:   Date.now(),
            text: text.trim(),
            date: this._todayStr(),
            done: false,
        });
        this._save();
        this._renderNotes();
    },

    toggleReminder: function (id) {
        const r = this.data.reminders.find(x => x.id === id);
        if (r) { r.done = !r.done; this._save(); this._renderNotes(); }
    },

    deleteReminder: function (id) {
        this.data.reminders = this.data.reminders.filter(x => x.id !== id);
        this._save();
        this._renderNotes();
    },

    _updateStreak: function () {
        // Recalculate streak: consecutive completed days ending at current/last day
        const sorted = [...this.data.completedDays].sort((a, b) => a - b);
        let streak = 0, prev = -1;
        for (const d of sorted) {
            streak = (d === prev + 1) ? streak + 1 : 1;
            prev = d;
        }
        this.data.streak = streak;
    },

    // ─────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────

    render: function () {
        this._renderBanner();
        this._renderPhaseCards();
        this._renderTimeline();
        this._renderTimetable();
        this._renderChecklist();
        this._renderStats();
        this._renderWeekBars();
        this._renderFocusTopics();
        this._renderNotes();
    },

    _renderBanner: function () {
        const day   = this._currentDay();
        const phase = this._phaseForDay(day);
        const done  = this.data.completedDays.length;
        const overall = Math.round((done / 31) * 100);
        const remaining = Math.max(0, 31 - day + 1);

        _st('sch-phase-badge',      phase.name);
        _st('sch-phase-label',      phase.label + ' · Days ' + phase.days[0] + '–' + phase.days[1]);
        _st('sch-days-remaining',   remaining);
        _st('sch-overall-pct',      overall + '%');
        _st('sch-today-badge',      'Day ' + day);
        _st('sch-focus-phase-label', phase.name);

        // Phase badge color
        const badge = document.getElementById('sch-phase-badge');
        if (badge) badge.style.background = phase.color;

        // Overall ring
        const ring = document.getElementById('sch-overall-ring');
        if (ring) {
            const c = 2 * Math.PI * 24; // r=24
            ring.style.strokeDasharray  = c;
            ring.style.strokeDashoffset = c - (overall / 100) * c;
            ring.style.stroke = phase.color;
        }
    },

    _renderPhaseCards: function () {
        this.phases.forEach(p => {
            const pct = this._phasePct(p.id);
            _st('sch-p' + p.id + '-pct', pct + '%');

            const card = document.getElementById('sch-phase-' + p.id);
            if (!card) return;

            // Remove old classes
            card.classList.remove('active', 'done');
            const day = this._currentDay();
            if (day >= p.days[0] && day <= p.days[1]) {
                card.classList.add('active');
                card.style.borderColor = p.color;
                card.style.boxShadow   = `0 4px 20px ${p.color}33`;
            } else if (day > p.days[1]) {
                card.classList.add('done');
            }

            const pctEl = document.getElementById('sch-p' + p.id + '-pct');
            if (pctEl) pctEl.style.color = p.color;
        });
    },

    _renderTimeline: function () {
        const container = document.getElementById('sch-timeline');
        if (!container) return;
        const current = this._currentDay();

        let html = '';
        this.phases.forEach(phase => {
            html += `<div class="sch-tl-phase-row">
                        <span class="sch-tl-phase-label" style="color:${phase.color}">${phase.name}</span>
                        <div class="sch-tl-days">`;
            for (let d = phase.days[0]; d <= phase.days[1]; d++) {
                const done    = this.data.completedDays.includes(d);
                const isCur   = d === current;
                const isFuture = d > current;
                let cls = 'sch-day-dot';
                if (done)    cls += ' done';
                if (isCur)   cls += ' current';
                if (isFuture && !done) cls += ' future';
                html += `<button class="${cls}" data-day="${d}" title="Day ${d}">${d}</button>`;
            }
            html += `</div></div>`;
        });

        container.innerHTML = html;

        // Attach click listeners
        container.querySelectorAll('.sch-day-dot').forEach(btn => {
            btn.addEventListener('click', e => {
                this.toggleDay(parseInt(e.target.getAttribute('data-day')));
            });
        });
    },

    _renderTimetable: function () {
        const container = document.getElementById('sch-timetable');
        if (!container) return;

        container.innerHTML = this.timetable.map((slot, i) => {
            const subColor = {
                biology:   '#16a34a', chemistry: '#1d4ed8',
                physics:   '#c2410c', pyq:       '#854d0e',
                revision:  '#7e22ce'
            }[slot.subject] || '#667eea';

            return `<div class="sch-slot" style="border-left-color:${subColor}">
                <div class="sch-slot-time">${slot.time}</div>
                <div class="sch-slot-label">${slot.label}</div>
                <div class="sch-slot-hours">${slot.hours}h</div>
            </div>`;
        }).join('');
    },

    _renderChecklist: function () {
        const container = document.getElementById('sch-checklist');
        if (!container) return;

        const cl   = this._todayChecklist();
        const done = cl.filter(Boolean).length;
        const total = cl.length;

        container.innerHTML = this.timetable.map((slot, i) => `
            <label class="sch-check-item ${cl[i] ? 'done' : ''}">
                <input type="checkbox" class="sch-cb" data-idx="${i}" ${cl[i] ? 'checked' : ''}>
                <span class="sch-cb-icon">${cl[i] ? '✅' : '⬜'}</span>
                <span class="sch-cb-text">${slot.label}</span>
                <span class="sch-cb-time">${slot.time}</span>
            </label>
        `).join('');

        // Count badge
        _st('sch-check-count', `${done}/${total} done`);

        // Progress bar
        const bar = document.getElementById('sch-checklist-bar');
        if (bar) bar.style.width = (total > 0 ? Math.round((done / total) * 100) : 0) + '%';

        // Listeners
        container.querySelectorAll('.sch-cb').forEach(cb => {
            cb.addEventListener('change', e => {
                this.toggleChecklist(parseInt(e.target.getAttribute('data-idx')));
            });
        });
    },

    _renderStats: function () {
        const prod   = this._productivity();
        const hours  = this.data.hoursLog[this._todayStr()] || 0;
        const done   = this.data.completedDays.length;

        _st('sch-prod-pct',    prod + '%');
        _st('sch-hours-today', hours + ' / 8h');
        _st('sch-streak',      this.data.streak);
        _st('sch-days-done',   done + ' / 31');

        // Productivity ring
        const ring = document.getElementById('sch-prod-ring');
        if (ring) {
            const c = 2 * Math.PI * 32; // r=32 → ~201
            ring.style.strokeDasharray  = c;
            ring.style.strokeDashoffset = c - (prod / 100) * c;
            ring.style.stroke = prod >= 80 ? '#22c55e' : prod >= 50 ? '#f59e0b' : '#ef4444';
        }

        // Prod text colour
        const prodEl = document.getElementById('sch-prod-pct');
        if (prodEl) {
            prodEl.className = 'sch-stat-val ' + (prod >= 80 ? 'green' : prod >= 50 ? 'amber' : 'red');
        }

        // Hours input prefill
        const inp = document.getElementById('sch-hours-input');
        if (inp && hours > 0) inp.value = hours;
    },

    _renderWeekBars: function () {
        const container = document.getElementById('sch-week-bars');
        if (!container) return;

        // Last 7 days
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toDateString());
        }

        const max = Math.max(...days.map(d => this.data.hoursLog[d] || 0), 1);

        container.innerHTML = days.map(d => {
            const h   = this.data.hoursLog[d] || 0;
            const pct = Math.round((h / max) * 100);
            const lbl = new Date(d).toLocaleDateString('en-IN', { weekday: 'short' });
            const isToday = d === this._todayStr();
            return `<div class="sch-bar-col">
                <div class="sch-bar-wrap">
                    <div class="sch-bar-fill ${isToday ? 'today' : ''}" style="height:${pct}%" title="${h}h"></div>
                </div>
                <div class="sch-bar-label ${isToday ? 'today' : ''}">${lbl}</div>
                <div class="sch-bar-val">${h > 0 ? h + 'h' : ''}</div>
            </div>`;
        }).join('');
    },

    _renderFocusTopics: function () {
        const container = document.getElementById('sch-focus-topics');
        if (!container) return;

        const day   = this._currentDay();
        const phase = this._phaseForDay(day);

        container.innerHTML = phase.topics.map(t => `
            <div class="sch-topic-chip">
                <span class="sch-topic-icon">${t.icon}</span>
                <span class="sch-topic-name">${t.name}</span>
                <span class="sch-topic-tag sch-tag-${t.tag.toLowerCase()}">${t.tag}</span>
            </div>
        `).join('');

        // Daily tasks for phase
        const dailyEl = document.getElementById('sch-focus-phase-label');
        if (dailyEl) {
            dailyEl.textContent = phase.name;
            dailyEl.style.background = phase.color;
        }
    },

    _renderNotes: function () {
        // Notes textarea
        const area = document.getElementById('sch-notes');
        if (area) area.value = this.data.notes[this._todayStr()] || '';

        // Reminders list
        const list = document.getElementById('sch-reminders-list');
        if (!list) return;

        if (this.data.reminders.length === 0) {
            list.innerHTML = '<li class="sch-reminder-empty">No reminders yet. Add one above!</li>';
            return;
        }

        list.innerHTML = this.data.reminders.map(r => `
            <li class="sch-reminder-item ${r.done ? 'done' : ''}" data-id="${r.id}">
                <button class="sch-rem-check" data-id="${r.id}" title="Mark done">${r.done ? '✅' : '📌'}</button>
                <span class="sch-rem-text">${r.text}</span>
                <span class="sch-rem-date">${r.date}</span>
                <button class="sch-rem-del" data-id="${r.id}" title="Delete">&times;</button>
            </li>
        `).join('');

        // Listeners on rendered items
        list.querySelectorAll('.sch-rem-check').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                this.toggleReminder(parseInt(e.currentTarget.getAttribute('data-id')));
            });
        });
        list.querySelectorAll('.sch-rem-del').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                this.deleteReminder(parseInt(e.currentTarget.getAttribute('data-id')));
            });
        });
    },

    // ─────────────────────────────────────────
    // EVENT LISTENERS
    // ─────────────────────────────────────────

    _attachListeners: function () {
        // Hours save
        const saveBtn = document.getElementById('sch-hours-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const val = document.getElementById('sch-hours-input')?.value;
                this.saveHours(val);
                saveBtn.textContent = 'Saved ✓';
                setTimeout(() => saveBtn.textContent = 'Save Hours', 1500);
            });
        }

        // Notes — explicit Save button
        const notesSaveBtn = document.getElementById('sch-notes-save');
        const notesArea    = document.getElementById('sch-notes');
        const notesTag     = document.getElementById('sch-notes-saved');

        const _showSaved = () => {
            if (notesTag) {
                notesTag.style.opacity = 1;
                setTimeout(() => notesTag.style.opacity = 0, 2000);
            }
        };

        if (notesSaveBtn && notesArea) {
            notesSaveBtn.addEventListener('click', () => {
                this.saveNotes(notesArea.value);
                notesSaveBtn.textContent = '✓ Saved!';
                notesSaveBtn.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';
                _showSaved();
                setTimeout(() => {
                    notesSaveBtn.textContent = '💾 Save Notes';
                    notesSaveBtn.style.background = '';
                }, 2000);
            });
        }

        // Notes — Clear button
        const notesClearBtn = document.getElementById('sch-notes-clear');
        if (notesClearBtn && notesArea) {
            notesClearBtn.addEventListener('click', () => {
                if (!notesArea.value.trim() || confirm('Clear today\'s notes?')) {
                    notesArea.value = '';
                    this.saveNotes('');
                }
            });
        }

        // Notes — auto-save on typing (in background, silent)
        if (notesArea) {
            notesArea.addEventListener('input', e => {
                clearTimeout(this._notesTimer);
                this._notesTimer = setTimeout(() => this.saveNotes(e.target.value), 1500);
            });
        }

        // Revision Reminder — Add button
        const reminderAddBtn = document.getElementById('sch-reminder-add');
        const reminderInput  = document.getElementById('sch-reminder-input');
        if (reminderAddBtn && reminderInput) {
            reminderAddBtn.addEventListener('click', () => {
                this.addReminder(reminderInput.value);
                reminderInput.value = '';
                reminderInput.focus();
            });
            reminderInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') reminderAddBtn.click();
            });
        }
    },

};

// ── Tiny helper (may already exist in dailyTracker.js — guard it)
if (typeof _st === 'undefined') {
    function _st(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }
}

// ── Expose globally
window.ScheduleEngine = ScheduleEngine;

// ── Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ScheduleEngine.init());
} else {
    ScheduleEngine.init();
}
