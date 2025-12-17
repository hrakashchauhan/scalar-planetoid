import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LectureSense",
  description: "Smart Proctoring for Modern Classrooms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // SAFETY CHECK: Prevent build failure if Vercel env vars are missing
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!clerkKey) {
    return (
      <html lang="en">
        <body className="antialiased p-10 text-center">
          <h1 className="text-2xl font-bold text-red-500">Deployment Pending Configuration</h1>
          <p className="mt-4">
            The environment variable <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> is missing.
            Please add it in Vercel Settings to enable the app.
          </p>
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
