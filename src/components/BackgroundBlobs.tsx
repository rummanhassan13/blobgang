export function BackgroundBlobs() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="ambient-blob" style={{ width: "48vmax", height: "48vmax", top: "-14vmax", left: "-12vmax", background: "var(--ambient-1)" }} />
      <div className="ambient-blob" style={{ width: "40vmax", height: "40vmax", bottom: "-12vmax", right: "-10vmax", background: "var(--ambient-2)", animationDelay: "-7s", animationDuration: "26s" }} />
      <div className="ambient-blob" style={{ width: "34vmax", height: "34vmax", top: "30%", left: "45%", background: "var(--ambient-3)", animationDelay: "-14s", animationDuration: "30s" }} />
    </div>
  );
}
