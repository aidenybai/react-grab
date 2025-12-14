"use client";

export const DemoFooter = () => {
  const handleRestartClick = () => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.clear();
    } catch {
      return;
    }
    window.location.reload();
  };

  return (
    <div className="pt-4 text-sm text-white/50">
      <p>
        created by{" "}
        <a
          href="https://million.dev"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-white/80"
        >
          million.dev
        </a>{" "}
        &middot;{" "}
        <button
          type="button"
          onClick={handleRestartClick}
          className="underline underline-offset-4 hover:text-white/80"
        >
          restart demo
        </button>{" "}
        &middot;{" "}
        <a
          href="/blog"
          className="underline underline-offset-4 hover:text-white/80"
        >
          blog
        </a>{" "}
        &middot;{" "}
        <a
          href="/changelog"
          className="underline underline-offset-4 hover:text-white/80"
        >
          changelog
        </a>
      </p>
    </div>
  );
};

DemoFooter.displayName = "DemoFooter";
