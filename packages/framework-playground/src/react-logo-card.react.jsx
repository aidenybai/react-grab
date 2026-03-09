export const ReactLogoCard = () => {
  return (
    <button
      id="react-logo-button"
      type="button"
      className="framework-logo-button"
    >
      <svg
        viewBox="0 0 100 100"
        className="framework-logo"
        data-framework-logo="react"
      >
        <g fill="none" stroke="#61dafb" strokeWidth="4">
          <ellipse cx="50" cy="50" rx="34" ry="14" />
          <ellipse
            cx="50"
            cy="50"
            rx="34"
            ry="14"
            transform="rotate(60 50 50)"
          />
          <ellipse
            cx="50"
            cy="50"
            rx="34"
            ry="14"
            transform="rotate(120 50 50)"
          />
        </g>
        <circle cx="50" cy="50" r="7" fill="#61dafb" />
      </svg>
    </button>
  );
};
