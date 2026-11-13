# Dashboard => Livro-caixa

Sistema web simples de controle financeiro para um pequeno negócio: registra entradas e saídas, calcula o lucro do mês e mostra as despesas por categoria. Feito para **um único usuário** e para rodar em **hospedagem gratuita**.

## Funcionalidades

- Login com e-mail e senha (um usuário)
- Painel do mês: lucro, total de entradas e saídas, despesas por categoria e últimos lançamentos
- Lançamentos: criar, editar, excluir, filtrar por tipo e categoria
- Categorias de entrada e saída editáveis (um conjunto padrão é criado no primeiro acesso)
- Exportação dos lançamentos em CSV (abre no Excel em português)
- Layout pensado para celular

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Interface | HTML5, CSS3 e JavaScript puro (ES Modules), sem framework e sem build |
| Banco de dados | PostgreSQL no Supabase, acessado pela API REST automática |
| Autenticação | Supabase Auth (e-mail e senha) |
| Segurança de dados | Row Level Security (RLS) por usuário |
| Cliente | `@supabase/supabase-js` 2.118.0 via CDN jsDelivr |
| Fonte | Figtree (Google Fonts) |
| Hospedagem | Cloudflare Pages ou Netlify (estático) |

## Estrutura

```
livro-caixa/
├── public/              única pasta publicada no site
│   ├── index.html       login
│   ├── app.html         painel, lançamentos e categorias
│   ├── _headers         cabeçalhos de segurança (CSP etc.)
│   ├── css/style.css
│   └── js/
│       ├── config.js    URL e chave publicável do Supabase
│       ├── supabase.js  cliente Supabase
│       ├── auth.js      login, logout e proteção de página
│       ├── dados.js     consultas ao banco
│       ├── util.js      moeda, datas e helper de DOM
│       ├── login.js     tela de login
│       └── app.js       telas do sistema
├── supabase/
│   └── schema.sql       tabelas e políticas RLS
├── .gitignore
└── README.md
```

Somente o conteúdo de `public/` vai ao ar. O README e o SQL ficam fora do site.

## Configuração

### 1. Supabase

1. Crie um projeto em https://supabase.com.
2. No **SQL Editor**, execute `supabase/schema.sql`.
3. Desative a criação de novos usuários (sign ups) nas configurações de autenticação.
4. Em **Authentication → Users**, crie o usuário com e-mail e senha (confirmando o e-mail automaticamente).
5. Em **Settings → API Keys**, aba *Publishable and secret API keys*, copie a **Publishable key** (`sb_publishable_...`). Se aparecer *Create new API keys*, clique nele antes. A chave também aparece no botão **Connect**.

### 2. Chaves no código

Edite `public/js/config.js`:

- `SUPABASE_URL`: endereço base do projeto, **sem** `/rest/v1/`
- `SUPABASE_KEY`: a chave publicável

A chave publicável pode ficar no código, porque quem protege os dados é o RLS. Nunca coloque a chave secreta (`sb_secret_...`) nem a `service_role` no frontend. Se trocar de projeto Supabase, atualize também o domínio em `connect-src` no `public/_headers`.

### 3. Rodar localmente

Módulos JS não funcionam com `file://`. Sirva a pasta `public/`:

```bash
python -m http.server 8000 --directory public
```

Abra http://localhost:8000. No VS Code, também serve o Live Server apontando para `public/`.

### 4. Publicar

Conecte o repositório do GitHub ao **Cloudflare Pages** (*Connect to Git*) ou ao **Netlify** (*Import an existing project*):

- Comando de build: vazio
- Diretório de saída / publicação: `public`

Depois de publicar, em **Authentication → URL Configuration** (Supabase), defina o **Site URL** com o endereço do site.

## Segurança

- Repositório privado e 2FA no GitHub, Supabase e hospedagem
- RLS ativo em `categorias` e `lancamentos`: cada usuário só acessa as próprias linhas
- Cadastro aberto desativado
- Só a chave publicável no código
- `_headers` com Content-Security-Policy, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy`
- Páginas com `noindex`
- Textos do usuário entram na tela como texto (sem `innerHTML`), o que evita XSS

Antes de cada commit, confira que não há segredo no código:

```bash
git grep -nE "sb_secret_[A-Za-z0-9]|eyJ"
```

## Fluxo de trabalho

```bash
git add .
git commit -m "descrição curta da mudança"
git push
```

Cada push na branch `main` publica o site automaticamente.

## Observações

- Projetos gratuitos do Supabase pausam depois de cerca de uma semana sem uso. Com uso diário isso não ocorre.
- Use **Baixar CSV** na aba Lançamentos de tempos em tempos como cópia de segurança.
- A senha do usuário pode ser trocada em **Authentication → Users** no Supabase.

## Ideias futuras

- Contas a pagar e a receber, com vencimento e status
- Cadastro de clientes e fornecedores
- Gráfico de evolução mensal
- Relatório do mês em PDF
