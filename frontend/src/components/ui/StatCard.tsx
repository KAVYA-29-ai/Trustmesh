import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  state?: "ready" | "pending" | "neutral";
}

function StatCard({
  label,
  value,
  detail,
  icon,
  state = "neutral",
}: StatCardProps) {
  return (
    <article className={`stat-card stat-card-${state}`}>
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>

      <div className="stat-value">{value}</div>

      <div className="stat-detail">{detail}</div>
    </article>
  );
}

export default StatCard;
