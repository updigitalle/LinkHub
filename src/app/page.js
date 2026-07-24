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