import type { Component } from "solid-js";

interface IconCheckProps {
  size?: number;
  class?: string;
}

export const IconCheck: Component<IconCheckProps> = (props) => {
  const size = () => props.size ?? 21;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={(size() * 20.1848) / 20.5381}
      viewBox="0 0 21 21"
      fill="none"
      class={props.class}
    >
      <g clip-path="url(#clip0_icon_check)">
        <path
          d="M20.1767 10.0875C20.1767 15.6478 15.6576 20.175 10.0875 20.175C4.52715 20.175 0 15.6478 0 10.0875C0 4.51914 4.52715 0 10.0875 0C15.6576 0 20.1767 4.51914 20.1767 10.0875ZM13.0051 6.23867L8.96699 12.7041L7.08476 10.3143C6.83358 9.99199 6.59941 9.88828 6.28984 9.88828C5.79414 9.88828 5.39961 10.2918 5.39961 10.7893C5.39961 11.0367 5.48925 11.2621 5.66386 11.4855L8.05703 14.3967C8.33027 14.7508 8.63183 14.9103 8.99902 14.9103C9.36445 14.9103 9.68105 14.7312 9.90546 14.3896L14.4742 7.27206C14.6107 7.04765 14.7289 6.80898 14.7289 6.58359C14.7289 6.07187 14.281 5.72968 13.7934 5.72968C13.4937 5.72968 13.217 5.90527 13.0051 6.23867Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_icon_check">
          <rect width="20.5381" height="20.1848" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
