export default function PageWrapperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-wrapper">{children}</div>;
}
