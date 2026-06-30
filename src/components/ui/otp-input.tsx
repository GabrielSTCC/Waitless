"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { surfaceInput } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

export interface OtpInputHandle {
  focus: () => void;
  clear: () => void;
}

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  onComplete?: (value: string) => void;
  invalid?: boolean;
  id?: string;
  "aria-label"?: string;
}

function sanitizeDigits(input: string, maxLength: number): string {
  return input.replace(/\D/g, "").slice(0, maxLength);
}

export const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(
  function OtpInput(
    {
      length = 4,
      value,
      onChange,
      disabled = false,
      autoFocus = false,
      onComplete,
      invalid = false,
      id = "otp-input",
      "aria-label": ariaLabel,
    },
    ref,
  ) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const completedRef = useRef(false);

    const digits = Array.from({ length }, (_, index) => value[index] ?? "");

    const focusIndex = useCallback(
      (index: number) => {
        const clamped = Math.max(0, Math.min(index, length - 1));
        inputRefs.current[clamped]?.focus();
      },
      [length],
    );

    useImperativeHandle(ref, () => ({
      focus() {
        focusIndex(value.length < length ? value.length : length - 1);
      },
      clear() {
        completedRef.current = false;
        onChange("");
        focusIndex(0);
      },
    }));

    useEffect(() => {
      if (autoFocus && !disabled) {
        focusIndex(0);
      }
    }, [autoFocus, disabled, focusIndex]);

    useEffect(() => {
      if (value.length === length && onComplete && !completedRef.current) {
        completedRef.current = true;
        onComplete(value);
      }
      if (value.length < length) {
        completedRef.current = false;
      }
    }, [value, length, onComplete]);

    function applyValue(nextValue: string, focusAt?: number) {
      const sanitized = sanitizeDigits(nextValue, length);
      onChange(sanitized);
      if (focusAt !== undefined) {
        focusIndex(focusAt);
      }
    }

    function handleDigitChange(index: number, raw: string) {
      const digit = raw.replace(/\D/g, "").slice(-1);

      if (!digit) {
        applyValue(value.slice(0, index) + value.slice(index + 1));
        return;
      }

      const before = value.slice(0, index);
      const after = value.slice(index + 1);
      const nextValue = sanitizeDigits(`${before}${digit}${after}`, length);
      applyValue(nextValue, Math.min(index + 1, length - 1));
    }

    function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
      if (event.key === "Backspace") {
        event.preventDefault();
        if (digits[index]) {
          applyValue(value.slice(0, index) + value.slice(index + 1), index);
          return;
        }
        if (index > 0) {
          applyValue(value.slice(0, index - 1) + value.slice(index), index - 1);
        }
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        focusIndex(index - 1);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        focusIndex(index + 1);
      }
    }

    function handlePaste(event: ClipboardEvent) {
      event.preventDefault();
      const pasted = sanitizeDigits(event.clipboardData.getData("text"), length);
      if (!pasted) return;
      applyValue(pasted, Math.min(pasted.length, length - 1));
    }

    function handleHiddenChange(raw: string) {
      const sanitized = sanitizeDigits(raw, length);
      onChange(sanitized);
      if (sanitized.length > 0) {
        focusIndex(Math.min(sanitized.length, length - 1));
      }
    }

    const boxClass = cn(
      "h-12 w-11 rounded-xl border bg-surface-container-low text-center text-xl font-semibold tabular-nums text-on-surface outline-none transition-shadow",
      "border-outline-variant disabled:cursor-not-allowed disabled:opacity-50",
      surfaceInput,
      "focus:border-primary focus:bg-surface-container focus:ring-2 focus:ring-primary/20",
      invalid && "border-error focus:border-error focus:ring-error/20",
    );

    return (
      <div className="relative flex w-full flex-col items-center">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          tabIndex={-1}
          aria-hidden
          value={value}
          onChange={(event) => handleHiddenChange(event.target.value)}
          disabled={disabled}
        />
        <div
          role="group"
          aria-label={ariaLabel}
          className="flex justify-center gap-2 sm:gap-3"
          onPaste={handlePaste}
        >
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              id={index === 0 ? id : undefined}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label={`Dígito ${index + 1} de ${length}`}
              maxLength={1}
              value={digit}
              disabled={disabled}
              className={boxClass}
              onChange={(event) => handleDigitChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onFocus={(event) => event.target.select()}
              onPaste={handlePaste}
            />
          ))}
        </div>
      </div>
    );
  },
);
