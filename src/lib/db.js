import mysql from "mysql2/promise";

// Pool de conexoes reutilizavel (evita abrir conexao a cada request)
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

// Cria a tabela caso ainda nao exista (roda de forma segura em toda inicializacao)
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
