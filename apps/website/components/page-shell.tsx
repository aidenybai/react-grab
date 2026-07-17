export const PageShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto flex max-w-210 items-start justify-center px-4 sm:px-6">
        <main className="page-fade-in flex min-h-screen w-full max-w-210 flex-col gap-6 border-line bg-card px-6 pt-4 pb-16 text-body leading-relaxed text-prose sm:border-x sm:px-18">
          {children}
        </main>
      </div>
    </div>
  );
};
