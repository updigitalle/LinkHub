import "./globals.css";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Encurtador";

export const metadata = {
  title: `${APP_NAME} | Encurtador de URLs`,
  description: "Transforme URLs longas em links curtos e faceis de compartilhar",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <nav className="navbar">
          <div className="container">
            <a className="navbar-brand" href="/">
              🔗 {APP_NAME}
            </a>
          </div>
        </nav>

        {children}

        <footer>
          <div className="container">
            &copy; {new Date().getFullYear()} {APP_NAME}. Todos os direitos
            reservados.
          </div>
        </footer>
      </body>
    </html>
  );
}
