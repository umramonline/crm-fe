type HelloPageProps = {
  onLogout: () => void;
};

export function HelloPage({ onLogout }: HelloPageProps) {
  return (
    <main className="hello-page">
      <section className="hello-card">
        <h1>Merhaba</h1>
        <p>Geçici giriş sonrası ekranı.</p>
        <button
          className="auth-primary-button hello-logout-button"
          type="button"
          onClick={onLogout}
        >
          Çıkış Yap
        </button>
      </section>
    </main>
  );
}
