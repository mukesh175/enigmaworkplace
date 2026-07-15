"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@enigma.work");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Email or password is incorrect.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-12 bg-brand-dark border-r border-base-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />
        <div className="relative">
          <div className="bg-white rounded-sm px-4 py-3 inline-block mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt="Enigma Nxt" className="h-10 w-auto" />
          </div>
          <span className="pill text-brand-accent border-brand-accent/40">Operating System</span>
          <h1 className="font-display text-5xl mt-6 leading-tight text-white">
            Workplace
          </h1>
        </div>
        <p className="relative text-base-200 max-w-sm text-sm leading-relaxed">
          Clients, projects, tasks, time, invoicing, attendance, files and team chat —
          run the whole agency from one console.
        </p>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <h2 className="font-display text-2xl mb-1">Sign in</h2>
          <p className="text-base-400 text-sm mb-8">Welcome back. Enter your credentials.</p>

          <div className="mb-4">
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-danger text-sm mb-4">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-base-500 text-xs mt-6 leading-relaxed">
            Seeded admin: <span className="font-mono text-base-300">admin@enigma.work</span> /{" "}
            <span className="font-mono text-base-300">admin123</span>
          </p>
        </form>
      </div>
    </div>
  );
}
