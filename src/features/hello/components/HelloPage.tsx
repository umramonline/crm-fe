import type { SessionData } from "@/features/auth/services/authApi";

type HelloPageProps = {
  session: SessionData;
};

export function HelloPage({ session }: HelloPageProps) {
  return (
    <section className="home-panel">
      <div className="content-card welcome-card">
        <span>CRM</span>
        <h1>Hoş geldiniz</h1>
        <p>
          Ümran CRM panelinde size tanımlı yetkilerle işlemlerinizi
          gerçekleştirebilirsiniz.
        </p>
      </div>

      <div className="content-card small-stat">
        <span>Rol</span>
        <strong>{session.user.roleName || "-"}</strong>
      </div>

      <div className="content-card small-stat">
        <span>Yetki</span>
        <strong>{session.permissions.length}</strong>
      </div>
    </section>
  );
}
