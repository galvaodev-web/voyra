import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="error-screen">
      <span className="eyebrow">404 · FORA DA ROTA</span>
      <h1>Vamos encontrar um novo caminho?</h1>
      <p>A página ou viagem que você procura não está aqui.</p>
      <Link className="button button-primary" href="/">
        Voltar para o início
      </Link>
    </main>
  );
}
