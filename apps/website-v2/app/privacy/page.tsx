import type { Metadata } from "next";
import { AccentLink } from "@/components/prose";
import { PageHeader } from "@/components/page-header";

const title = "Privacy Policy";
const description = "Privacy policy for React Grab browser extension and website";
const ogImageUrl = `/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description)}`;

export const metadata: Metadata = {
  title: `${title} - React Grab`,
  description,
  openGraph: {
    title: `${title} - React Grab`,
    description,
    url: "/privacy",
    siteName: "React Grab",
    images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `React Grab - ${title}` }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} - React Grab`,
    description,
    images: [ogImageUrl],
  },
};

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-background px-6 py-8 text-prose sm:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col pt-8">
        <PageHeader
          title="Privacy Policy"
          subtitle={`Last updated ${new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}`}
        />

        <div className="mt-4 space-y-6">
          <section>
            <h2 className="mb-2 font-medium text-title">Overview</h2>
            <p>
              React Grab is a developer tool that helps you inspect and copy React components from
              web pages. This privacy policy explains how the React Grab browser extension and
              website handle your data.
            </p>
          </section>

          <section>
            <p className="mb-2 font-medium text-title">Data Collection</p>
            <p className="mb-2">
              React Grab does NOT collect, store, or transmit any personal data. Specifically:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>We do not collect any personally identifiable information</li>
              <li>We do not track your browsing history</li>
              <li>We do not store any data about the websites you visit</li>
              <li>We do not use analytics or tracking services</li>
              <li>We do not use cookies for tracking purposes</li>
            </ul>
          </section>

          <section>
            <p className="mb-2 font-medium text-title">How React Grab Works</p>
            <p className="mb-2">
              React Grab operates entirely locally in your browser. When you use the extension:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>The extension injects code into web pages to enable element selection</li>
              <li>When you select an element, the HTML/JSX is copied to your clipboard locally</li>
              <li>No data is sent to external servers</li>
              <li>All processing happens on your device</li>
            </ul>
          </section>

          <section>
            <p className="mb-2 font-medium text-title">Permissions</p>
            <p className="mb-2">The extension requires the following permissions:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <span className="text-title">Access to all websites:</span> Required to inject the
                element selection functionality into any webpage you visit.
              </li>
              <li>
                <span className="text-title">Storage:</span> Used only to store your extension
                preferences locally on your device.
              </li>
              <li>
                <span className="text-title">Active Tab:</span> Needed to interact with the
                currently active tab when you use the keyboard shortcut.
              </li>
            </ul>
            <p className="mt-2">
              These permissions are used solely for the core functionality of the extension and are
              not used to collect or transmit any data.
            </p>
          </section>

          <section>
            <p className="mb-2 font-medium text-title">Local Storage</p>
            <p>
              React Grab may store minimal settings locally on your device using browser storage
              APIs. This data never leaves your device and can be cleared by uninstalling the
              extension or clearing your browser data.
            </p>
          </section>

          <section>
            <p className="mb-2 font-medium text-title">Third-Party Services</p>
            <p>
              React Grab does not integrate with any third-party analytics, tracking, or advertising
              services. The extension operates entirely offline and does not make any external
              network requests.
            </p>
          </section>

          <section>
            <p className="mb-2 font-medium text-title">Open Source</p>
            <p>
              React Grab is open source software. You can review the complete source code on{" "}
              <AccentLink href="https://github.com/aidenybai/react-grab">GitHub</AccentLink> to
              verify these privacy claims.
            </p>
          </section>

          <section>
            <p className="mb-2 font-medium text-title">Changes to This Policy</p>
            <p>
              We may update this privacy policy from time to time. Any changes will be posted on
              this page with an updated revision date.
            </p>
          </section>

          <section>
            <p className="mb-2 font-medium text-title">Contact</p>
            <p>
              If you have questions about this privacy policy, please open an issue on our{" "}
              <AccentLink href="https://github.com/aidenybai/react-grab/issues">
                GitHub repository
              </AccentLink>{" "}
              or join our{" "}
              <AccentLink href="https://discord.com/invite/G7zxfUzkm7">Discord community</AccentLink>
              .
            </p>
          </section>

          <section className="border-t border-line pt-6">
            <p className="mb-2 font-medium text-title">Summary</p>
            <p>
              React Grab respects your privacy. We don&apos;t collect, store, or transmit any of
              your personal data. The extension works entirely locally on your device.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

PrivacyPage.displayName = "PrivacyPage";

export default PrivacyPage;
