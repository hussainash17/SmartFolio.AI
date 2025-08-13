"use client";

import * as React from "react";
import { cn } from "./utils";

interface SliderProps {
  className?: string;
  defaultValue?: number[];
  value?: number[];
  onValueChange?: (values: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

function Slider({
  className,
  defaultValue = [50],
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
}: SliderProps) {
  const [internalValue, setInternalValue] = React.useState(
    value || defaultValue || [50]
  );

  const currentValue = value || internalValue;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = [Number(event.target.value)];
    setInternalValue(newValue);
    onValueChange?.(newValue);
  };

  const percentage = ((currentValue[0] - min) / (max - min)) * 100;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue[0]}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
        />
        
        {/* Track */}
        <div className="relative flex w-full touch-none items-center select-none h-4">
          <div className="bg-muted relative grow overflow-hidden rounded-full h-4 w-full">
            {/* Range */}
            <div
              className="bg-primary absolute h-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
          
          {/* Thumb */}
          <div
            className="border-primary bg-background ring-ring/50 absolute block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            style={{ left: `calc(${percentage}% - 8px)` }}
            onClick={(e) => {
              if (disabled) return;
              const rect = e.currentTarget.parentElement!.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const newPercentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
              const newValue = min + (newPercentage / 100) * (max - min);
              const steppedValue = Math.round(newValue / step) * step;
              const clampedValue = Math.max(min, Math.min(max, steppedValue));
              const finalValue = [clampedValue];
              setInternalValue(finalValue);
              onValueChange?.(finalValue);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export { Slider };