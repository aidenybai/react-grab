import { SVGProps } from "react";

export const IconGemini = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M14 28C14 21.9249 9.07513 17 3 17V11C9.07513 11 14 6.07513 14 0C14 6.07513 18.9249 11 25 11V17C18.9249 17 14 21.9249 14 28Z"
      fill="url(#paint0_radial_gemini)"
    />
    <defs>
      <radialGradient
        id="paint0_radial_gemini"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(3 17) rotate(-45) scale(36.7696)"
      >
        <stop offset="0" stopColor="#1BA1E3" />
        <stop offset="0.3" stopColor="#5489D6" />
        <stop offset="0.55" stopColor="#9B72CB" />
        <stop offset="0.75" stopColor="#D96570" />
        <stop offset="1" stopColor="#F49C46" />
      </radialGradient>
    </defs>
  </svg>
);
