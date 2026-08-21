import { ReactNode } from "react";

interface DeviceMockupProps {
  children: ReactNode;
  type?: "desktop" | "tablet" | "mobile";
  className?: string;
}

export function DeviceMockup({ children, type = "desktop", className = "" }: DeviceMockupProps) {
  const frameStyles = {
    desktop: "w-full max-w-5xl",
    tablet: "w-full max-w-xl",
    mobile: "w-full max-w-[280px]",
  };

  return (
    <div className={`relative mx-auto ${frameStyles[type]} ${className}`}>
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 rounded-3xl blur-xl opacity-60" />

      {/* Device frame */}
      <div className={`relative bg-neutral-900 rounded-xl overflow-hidden shadow-2xl border border-neutral-700 ${
        type === "desktop" ? "aspect-[16/10]" : type === "tablet" ? "aspect-[4/3]" : "aspect-[9/16]"
      }`}>
        {/* Browser chrome / device top bar */}
        <div className="bg-neutral-800 px-4 py-2.5 flex items-center gap-3 border-b border-neutral-700">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-neutral-600" />
            <div className="w-3 h-3 rounded-full bg-neutral-600" />
            <div className="w-3 h-3 rounded-full bg-neutral-600" />
          </div>
          {/* URL bar (desktop only) */}
          {type === "desktop" && (
            <div className="flex-1 bg-neutral-700 rounded-md px-3 py-1 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary/70" />
              <span className="text-[10px] text-neutral-400 font-mono">app.agrisun.et</span>
            </div>
          )}
          {/* Phone notch (mobile only) */}
          {type === "mobile" && (
            <div className="flex-1 flex justify-center">
              <div className="w-16 h-4 bg-neutral-700 rounded-full" />
            </div>
          )}
          {/* Phone nav dots (tablet) */}
          {type === "tablet" && (
            <div className="flex-1 flex justify-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="w-full h-full overflow-hidden bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}