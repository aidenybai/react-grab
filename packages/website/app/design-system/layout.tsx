import type { Metadata } from "next";

const title = "Design System";
const description =
  "Component gallery and visual reference for React Grab's UI components.";
const ogImageUrl = `https://react-grab.com/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description)}`;

export const metadata: Metadata = {
  title,
  description,
  icons: {
    icon: "https://react-grab.com/logo.png",
    shortcut: "https://react-grab.com/logo.png",
    apple: "https://react-grab.com/logo.png",
  },
  openGraph: {
    title,
    description,
    url: "https://react-grab.com/design-system",
    siteName: "React Grab",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: `React Grab - ${title}`,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImageUrl],
  },
  alternates: {
    canonical: "https://react-grab.com/design-system",
  },
};

interface DesignSystemLayoutProps {
  children: React.ReactNode;
}

const DesignSystemLayout = ({ children }: DesignSystemLayoutProps) => {
  return children;
};

DesignSystemLayout.displayName = "DesignSystemLayout";

export default DesignSystemLayout;
