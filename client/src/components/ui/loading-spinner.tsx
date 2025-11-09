import { cn } from "~/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function LoadingSpinner({ size = "md", text, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  const dotSizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      {/* Animated Circle Spinner */}
      <div className="relative">
        <div
          className={cn(
            "animate-spin rounded-full border-4 border-primary/30 border-t-primary",
            sizeClasses[size]
          )}
        />
      </div>

      {/* Optional Loading Text */}
      {text && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-foreground text-sm font-medium">{text}</p>
          {/* Animated Dots */}
          <div className="flex gap-1">
            <div
              className={cn(
                "animate-bounce rounded-full bg-primary",
                dotSizeClasses[size],
                "[animation-delay:-0.3s]"
              )}
            />
            <div
              className={cn(
                "animate-bounce rounded-full bg-primary",
                dotSizeClasses[size],
                "[animation-delay:-0.15s]"
              )}
            />
            <div
              className={cn(
                "animate-bounce rounded-full bg-primary",
                dotSizeClasses[size]
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function LoadingCard({ text, className }: { text?: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border border-gray-800 bg-secondary/20 p-12",
        className
      )}
    >
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

export function LoadingOverlay({ text }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
