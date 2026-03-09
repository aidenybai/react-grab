"use client";

import { useState } from "react";

interface WebhookConfigProps {
  webhookUrl?: string;
  secret?: string;
  events?: string[];
  availableEvents?: string[];
  onSave: (config: { url: string; secret: string; events: string[] }) => void;
}

export function WebhookConfig({
  webhookUrl = "",
  secret = "",
  events = [],
  availableEvents = [
    "booking.created",
    "booking.cancelled",
    "booking.rescheduled",
    "payment.received",
  ],
  onSave,
}: WebhookConfigProps) {
  const [url, setUrl] = useState(webhookUrl);
  const [webhookSecret, setWebhookSecret] = useState(secret);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(events);

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  return (
    <div className="webhook-config">
      <h3>Webhook Configuration</h3>
      <div className="webhook-config__field">
        <label>Endpoint URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/webhook"
        />
      </div>
      <div className="webhook-config__field">
        <label>Secret</label>
        <input
          type="password"
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
        />
      </div>
      <div className="webhook-config__events">
        <label>Events</label>
        {availableEvents.map((event) => (
          <label key={event} className="webhook-config__event-item">
            <input
              type="checkbox"
              checked={selectedEvents.includes(event)}
              onChange={() => toggleEvent(event)}
            />
            {event}
          </label>
        ))}
      </div>
      <button
        className="btn btn-primary"
        onClick={() =>
          onSave({ url, secret: webhookSecret, events: selectedEvents })
        }
      >
        Save Webhook
      </button>
    </div>
  );
}
