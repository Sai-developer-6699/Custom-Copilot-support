import React, { useEffect, useState, useRef } from "react";
import { useInView } from "framer-motion";
import { cn } from "../../lib/utlis";

export default function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  decimalPlaces = 0,
  className,
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -50px 0px" });
  const [displayVal, setDisplayVal] = useState(direction === "down" ? value : 0);

  useEffect(() => {
    if (!isInView) return;

    let startTimestamp = null;
    const duration = 1800; // 1.8 seconds duration
    const endVal = value;
    const startVal = direction === "down" ? value : 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Ease out quad formula
      const easedProgress = progress * (2 - progress);
      const currentVal = startVal + easedProgress * (endVal - startVal);
      
      setDisplayVal(currentVal);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    const timeoutId = setTimeout(() => {
      window.requestAnimationFrame(step);
    }, delay * 1000);

    return () => clearTimeout(timeoutId);
  }, [isInView, value, direction, delay]);

  return (
    <span
      ref={ref}
      className={cn(
        "inline-block tabular-nums text-zinc-50 font-bold",
        className
      )}
    >
      {displayVal.toFixed(decimalPlaces)}
    </span>
  );
}
