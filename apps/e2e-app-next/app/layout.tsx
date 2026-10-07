import { ProductionProvider } from "./components/ui/production-provider";

export const metadata = {
  title: "React Grab E2E (Next)",
};

const RootLayout = (props: RootLayoutProps) => (
  <html lang="en">
    <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
      <ProductionProvider>{props.children}</ProductionProvider>
      <div id="portal-root" />
    </body>
  </html>
);

export default RootLayout;
