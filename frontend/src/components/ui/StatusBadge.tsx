interface StatusBadgeProps {
  children: string;
  variant?: "success" | "warning" | "danger" | "neutral";
}

function StatusBadge({
  children,
  variant = "success",
}: StatusBadgeProps) {
  return (
    <span className={`status-badge ${variant}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}

export default StatusBadge;