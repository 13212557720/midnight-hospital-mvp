export function ProgressPips({ current, total }: { current: number; total: number }) {
  return (
    <div className="status-bar" aria-label="节点进度">
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className="status-chip">
          {index < current ? '已清除' : `节点 ${index + 1}`}
        </span>
      ))}
    </div>
  );
}
