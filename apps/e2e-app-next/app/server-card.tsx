// A React Server Component. Elements it renders carry server frames in their
// bippy owner stack, so grabbing them drives react-grab's Next symbolication
// path (POST /__nextjs_original-stack-frames). The blocking spec grabs inside
// this card while that endpoint is stalled.
export function ServerCard() {
  return (
    <section
      data-testid="server-card"
      style={{ padding: 16, border: "1px solid #ccc", borderRadius: 8, marginTop: 16 }}
    >
      <h2 data-testid="server-card-title">Server-rendered card</h2>
      <p data-testid="server-card-body">This paragraph is rendered by a React Server Component.</p>
      <button data-testid="server-card-button" type="button">
        Server button
      </button>
    </section>
  );
}
