import { useState, useEffect } from "react";
import {
  getStorage,
  setStorage,
  getDefaultSettings,
  type ExtensionSettings,
} from "@/utils/messaging";

export function App() {
  const [activeTab, setActiveTab] = useState<"info" | "settings">("info");
  const [settings, setSettings] = useState<ExtensionSettings>(getDefaultSettings());

  useEffect(() => {
    // Load settings from type-safe storage
    getStorage("settings").then((result) => {
      if (result.settings) {
        setSettings(result.settings);
      }
    });
  }, []);

  const saveSettings = async () => {
    await setStorage({ settings });
    // Show success message
    const successEl = document.getElementById("save-success");
    if (successEl) {
      successEl.classList.remove("hidden");
      setTimeout(() => {
        successEl.classList.add("hidden");
      }, 2000);
    }
  };

  const hotkeyDisplay = settings.hotkey.modifiers
    .map((mod) => {
      if (mod === "Meta") return navigator.platform.includes("Mac") ? "⌘" : "⊞";
      return mod;
    })
    .concat(settings.hotkey.key.toUpperCase())
    .join("+");

  return (
    <div className="w-96 h-auto min-h-[400px] bg-background text-foreground">
      {/* Header */}
      <div className="p-4 border-b border-grab-primary-dark bg-background text-grab-primary">
        <h1 className="text-xl font-bold">React Grab</h1>
        <p className="text-sm opacity-90">Grab elements from any website</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          className={`flex-1 py-3 px-4 font-medium transition-colors ${
            activeTab === "info"
              ? "border-b-2 border-grab-primary text-grab-primary-dark"
              : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setActiveTab("info")}
        >
          Info
        </button>
        <button
          className={`flex-1 py-3 px-4 font-medium transition-colors ${
            activeTab === "settings"
              ? "border-b-2 border-grab-primary text-grab-primary-dark"
              : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "info" ? (
          <div className="space-y-3">
            <div className="bg-grab-secondary border border-grab-border rounded p-3">
              <h3 className="text-sm font-semibold text-grab-primary-dark mb-2">How to use</h3>
              <ol className="text-sm text-foreground/70 space-y-1.5 list-decimal list-inside">
                <li>
                  Hold <kbd
                    className="px-1.5 py-0.5 bg-card border border-border rounded text-xs"
                    style={{
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
                    }}
                  >{hotkeyDisplay}</kbd> for {settings.keyHoldDuration}ms
                </li>
                <li>Click any element to grab it</li>
                <li>Press ESC to cancel</li>
              </ol>
            </div>

            <div className="bg-grab-secondary border border-grab-border rounded p-3">
              <h3 className="text-sm font-semibold text-grab-primary-dark mb-2">Features</h3>
              <ul className="text-sm text-foreground/70 space-y-1">
                <li>✓ Works on any website</li>
                <li>✓ Extracts HTML + React components</li>
                <li>✓ Hold-to-activate prevents accidents</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, enabled: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Enable React Grab</span>
              </label>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="font-semibold mb-3">Keyboard Shortcut</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-foreground mb-2 block">
                    Activation Key
                  </label>
                  <input
                    type="text"
                    value={settings.hotkey.key.toUpperCase()}
                    onChange={(e) => {
                      const key = e.target.value.slice(-1).toLowerCase();
                      if (key && /^[a-z]$/.test(key)) {
                        setSettings({
                          ...settings,
                          hotkey: { ...settings.hotkey, key },
                        });
                      }
                    }}
                    maxLength={1}
                    className="w-16 p-2 border border-border bg-card text-foreground rounded text-center font-mono uppercase"
                    placeholder="G"
                  />
                </div>

                <div>
                  <label className="text-sm text-foreground mb-2 block">
                    Modifiers
                  </label>
                  <div className="space-y-2">
                    {["Control", "Shift", "Alt", "Meta"].map((modifier) => (
                      <label key={modifier} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.hotkey.modifiers.includes(modifier)}
                          onChange={(e) => {
                            const modifiers = e.target.checked
                              ? [...settings.hotkey.modifiers, modifier]
                              : settings.hotkey.modifiers.filter(
                                  (m) => m !== modifier,
                                );
                            setSettings({
                              ...settings,
                              hotkey: { ...settings.hotkey, modifiers },
                            });
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">
                          {modifier === "Meta" ? "⌘ Command (Mac) / ⊞ Win" : modifier}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-foreground mb-2 block">
                    Hold Duration: {settings.keyHoldDuration}ms
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={settings.keyHoldDuration}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        keyHoldDuration: parseInt(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>100ms (fast)</span>
                    <span>1000ms (slow)</span>
                  </div>
                </div>

                <div className="bg-muted border border-border rounded p-3">
                  <p className="text-xs text-muted-foreground mb-1">Current shortcut:</p>
                  <div className="flex gap-1 flex-wrap items-center">
                    <span className="text-sm">Hold</span>
                    {settings.hotkey.modifiers.map((mod) => (
                      <kbd
                        key={mod}
                        className="px-2 py-1 bg-card rounded border border-border text-xs"
                        style={{
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
                        }}
                      >
                        {mod === "Meta"
                          ? navigator.platform.includes("Mac")
                            ? "⌘"
                            : "⊞"
                          : mod}
                      </kbd>
                    ))}
                    <span className="text-muted-foreground">+</span>
                    <kbd
                      className="px-2 py-1 bg-card rounded border border-border text-xs uppercase"
                      style={{
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
                      }}
                    >
                      {settings.hotkey.key}
                    </kbd>
                    <span className="text-sm">for {settings.keyHoldDuration}ms</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="font-semibold mb-3">AI Adapter</h3>

              <select
                value={settings.adapter}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    adapter: e.target.value as ExtensionSettings["adapter"],
                  })
                }
                className="w-full p-2 border border-border bg-card text-foreground rounded"
              >
                <option value="none">None (clipboard only)</option>
                <option value="cursor">Cursor</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically open grabbed elements in your AI coding tool
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={saveSettings}
                className="flex-1 py-2 bg-grab-primary text-white rounded hover:bg-grab-primary-dark transition-colors font-medium"
              >
                Save Settings
              </button>
              <div
                id="save-success"
                className="hidden text-sm text-grab-primary-dark font-medium"
              >
                ✓ Saved
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
