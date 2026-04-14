const ORBS = [
  { id: "orb-1", size: 320, top: "12%", left: "6%", color: "var(--info)", delay: "0s" },
  { id: "orb-2", size: 260, top: "18%", right: "10%", color: "var(--violet)", delay: "2s" },
  { id: "orb-3", size: 300, bottom: "8%", left: "18%", color: "var(--success)", delay: "4s" },
  { id: "orb-4", size: 220, bottom: "16%", right: "16%", color: "var(--warning)", delay: "1.5s" },
];

const BEAMS = [
  { id: "beam-1", width: "44%", top: "16%", left: "-8%", rotation: "-8deg" },
  { id: "beam-2", width: "36%", top: "52%", right: "-6%", rotation: "12deg" },
  { id: "beam-3", width: "28%", bottom: "18%", left: "26%", rotation: "-14deg" },
];

const NODES = Array.from({ length: 12 }, (_, index) => ({
  id: `node-${index}`,
  top: `${16 + (index % 4) * 18}%`,
  left: `${8 + Math.floor(index / 4) * 28}%`,
  delay: `${index * 0.45}s`,
}));

export default function BackgroundScene() {
  return (
    <div className="background-scene" aria-hidden="true">
      <div className="background-scene__grid" />
      {ORBS.map((orb) => (
        <span
          key={orb.id}
          className="background-scene__orb"
          style={{
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
            right: orb.right,
            bottom: orb.bottom,
            "--orb-color": orb.color,
            animationDelay: orb.delay,
          }}
        />
      ))}
      {BEAMS.map((beam) => (
        <span
          key={beam.id}
          className="background-scene__beam"
          style={{
            width: beam.width,
            top: beam.top,
            left: beam.left,
            right: beam.right,
            bottom: beam.bottom,
            transform: `rotate(${beam.rotation})`,
          }}
        />
      ))}
      <div className="background-scene__network">
        {NODES.map((node) => (
          <span
            key={node.id}
            className="background-scene__node"
            style={{ top: node.top, left: node.left, animationDelay: node.delay }}
          />
        ))}
      </div>
    </div>
  );
}
