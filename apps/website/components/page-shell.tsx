export const PageShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-canvas">
      <main className="page-fade-in mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 pb-16 text-body leading-relaxed text-prose">
        {children}
      </main>
    </div>
  );
};
