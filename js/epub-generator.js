/* ============================================
   EPUB-GENERATOR.JS - Exportação EPUB3 Melhorada
   ============================================ */

const EPUBGenerator = {
    async generate() {
        const btn = App.dom.exportBtn;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Gerando...`;
        btn.disabled = true;

        try {
            const zip = new JSZip();
            const theme = ThemeManager.get(App.dom.select.value);
            let contentHTML = marked.parse(App.dom.input.value);
            contentHTML = App.processSpecialBlocks(contentHTML);

            // Build TOC
            if (App.dom.tocCheck.checked) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(contentHTML, 'text/html');
                const headers = doc.querySelectorAll('h1');
                if (headers.length > 0) {
                    let tocHTML = '<nav epub:type="toc" id="toc"><h1>Índice</h1><ol>';
                    let idCounter = 1;
                    headers.forEach(h => {
                        const id = `toc-${idCounter++}`;
                        h.id = id;
                        tocHTML += `<li><a href="#${id}">${h.innerText}</a></li>`;
                    });
                    tocHTML += '</ol></nav>';
                    contentHTML = doc.body.innerHTML;
                    // Store TOC separately
                    var tocContent = tocHTML;
                }
            }

            // Process images
            const parser = new DOMParser();
            const doc = parser.parseFromString(contentHTML, 'text/html');
            const imgs = doc.querySelectorAll('img');
            let imageIndex = 1;
            const imagesFolder = zip.folder("OEBPS/Images");

            for (let img of imgs) {
                const src = img.getAttribute('src') || img.src;

                if (src.startsWith('data:')) {
                    // Base64 image - extract and save
                    const matches = src.match(/^data:(.+);base64,(.+)$/);
                    if (matches) {
                        const ext = matches[1].split('/')[1] || 'png';
                        const filename = `image_${imageIndex}.${ext}`;
                        imagesFolder.file(filename, matches[2], { base64: true });
                        img.setAttribute('src', `../Images/${filename}`);
                        imageIndex++;
                    }
                } else if (src.startsWith('http')) {
                    // External URL - try to fetch and embed
                    try {
                        const response = await fetch(src, { mode: 'cors' });
                        const blob = await response.blob();
                        const ext = ImageManager.getExtension(src);
                        const filename = `image_${imageIndex}.${ext}`;
                        const arrayBuffer = await blob.arrayBuffer();
                        imagesFolder.file(filename, new Uint8Array(arrayBuffer));
                        img.setAttribute('src', `../Images/${filename}`);
                        imageIndex++;
                    } catch (e) {
                        // Keep original URL if fetch fails
                        console.warn('Could not fetch external image:', src);
                    }
                }
            }
            contentHTML = doc.body.innerHTML;

            // Extract metadata
            const titleMatch = App.dom.input.value.match(/^#\s+(.*)$/m);
            const bookTitle = titleMatch ? titleMatch[1] : "Livro";
            const cleanId = bookTitle.replace(/[^a-zA-Z0-9]/g, "_");

            // EPUB structure
            zip.file("mimetype", "application/epub+zip");

            zip.folder("META-INF").file("container.xml",
                `<?xml version="1.0" encoding="UTF-8"?>
                <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
                    <rootfiles>
                        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
                    </rootfiles>
                </container>`
            );

            const oebps = zip.folder("OEBPS");

            // CSS
            const bookCSS = ThemeManager.getPrintCSS(theme);
            oebps.file("Styles/style.css", bookCSS);

            // Content XHTML
            const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
            <!DOCTYPE html>
            <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
            <head>
                <title>${bookTitle}</title>
                <link rel="stylesheet" type="text/css" href="../Styles/style.css"/>
            </head>
            <body>
                ${contentHTML}
            </body>
            </html>`;
            oebps.file("Text/content.xhtml", xhtml);

            // Navigation
            let navHTML = `<?xml version="1.0" encoding="UTF-8"?>
            <!DOCTYPE html>
            <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
            <head>
                <title>Navegação</title>
                <link rel="stylesheet" type="text/css" href="../Styles/style.css"/>
            </head>
            <body>
                <nav epub:type="toc" id="toc">
                    <h1>Índice</h1>
                    <ol>
                        <li><a href="Text/content.xhtml">${bookTitle}</a></li>
                    </ol>
                </nav>
            </body>
            </html>`;

            if (tocContent) {
                navHTML = `<?xml version="1.0" encoding="UTF-8"?>
                <!DOCTYPE html>
                <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
                <head>
                    <title>Navegação</title>
                    <link rel="stylesheet" type="text/css" href="../Styles/style.css"/>
                </head>
                <body>
                    ${tocContent}
                </body>
                </html>`;
            }
            oebps.file("Text/nav.xhtml", navHTML);

            // OPF Package
            const imageManifest = [];
            for (let i = 1; i < imageIndex; i++) {
                const ext = ImageManager.getExtension('image.' + i);
                const mediaType = ImageManager.getMimeType('image.' + ext);
                imageManifest.push(`<item id="img${i}" href="Images/image_${i}.${ext}" media-type="${mediaType}"/>`);
            }

            const opf = `<?xml version="1.0" encoding="UTF-8"?>
            <package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid">
                <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
                    <dc:identifier id="uid">${cleanId}</dc:identifier>
                    <dc:title>${bookTitle}</dc:title>
                    <dc:language>pt-BR</dc:language>
                    <dc:creator>MD2PDF Premium</dc:creator>
                    <dc:publisher>MD2PDF Premium</dc:publisher>
                    <dc:date>${new Date().toISOString().split('T')[0]}</dc:date>
                    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
                </metadata>
                <manifest>
                    <item id="nav" href="Text/nav.xhtml" properties="nav" media-type="application/xhtml+xml"/>
                    <item id="style" href="Styles/style.css" media-type="text/css"/>
                    <item id="content" href="Text/content.xhtml" media-type="application/xhtml+xml"/>
                    ${imageManifest.join('\n                    ')}
                </manifest>
                <spine>
                    <itemref idref="content"/>
                </spine>
            </package>`;
            oebps.file("content.opf", opf);

            // Generate and download
            const blob = await zip.generateAsync({
                type: "blob",
                mimeType: "application/epub+zip",
                compression: "DEFLATE",
                compressionOptions: { level: 6 }
            });

            saveAs(blob, `${bookTitle}.epub`);
            App.showToast('EPUB gerado com sucesso!', 'success');

        } catch (e) {
            console.error('EPUB generation error:', e);
            App.showToast('Erro ao gerar EPUB: ' + e.message, 'error');
        } finally {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    }
};
