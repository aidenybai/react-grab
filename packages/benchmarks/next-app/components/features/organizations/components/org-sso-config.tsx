"use client";

import { useState } from "react";

interface OrgSsoConfigProps {
  isEnabled: boolean;
  provider?: string;
  entityId?: string;
  ssoUrl?: string;
  certificate?: string;
  onSave: (config: {
    provider: string;
    entityId: string;
    ssoUrl: string;
    certificate: string;
  }) => void;
  onToggle: (enabled: boolean) => void;
}

export function OrgSsoConfig({
  isEnabled,
  provider = "",
  entityId = "",
  ssoUrl = "",
  certificate = "",
  onSave,
  onToggle,
}: OrgSsoConfigProps) {
  const [formProvider, setFormProvider] = useState(provider);
  const [formEntityId, setFormEntityId] = useState(entityId);
  const [formSsoUrl, setFormSsoUrl] = useState(ssoUrl);
  const [formCertificate, setFormCertificate] = useState(certificate);

  return (
    <div className="org-sso-config">
      <div className="org-sso-config__header">
        <h3>Single Sign-On (SSO)</h3>
        <label>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onToggle(e.target.checked)}
          />
          Enable SSO
        </label>
      </div>
      {isEnabled && (
        <div className="org-sso-config__form">
          <div className="org-sso-config__field">
            <label>Provider</label>
            <select
              value={formProvider}
              onChange={(e) => setFormProvider(e.target.value)}
            >
              <option value="">Select provider</option>
              <option value="okta">Okta</option>
              <option value="azure_ad">Azure AD</option>
              <option value="google">Google Workspace</option>
              <option value="onelogin">OneLogin</option>
              <option value="custom">Custom SAML</option>
            </select>
          </div>
          <div className="org-sso-config__field">
            <label>Entity ID</label>
            <input
              type="text"
              value={formEntityId}
              onChange={(e) => setFormEntityId(e.target.value)}
            />
          </div>
          <div className="org-sso-config__field">
            <label>SSO URL</label>
            <input
              type="url"
              value={formSsoUrl}
              onChange={(e) => setFormSsoUrl(e.target.value)}
            />
          </div>
          <div className="org-sso-config__field">
            <label>Certificate</label>
            <textarea
              value={formCertificate}
              onChange={(e) => setFormCertificate(e.target.value)}
              rows={4}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={() =>
              onSave({
                provider: formProvider,
                entityId: formEntityId,
                ssoUrl: formSsoUrl,
                certificate: formCertificate,
              })
            }
          >
            Save SSO Configuration
          </button>
        </div>
      )}
    </div>
  );
}
