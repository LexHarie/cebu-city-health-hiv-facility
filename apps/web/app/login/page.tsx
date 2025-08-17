"use client";

import * as React from "react";
import { useState } from "react";
import { RedRibbonIcon } from "@cebu-health/ui/components/RedRibbonIcon";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otpType, setOtpType] = useState<"EMAIL" | "SMS">("EMAIL");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: otpType,
          email: otpType === "EMAIL" ? email : undefined,
          phone: otpType === "SMS" ? phone : undefined,
        }),
      });

      if (response.ok) {
        window.location.href = "/verify";
      }
    } catch (error) {
      // Handle login error
    } finally {
      setIsLoading(false);
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
            <h1 className="text-2xl font-bold text-gray-900">
              Cebu City Health HIV Care
            </h1>
            <p className="text-gray-600 mt-2">
              Sign in to access the care management system
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex rounded-lg border border-gray-300 p-1 bg-gray-50">
              <button
                type="button"
                onClick={() => setOtpType("EMAIL")}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  otpType === "EMAIL"
                    ? "bg-[#D4AF37] text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setOtpType("SMS")}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  otpType === "SMS"
                    ? "bg-[#D4AF37] text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                SMS
              </button>
            </div>

            {otpType === "EMAIL" ? (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  placeholder="Enter your email address"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || (!email && otpType === "EMAIL") || (!phone && otpType === "SMS")}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D4AF37] hover:bg-[#B8941F] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Sending..." : "Send Verification Code"}
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to comply with data privacy regulations
            and use this system responsibly for patient care.
          </p>
        </div>
      </div>
    </div>
  );
}