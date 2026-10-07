import { Link } from "react-router-dom";

export const SelectorCases = () => (
  <section>
    <h2>Selector fallback</h2>
    <div className="target-row">
      <Link
        aria-label="Duplicate semantic destination"
        data-selector-special={"quotes\"' brackets[] colon:# slash/ check✓"}
        data-testid="selector-special-target"
        to="/detail?source=special&value=item:two/%E2%9C%93"
      >
        Duplicate destination
      </Link>
      <Link
        aria-label="Duplicate semantic destination"
        to="/detail?source=special&value=item:two/%E2%9C%93"
      >
        Duplicate destination
      </Link>
    </div>
  </section>
);
