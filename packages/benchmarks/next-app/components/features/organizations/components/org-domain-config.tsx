"use client";

import { useState, useCallback } from "react";

interface OrgDomainConfigProps {
  domains: Array<{ domain: string; verified: boolean }>;
  onAddDomain: (domain: string) => void;
  onRemoveDomain: (domain: string) => void;
  onVerifyDomain: (domain: string) => void;
}

export function OrgDomainConfig({
  domains,
  onAddDomain,
  onRemoveDomain,
  onVerifyDomain,
}: OrgDomainConfigProps) {
  const [newDomain, setNewDomain] = useState("");

  const handleAdd = useCallback(() => {
    if (newDomain.trim()) {
      onAddDomain(newDomain.trim());
      setNewDomain("");
    }
  }, [newDomain, onAddDomain]);

  return (
    <div className="org-domain-config">
      <h3>Custom Domains</h3>
      <div className="org-domain-config__add">
        <input
          type="text"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="example.com"
        />
        <button className="btn btn-primary btn-sm" onClick={handleAdd}>
          Add Domain
        </button>
      </div>
      <div className="org-domain-config__list">
        {domains.map((d) => (
          <div key={d.domain} className="org-domain-config__item">
            <span className="org-domain-config__domain">{d.domain}</span>
            <span
              className={`org-domain-config__status ${d.verified ? "org-domain-config__status--verified" : ""}`}
            >
              {d.verified ? "Verified" : "Pending"}
            </span>
            <div className="org-domain-config__actions">
              {!d.verified && (
                <button
                  className="btn btn-sm"
                  onClick={() => onVerifyDomain(d.domain)}
                >
                  Verify
                </button>
              )}
              <button
                className="btn btn-sm btn-danger"
                onClick={() => onRemoveDomain(d.domain)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
