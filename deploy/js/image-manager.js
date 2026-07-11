/* ============================================
   IMAGE-MANAGER.JS - Gerenciamento de Imagens
   ============================================
   
   Upload para ImgBB - URLs limpas no markdown
   ============================================ */

const ImageManager = {
    // Configuração ImgBB
    IMGBB_API_KEY: 'a8ddbba76fb73a08f9d36aa5b7b9cecf',
    IMGBB_API_URL: 'https://api.imgbb.com/1/upload',
    
    init() {
        this.bindEvents();
    },

    bindEvents() {
        const btnInsertImg = document.getElementById('btn-insert-image');
        if (btnInsertImg) {
            btnInsertImg.addEventListener('click', () => this.showInsertModal());
        }
    },

    showInsertModal() {
        const modal = ModalManager.create({
            title: I18n.t('image'),
            size: 'md',
            content: `
                <div class="image-tabs">
                    <div class="image-tab active" data-tab="url">${I18n.t('imageURL')}</div>
                    <div class="image-tab" data-tab="upload">${I18n.t('imageUpload')}</div>
                </div>
                <div class="tab-content" id="tab-url">
                    <div class="form-group">
                        <label>${I18n.t('imageURL')}</label>
                        <input type="url" id="img-url-input" placeholder="https://exemplo.com/imagem.jpg">
                        <div class="form-hint">Cole a URL de qualquer imagem da web</div>
                    </div>
                    <div class="form-group">
                        <label>Texto Alternativo (alt)</label>
                        <input type="text" id="img-alt-input" placeholder="Descrição da imagem">
                    </div>
                    <div class="image-preview-container" id="img-preview-url">
                        <span class="placeholder"><i class="fas fa-image"></i> A preview aparecerá aqui</span>
                    </div>
                </div>
                <div class="tab-content hidden" id="tab-upload">
                    <div class="form-group">
                        <label>${I18n.t('imageUpload')}</label>
                        <input type="file" id="img-file-input" accept="image/*" style="display:none">
                        <button class="btn btn-secondary" onclick="document.getElementById('img-file-input').click()">
                            <i class="fas fa-upload"></i> Escolher arquivo
                        </button>
                        <div class="form-hint">Suporta JPG, PNG, GIF, SVG, WebP (max 32MB)</div>
                    </div>
                    <div class="form-group" style="margin-top: 12px;">
                        <label>Nome do arquivo (opcional)</label>
                        <input type="text" id="img-name-input" placeholder="nome-da-imagem">
                        <div class="form-hint">Usado como nome do arquivo no ImgBB</div>
                    </div>
                    <div class="image-preview-container" id="img-preview-upload">
                        <span class="placeholder"><i class="fas fa-image"></i> A preview aparecerá aqui</span>
                    </div>
                    <div id="img-upload-status" style="display:none; margin-top: 10px; padding: 10px; border-radius: 6px; font-size: 0.9em;"></div>
                </div>
            `,
            buttons: [
                { text: I18n.t('cancel'), class: 'btn-secondary', action: 'close' },
                { text: I18n.t('insertImage'), class: 'btn-primary', action: 'insert' }
            ]
        });

        this.setupModalEvents(modal);
    },

    setupModalEvents(modal) {
        const tabs = modal.querySelectorAll('.image-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                modal.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                modal.querySelector(`#tab-${tab.dataset.tab}`).classList.remove('hidden');
            });
        });

        const urlInput = modal.querySelector('#img-url-input');
        const previewUrl = modal.querySelector('#img-preview-url');
        let urlDebounce;

        urlInput.addEventListener('input', () => {
            clearTimeout(urlDebounce);
            urlDebounce = setTimeout(() => {
                const url = urlInput.value.trim();
                if (url && this.isValidImageUrl(url)) {
                    previewUrl.innerHTML = `<img src="${url}" onerror="this.parentElement.innerHTML='<span class=\\'placeholder\\'><i class=\\'fas fa-exclamation-triangle\\'></i> Não foi possível carregar a imagem</span>'">`;
                    previewUrl.classList.add('has-image');
                } else {
                    previewUrl.innerHTML = '<span class="placeholder"><i class="fas fa-image"></i> A preview aparecerá aqui</span>';
                    previewUrl.classList.remove('has-image');
                }
            }, 300);
        });

        const fileInput = modal.querySelector('#img-file-input');
        const previewUpload = modal.querySelector('#img-preview-upload');
        const uploadStatus = modal.querySelector('#img-upload-status');
        const nameInput = modal.querySelector('#img-name-input');

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // Validação de tamanho (32MB limite do ImgBB)
            if (file.size > 32 * 1024 * 1024) {
                uploadStatus.style.display = 'block';
                uploadStatus.style.background = '#fee2e2';
                uploadStatus.style.color = '#dc2626';
                uploadStatus.textContent = 'Arquivo muito grande. Máximo: 32MB';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (ev) => {
                previewUpload.innerHTML = `<img src="${ev.target.result}">`;
                previewUpload.classList.add('has-image');
                previewUpload.dataset.dataUrl = ev.target.result;
                previewUpload.dataset.fileName = file.name;
                
                // Preview do tamanho
                const sizeKB = (file.size / 1024).toFixed(1);
                const sizeText = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)}MB` : `${sizeKB}KB`;
                uploadStatus.style.display = 'block';
                uploadStatus.style.background = '#f0fdf4';
                uploadStatus.style.color = '#16a34a';
                uploadStatus.innerHTML = `<i class="fas fa-check-circle"></i> ${file.name} (${sizeText})`;
            };
            reader.readAsDataURL(file);
        });

        const insertBtn = modal.querySelector('[data-action="insert"]');
        insertBtn.addEventListener('click', async () => {
            const activeTab = modal.querySelector('.image-tab.active').dataset.tab;
            if (activeTab === 'url') {
                this.insertFromUrl(urlInput.value, modal.querySelector('#img-alt-input').value);
            } else {
                await this.insertFromUpload(previewUpload, nameInput.value, uploadStatus);
            }
            ModalManager.close(modal);
        });
    },

    insertFromUrl(url, alt) {
        if (!url || !this.isValidImageUrl(url)) {
            App.showToast('URL de imagem inválida', 'error');
            return;
        }
        alt = alt || url.split('/').pop().split('?')[0] || 'imagem';
        App.insertAtCursor(`\n![${alt}](${url})\n`);
        App.showToast('Imagem inserida via URL', 'success');
    },

    async insertFromUpload(previewEl, customName, statusEl) {
        const dataUrl = previewEl.dataset.dataUrl;
        const fileName = customName || previewEl.dataset.fileName || 'imagem';
        
        if (!dataUrl) {
            App.showToast('Selecione uma imagem primeiro', 'error');
            return;
        }

        // Mostrar loading
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = '#eff6ff';
            statusEl.style.color = '#2563eb';
            statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando para ImgBB...';
        }

        try {
            // Converter data URL para base64 puro
            const base64Data = dataUrl.split(',')[1];
            
            // Upload para ImgBB
            const response = await fetch(`${this.IMGBB_API_URL}?key=${this.IMGBB_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `image=${encodeURIComponent(base64Data)}&name=${encodeURIComponent(fileName.replace(/\.[^/.]+$/, ''))}`
            });

            const result = await response.json();

            if (result.success) {
                const imageUrl = result.data.url;
                const alt = fileName.replace(/\.[^/.]+$/, '');
                
                // Inserir URL limpa no markdown
                App.insertAtCursor(`\n![${alt}](${imageUrl})\n`);
                
                if (statusEl) {
                    statusEl.style.background = '#f0fdf4';
                    statusEl.style.color = '#16a34a';
                    statusEl.innerHTML = `<i class="fas fa-check-circle"></i> Imagem enviada com sucesso!`;
                }
                
                App.showToast('Imagem enviada para ImgBB - URL limpa inserida!', 'success');
            } else {
                throw new Error(result.error?.message || 'Erro ao enviar imagem');
            }
        } catch (error) {
            console.error('ImgBB upload error:', error);
            
            if (statusEl) {
                statusEl.style.background = '#fee2e2';
                statusEl.style.color = '#dc2626';
                statusEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Erro: ${error.message}`;
            }
            
            // Fallback: usar base64 se ImgBB falhar
            App.showToast('Erro no upload. Usando base64 como fallback...', 'warning');
            App.insertAtCursor(`\n![${fileName}](${dataUrl})\n`);
        }
    },

    isValidImageUrl(url) {
        try {
            new URL(url);
            return /\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)(\?.*)?$/i.test(url)
                || url.includes('imgur.com')
                || url.includes('imgbb.com')
                || url.includes('cloudinary.com')
                || url.includes('unsplash.com')
                || url.startsWith('data:image/');
        } catch {
            return false;
        }
    },

    async fetchImageForEPUB(url) {
        try {
            const response = await fetch(url, { mode: 'cors' });
            const blob = await response.blob();
            return blob;
        } catch (e) {
            console.warn('Failed to fetch image:', url, e);
            return null;
        }
    },

    getMimeType(url) {
        const ext = url.split('?')[0].split('.').pop().toLowerCase();
        const mimeMap = {
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
            'png': 'image/png', 'gif': 'image/gif',
            'svg': 'image/svg+xml', 'webp': 'image/webp',
            'bmp': 'image/bmp'
        };
        return mimeMap[ext] || 'image/png';
    },

    getExtension(url) {
        const ext = url.split('?')[0].split('.').pop().toLowerCase();
        const validExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'];
        return validExts.includes(ext) ? ext : 'png';
    }
};
