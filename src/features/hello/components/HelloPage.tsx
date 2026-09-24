import { Card, SmallBox } from "@adminlte/react";

import type { SessionData } from "@/features/auth/services/authApi";
import { ContentHeader } from "@/shared/components/ContentHeader";

type HelloPageProps = {
  session: SessionData;
};

export function HelloPage({ session }: HelloPageProps) {
  return (
    <>
      <ContentHeader
        title="Hoş geldiniz"
        breadcrumbs={[{ label: "Ana Sayfa", href: "/home" }]}
      />

      <div className="row">
        <div className="col-lg-8 mb-3">
          <Card title="CRM">
            <span className="text-uppercase text-muted small fw-bold">CRM</span>
            <h2 className="mt-2">Hoş geldiniz</h2>
            <p className="mb-0 text-muted">
              Ümran CRM panelinde size tanımlı yetkilerle işlemlerinizi
              gerçekleştirebilirsiniz.
            </p>
          </Card>
        </div>

        <div className="col-lg-2 col-md-6 mb-3">
          <SmallBox
            title={session.user.roleName || "-"}
            text="Rol"
            theme="primary"
            icon={
              <div className="icon">
                <i className="bi bi-person-badge" aria-hidden="true" />
              </div>
            }
          />
        </div>

        <div className="col-lg-2 col-md-6 mb-3">
          <SmallBox
            title={session.permissions.length}
            text="Yetki"
            theme="info"
            icon={
              <div className="icon">
                <i className="bi bi-shield-check" aria-hidden="true" />
              </div>
            }
          />
        </div>
      </div>
    </>
  );
}
