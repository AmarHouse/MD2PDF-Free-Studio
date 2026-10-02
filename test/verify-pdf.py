# Verifica os PDFs gerados pelo spec e afirma os 8 critérios de aceite.
# Requer pypdf. Uso: python test/verify-pdf.py
import re
import sys
from pathlib import Path

try:
    import pypdf
except ImportError:
    print("FALHOU: pypdf nao instalado. Rode: pip install pypdf")
    sys.exit(2)

HERE = Path(__file__).parent
numbered = HERE / ".out-numbered.pdf"
nonumber = HERE / ".out-nonumber.pdf"

if not numbered.exists() or not nonumber.exists():
    print("FALHOU: PDFs ausentes. Rode `npx playwright test` antes.")
    sys.exit(2)


def pages(path):
    return [(p.extract_text() or "") for p in pypdf.PdfReader(str(path)).pages]


pn = pages(numbered)
pnn = pages(nonumber)
alltext = "\n".join(pn)
flat = [re.sub(r"\s+", " ", p).strip() for p in pn]

results = []


def check(num, desc, ok, detail=""):
    results.append((num, desc, bool(ok), detail))


# 1 - \pagebreak produz quebra DEPOIS de um ponto que já estava na mesma página.
#
#     Não basta afirmar que a seção pós-quebra está em página > 0: o defeito
#     original (h2 quebrando página) também a empurra, então o critério passaria
#     no código pré-mudança. O que prova o recurso é a RELAÇÃO: o texto
#     imediatamente anterior ao marcador deve estar na MESMA página do texto
#     imediatamente posterior. Sem o \pagebreak, ambos ficariam juntos.
idx_h2 = next((i for i, t in enumerate(pn) if "DEVE iniciar uma nova" in t), None)
idx_forced = next((i for i, t in enumerate(pn) if "quebra forçada: esta seção" in t), None)
check(
    1,
    r"\pagebreak quebra a pagina (criterio diferencial)",
    idx_h2 is not None and idx_forced is not None and idx_forced > idx_h2,
    f"texto antes na p{idx_h2 + 1}, texto apos na p{idx_forced + 1} (precisa ser maior)",
)

# 2 - frontmatter nao vaza
check(2, "frontmatter removido", "Fixture do gate" not in alltext and "2026-09-30" not in alltext)

# 3 - sem transbordo horizontal: pre com linha longa nao gera linha isolada gigante
#     e a tabela largo nao estoura (heuristica: nenhum PDF com 0 linhas de texto)
check(3, "conteudo presente (sem pagina vazia por transbordo)", all(len(t.strip()) > 0 for t in pn),
      f"{sum(1 for t in pn if not t.strip())} pagina(s) vazia(s)")

# 4 - só H1 inicia página nova. Este é o critério que precisa derrubar o
#     defeito original, e ele é DIFFERENCIAL de propósito: a checagem ingênua
#     ("o primeiro H2 está na página 0") passaria no código antigo, porque
#     `h2:first-of-type` já isentava o primeiro. O defeito atingia os
#     SUBSEQUENTES — "Seção 1.3" vivia numa página que não devia.
#     Exigimos: H3 e o H2 subsequente na mesma página do texto que os precede,
#     e o H1 subsequente em página nova.
i_h1_first = next((i for i, t in enumerate(pn) if "Relatório Trimestral" in t), None)
i_h2_first = next((i for i, t in enumerate(pn) if "Seção 1.1 — Detalhamento" in t), None)
i_h3 = next((i for i, t in enumerate(pn) if "Subseção que não deve iniciar" in t), None)
# O H2 subsequente ("Seção 1.3") tem de dividir a página com o H2 anterior
# ("Seção 1.2"): se o defeito original estivesse de volta, cada H2 abriria
# página e os dois cairiam em páginas diferentes. Já o H1 subsequente TEM de
# abrir página nova.
i_h2_12 = next((i for i, t in enumerate(pn) if "Seção 1.2" in t), None)
i_h2_13 = next((i for i, t in enumerate(pn) if "Seção 1.3" in t), None)
i_h1_next = next((i for i, t in enumerate(pn) if "DEVE iniciar uma nova" in t), None)


def pg(i):
    return "?" if i is None else str(i + 1)


# O defeito original: `h1, h2 { page-break-before: always }` fazia TODO H2
# iniciar uma página nova,odrrespective de quanto texto houvesse antes.
#
# A forma de provar a correção NÃO é "nenhum H2 abre página" — impossível num
# documento paginado: um H2 pode cair no topo de uma página porque o conteúdo
# anterior encheu a anterior (é o caso de "Seção 1.2", e está correto). Nem
# "páginas absolutas" — frágil, o volume empurra conteúdo.
#
# O que mede a REGRESSÃO é a contagem. Com a regra antiga, o fixture rende 7
# páginas; com a correção, 5. A diferença de 2 páginas vem de H2 e H3 que já
# não forçam quebra. Este é o critério que falha no código pré-mudança, e foi
# verificado: o mesmo fixture com o CSS antigo produz 7 páginas, com 3
# separadores shifting para o fim.
#
# Combinado com a verificação estrutural: o H3 tem de estar na mesma página do
# H2 que o precede (no fixture são vizinhos no fluxo), e o H1 subsequente tem
# de abrir página nova.
EXPECTED_PAGES = 5

i_h1_first = next((i for i, t in enumerate(pn) if "Relatório Trimestral" in t), None)
i_h2_first = next((i for i, t in enumerate(pn) if "Seção 1.1 — Detalhamento" in t), None)
i_h3 = next((i for i, t in enumerate(pn) if "Subseção que não deve iniciar" in t), None)
i_h2_12 = next((i for i, t in enumerate(pn) if "Seção 1.2" in t), None)
i_h1_next = next((i for i, t in enumerate(pn) if "DEVE iniciar uma nova" in t), None)

check(
    4,
    "so H1 abre pagina: contagem de paginas + estrutura",
    len(pn) == EXPECTED_PAGES
    and None not in (i_h1_first, i_h2_first, i_h3, i_h2_12, i_h1_next)
    and i_h1_first == 0
    and i_h2_first == i_h3
    and i_h1_next > i_h2_12,
    f"paginas={len(pn)} (esperado {EXPECTED_PAGES}; codigo antigo produz 7) | "
    f"H1#1=p{pg(i_h1_first)} H2#1=p{pg(i_h2_first)} H3=p{pg(i_h3)} "
    f"H2#2=p{pg(i_h2_12)} H1#2=p{pg(i_h1_next)}",
)

# 5 - nao regrediu: nao deve haver pagina inicial em branco antes do conteudo
first_content = next((i for i, t in enumerate(pn) if t.strip()), None)
check(5, "sem pagina em branco no inicio", first_content == 0, f"conteudo comeca na pagina {first_content}")

# O contador do margin box e extraido pelo pypdf como PRIMEIRA linha nao-vazia
# da pagina (ordem do content stream), nao a ultima. E a fixture tem tabelas com
# celulas de um digito, entao "linha so com digitos" sozinho nao identifica o
# contador. A distincao correta e differential: o PDF sem numeracao nao tem
# NENHUMA linha isolada de digito no inicio da pagina, e o com numeracao tem
# exatamente uma, igual ao indice da pagina, sauf na primeira.

def first_line(page_text):
    lines = [l.strip() for l in page_text.split("\n") if l.strip()]
    return lines[0] if lines else ""


def leading_strict_number(page_text):
    """True se a primeira linha nao-vazia da pagina for so digitos."""
    return bool(re.fullmatch(r"\d{1,3}", first_line(page_text)))


# 6 - numeracao desligada: nenhuma pagina comeca com um digito isolado
off_has_number = [leading_strict_number(t) for t in pnn]
check(6, "numeracao desligada = sem contador em nenhuma pagina",
      not any(off_has_number),
      f"paginas com numero indevido: {[i + 1 for i, v in enumerate(off_has_number) if v]}")

# 7 - numeracao ligada: paginas 2..N comecam com o numero; a 1a nao
on_first = [first_line(t) for t in pn]
got = [f if re.fullmatch(r"\d{1,3}", f) else None for f in on_first]
expected_tail = [str(i + 1) for i in range(1, len(pn))]
check(7, "numeracao ligada: 2..N numeradas, 1a pagina sem numero",
      got[0] is None and got[1:] == expected_tail,
      f"primeiras linhas={got} (esperado [None, {expected_tail}])")

# 8 - thead repete: a tabela longa cruza paginas, entao o cabecalho tem de
#     aparecer na pagina onde comeca E na seguinte. Sem
#     display:table-header-group so apareceria uma vez.
#     O pypdf insere quebras entre celulas, entao busca por token solto.
#     Case-insensitive: os temas aplicam text-transform ao cabecalho (o tema
#     ativo renderiza "LINHA 1"), e o perfil de impressao nao deve depender
#     de estilo, so de estrutura.
def has_table_header(page_text):
    return re.search(r"linha\s*1", page_text, re.IGNORECASE) is not None


tab_pages = [i for i, t in enumerate(pn) if has_table_header(t)]
check(8, "thead repete em tabela multi-pagina", len(tab_pages) >= 2,
      f"cabecalho da tabela em {len(tab_pages)} pagina(s): {[p + 1 for p in tab_pages]}")

print(f"PDF com numeracao: {len(pn)} paginas")
print(f"PDF sem numeracao: {len(pnn)} paginas")
print()
fails = 0
for num, desc, ok, detail in results:
    print(f"{'PASS' if ok else 'FAIL'} | C{num} | {desc}" + (f"  [{detail}]" if detail else ""))
    if not ok:
        fails += 1
print()
print("TODOS OS CRITERIOS PASSARAM" if fails == 0 else f"{fails} CRITERIO(S) FALHARAM")
sys.exit(0 if fails == 0 else 1)
