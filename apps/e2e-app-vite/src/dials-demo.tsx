import { useReactGrab } from "react-grab/react";

const DialKitCard = () => {
  const params = useReactGrab("Card", {
    blur: [0, 0, 40],
    scale: 1.2,
    radius: [24, 0, 80],
    color: "#ff5500",
    background: "#0b1020",
    label: "React Grab",
    visible: true,
    layout: { type: "select", options: ["stack", "fan", "grid"], default: "stack" },
    shadow: {
      _collapsed: false,
      blur: [24, 0, 80],
      opacity: [0.4, 0, 1],
    },
    spring: { type: "spring", visualDuration: 0.5, bounce: 0.2 },
  });

  return (
    <section className="border rounded-lg p-4" data-testid="dialkit-section">
      <h2 className="text-lg font-bold mb-4">useReactGrab() Demo</h2>
      <div className="flex items-center justify-center h-72">
        <div
          data-testid="dialkit-card"
          style={{
            opacity: params.visible ? 1 : 0,
            filter: `blur(${params.blur}px)`,
            transform: `scale(${params.scale})`,
            borderRadius: `${params.radius}px`,
            color: params.color,
            background: params.background,
            boxShadow: `0 8px ${params.shadow.blur}px rgba(0,0,0,${params.shadow.opacity})`,
            transition: `transform ${params.spring.visualDuration}s, filter 0.2s, border-radius 0.2s`,
            width: 220,
            height: 140,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            fontSize: 18,
          }}
        >
          {params.label} ({params.layout})
        </div>
      </div>
    </section>
  );
};

const SceneDials = () => {
  const params = useReactGrab("Scene", {
    fov: [50, 10, 120],
    wireframe: false,
    quality: { type: "select", options: ["low", "medium", "high"], default: "medium" },
  });

  return (
    <section className="border rounded-lg p-4" data-testid="dialkit-section-2">
      <h2 className="text-lg font-bold mb-4">Second useReactGrab() Hook</h2>
      <div className="text-sm text-gray-600" data-testid="scene-readout">
        FOV {params.fov} · {params.quality} · {params.wireframe ? "wireframe" : "solid"}
      </div>
    </section>
  );
};

const TypographyDials = () => {
  const params = useReactGrab("Typography", {
    fontSize: [16, 8, 72],
    lineHeight: [1.5, 0.8, 3],
    weight: { type: "select", options: ["regular", "medium", "bold"], default: "regular" },
    italic: false,
  });

  return (
    <section className="border rounded-lg p-4" data-testid="dialkit-section-3">
      <h2 className="text-lg font-bold mb-4">Third useReactGrab() Hook</h2>
      <p
        data-testid="typography-readout"
        style={{
          fontSize: `${params.fontSize}px`,
          lineHeight: params.lineHeight,
          fontWeight: params.weight === "bold" ? 700 : params.weight === "medium" ? 500 : 400,
          fontStyle: params.italic ? "italic" : "normal",
        }}
      >
        The quick brown fox
      </p>
    </section>
  );
};

const DialsDemo = () => (
  <>
    <DialKitCard />

    <SceneDials />

    <TypographyDials />
  </>
);

export default DialsDemo;
