/*
   Strategy PDF — shared module
   ────────────────────────────
   Single source: assets/pdfs/NEET_31Day_Strategy.pdf
   - Roadmap tab: full upload guide + large actions
   - Schedule tab: compact quick-access card only
*/

const RoadmapPdf = {
    pdfPath: 'assets/pdfs/NEET_31Day_Strategy.pdf',
    fileName: 'NEET_31Day_Strategy.pdf',

    init: function () {
        this._applyLinks();
        this.cacheDOM();
        if (this.zone) this.attachDropZone();
        this.checkAvailability();
        console.log('📄 Strategy PDF ready (Roadmap + Schedule quick access)');
    },

    _applyLinks: function () {
        document.querySelectorAll('[data-pdf-open]').forEach(el => {
            el.href = this.pdfPath;
        });
        document.querySelectorAll('[data-pdf-download]').forEach(el => {
            el.href = this.pdfPath;
            el.setAttribute('download', this.fileName);
        });
    },

    cacheDOM: function () {
        this.zone = document.getElementById('rm-drop-zone');
        this.statusEls = document.querySelectorAll('[data-pdf-status]');
        this.openBtns = document.querySelectorAll('[data-pdf-open]');
        this.downloadBtns = document.querySelectorAll('[data-pdf-download]');
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
            if (file && file.type === 'application/pdf' && hint) {
                hint.textContent = `"${file.name}" — copy into assets/pdfs/ as NEET_31Day_Strategy.pdf`;
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
