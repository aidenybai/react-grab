import type { Metadata } from "next";

const title = "React Grab for Agents";
const description = "React Grab used to stop at copying context for your coding agent. Now it can directly talk to the agent to edit the code directly from the browser.";
const ogImageUrl = `https://react-grab.com/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description)}`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://react-grab.com/blog/agent",
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
    type: "article",
    authors: ["Aiden Bai"],
    publishedTime: "2025-12-04T00:00:00Z",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImageUrl],
    creator: "@aidenybai",
  },
  alternates: {
    canonical: "https://react-grab.com/blog/agent",
  },
};

interface AgentLayoutProps {
  children: React.ReactNode;
}

const AgentLayout = ({ children }: AgentLayoutProps) => {
  return children;
};

AgentLayout.displayName = "AgentLayout";

export default AgentLayout;
