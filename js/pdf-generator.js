/* ============================================
   PDF-GENERATOR.JS - Exportação PDF Profissional
   ============================================ */

const PDFGenerator = {
    defaultSettings: {
        pageSize: 'a4',
        orientation: 'portrait',
        marginTop: 25,
        marginBottom: 25,
        marginLeft: 30,
        marginRight: 25,
        watermark: '',
        watermarkOpacity: 0.1,
        watermarkSize: 48,
        watermarkRotation: -45
    },

    settings: {},

    init() {
        this.settings = Storage.load('pdfSettings') || { ...this.defaultSettings };
        // Marca dagua sempre comeca vazia
        this.settings.watermark = '';
    },

    showSettings() {
        const modal = ModalManager.create({
            title: I18n.t('pageSettings'),
            size: 'md',
            content: `
                <div class="form-row">
                    <div class="form-group">
                        <label>${I18n.t('pageSize')}</label>
                        <select id="pdf-page-size">
                            <option value="a4" ${this.settings.pageSize === 'a4' ? 'selected' : ''}>A4 (210×297mm)</option>
                            <option value="a5" ${this.settings.pageSize === 'a5' ? 'selected' : ''}>A5 (148×210mm)</option>
                            <option value="letter" ${this.settings.pageSize === 'letter' ? 'selected' : ''}>Carta (216×279mm)</option>
                            <option value="legal" ${this.settings.pageSize === 'legal' ? 'selected' : ''}>Ofício (216×356mm)</option>
                            <option value="kindle" ${this.settings.pageSize === 'kindle' ? 'selected' : ''}>Kindle (120×190mm)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${I18n.t('orientation')}</label>
                        <select id="pdf-orientation">
                            <option value="portrait" ${this.settings.orientation === 'portrait' ? 'selected' : ''}>Retrato</option>
                            <option value="landscape" ${this.settings.orientation === 'landscape' ? 'selected' : ''}>Paisagem</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Margem Superior (mm)</label>
                        <input type="number" id="pdf-margin-top" value="${this.settings.marginTop}" min="0" max="100">
                    </div>
                    <div class="form-group">
                        <label>Margem Inferior (mm)</label>
                        <input type="number" id="pdf-margin-bottom" value="${this.settings.marginBottom}" min="0" max="100">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Margem Esquerda (mm)</label>
                        <input type="number" id="pdf-margin-left" value="${this.settings.marginLeft}" min="0" max="100">
                    </div>
                    <div class="form-group">
                        <label>Margem Direita (mm)</label>
                        <input type="number" id="pdf-margin-right" value="${this.settings.marginRight}" min="0" max="100">
                    </div>
                </div>
                <hr style="margin: 16px 0; border-color: var(--border);">
                <div class="form-group">
                    <label>${I18n.t('watermark')} (opcional)</label>
                    <input type="text" id="pdf-watermark" value="${this.settings.watermark}" placeholder="Ex: RASCUNHO, CONFIDENCIAL">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Opacidade</label>
                        <input type="range" id="pdf-watermark-opacity" min="0.05" max="0.5" step="0.05" value="${this.settings.watermarkOpacity}">
                    </div>
                    <div class="form-group">
                        <label>Tamanho</label>
                        <input type="number" id="pdf-watermark-size" value="${this.settings.watermarkSize}" min="20" max="120">
                    </div>
                </div>
            `,
            buttons: [
                { text: I18n.t('cancel'), class: 'btn-secondary', action: 'close' },
                { text: 'Restaurar Padrões', class: 'btn-secondary', action: 'reset' },
                { text: `${I18n.t('exportPDF')} Agora`, class: 'btn-primary', action: 'export' }
            ]
        });

        modal.querySelector('[data-action="reset"]').addEventListener('click', () => {
            this.settings = { ...this.defaultSettings };
            ModalManager.close(modal);
            this.showSettings();
        });

        modal.querySelector('[data-action="export"]').addEventListener('click', () => {
            this.settings = {
                pageSize: modal.querySelector('#pdf-page-size').value,
                orientation: modal.querySelector('#pdf-orientation').value,
                marginTop: parseInt(modal.querySelector('#pdf-margin-top').value) || 20,
                marginBottom: parseInt(modal.querySelector('#pdf-margin-bottom').value) || 20,
                marginLeft: parseInt(modal.querySelector('#pdf-margin-left').value) || 20,
                marginRight: parseInt(modal.querySelector('#pdf-margin-right').value) || 20,
                watermark: modal.querySelector('#pdf-watermark').value,
                watermarkOpacity: parseFloat(modal.querySelector('#pdf-watermark-opacity').value) || 0.1,
                watermarkSize: parseInt(modal.querySelector('#pdf-watermark-size').value) || 48
            };
            Storage.save('pdfSettings', this.settings);
            ModalManager.close(modal);
            this.generate();
        });
    },

    getBookTitle() {
        const text = App?.dom?.input?.value || '';
        const match = text.match(/^#\s+(.+)$/m);
        return match ? match[1].replace(/[<>:"/\\|?*]/g, '').trim() : 'Documento';
    },

    async generate() {
        App.showToast('Gerando PDF...', 'info');

        try {
            const previewContent = document.getElementById('preview-content');
            if (!previewContent) throw new Error('Preview não encontrado');

            const bookTitle = this.getBookTitle();
            const printWindow = window.open('', '_blank');
            if (!printWindow) throw new Error('Popup bloqueado. Permita popups para gerar PDF.');

            const theme = ThemeManager.get(App.currentIndex);
            const themeCSS = ThemeManager.getPrintCSS(theme);
            const fontLink = getGoogleFontsLink(theme.fonts.head, theme.fonts.body);

            const sizeMap = {
                'a4': '210mm', 'a5': '148mm',
                'letter': '216mm', 'legal': '216mm',
                'kindle': '120mm'
            };
            const heightMap = {
                'a4': '297mm', 'a5': '210mm',
                'letter': '279mm', 'legal': '356mm',
                'kindle': '190mm'
            };

            const pageWidth = this.settings.orientation === 'landscape' ? heightMap[this.settings.pageSize] : sizeMap[this.settings.pageSize];
            const pageHeight = this.settings.orientation === 'landscape' ? sizeMap[this.settings.pageSize] : heightMap[this.settings.pageSize];

            let watermarkCSS = '';
            if (this.settings.watermark) {
                watermarkCSS = `
                    body::before {
                        content: "${this.settings.watermark}";
                        position: fixed;
                        top: 50%; left: 50%;
                        transform: translate(-50%, -50%) rotate(${this.settings.watermarkRotation}deg);
                        font-size: ${this.settings.watermarkSize}px;
                        color: rgba(0,0,0,${this.settings.watermarkOpacity});
                        font-family: ${theme.fonts.head};
                        font-weight: 200;
                        letter-spacing: 0.3em;
                        text-transform: uppercase;
                        pointer-events: none;
                        z-index: 9999;
                        white-space: nowrap;
                        opacity: 0.6;
                    }
                `;
            }

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${bookTitle}</title>
                    <meta name="author" content="MD2PDF Studio">
                    <meta name="subject" content="${bookTitle}">
                    <meta name="creator" content="MD2PDF Studio">
                    <meta name="producer" content="MD2PDF Studio">
                    ${fontLink}
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <style>
                        @page {
                            size: ${pageWidth} ${pageHeight};
                            margin: ${this.settings.marginTop}mm ${this.settings.marginRight}mm ${this.settings.marginBottom}mm ${this.settings.marginLeft}mm;
                            @bottom-center {
                                content: counter(page);
                                font-size: 9pt;
                                font-family: ${theme.fonts.body};
                                color: #999;
                            }
                        }
                        @page :first {
                            @bottom-center { content: none; }
                        }
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            margin: 0;
                            padding: 0;
                            -webkit-font-smoothing: antialiased;
                            -moz-osx-font-smoothing: grayscale;
                            text-rendering: optimizeLegibility;
                            font-kerning: normal;
                        }
                        ${themeCSS}
                        body { padding: 0 !important; margin: 0 !important; }
                        ${watermarkCSS}
                        img { max-width: 100%; height: auto; }
                        h1, h2 { page-break-before: always; }
                        body > *:first-child,
                        body > *:first-child h1,
                        body > *:first-child h2 {
                            page-break-before: auto !important;
                        }
                        h1, h2, h3 { page-break-after: avoid; }
                        blockquote, ul, ol, li, table, img { page-break-inside: avoid; }
                        p { orphans: 3; widows: 3; }
                    </style>
                </head>
                <body>${previewContent.innerHTML}</body>
                </html>
            `);

            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                App.showToast('PDF pronto! Use "Salvar como PDF" no diálogo de impressão.', 'success');
            }, 500);

        } catch (e) {
            console.error('PDF generation error:', e);
            App.showToast('Erro ao gerar PDF: ' + e.message, 'error');
        }
    }
};
