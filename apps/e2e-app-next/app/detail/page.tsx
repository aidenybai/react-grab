import Link from "next/link";

const DetailPage = () => (
  <main style={{ padding: 24 }}>
    <h1 data-testid="route-detail-target">Next.js detail route</h1>
    <Link data-testid="detail-back-link" href="/">
      Back to fixture home
    </Link>
  </main>
);

export default DetailPage;
