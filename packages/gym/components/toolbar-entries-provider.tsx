"use client";

import { useEffect } from "react";
import { registerPlugin, unregisterPlugin } from "react-grab";

const PLUGIN_NAME = "toolbar-entries-demo";

export function ToolbarEntriesProvider() {
  useEffect(() => {
    registerPlugin({
      name: PLUGIN_NAME,
      toolbarEntries: [
        {
          id: "debug-panel",
          icon: "🐛",
          tooltip: "Debug Panel",
          onRender: (container, handle) => {
            container.innerHTML = `
              <div style="padding:12px;min-width:200px;color:black;font-family:system-ui,sans-serif">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                  <strong>Debug Panel</strong>
                  <button id="close-btn" style="cursor:pointer;border:none;background:none;font-size:16px">✕</button>
                </div>
                <div style="font-size:12px;color:#666;margin-bottom:8px">
                  Active: <span id="active-status">—</span><br/>
                  Enabled: <span id="enabled-status">—</span>
                </div>
                <div style="display:flex;gap:4px">
                  <button id="badge-btn" style="cursor:pointer;padding:4px 8px;border:1px solid #ddd;border-radius:4px;background:white;font-size:12px">Set Badge</button>
                  <button id="clear-badge-btn" style="cursor:pointer;padding:4px 8px;border:1px solid #ddd;border-radius:4px;background:white;font-size:12px">Clear Badge</button>
                </div>
              </div>
            `;

            const closeButton = container.querySelector(
              "#close-btn",
            ) as HTMLElement;
            const badgeButton = container.querySelector(
              "#badge-btn",
            ) as HTMLElement;
            const clearBadgeButton = container.querySelector(
              "#clear-badge-btn",
            ) as HTMLElement;
            const activeStatusElement = container.querySelector(
              "#active-status",
            ) as HTMLElement;
            const enabledStatusElement = container.querySelector(
              "#enabled-status",
            ) as HTMLElement;

            const updateStatus = () => {
              activeStatusElement.textContent = handle.api.isActive()
                ? "Yes"
                : "No";
              enabledStatusElement.textContent = handle.api.isEnabled()
                ? "Yes"
                : "No";
            };
            updateStatus();

            const handleClose = () => handle.close();
            closeButton.addEventListener("click", handleClose);

            let badgeCount = 0;
            const handleBadge = () => {
              badgeCount++;
              handle.setBadge(badgeCount);
            };
            badgeButton.addEventListener("click", handleBadge);

            const handleClearBadge = () => {
              badgeCount = 0;
              handle.setBadge(undefined);
            };
            clearBadgeButton.addEventListener("click", handleClearBadge);

            return () => {
              closeButton.removeEventListener("click", handleClose);
              badgeButton.removeEventListener("click", handleBadge);
              clearBadgeButton.removeEventListener("click", handleClearBadge);
            };
          },
        },
        {
          id: "screenshot-action",
          icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>',
          tooltip: "Take Screenshot",
          onClick: () => {
            console.log(
              `📸 Screenshot taken at ${new Date().toLocaleTimeString()}`,
            );
          },
        },
        {
          id: "status-indicator",
          icon: '<svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="gray"/></svg>',
          tooltip: "Connection Status",
          onClick: (handle) => {
            const isConnected = handle.api.isActive();
            handle.setIcon(
              isConnected
                ? '<svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="green"/></svg>'
                : '<svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="red"/></svg>',
            );
          },
        },
      ],
    });

    return () => {
      unregisterPlugin(PLUGIN_NAME);
    };
  }, []);

  return null;
}
