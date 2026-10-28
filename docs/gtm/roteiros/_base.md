# Base — marca, formato e prompt ChatGPT

Use este arquivo em todo nicho. Os roteiros por nicho só preenchem o conteúdo; as regras ficam aqui.

---

## Marca

| Item | Valor |
|------|-------|
| Nome | Waitless |
| Tagline | FILA INTELIGENTE |
| Site | https://www.waitless.solutions |
| Navy | `#0A1B3F` |
| Laranja (CTA) | `#FF6600` |
| Off-white | `#F8F9FA` |

Referência: [docs/DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md).

## Logo (obrigatório — não inventar)

O ChatGPT **não pode redesenhar** a marca. Na arte que você gerou, o ícone/tipografia costuma sair diferente do oficial.

| Arquivo | Uso |
|---------|-----|
| [assets/logo-waitless.png](./assets/logo-waitless.png) | Logo completa (ícone + Waitless + FILA INTELIGENTE) — fundos claros |
| [assets/logo-icone.png](./assets/logo-icone.png) | Só o ícone (3 figuras navy + 1 laranja na seta) |
| `public/logo-clara-photoroom.png` | Versão clara para fundo navy |

### Como usar no ChatGPT

1. Anexe `assets/logo-waitless.png` (ou o ícone) na conversa.
2. No prompt, diga explicitamente: **usar o arquivo anexado; não redesenhar, não alterar proporções, não inventar figuras.**
3. Posição sugerida: canto superior esquerdo ou superior central, com margem.
4. Tamanho: compacto (cerca de 12–18% da largura da arte). Não ocupar o terço superior inteiro.
5. Se a geração não respeitar o anexo: peça a arte **sem logo** (reserva um retângulo vazio no topo) e cole a logo oficial depois no Canva/Figma.

### Proibido na logo

- Inventar ícone (número errado de pessoas, seta diferente, tipografia inventada)
- Escrever só a palavra “Waitless” no lugar da logo oficial
- Distortionar, recolorir ou espelhar o arquivo da marca

## Produto em uma linha (não inventar além disso)

Fila digital: o estabelecimento organiza a espera no painel; o cliente acompanha a posição no celular pelo link (WhatsApp), sem baixar app. Dá para agendar horário sem misturar com quem chegou na hora.

Fonte: [docs/O_QUE_E_WAITLESS.md](../../O_QUE_E_WAITLESS.md).

---

## Formato

| Canal | Formato | Tamanho |
|-------|--------|---------|
| Instagram Reels / TikTok | **9:16** | 1080 × 1920 |
| Carrossel IG (só se o roteiro pedir) | 1:1 | 1080 × 1080 |

Padrão: **sempre 9:16**, a menos que o criativo diga o contrário.

---

## Estilo minimalista (obrigatório)

- Fundo sólido ou gradiente suave (navy → off-white, ou off-white limpo)
- **Uma ideia por frame**
- Máximo: **1 headline + 1 linha de apoio**
- Tipografia grande, poucos caracteres
- Sem collage, sem grade de prints, sem mockup de dashboard lotado
- Sem emoji na arte
- Sem “painel SaaS genérico” roxo/neon
- Pessoa ou objeto do nicho só se estiver limpo e secundário (não competir com o texto)
- Logo: só o arquivo oficial anexado (ver secção Logo acima)

---

## Tom da copy

- Português BR, direto
- Foco no **dono / recepção** do nicho
- Estrutura: **dor → alívio → CTA**
- CTA padrão: `waitless.solutions`
- Instagram: um pouco mais profissional
- TikTok: mais curto e falado

### Proibido

- Inventar preço, desconto ou “garantia de X minutos”
- Feature que não exista no produto (totem, PDV, app obrigatório, prontuário)
- Prometer cura, resultado médico ou fila zero absoluta

---

## Template de prompt (copiar e colar)

Substitua `{nicho}`, `{headline}`, `{sub}` e `{cena}` pelos valores do criativo.

```text
Crie uma imagem vertical 9:16 (1080x1920), estilo minimalista para Instagram Reels e TikTok.

Marca: Waitless (fila digital). Cores: navy #0A1B3F, laranja #FF6600, off-white #F8F9FA.

LOGO (obrigatório): use EXATAMENTE a imagem de logo anexada (logo-waitless.png).
Não redesenhe, não invente ícone, não altere cores/proporções, não substitua por texto "Waitless".
Coloque a logo anexada no canto superior esquerdo, pequena (cerca de 15% da largura), com margem.

Nicho: {nicho}.
Cena: {cena}.

Layout:
- fundo limpo (sólido ou gradiente suave navy/off-white)
- tipografia forte e legível
- headline principal (poucas palavras): "{headline}"
- uma linha de apoio pequena: "{sub}"
- espaço negativo generoso
- sem emojis, sem collage, sem dashboard lotado, sem UI fake detalhada
- no máximo um detalhe visual do nicho, discreto

Tom: calmo, premium, brasileiro, comercial B2B para dono de estabelecimento.
```

### Variante só tipografia (quando o criativo for “texto puro”)

```text
Crie uma imagem vertical 9:16 (1080x1920), tipografia minimalista.

Fundo: #0A1B3F ou #F8F9FA.
Headline em destaque: "{headline}"
Linha de apoio: "{sub}"
Acento laranja #FF6600 só em uma palavra ou barra fina.
Sem foto, sem ícones inventados, sem mockup. Muito espaço vazio. Estilo cartaz editorial limpo.
LOGO: use EXATAMENTE a logo anexada (logo-waitless.png ou logo-icone.png). Não redesenhe. Canto superior, pequena.
```

---

## Caption — esqueleto

**Instagram**

```text
{gancho em 1 linha}

{1–2 frases: dor + alívio}

{CTA + link}
waitless.solutions

#Waitless #{hashtagNicho} #FilaDigital
```

**TikTok**

```text
{gancho falado / curtíssimo}

{1 frase}

Link: waitless.solutions
```

---

## Áudio

Só indique **vibe** (ex.: ambient calmo, beat leve). Não nomeie música com copyright.

---

## Tipos de criativo (ordem nos arquivos de nicho)

1. Dor da espera  
2. Cliente livre enquanto espera  
3. Recepção sem “quanto tempo ainda?”  
4. Link no WhatsApp (fricção zero)  
5. Agendamento  
6. CTA piloto / “veja em 30 segundos”
