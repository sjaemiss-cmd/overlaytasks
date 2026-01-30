import type { ReactNode } from "react";

interface CustomTitleBarProps {
  title?: string;
  titleContent?: ReactNode;
  progress?: number;
  actions?: ReactNode;
  className?: string;
  miniMode?: boolean;
}

const CustomTitleBar = ({
  title = "",
  titleContent,
  progress,
  actions,
  className,
  miniMode = false
}: CustomTitleBarProps) => {
  const hasTitle = Boolean(titleContent) || title.trim().length > 0;
  return (
    <div
      className={`drag-region sticky top-0 z-20 ${className ?? ""}`}
    >
      <div className={`panel-glass-strong relative overflow-hidden px-4 py-3 ${miniMode ? "rounded-2xl" : ""}`}>
        {typeof progress === "number" ? (
          <div className="absolute inset-0">
            <div className="h-full w-full bg-white/5" />
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-300/25 via-yellow-300/25 to-red-400/25"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
        <div
          className={`relative z-10 flex items-center ${hasTitle ? "justify-between" : "justify-end"
            }`}
        >
          {hasTitle ? (
            <div className="text-sm font-semibold tracking-[0.2em] text-slate-200">
              {titleContent ?? title}
            </div>
          ) : null}
          <div className="no-drag flex items-center gap-2">{actions}</div>
        </div>
      </div>
    </div>
  );
};

export default CustomTitleBar;

