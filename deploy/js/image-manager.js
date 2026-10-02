/* ============================================
   IMAGE-MANAGER.JS - Gerenciamento de Imagens
   ============================================
   
   Upload para ImgBB - URLs limpas no markdown
   ============================================ */

const ImageManager = {
    // Configuração ImgBB
    IMGBB_API_KEY: 'a8ddbba76fb73a08f9d36aa5b7b9cecf',
    IMGBB_API_URL: 'https://api.imgbb.com/1/upload',

    // Hosts de imagem com domínio próprio (P7): a validação é por HOSTNAME do
    // URL parseado, nunca por includes() na string crua. Subdomínios são
    // aceitos (i.imgur.com, res.cloudinary.com, images.unsplash.com).
    ALLOWED_IMAGE_HOSTS: ['imgur.com', 'imgbb.com', 'cloudinary.com', 'unsplash.com'],
    
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
                    // P7: nada de interpolação de valor do usuário em HTML.
                    // O <img> é criado via DOM (.src/.alt), então a URL não
                    // entra em contexto de atributo; o fallback de erro é um
                    // handler registrado (addEventListener), não um atributo
                    // onerror inline.
                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = '';
                    img.addEventListener('error', () => {
                        previewUrl.innerHTML = '<span class="placeholder"><i class="fas fa-exclamation-triangle"></i> Não foi possível carregar a imagem</span>';
                        previewUrl.classList.remove('has-image');
                    });
                    previewUrl.innerHTML = '';
                    previewUrl.appendChild(img);
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
                // P7: mesmo tratamento — a data URL entra via propriedade DOM
                // (.src), nunca por interpolação em HTML.
                previewUpload.innerHTML = '';
                const img = document.createElement('img');
                img.src = ev.target.result;
                previewUpload.appendChild(img);
                previewUpload.classList.add('has-image');
                previewUpload.dataset.dataUrl = ev.target.result;
                previewUpload.dataset.fileName = file.name;
                
                // Preview do tamanho
                const sizeKB = (file.size / 1024).toFixed(1);
                const sizeText = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)}MB` : `${sizeKB}KB`;
                uploadStatus.style.display = 'block';
                uploadStatus.style.background = '#f0fdf4';
                uploadStatus.style.color = '#16a34a';
                // P7: file.name é texto de terceiros — textContent, nunca
                // innerHTML. O <i> é criado via DOM para preservar o visual.
                uploadStatus.textContent = '';
                const icon = document.createElement('i');
                icon.className = 'fas fa-check-circle';
                uploadStatus.appendChild(icon);
                uploadStatus.appendChild(document.createTextNode(` ${file.name} (${sizeText})`));
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
                // P7: error.message pode vir da resposta da API ImgBB — texto
                // de terceiros — textContent, nunca innerHTML.
                statusEl.textContent = '';
                const icon = document.createElement('i');
                icon.className = 'fas fa-exclamation-triangle';
                statusEl.appendChild(icon);
                statusEl.appendChild(document.createTextNode(` Erro: ${error.message}`));
            }
            
            // Fallback: usar base64 se ImgBB falhar
            App.showToast('Erro no upload. Usando base64 como fallback...', 'warning');
            App.insertAtCursor(`\n![${fileName}](${dataUrl})\n`);
        }
    },

    isValidImageUrl(url) {
        if (typeof url !== 'string') return false;
        const trimmed = url.trim();
        if (!trimmed) return false;
        // Fronteira defensiva (SECURITY-POLICY, princípio 14): a função valida
        // os próprios precondicionais, independentemente de quem chama. A URL
        // crua não pode conter delimitador de atributo/HTML: um `"` quebraria
        // qualquer contexto de atributo se um caller voltasse a interpolar.
        // URLs reais nunca contêm " < > (data:image/svg+xml com < literal fica
        // fora — só base64/percent-encoded é aceito).
        if (/["<>]/.test(trimmed)) return false;
        try {
            const parsed = new URL(trimmed);
            // data: só para data:image/ (fluxo readAsDataURL do upload).
            if (parsed.protocol === 'data:') {
                return /^data:image\//i.test(trimmed);
            }
            // Protocolo restrito a http(s) — javascript:, etc. morrem aqui.
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                return false;
            }
            // Hostname parseado, nunca includes() na string crua:
            // https://evil.com/?x=imgur.com não passa (hostname = evil.com).
            const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
            if (this.ALLOWED_IMAGE_HOSTS.some(h => host === h || host.endsWith('.' + h))) {
                return true;
            }
            // Caminho principal do produto ("URL de qualquer imagem da web"):
            // extensão de imagem no PATH do URL parseado. O vetor
            // `a.jpg?x=" onerror="` morre aqui: a extensão é verificada no
            // pathname, nunca na string crua com query.
            return /\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)$/i.test(parsed.pathname);
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
