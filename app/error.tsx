"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="error-screen">
      <h1>Uma pequena pausa no caminho.</h1>
      <p>Não foi possível carregar esta página. Tente novamente.</p>
      <button className="button button-primary" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
