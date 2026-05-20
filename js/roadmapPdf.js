/*
   Roadmap — Strategy PDF section
   Static PDF served from assets/pdfs/ (no server upload).
*/

const RoadmapPdf = {
    pdfPath: 'assets/pdfs/NEET_31Day_Strategy.pdf',
    fileName: 'NEET_31Day_Strategy.pdf',

    init: function () {
        this.cacheDOM();
        if (this.zone) this.attachDropZone();
        this.attachRoadmapLink();
        this.checkAvailability();
        console.log('📄 Strategy PDF ready (Roadmap + Schedule)');
    },

    cacheDOM: function () {
        this.zone = document.getElementById('rm-drop-zone');
        this.statusEls = [
            document.getElementById('rm-pdf-status'),
            document.getElementById('sch-pdf-status'),
        ].filter(Boolean);
        this.openBtns = [
            document.getElementById('rm-pdf-open'),
            document.getElementById('sch-pdf-open'),
        ].filter(Boolean);
        this.downloadBtns = [
            document.getElementById('rm-pdf-download'),
            document.getElementById('sch-pdf-download'),
        ].filter(Boolean);
        this.roadmapLinkBtn = document.getElementById('sch-pdf-roadmap-link');
    },

    attachRoadmapLink: function () {
        if (!this.roadmapLinkBtn) return;
        this.roadmapLinkBtn.addEventListener('click', () => {
            if (typeof TabManager !== 'undefined') {
                TabManager.switchTab('roadmap');
            } else {
                const btn = document.querySelector('[data-tab="roadmap"]');
                if (btn) btn.click();
            }
        });
    },

    attachDropZone: function () {
        const hint = this.zone.querySelector('.rm-drop-hint');

        ['dragenter', 'dragover'].forEach(evt => {
            this.zone.addEventListener(evt, e => {
                e.preventDefault();
                e.stopPropagation();
                this.zone.classList.add('is-dragover');
            });
        });

        ['dragleave', 'drop'].forEach(evt => {
            this.zone.addEventListener(evt, e => {
                e.preventDefault();
                e.stopPropagation();
                this.zone.classList.remove('is-dragover');
            });
        });

        this.zone.addEventListener('drop', e => {
            const file = e.dataTransfer?.files?.[0];
            if (file && file.type === 'application/pdf') {
                if (hint) {
                    hint.textContent = `"${file.name}" — copy this file into assets/pdfs/ as NEET_31Day_Strategy.pdf`;
                }
            }
        });
    },

    checkAvailability: function () {
        fetch(this.pdfPath, { method: 'HEAD' })
            .then(res => this.setStatus(res.ok))
            .catch(() => this.setStatus(false));
    },

    setStatus: function (ready) {
        this.statusEls.forEach(el => {
            el.classList.toggle('rm-status-ready', ready);
            el.classList.toggle('rm-status-missing', !ready);
            if (el.id === 'sch-pdf-status') {
                el.textContent = ready ? 'Ready' : 'Missing';
            } else {
                el.textContent = ready
                    ? 'PDF ready'
                    : 'PDF not found — add file to assets/pdfs/';
            }
        });

        [...this.openBtns, ...this.downloadBtns].forEach(btn => {
            if (ready) {
                btn.removeAttribute('aria-disabled');
                btn.classList.remove('is-disabled');
            } else {
                btn.setAttribute('aria-disabled', 'true');
                btn.classList.add('is-disabled');
            }
        });
    },
};

window.RoadmapPdf = RoadmapPdf;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => RoadmapPdf.init());
} else {
    RoadmapPdf.init();
}
