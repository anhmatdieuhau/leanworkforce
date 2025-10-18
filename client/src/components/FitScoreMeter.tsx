interface FitScoreMeterProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function FitScoreMeter({ score, size = "md", showLabel = true }: FitScoreMeterProps) {
  const sizeClasses = {
    sm: { container: "w-16 h-16", text: "text-lg", label: "text-xs" },
    md: { container: "w-24 h-24", text: "text-2xl", label: "text-sm" },
    lg: { container: "w-32 h-32", text: "text-3xl", label: "text-base" },
  };

  const currentSize = sizeClasses[size];
  
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  const getColorClass = () => {
    if (score >= 80) return "stroke-[hsl(142,76%,36%)]"; // Success green
    if (score >= 50) return "stroke-foreground"; // Neutral black
    return "stroke-[hsl(0,84%,60%)]"; // Warning red
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative ${currentSize.container}`} data-testid="fit-score-meter">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            className={getColorClass()}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`${currentSize.text} font-bold`} data-testid="fit-score-value">{score}</div>
            {showLabel && <div className={`${currentSize.label} text-muted-foreground`}>Fit</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
