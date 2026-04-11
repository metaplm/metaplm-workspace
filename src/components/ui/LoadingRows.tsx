export function LoadingRows({ count = 5, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl animate-pulse"
          style={{
            height: 52,
            background: "rgba(255,255,255,0.04)",
            opacity: 1 - i * 0.15,
          }}
        />
      ))}
    </div>
  );
}
