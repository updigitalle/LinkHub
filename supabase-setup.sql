-- Execute este script no SQL Editor do Supabase Dashboard
-- (Dashboard > SQL Editor > New Query > colar > Run)

-- Tabela de links encurtados
CREATE TABLE IF NOT EXISTS links (
  id BIGSERIAL PRIMARY KEY,
  original_url TEXT NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Funcao para incrementar cliques de forma atomica
CREATE OR REPLACE FUNCTION increment_clicks(slug_param TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE links SET clicks = clicks + 1 WHERE slug = slug_param;
END;
$$;