interface IconNextjsProps {
  width?: number;
  height?: number;
  className?: string;
}

export const IconNextjs = ({
  width = 14,
  height = 14,
  className = "",
}: IconNextjsProps) => (
  <span
    className={`inline-flex grayscale opacity-50 ${className}`}
    dangerouslySetInnerHTML={{
      __html: `<svg viewBox="0 0 180 180" width="${width}" height="${height}"><mask height="180" id="nextjs_mask0" maskUnits="userSpaceOnUse" style="mask-type:alpha" width="180" x="0" y="0"><circle cx="90" cy="90" fill="black" r="90"></circle></mask><g mask="url(#nextjs_mask0)"><circle cx="90" cy="90" data-circle="true" fill="black" r="90" stroke="white" stroke-width="6px"></circle><path d="M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z" fill="url(#nextjs_paint0)"></path><rect fill="url(#nextjs_paint1)" height="72" width="12" x="115" y="54"></rect></g><defs><linearGradient gradientUnits="userSpaceOnUse" id="nextjs_paint0" x1="109" x2="144.5" y1="116.5" y2="160.5"><stop stop-color="white"></stop><stop offset="1" stop-color="white" stop-opacity="0"></stop></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="nextjs_paint1" x1="121" x2="120.799" y1="54" y2="106.875"><stop stop-color="white"></stop><stop offset="1" stop-color="white" stop-opacity="0"></stop></linearGradient></defs></svg>`,
    }}
  />
);

IconNextjs.displayName = "IconNextjs";
