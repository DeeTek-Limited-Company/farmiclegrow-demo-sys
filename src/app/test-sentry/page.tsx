"use client";

import { Button } from "@/components/ui/button";

export default function TestSentryPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <h1 className="text-2xl font-bold">Sentry Integration Test</h1>
      <p className="text-muted-foreground">Click the button below to trigger a test error.</p>
      <Button
        variant="destructive"
        onClick={() => {
          throw new Error("Sentry Test Error: " + new Date().toISOString());
        }}
      >
        Trigger Test Error
      </Button>
    </div>
  );
}
