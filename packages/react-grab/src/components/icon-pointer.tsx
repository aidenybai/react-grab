import type { Component } from "solid-js";

interface IconPointerProps {
  size?: number;
  class?: string;
}

export const IconPointer: Component<IconPointerProps> = (props) => {
  const size = () => props.size ?? 20;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size()}
      height={size()}
      viewBox="0 0 20 20"
      fill="none"
      class={props.class}
    >
      <g filter="url(#filter0_d_pointer)">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M3.43938 2.43938C3.85531 2.02345 4.47597 1.88901 5.02673 2.09555L16.0267 6.22055C16.6416 6.45111 17.035 7.05477 16.9976 7.71034C16.9603 8.36592 16.5009 8.921 15.8638 9.08026L11.237 10.237L10.0803 14.8638C9.921 15.5009 9.36592 15.9603 8.71034 15.9976C8.05477 16.035 7.45111 15.6416 7.22055 15.0267L3.09555 4.02673C2.88901 3.47597 3.02345 2.85531 3.43938 2.43938Z"
          fill="white"
        />
      </g>
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M4.67561 3.03188C4.49202 2.96303 4.28514 3.00785 4.14649 3.14649C4.00785 3.28514 3.96303 3.49202 4.03188 3.67561L8.15688 14.6756C8.23373 14.8805 8.43495 15.0117 8.65348 14.9992C8.872 14.9868 9.05703 14.8337 9.11012 14.6213L10.4124 9.41236L15.6213 8.11012C15.8337 8.05703 15.9868 7.872 15.9992 7.65348C16.0117 7.43495 15.8805 7.23373 15.6756 7.15688L4.67561 3.03188Z"
        fill="black"
      />
      <defs>
        <filter
          id="filter0_d_pointer"
          x="0"
          y="0"
          width="20.0001"
          height="20.0001"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="1" />
          <feGaussianBlur stdDeviation="1.5" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_pointer"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_pointer"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};
