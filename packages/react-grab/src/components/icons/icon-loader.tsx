import type { Component } from "solid-js";

interface IconLoaderProps {
  size?: number;
  class?: string;
}

export const IconLoader: Component<IconLoaderProps> = (props) => {
  const size = () => props.size ?? 16;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={size()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.class}
    >
      <path
        class="icon-loader-bar"
        style={{ "animation-delay": "0ms" }}
        d="M12 2v4"
      />
      <path
        class="icon-loader-bar"
        style={{ "animation-delay": "-42ms" }}
        d="M15 6.8l2-3.5"
      />
      <path
        class="icon-loader-bar"
        style={{ "animation-delay": "-83ms" }}
        d="M17.2 9l3.5-2"
      />
      <path
        class="icon-loader-bar"
        style={{ "animation-delay": "-125ms" }}
        d="M18 12h4"
      />
      <path
        class="icon-loader-bar"
        style={{ "animation-delay": "-167ms" }}
        d="M17.2 15l3.5 2"
      />
      <path
        class="icon-loader-bar"
        style={{ "animation-delay": "-208ms" }}
        d="M15 17.2l2 3.5"
      />
      <path
        class="icon-loader-bar"
        style={{ "animation-delay": "-250ms" }}
        d="M12 18v4"
      />
      <path
        class="icon-loader-bar"
        style={{ "animation-delay": "-292ms" }}
        d="M9 17.2l-2 3.5"
      />
      <path
        class="icon-loader-bar"
        style={{ "animation-delay": "-333ms" }}
        d="M6.8 15l-3.5 2"
      />
      <path
        class="icon-loader-bar"
        style={{ "animation-delay": "-375ms" }}
        d="M2 12h4"
      />
      <path
        class="icon-loader-bar"
        style={{ "animation-delay": "-417ms" }}
        d="M6.8 9l-3.5-2"
      />
      <path
        class="icon-loader-bar"
        style={{ "animation-delay": "-458ms" }}
        d="M9 6.8l-2-3.5"
      />
    </svg>
  );
};
