import { Link } from "react-router-dom";

export const DetailPage = () => (
  <main>
    <h1>Detail route</h1>
    <p data-testid="route-detail-target">Client-routed detail target</p>
    <Link data-testid="detail-back-link" to="/">
      Back to fixture home
    </Link>
  </main>
);
