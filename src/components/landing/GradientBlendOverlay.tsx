interface GradientBlendOverlayProps {
  direction?: "left" | "right";
  className?: string;
}

/**
 * Reusable gradient blend overlay component for images
 * Creates a smooth blend transition from image to background
 */
export default function GradientBlendOverlay({
  direction = "right",
  className = "",
}: GradientBlendOverlayProps) {
  const gradientDirection =
    direction === "left" ? "bg-gradient-to-l" : "bg-gradient-to-r";
  const borderRadiusClasses =
    direction === "left"
      ? "rounded-br-lg lg:rounded-tl-none lg:rounded-bl-none"
      : "rounded-lg lg:rounded-l-none lg:rounded-tr-none lg:rounded-br-none";

  return (
    <div
      className={`absolute inset-0 ${borderRadiusClasses} ${gradientDirection} from-transparent via-white/20 to-white dark:from-transparent dark:via-neutral-900/20 dark:to-neutral-900 pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}

