import type { Metadata } from "next";
import { HomepageDemo } from "@/components/homepage-demo";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://react-grab.com",
    types: {
      "text/markdown": "https://react-grab.com/index.md",
    },
  },
};

const Home = () => {
  return (
    <main id="main-content">
      <h1 className="sr-only">React Grab — Select React Elements for AI Coding Agents</h1>
      <h2 className="sr-only">Pick any element, hand it to Cursor or Claude Code</h2>
      <h3 className="sr-only">Install with npx grab init</h3>
      <HomepageDemo />
    </main>
  );
};

Home.displayName = "Home";

export default Home;
