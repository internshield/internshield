import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "InternShield | Learn. Practice. Build. Defend.", description: "Discover internships, build practical skills, and connect with career opportunities through InternShield.", applicationName: "InternShield" };
export const viewport: Viewport = { themeColor: "#070910", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }