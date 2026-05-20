/*
   NEET Performance Engine
   ───────────────────────
   Advanced analytics: weak topic detection + NEET readiness score.
   Uses: ChapterDatabase, AnalyticsEngine, DailyTracker (when available).
*/

const PerformanceEngine = {
    storageKey: 'neetPerformance',

    // Weak-score weights (must sum to ~1.0 for interpretability)
    weights: {
        completion: 0.30,
        confidence: 0.22,
        revision: 0.20,
        mockPractice: 0.13,
        status: 0.10,
        mistakes: 0.05,
    },

    init: function () {
        this._loadMistakeCache();
        this.render();
        this._bindTabRefresh();
        console.log('🧠 Performance Engine initialized');
    },

    _bindTabRefresh: function () {
        const btn = document.querySelector('[data-tab="analytics"]');
        if (btn) {
            btn.addEventListener('click', () => {
                this._loadMistakeCache();
                this.render();
            });
        }
    },

    // ── Pull mistake counts by subject from Daily Tracker
    _loadMistakeCache: function () {
        this._mistakesBySubject = { biology: 0, chemistry: 0, physics: 0, general: 0 };
        const mistakes = window.DailyTracker?.data?.mistakes;
        if (!mistakes || !mistakes.length) return;

        const map = {
            biology: /bio|biology|botany|zoology|ncert bio/i,
            chemistry: /chem|organic|inorganic|physical chem|mole/i,
            physics: /phys|mechanic|optics|electro|thermo|wave/i,
        };

        mistakes.forEach(m => {
            const text = `${m.text || ''} ${m.type || ''}`;
            let matched = false;
            for (const [subj, re] of Object.entries(map)) {
                if (re.test(text)) {
                    this._mistakesBySubject[subj]++;
                    matched = true;
                    break;
                }
            }
            if (!matched) this._mistakesBySubject.general++;
        });
    },

    _subjectForChapter: function (chapter) {
        if (ChapterDatabase.biology.some(c => c.id === chapter.id)) return 'biology';
        if (ChapterDatabase.chemistry.some(c => c.id === chapter.id)) return 'chemistry';
        if (ChapterDatabase.physics.some(c => c.id === chapter.id)) return 'physics';
        return 'biology';
    },

    // ─────────────────────────────────────────
    // 1. WEAK CHAPTER DETECTION
    // ─────────────────────────────────────────
    /*
     * Each chapter gets a weakness score 0–100 (higher = weaker).
     * Factors:
     *   - Low completion % (inverted progress)
     *   - Low confidence
     *   - Insufficient revisions for current progress
     *   - Low PYQ/mock practice completion
     *   - status === 'weak'
     *   - Subject mistake load from Daily Tracker
     * High-priority chapters get a 1.12× multiplier.
     */
    computeChapterWeakness: function (chapter) {
        const w = this.weights;
        const progressGap = (100 - (chapter.progress || 0)) / 100;
        const conf = chapter.confidence || 0;
        const confidenceGap = (100 - conf) / 100;

        let revisionGap = 0;
        const prog = chapter.progress || 0;
        const rev = chapter.revisions || 0;
        if (prog >= 60 && rev < 2) revisionGap = 1;
        else if (prog >= 30 && rev < 1) revisionGap = 0.75;
        else if (prog > 0) revisionGap = Math.max(0, (2 - rev) / 2);
        else if (chapter.priority === 'high') revisionGap = 0.4;

        const pyqGap = (100 - (chapter.pyqCompletion || 0)) / 100;

        let statusGap = 0;
        if (chapter.status === 'weak') statusGap = 1;
        else if (chapter.status === 'neutral' && prog < 45) statusGap = 0.35;

        const subj = this._subjectForChapter(chapter);
        const subMistakes = this._mistakesBySubject[subj] || 0;
        const mistakeGap = Math.min(1, subMistakes / 8);

        let score =
            progressGap * w.completion * 100 +
            confidenceGap * w.confidence * 100 +
            revisionGap * w.revision * 100 +
            pyqGap * w.mockPractice * 100 +
            statusGap * w.status * 100 +
            mistakeGap * w.mistakes * 100;

        if (chapter.priority === 'high') score *= 1.12;
        else if (chapter.priority === 'medium') score *= 1.05;

        return Math.min(100, Math.round(score));
    },

    getWeakChaptersRanked: function (limit = 12) {
        return ChapterDatabase.getAllChapters()
            .map(ch => ({
                ...ch,
                subject: this._subjectForChapter(ch),
                weaknessScore: this.computeChapterWeakness(ch),
            }))
            .filter(ch => ch.weaknessScore >= 25)
            .sort((a, b) => b.weaknessScore - a.weaknessScore)
            .slice(0, limit);
    },

    // ─────────────────────────────────────────
    // 2. NEET READINESS SCORE
    // ─────────────────────────────────────────
    /*
     * Overall preparation % (0–100):
     *   35% — Mark-weighted syllabus mastery (progress × chapter marks)
     *   15% — Chapter completion rate (100% done)
     *   15% — Average confidence across chapters
     *   10% — Revision health (% started chapters with ≥1 revision)
     *   15% — Mock test performance (or mastery fallback if no mocks)
     *   10% — Study consistency (last 7 days from Daily Tracker)
     */
    getNeetReadinessScore: function () {
        const chapters = ChapterDatabase.getAllChapters();
        const totalMarks = ChapterDatabase.getTotalMarks() || 720;

        const mastery = chapters.reduce((s, ch) => s + (ch.progress || 0) * ch.marks, 0) / totalMarks;

        const completion =
            (chapters.filter(ch => ch.progress === 100).length / chapters.length) * 100;

        const avgConfidence =
            chapters.reduce((s, ch) => s + (ch.confidence || 0), 0) / chapters.length;

        const started = chapters.filter(ch => ch.progress > 0);
        const revisionHealth = started.length
            ? (started.filter(ch => (ch.revisions || 0) >= 1).length / started.length) * 100
            : 0;

        let mockPct = 0;
        const mocks = AnalyticsEngine.data?.mocks || [];
        if (mocks.length) {
            mockPct =
                mocks.reduce((s, m) => s + (m.percentage || (m.score / m.totalMarks) * 100), 0) /
                mocks.length;
        } else {
            mockPct = mastery;
        }

        const consistency = this._getConsistencyScore();

        const score = Math.round(
            mastery * 0.35 +
            completion * 0.15 +
            avgConfidence * 0.15 +
            revisionHealth * 0.1 +
            mockPct * 0.15 +
            consistency * 0.1
        );

        return {
            total: Math.min(100, Math.max(0, score)),
            breakdown: {
                mastery: Math.round(mastery),
                completion: Math.round(completion),
                confidence: Math.round(avgConfidence),
                revisionHealth: Math.round(revisionHealth),
                mockPct: Math.round(mockPct),
                consistency: Math.round(consistency),
            },
        };
    },

    _getConsistencyScore: function () {
        const history = window.DailyTracker?.data?.history || [];
        const today = window.DailyTracker?.data?.today;
        const last7 = [];

        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toDateString();
            if (i === 0 && today?.date === key && (today.studyHours > 0 || today.checklist?.some(c => c.done))) {
                last7.push(1);
                continue;
            }
            const day = history.find(h => h.date === key);
            if (day && (day.studyHours > 0 || day.checklist?.some(c => c.done))) last7.push(1);
            else last7.push(0);
        }

        const activeDays = last7.filter(Boolean).length;
        return Math.round((activeDays / 7) * 100);
    },

    _readinessLabel: function (score) {
        if (score >= 80) return { text: 'Exam Ready', class: 'an-ready-high' };
        if (score >= 60) return { text: 'Strong Progress', class: 'an-ready-mid' };
        if (score >= 40) return { text: 'Building Momentum', class: 'an-ready-low' };
        return { text: 'Needs Focus', class: 'an-ready-critical' };
    },

    // ─────────────────────────────────────────
    // RENDER — Analytics tab
    // ─────────────────────────────────────────
    render: function () {
        const readiness = this.getNeetReadinessScore();
        const weak = this.getWeakChaptersRanked(10);

        this._renderReadinessHero(readiness);
        this._renderWeakTopics(weak);
        this._renderBreakdown(readiness.breakdown);
        this._renderLegacyCards(readiness);
    },

    _renderReadinessHero: function (readiness) {
        const ring = document.getElementById('an-readiness-ring');
        const val = document.getElementById('an-readiness-value');
        const label = document.getElementById('an-readiness-label');
        const sub = document.getElementById('an-readiness-sub');

        if (!ring || !val) return;

        const r = 54;
        const circ = 2 * Math.PI * r;
        const offset = circ - (readiness.total / 100) * circ;
        ring.style.strokeDasharray = circ;
        ring.style.strokeDashoffset = offset;
        ring.style.stroke =
            readiness.total >= 80 ? '#22c55e' : readiness.total >= 60 ? '#667eea' : readiness.total >= 40 ? '#f59e0b' : '#ef4444';

        val.textContent = readiness.total + '%';

        const lbl = this._readinessLabel(readiness.total);
        if (label) {
            label.textContent = lbl.text;
            label.className = 'an-readiness-badge ' + lbl.class;
        }
        if (sub) {
            sub.textContent = `Expected marks ~${AnalyticsEngine.getExpectedMarks()}/720 · ${ChapterDatabase.getAllChapters().filter(c => c.progress === 100).length} chapters complete`;
        }
    },

    _renderBreakdown: function (b) {
        const items = [
            { key: 'mastery', label: 'Syllabus Mastery', pct: b.mastery },
            { key: 'completion', label: 'Completion', pct: b.completion },
            { key: 'confidence', label: 'Confidence', pct: b.confidence },
            { key: 'revisionHealth', label: 'Revision Health', pct: b.revisionHealth },
            { key: 'mockPct', label: 'Mock / PYQ', pct: b.mockPct },
            { key: 'consistency', label: '7-Day Consistency', pct: b.consistency },
        ];

        const container = document.getElementById('an-readiness-breakdown');
        if (!container) return;

        container.innerHTML = items
            .map(
                item => `
            <div class="an-breakdown-row">
                <span class="an-breakdown-label">${item.label}</span>
                <div class="an-breakdown-bar-wrap">
                    <div class="an-breakdown-bar" style="width:${item.pct}%"></div>
                </div>
                <span class="an-breakdown-pct">${item.pct}%</span>
            </div>`
            )
            .join('');
    },

    _renderWeakTopics: function (weak) {
        const list = document.getElementById('an-weak-list');
        const count = document.getElementById('an-weak-count');
        if (!list) return;

        if (count) count.textContent = weak.length ? `${weak.length} flagged` : 'None flagged';

        if (!weak.length) {
            list.innerHTML = `<p class="an-weak-empty">No critical weak chapters detected. Keep revising high-weight topics.</p>`;
            return;
        }

        const subjIcon = { biology: '🧬', chemistry: '🧪', physics: '⚛️' };

        list.innerHTML = weak
            .map(ch => {
                const reasons = this._weakReasons(ch);
                return `
            <div class="an-weak-item" data-id="${ch.id}">
                <div class="an-weak-top">
                    <span class="an-weak-subj">${subjIcon[ch.subject] || '📚'} ${ch.subject}</span>
                    <span class="an-weak-score">${ch.weaknessScore}% weak</span>
                </div>
                <h4 class="an-weak-name">${ch.name}</h4>
                <div class="an-weak-bar-wrap">
                    <div class="an-weak-bar" style="width:${ch.weaknessScore}%"></div>
                </div>
                <p class="an-weak-meta">
                    ${ch.progress}% done · ${ch.revisions} rev · ${ch.confidence}% conf · ${ch.marks} marks
                </p>
                <p class="an-weak-reasons">${reasons}</p>
            </div>`;
            })
            .join('');
    },

    _weakReasons: function (ch) {
        const r = [];
        if (ch.progress < 40) r.push('Low completion');
        if ((ch.confidence || 0) < 40) r.push('Low confidence');
        if (ch.progress > 0 && (ch.revisions || 0) < 2) r.push('Needs more revision');
        if ((ch.pyqCompletion || 0) < 30) r.push('Low PYQ practice');
        if (ch.status === 'weak') r.push('Marked weak');
        if (this._mistakesBySubject?.[ch.subject] > 0) r.push('Recent mistakes in subject');
        return r.length ? r.join(' · ') : 'High-weight chapter needs attention';
    },

    _renderLegacyCards: function (readiness) {
        const bars = document.querySelectorAll('#an-subject-chart .an-subject-bar');
        if (bars.length) {
            ['physics', 'chemistry', 'biology'].forEach((subj, i) => {
                const pct = AnalyticsEngine.getSubjectProgress(subj);
                const bar = bars[i];
                if (bar) {
                    bar.style.height = Math.max(8, pct) + '%';
                    bar.dataset.pct = pct + '%';
                    const span = bar.querySelector('span');
                    if (span) span.textContent = pct + '%';
                }
            });
        }

        const hoursEl = document.getElementById('an-weekly-hours');
        if (hoursEl && window.DailyTracker?.data) {
            const hist = DailyTracker.data.history || [];
            const recent = hist.slice(-7);
            const avg =
                recent.length > 0
                    ? recent.reduce((s, d) => s + (d.studyHours || 0), 0) / recent.length
                    : DailyTracker.data.today?.studyHours || 0;
            hoursEl.textContent = avg.toFixed(1) + 'h';
        }

        const mockList = document.getElementById('an-mock-list');
        if (mockList) {
            const mocks = AnalyticsEngine.data?.mocks || [];
            if (!mocks.length) {
                mockList.innerHTML = '<li class="an-mock-empty">No mocks logged yet — add scores in AnalyticsEngine</li>';
            } else {
                mockList.innerHTML = mocks
                    .slice(-5)
                    .reverse()
                    .map(
                        (m, i) =>
                            `<li>Mock ${m.mockNumber || mocks.length - i}: <strong>${m.score}/${m.totalMarks || 720}</strong></li>`
                    )
                    .join('');
            }
        }
    },
};

window.PerformanceEngine = PerformanceEngine;

function _initPerformanceEngine() {
    if (typeof ChapterDatabase === 'undefined' || typeof AnalyticsEngine === 'undefined') return;
    PerformanceEngine.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(_initPerformanceEngine, 100));
} else {
    setTimeout(_initPerformanceEngine, 100);
}
