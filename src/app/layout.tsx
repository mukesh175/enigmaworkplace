import type { Metadata, Viewport } from "next";
import {
  Space_Grotesk,
  Inter,
  IBM_Plex_Mono,
  Manrope,
  Plus_Jakarta_Sans,
  Outfit,
  Mulish,
  Jost,
  Urbanist,
  Lexend,
  Be_Vietnam_Pro,
  Sora,
  Work_Sans,
  Poppins,
} from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fontCssVar, fontWeightValue } from "@/lib/fonts";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"],
});
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

// Selectable app fonts (see src/lib/fonts.ts). Loaded once here so choosing a
// font in Profile & Settings is instant — no per-request font fetch.
const interSel = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["300", "400", "500", "600"] });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", weight: ["300", "400", "500", "600"] });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-plus-jakarta", weight: ["300", "400", "500", "600"] });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", weight: ["300", "400", "500", "600"] });
const mulish = Mulish({ subsets: ["latin"], variable: "--font-mulish", weight: ["300", "400", "500", "600"] });
const jost = Jost({ subsets: ["latin"], variable: "--font-jost", weight: ["300", "400", "500", "600"] });
const urbanist = Urbanist({ subsets: ["latin"], variable: "--font-urbanist", weight: ["300", "400", "500", "600"] });
const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", weight: ["300", "400", "500", "600"] });
const beVietnam = Be_Vietnam_Pro({ subsets: ["latin"], variable: "--font-be-vietnam", weight: ["300", "400", "500", "600"] });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["300", "400", "500", "600"] });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans", weight: ["300", "400", "500", "600"] });
const poppins = Poppins({ subsets: ["latin"], variable: "--font-poppins", weight: ["300", "400", "500", "600"] });

const FONT_VARS = [
  interSel, manrope, plusJakarta, outfit, mulish, jost, urbanist, lexend, beVietnam, sora, workSans, poppins,
].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: "Enigma Nxt Workplace",
  description: "Clients, projects, time, invoicing and team — one operating system.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Enigma",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1c5c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Custom properties only cascade downward, and the html-level rules that
  // depend on them (font-size scale, background/text colors, font-family)
  // live on <html>/<body> themselves — so the overrides MUST be set here,
  // on <html>, not on some div nested inside <body>. Setting them lower in
  // the tree silently does nothing, which was the earlier bug.
  const session = await getServerSession(authOptions);
  const me = session
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { themeMode: true, accentColor: true, fontFamily: true, fontWeight: true, fontSizeScale: true },
      })
    : null;

  const htmlStyle = {
    "--accent": me?.accentColor ?? "#2f3192",
    "--font-scale": me?.fontSizeScale ?? 1,
    "--font-sans-user": `var(${fontCssVar(me?.fontFamily ?? "inter")})`,
  } as React.CSSProperties;

  return (
    <html
      lang="en"
      data-theme={me?.themeMode ?? "dark"}
      className={`${display.variable} ${sans.variable} ${mono.variable} ${FONT_VARS}`}
      style={htmlStyle}
    >
      <body style={{ fontWeight: fontWeightValue(me?.fontWeight ?? "regular") }}>
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
