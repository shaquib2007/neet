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
        this.checkAvailability();
        console.log('📄 Roadmap PDF section ready');
    },

    cacheDOM: function () {
        this.zone = document.getElementById('rm-drop-zone');
        this.statusEl = document.getElementById('rm-pdf-status');
        this.openBtn = document.getElementById('rm-pdf-open');
        this.downloadBtn = document.getElementById('rm-pdf-download');
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
                hint.textContent = `"${file.name}" — copy this file into assets/pdfs/ as NEET_31Day_Strategy.pdf`;
            }
        });
    },

    checkAvailability: function () {
        fetch(this.pdfPath, { method: 'HEAD' })
            .then(res => this.setStatus(res.ok))
            .catch(() => this.setStatus(false));
    },

    setStatus: function (ready) {
        if (!this.statusEl) return;

        this.statusEl.classList.toggle('rm-status-ready', ready);
        this.statusEl.classList.toggle('rm-status-missing', !ready);
        this.statusEl.textContent = ready
            ? 'PDF ready'
            : 'PDF not found — add file to assets/pdfs/';

        [this.openBtn, this.downloadBtn].forEach(btn => {
            if (!btn) return;
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
