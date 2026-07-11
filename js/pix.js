/* ============================================
   PIX.JS - Modal de Doacao PIX
   ============================================ */

const PIX_CONFIG = {
    chave: 'pedroluz@yahoo.com',
    nome: 'Pedro F F Luz',
    cidade: 'Resende RJ',
    valores: [10, 20, 50, 100],
    mensagemPadrao: 'Incentive meu trabalho! :)'
};

function pixTlv(tag, value) {
    return tag.toString().padStart(2, '0') +
           value.length.toString().padStart(2, '0') +
           value;
}

function crc16ccitt(str) {
    var crc = 0xFFFF;
    for (var i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (var j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function generatePixPayload(chave, nome, cidade, amount, message) {
    var payload = '';
    payload += pixTlv('00', '01');
    payload += pixTlv('01', '11');

    var merchantInfo = pixTlv('00', 'br.gov.bcb.pix') + pixTlv('01', chave);
    if (message && message.trim().length > 0) {
        var clean = message.trim().substring(0, 72).replace(/[^A-Za-z0-9$%*+\-.\/: ]/g, '');
        merchantInfo += pixTlv('02', clean);
    }
    payload += pixTlv('26', merchantInfo);

    payload += pixTlv('52', '0000');
    payload += pixTlv('53', '986');

    if (amount && amount > 0) {
        payload += pixTlv('54', amount.toFixed(2));
    }

    payload += pixTlv('58', 'BR');
    payload += pixTlv('59', nome.substring(0, 25).toUpperCase().replace(/[^A-Z0-9 ]/g, ''));
    payload += pixTlv('60', cidade.substring(0, 15).toUpperCase().replace(/[^A-Z0-9 ]/g, ''));
    payload += pixTlv('62', pixTlv('05', '***'));

    var crcPayload = payload + '6304';
    var crc = crc16ccitt(crcPayload);
    return payload + '6304' + crc;
}

function openPixModal() {
    var el = document.getElementById('pixModalOverlay');
    el.style.cssText = 'display:flex!important;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);z-index:9999;align-items:center;justify-content:center;';
    el.classList.add('open');

    var valDiv = document.getElementById('pixValues');
    if (!valDiv.children.length) {
        PIX_CONFIG.valores.forEach(function(v) {
            var btn = document.createElement('button');
            btn.className = 'pix-value-btn';
            btn.textContent = 'R$ ' + v;
            btn.onclick = function() { selectPixValue(v, btn); };
            valDiv.appendChild(btn);
        });
    }

    document.getElementById('pixMsgInput').value = '';
    document.getElementById('pixCustomInput').value = '0';
    document.querySelectorAll('.pix-value-btn').forEach(function(b, i) {
        b.classList.toggle('active', i === 0);
    });
    generatePix();
}

function closePixModal() {
    var el = document.getElementById('pixModalOverlay');
    el.style.cssText = 'display:none;';
    el.classList.remove('open');
}

function selectPixValue(val, btn) {
    document.querySelectorAll('.pix-value-btn').forEach(function(b) {
        b.classList.remove('active');
    });
    if (btn) btn.classList.add('active');
    document.getElementById('pixCustomInput').value = val;
    generatePix();
}

function generatePix() {
    var amt = parseFloat(document.getElementById('pixCustomInput').value) || 0;
    var msg = document.getElementById('pixMsgInput').value.trim();
    var payload = generatePixPayload(PIX_CONFIG.chave, PIX_CONFIG.nome, PIX_CONFIG.cidade, amt, msg || PIX_CONFIG.mensagemPadrao);
    var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' +
                encodeURIComponent(payload) + '&margin=8&format=png';
    document.getElementById('pixQr').src = qrUrl;
    document.getElementById('pixPayloadText').textContent = payload;
}

function copiarPix() {
    var text = document.getElementById('pixPayloadText').textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(function() {
        var btn = document.getElementById('pixCopyBtn');
        var orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
        btn.style.background = '#16a34a';
        // Mostrar instrucao abaixo
        var hint = document.querySelector('.pix-qr-hint');
        if (hint) hint.textContent = 'Agora abra o app do seu banco, clique em Copia e Cola e cole o codigo la!';
        setTimeout(function() {
            btn.innerHTML = orig;
            btn.style.background = '';
            if (hint) hint.textContent = 'Escaneie com o app do seu banco ou Copia e Cola';
        }, 4000);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('pixModal').addEventListener('click', function(e) { e.stopPropagation(); });
    document.getElementById('pixModalOverlay').addEventListener('click', function(e) {
        if (e.target === document.getElementById('pixModalOverlay')) closePixModal();
    });
    document.getElementById('pixCustomInput').addEventListener('input', function() {
        document.querySelectorAll('.pix-value-btn').forEach(function(b) { b.classList.remove('active'); });
        generatePix();
    });
    document.getElementById('pixMsgInput').addEventListener('input', function() {
        if (document.getElementById('pixCustomInput').value) generatePix();
    });
});
