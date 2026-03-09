"use client";

import { useState, useMemo } from "react";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  isInstalled: boolean;
}

interface IntegrationListProps {
  integrations: Integration[];
  onSelect?: (id: string) => void;
  filterCategory?: string;
}

export function IntegrationList({
  integrations,
  onSelect,
  filterCategory,
}: IntegrationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    return integrations.filter((i) => {
      const matchesSearch = i.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory = !filterCategory || i.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [integrations, searchQuery, filterCategory]);

  const categories = useMemo(() => {
    return Array.from(new Set(integrations.map((i) => i.category)));
  }, [integrations]);

  return (
    <div className="integration-list">
      <div className="integration-list__search">
        <input
          type="text"
          placeholder="Search integrations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="integration-list__grid">
        {filtered.map((integration) => (
          <div
            key={integration.id}
            className="integration-list__item"
            onClick={() => onSelect?.(integration.id)}
          >
            <h4>{integration.name}</h4>
            <p>{integration.description}</p>
            <span className="integration-list__category">
              {integration.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
