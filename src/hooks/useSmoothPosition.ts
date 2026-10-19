import { useEffect, useRef, useState } from "react";
import { lerp, type LatLng } from "../lib/geo";

/**
 * Glides a map marker between GPS updates instead of jumping.
 * Each new target is reached over `durationMs`, roughly the driver app's update interval.
 */
export function useSmoothPosition(target: LatLng | null, heading = 0, durationMs = 1000) {
  const [pos, setPos] = useState<{ location: LatLng; heading: number } | null>(target ? { location: target, heading } : null);
  const current = useRef<LatLng | null>(target);
  const frame = useRef<number | null>(null);
  const headingRef = useRef(heading);

  useEffect(() => {
    if (!target) return;
    headingRef.current = heading;
    const from = current.current ?? target;
    const start = Date.now();
    if (frame.current) cancelAnimationFrame(frame.current);
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const p = lerp(from, target, t);
      current.current = p;
      setPos({ location: p, heading: headingRef.current });
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, [target?.latitude, target?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  return pos;
}
