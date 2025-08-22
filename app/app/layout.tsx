import type React from "react"
import type { Metadata } from "next"
import { Space_Grotesk, DM_Sans } from "next/font/google"
import "./globals.css"
import { SolanaProvider } from "@/components/solana-provider"; // Import the provider

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
})

export const metadata: Metadata = {
  title: "SolanaForge - Decentralized Token Management",
  description: "A professional Solana DApp for wallet integration, token creation, and decentralized swaps",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable} antialiased`}>
      <body>
        {/* Wrap the entire application with the SolanaProvider */}
        <SolanaProvider>
            <main className="min-h-screen bg-background font-sans antialiased">{children}</main>
        </SolanaProvider>
      </body>
    </html>
  )
}
