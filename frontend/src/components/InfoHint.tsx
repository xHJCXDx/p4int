import { useState } from "react";

interface InfoHintProps {
  text: string;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  tooltipClassName?: string;
}

export function InfoHint({ text, ariaLabel = "Informacion", className = "ml-1", buttonClassName = "", tooltipClassName = "" }: InfoHintProps) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`w-5 h-5 rounded-full border border-blue-500 text-blue-600 text-xs font-bold leading-none flex items-center justify-center hover:bg-blue-50 ${buttonClassName}`}
      >
        i
      </button>
      {open && (
        <span className={`absolute z-20 top-7 right-0 w-72 rounded-lg border border-blue-200 bg-white p-3 text-xs text-gray-700 shadow-lg ${tooltipClassName}`}>
          {text}
        </span>
      )}
    </span>
  );
}
