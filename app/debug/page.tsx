// FILE: app/debug/page.tsx
"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileDebug } from "@/components/mobile-debug";

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2 pl-0">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold font-serif text-red-600">
          Mobile Link Diagnostics
        </h1>
        <p className="text-sm text-muted-foreground">
          Use this page to verify if Deep Linking is working at all.
        </p>
        <MobileDebug />
      </div>
    </div>
  );
}