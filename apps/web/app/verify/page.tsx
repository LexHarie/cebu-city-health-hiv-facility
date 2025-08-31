"use client";

import * as React from "react";
import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RedRibbonIcon } from "@cebu-health/ui/components/RedRibbonIcon";

function VerifyForm() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const searchParams = useSearchParams();
  const typeParam = (searchParams.get("type") || "EMAIL") as "EMAIL" | "SMS";
  const emailParam = searchParams.get("email") || "";
  const phoneParam = searchParams.get("phone") || "";

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = code.join("");
    
    if (otpCode.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otpCode, type: typeParam, email: emailParam || undefined, phone: phoneParam || undefined }),
      });

      if (response.ok) {
        window.location.href = "/";
      } else {
        const data = await response.json();
        setError(data.error || "Invalid verification code");
      }
    } catch (error) {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: typeParam, email: emailParam || undefined, phone: phoneParam || undefined })
      });
    } catch (error) {
      // Handle resend error
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <RedRibbonIcon size={48} className="text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Verify Your Identity</h1>
            <p className="text-gray-600 mt-2">
              Enter the 6-digit verification code sent to your {typeParam === 'EMAIL' ? 'email' : 'phone'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-center space-x-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-semibold border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {error && (
              <div className="text-center text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || code.some(digit => !digit)}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D4AF37] hover:bg-[#B8941F] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Verifying..." : "Verify Code"}
          </button>

          <div className="text-center">
            <button type="button" onClick={handleResendCode} className="text-sm text-[#D4AF37] hover:text-[#B8941F] transition-colors">
              Didn&apos;t receive a code? Resend
            </button>
          </div>
        </form>

        <div className="text-center">
          <a href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">← Back to login</a>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-4 text-gray-600">Loading…</div>}>
      <VerifyForm />
    </Suspense>
  );
}
