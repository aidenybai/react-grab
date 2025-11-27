import type { Component } from "solid-js";

interface IconZedProps {
  size?: number;
}

export const IconZed: Component<IconZedProps> = (props) => {
  const size = () => props.size ?? 12;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      fill="currentColor"
      width={size()}
      height={size()}
    >
      <path d="M960 0H64C28.65 0 0 28.65 0 64v896c0 35.35 28.65 64 64 64h896c35.35 0 64-28.65 64-64V64c0-35.35-28.65-64-64-64zM725.33 736H298.67c-23.56 0-42.67-19.11-42.67-42.67 0-11.52 4.65-22.53 12.87-30.55L588.44 352H298.67c-23.56 0-42.67-19.11-42.67-42.67s19.11-42.67 42.67-42.67h426.67c23.56 0 42.67 19.11 42.67 42.67 0 11.52-4.65 22.53-12.87 30.55L435.56 650.67h289.78c23.56 0 42.67 19.11 42.67 42.67S748.89 736 725.33 736z" />
    </svg>
  );
};
