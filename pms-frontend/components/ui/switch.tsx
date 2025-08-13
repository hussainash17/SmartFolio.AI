"use client";

import * as React from "react";
import { cn } from "./utils";

interface SwitchProps {
  className?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
}

function Switch({
  className,
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  id,
  name,
}: SwitchProps) {
  const [internalChecked, setInternalChecked] = React.useState(
    checked !== undefined ? checked : defaultChecked
  );

  const isChecked = checked !== undefined ? checked : internalChecked;

  const handleChange = () => {
    if (disabled) return;
    const newChecked = !isChecked;
    setInternalChecked(newChecked);
    onCheckedChange?.(newChecked);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleChange();
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      disabled={disabled}
      id={id}
      onClick={handleChange}
      onKeyDown={handleKeyDown}
      className={cn(
        "peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-all outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isChecked 
          ? "bg-primary" 
          : "bg-switch-background",
        disabled && "cursor-not-allowed opacity-50",
        !disabled && "cursor-pointer",
        className
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={isChecked}
        onChange={() => {}} // Controlled by button click
        name={name}
        tabIndex={-1}
      />
      <div
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-card shadow-sm ring-0 transition-transform",
          isChecked ? "translate-x-[calc(100%-2px)]" : "translate-x-0"
        )}
      />
    </button>
  );
}

export { Switch };