"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Giriş başarısız");
      }

      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="glass rounded-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center gap-4 mb-8">
          <Image src="/metaplm_logo_2.png" alt="MetaPLM" width={64} height={64} className="rounded-lg" />
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>MetaPLM Workspace</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Devam etmek için giriş yapın</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>E-posta</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta adresinizi girin"
              className="text-sm"
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Şifre</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifrenizi girin"
              className="text-sm"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-sm text-center p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
