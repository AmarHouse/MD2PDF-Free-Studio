# js/vendor — dependências self-hosted

| Arquivo | Versão | Licença | Origem |
|---|---|---|---|
| `dompurify.min.js` | DOMPurify 3.4.16 | MPL-2.0 / Apache-2.0 (dual) | `dist/purify.min.js` do pacote npm `dompurify@3.4.16` |

## Por que self-host (decisão D1 do plano md2pdf-sanitize-p1)

- O produto é PWA com promessa de offline (`sw.js` cache-first): um
  sanitizador vindo de CDN seria dependência de rede no caminho crítico de
  segurança, além de mais um CDN sem SRI (achado P3 do SECURITY-REVIEW.md).
- O produto não tem build step: basta copiar o arquivo de `dist/`.
- DOMPurify não entra no `package.json` de dependências — é vendor, não
  dependência de build.

## Atualizar

```text
npm pack dompurify@<versão> --pack-destination <temp>
tar -xzf dompurify-<versão>.tgz
copiar package/dist/purify.min.js para cá
```

Bump de `CACHE_VERSION` em `sw.js` a cada atualização.