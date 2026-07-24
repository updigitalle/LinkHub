# Plano de Construção: Encurtador de Links em Next.js

Documento de especificação para construir um encurtador de URLs em Next.js 15
com banco MySQL, versionado no GitHub e publicado na Hostinger (hospedagem
Node.js) com deploy automático.

Este plano é autossuficiente: siga na ordem, criando cada arquivo com o
conteúdo indicado. Ao final há o passo a passo de publicação.

---

## 1. Objetivo do produto

Um site que:

1. Recebe uma URL longa e devolve um link curto (ex: `https://seudominio.com/aB3xY9`).
2. Permite um slug personalizado opcional (ex: `https://seudominio.com/promo`).
3. Conta quantos cliques cada link recebeu.
4. Redireciona quem acessa o link curto para a URL original.
5. Força HTTPS e é responsivo (funciona bem no celular).

Identidade visual: tema roxo (cor primária `#6c5ce7`, secundária `#a363d8`).

---

## 2. Stack técnica

| Item | Escolha | Motivo |
|------|---------|--------|
| Framework | Next.js 15 (App Router) | Suportado pela Hostinger Node.js |
| Runtime | Node.js 18+ | Padrão da Hostinger |
| UI | React 19 | Vem com o Next.js |
| Banco | MySQL da Hostinger | Já disponível no hPanel |
| Driver do banco | mysql2 | Leve, sem etapa de build complicada |
| Estilo | CSS puro (globals.css) | Sem dependências extras |
| Versionamento | Git + GitHub | Deploy automático na Hostinger |

Não usar Prisma nem ORM pesado nesta primeira versão, para simplificar o deploy.

---

## 3. Estrutura de pastas

```
encurtador-nextjs/
├── package.json
├── next.config.js
├── .gitignore
├── .env.example
├── .env.local            (criado localmente, NUNCA vai para o GitHub)
├── PLANO.md
├── README.md
├── banco-de-dados.sql
└── src/
    ├── lib/
    │   ├── db.js         (conexão MySQL + criação da tabela)
    │   └── slug.js       (geração e validação de slug/URL)
    └── app/
        ├── globals.css   (todos os estilos)
        ├── layout.js     (navbar + rodapé + metadados)
        ├── page.js       (página inicial: form de encurtar)
        ├── api/
        │   └── shorten/
        │       └── route.js   (POST: cria o link curto)
        └── [slug]/
            └── route.js       (GET: redireciona e conta clique)
```

---

## 4. Banco de dados

Tabela única `links`. Criar via phpMyAdmin da Hostinger importando o arquivo
`banco-de-dados.sql`, OU deixar o app criar sozinho (a função `ensureSchema`
faz isso na primeira execução).

### Arquivo: `banco-de-dados.sql`

```sql
CREATE TABLE IF NOT EXISTS `links` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `original_url` TEXT NOT NULL,
  `slug` VARCHAR(50) NOT NULL,
  `clicks` INT(11) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 5. Variáveis de ambiente

Criar `.env.local` (para desenvolvimento) e configurar as mesmas variáveis no
painel da Hostinger (para produção). Nunca subir valores reais para o GitHub.

### Arquivo: `.env.example`

```
NEXT_PUBLIC_APP_NAME="Encurtador"
DB_HOST="localhost"
DB_PORT="3306"
DB_USER="seu_usuario"
DB_PASSWORD="sua_senha"
DB_NAME="seu_banco"
```

Observações:
- Na Hostinger, `DB_HOST` normalmente é `localhost`.
- `NEXT_PUBLIC_APP_NAME` é o nome exibido na navbar e no título.
- A URL curta é montada a partir do domínio da requisição, então não precisa de
  variável de URL fixa.

---

## 6. Arquivos e conteúdo

### `package.json`

```json
{
  "name": "encurtador-nextjs",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "mysql2": "^3.11.5",
    "next": "^15.1.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "eslint": "^9",
    "eslint-config-next": "^15.1.6"
  }
}
```

### `next.config.js`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
```

### `.gitignore`

```
/node_modules
/.next
/out
.env
.env.local
.env*.local
npm-debug.log*
.DS_Store
Thumbs.db
```

### `src/lib/db.js`

```js
import mysql from "mysql2/promise";

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4",
    });
  }
  return pool;
}

export async function ensureSchema() {
  const sql = `
    CREATE TABLE IF NOT EXISTS links (
      id INT(11) NOT NULL AUTO_INCREMENT,
      original_url TEXT NOT NULL,
      slug VARCHAR(50) NOT NULL,
      clicks INT(11) DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await getPool().query(sql);
}
```

### `src/lib/slug.js`

```js
import { randomInt } from "crypto";
import { getPool } from "./db";

const CHARS =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export async function generateUniqueSlug(length = 6) {
  const pool = getPool();
  let slug;
  let exists = true;

  do {
    slug = "";
    for (let i = 0; i < length; i++) {
      slug += CHARS[randomInt(0, CHARS.length)];
    }
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS total FROM links WHERE slug = ?",
      [slug]
    );
    exists = rows[0].total > 0;
  } while (exists);

  return slug;
}

export function isValidCustomSlug(slug) {
  return /^[a-zA-Z0-9-]+$/.test(slug) && slug.length <= 50;
}

export function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
```

### `src/app/api/shorten/route.js` (POST: cria o link)

Regras:
1. Ler `url` e `slug` do corpo JSON.
2. Validar a URL com `isValidUrl`. Se inválida, retornar 400 com `{ error }`.
3. Se houver slug personalizado, validar com `isValidCustomSlug` e checar se já
   existe. Se existir, retornar 409 com mensagem "Este slug já está em uso".
4. Se não houver slug, gerar um com `generateUniqueSlug`.
5. Inserir na tabela `links`.
6. Montar a URL curta a partir do host da requisição.
7. Retornar `{ success: true, shortUrl }`.

```js
import { NextResponse } from "next/server";
import { getPool, ensureSchema } from "@/lib/db";
import {
  generateUniqueSlug,
  isValidCustomSlug,
  isValidUrl,
} from "@/lib/slug";

export async function POST(request) {
  try {
    await ensureSchema();

    const { url, slug: customSlug } = await request.json();

    if (!isValidUrl(url)) {
      return NextResponse.json({ error: "URL inválida" }, { status: 400 });
    }

    const pool = getPool();
    let slug;

    if (customSlug && customSlug.trim() !== "") {
      if (!isValidCustomSlug(customSlug)) {
        return NextResponse.json(
          { error: "Slug inválido. Use apenas letras, números e hífens." },
          { status: 400 }
        );
      }
      const [rows] = await pool.query(
        "SELECT COUNT(*) AS total FROM links WHERE slug = ?",
        [customSlug]
      );
      if (rows[0].total > 0) {
        return NextResponse.json(
          { error: "Este slug já está em uso. Escolha outro." },
          { status: 409 }
        );
      }
      slug = customSlug;
    } else {
      slug = await generateUniqueSlug();
    }

    await pool.query(
      "INSERT INTO links (original_url, slug) VALUES (?, ?)",
      [url, slug]
    );

    const host = request.headers.get("host");
    const protocol = host && host.startsWith("localhost") ? "http" : "https";
    const shortUrl = `${protocol}://${host}/${slug}`;

    return NextResponse.json({ success: true, shortUrl });
  } catch (err) {
    console.error("Erro ao encurtar:", err.message);
    return NextResponse.json(
      { error: "Erro ao encurtar o link. Tente novamente." },
      { status: 500 }
    );
  }
}
```

### `src/app/[slug]/route.js` (GET: redireciona e conta clique)

Regras:
1. Ler o slug da URL.
2. Buscar `original_url` na tabela.
3. Se achar, incrementar `clicks` e redirecionar (302) para a URL original.
4. Se não achar, redirecionar para a página inicial.

```js
import { NextResponse } from "next/server";
import { getPool, ensureSchema } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    await ensureSchema();
    const { slug } = await params;

    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT original_url FROM links WHERE slug = ?",
      [slug]
    );

    if (rows.length === 0) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    await pool.query(
      "UPDATE links SET clicks = clicks + 1 WHERE slug = ?",
      [slug]
    );

    return NextResponse.redirect(rows[0].original_url, 302);
  } catch (err) {
    console.error("Erro no redirecionamento:", err.message);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
```

### `src/app/page.js` (página inicial com o formulário)

Componente cliente ("use client") com:
1. Hero com título e subtítulo.
2. Formulário com campo de URL (obrigatório) e slug personalizado (opcional).
3. Ao enviar, faz `fetch` para `/api/shorten` e mostra o resultado com botão
   "Copiar".
4. Exibe mensagens de erro/sucesso.

```jsx
"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult("");
    setCopied(false);

    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, slug }),
      });
      const data = await res.json();

      if (data.success) {
        setResult(data.shortUrl);
        setUrl("");
        setSlug("");
      } else {
        setError(data.error || "Erro ao encurtar o link.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function copiar() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>🔗 Encurte seus links</h1>
          <p>Transforme URLs longas em links curtos e fáceis de compartilhar</p>
        </div>
      </section>

      <div className="container">
        <form className="card" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="url">
              URL para encurtar
            </label>
            <div className="input-group">
              <input
                id="url"
                type="url"
                className="input"
                placeholder="Cole sua URL aqui"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="slug">
              Slug personalizado <span className="badge">Opcional</span>
            </label>
            <div className="input-group">
              <span className="input-prefix">/</span>
              <input
                id="slug"
                type="text"
                className="input"
                placeholder="seu-slug-aqui"
                pattern="[a-zA-Z0-9-]+"
                maxLength={50}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
            <div className="form-text">
              Apenas letras, números e hífens são permitidos.
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Encurtando..." : "Encurtar URL"}
          </button>
        </form>

        {error && <div className="alert alert-danger">{error}</div>}

        {result && (
          <div className="result">
            <div className="result-head">
              <strong>Link encurtado:</strong>
              <button className="btn btn-outline" onClick={copiar}>
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>
            <a href={result} target="_blank" rel="noopener noreferrer">
              {result}
            </a>
          </div>
        )}
      </div>
    </>
  );
}
```

### `src/app/layout.js`, `src/app/globals.css`

Já estão prontos na pasta do projeto. O layout monta navbar e rodapé usando
`NEXT_PUBLIC_APP_NAME`. O CSS aplica o tema roxo. (Conteúdo completo nos
arquivos entregues.)

---

## 7. Testar localmente (antes de publicar)

1. Instalar dependências: `npm install`
2. Criar `.env.local` a partir do `.env.example` com os dados de um MySQL local
   (ou o da Hostinger, se permitir conexão remota).
3. Rodar: `npm run dev`
4. Abrir `http://localhost:3000`, encurtar uma URL e testar o redirecionamento.

---

## 8. Publicar na Hostinger com GitHub (deploy automático)

### Passo A: Subir para o GitHub
1. Criar um repositório novo no GitHub (privado de preferência).
2. Na pasta do projeto:
   ```
   git init
   git add .
   git commit -m "Primeira versao do encurtador"
   git branch -M main
   git remote add origin URL_DO_SEU_REPO
   git push -u origin main
   ```
   Confirmar que o `.env.local` NÃO foi enviado (ele está no `.gitignore`).

### Passo B: Criar o banco MySQL na Hostinger
1. hPanel: `Bancos de Dados MySQL`.
2. Criar banco, usuário e senha. Anotar tudo.
3. Abrir o phpMyAdmin e importar `banco-de-dados.sql` (ou deixar o app criar a
   tabela sozinho na primeira execução).

### Passo C: Criar a aplicação Node.js na Hostinger
1. hPanel: seção de aplicações Node.js / Web Apps.
2. Conectar o repositório do GitHub.
3. Configurar:
   - Comando de build: `npm run build`
   - Comando de start: `npm run start`
   - Versão do Node: 18 ou superior
4. Adicionar as variáveis de ambiente (as mesmas do `.env.example`, com os
   valores reais do banco da Hostinger).
5. Apontar o domínio para a aplicação.

### Passo D: Deploy automático
Depois de conectado, todo `git push` para a branch `main` dispara um novo deploy
na Hostinger automaticamente.

---

## 9. Segurança (obrigatório)

1. Nunca colocar senha do banco no código nem no GitHub. Só em variável de
   ambiente.
2. Confirmar que `.env.local` está no `.gitignore`.
3. As queries já usam prepared statements (protege contra SQL injection).
4. Manter `display_errors` desligado em produção (padrão do Next.js em build de
   produção).

---

## 10. Ideias de upgrade futuro (opcional)

1. Painel com login para ver todos os links e estatísticas de cliques.
2. Geração de QR code para cada link curto.
3. Data de expiração dos links.
4. Gráfico de cliques por dia.
5. Proteção contra URLs maliciosas (checagem de blacklist).
