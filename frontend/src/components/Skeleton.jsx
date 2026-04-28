export function SkeletonCard() {
  return (
    <article className="metric-card metric-card--info" style={{ opacity: 0.5 }}>
      <div style={{ background: "#333", borderRadius: 4, height: 12, width: "60%", marginBottom: 8 }} />
      <div style={{ background: "#333", borderRadius: 4, height: 32, width: "40%", marginBottom: 8 }} />
      <div style={{ background: "#333", borderRadius: 4, height: 10, width: "80%" }} />
    </article>
  );
}
export function SkeletonRow() {
  return (
    <div className="service-row service-row--info" style={{ opacity: 0.5 }}>
      <div>
        <div style={{ background: "#333", borderRadius: 4, height: 14, width: 140, marginBottom: 6 }} />
        <div style={{ background: "#333", borderRadius: 4, height: 10, width: 200 }} />
      </div>
    </div>
  );
}
export function SkeletonPanel({ rows = 3 }) {
  return (
    <div className="service-list">
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}
