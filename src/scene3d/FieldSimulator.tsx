"use client";
export interface FieldSimulatorProps {
  stage?: boolean;
  initialPreset?: number;
  liveSoil?: boolean;
  height?: number | string;
  autoTour?: boolean;
}
export function FieldSimulator({ height = 640 }: FieldSimulatorProps) {
  return (
    <div className="grid place-items-center rounded-2xl border border-line bg-surface text-dim" style={{ height }}>
      3D saha (yapım aşamasında)
    </div>
  );
}
