import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - React Grab",
  description: "Privacy policy for React Grab browser extension and website",
};

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <div className="space-y-6 text-gray-800 dark:text-gray-200">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Overview</h2>
            <p>
              React Grab is a developer tool that helps you inspect and copy React components from web pages.
              This privacy policy explains how the React Grab browser extension and website handle your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Collection</h2>
            <p className="mb-3">React Grab does NOT collect, store, or transmit any personal data. Specifically:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>We do not collect any personally identifiable information</li>
              <li>We do not track your browsing history</li>
              <li>We do not store any data about the websites you visit</li>
              <li>We do not use analytics or tracking services</li>
              <li>We do not use cookies for tracking purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">How React Grab Works</h2>
            <p className="mb-3">
              React Grab operates entirely locally in your browser. When you use the extension:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The extension injects code into web pages to enable element selection</li>
              <li>When you select an element, the HTML/JSX is copied to your clipboard locally</li>
              <li>No data is sent to external servers</li>
              <li>All processing happens on your device</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Permissions</h2>
            <p className="mb-3">The extension requires the following permissions:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Access to all websites ("&lt;all_urls&gt;"):</strong> Required to inject the element
                selection functionality into any webpage you visit. This enables you to grab elements from any site.
              </li>
              <li>
                <strong>Storage:</strong> Used only to store your extension preferences locally on your device
                (such as whether the extension is enabled or disabled).
              </li>
              <li>
                <strong>Active Tab:</strong> Needed to interact with the currently active tab when you use the
                keyboard shortcut to grab elements.
              </li>
            </ul>
            <p className="mt-3">
              These permissions are used solely for the core functionality of the extension and are not used to
              collect or transmit any data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Local Storage</h2>
            <p>
              React Grab may store minimal settings locally on your device using browser storage APIs. This data
              never leaves your device and can be cleared by uninstalling the extension or clearing your browser data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
            <p>
              React Grab does not integrate with any third-party analytics, tracking, or advertising services.
              The extension operates entirely offline and does not make any external network requests.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Open Source</h2>
            <p>
              React Grab is open source software. You can review the complete source code on{" "}
              <a
                href="https://github.com/aidenybai/react-grab"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 dark:text-pink-400 hover:underline"
              >
                GitHub
              </a>
              {" "}to verify these privacy claims.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Any changes will be posted on this page with
              an updated revision date. Since we don't collect your contact information, we cannot notify you
              directly of changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact</h2>
            <p>
              If you have questions about this privacy policy, please open an issue on our{" "}
              <a
                href="https://github.com/aidenybai/react-grab/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 dark:text-pink-400 hover:underline"
              >
                GitHub repository
              </a>
              {" "}or join our{" "}
              <a
                href="https://discord.com/invite/G7zxfUzkm7"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 dark:text-pink-400 hover:underline"
              >
                Discord community
              </a>.
            </p>
          </section>

          <section className="pt-8 border-t border-gray-200 dark:border-gray-800">
            <h2 className="text-2xl font-semibold mb-4">Summary</h2>
            <p className="text-lg font-medium">
              React Grab respects your privacy. We don't collect, store, or transmit any of your personal data.
              The extension works entirely locally on your device.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

PrivacyPage.displayName = "PrivacyPage";

export default PrivacyPage;
