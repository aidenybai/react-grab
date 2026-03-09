export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="main-layout">
      <nav className="sidebar" />
      <main className="content">{children}</main>
    </div>
  );
}
