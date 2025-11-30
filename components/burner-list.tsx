// FILE: components/burner-list.tsx

"use client";

import { BurnHistoryItem } from "@/hooks/useBurner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Flame } from "lucide-react";

interface BurnerListProps {
  history: BurnHistoryItem[];
  onStartBurn: () => void;
}

export function BurnerList({ history, onStartBurn }: BurnerListProps) {
  return (
    <Card className="animate-slide-up min-h-[500px] border-orange-200/50">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-6 bg-orange-50/50 dark:bg-orange-950/10">
        <div>
          <CardTitle className="font-serif text-2xl text-orange-700 dark:text-orange-400">
            Incinerator History
          </CardTitle>
          <CardDescription>
            Recent burn events from this session
          </CardDescription>
        </div>
        <Button
          onClick={onStartBurn}
          className="bg-orange-600 hover:bg-orange-700 text-white gap-2 shadow-lg shadow-orange-500/20"
        >
          <Flame className="h-4 w-4" /> Start Burn
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        {history.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="bg-orange-100 dark:bg-orange-900/20 p-5 rounded-full inline-block animate-pulse">
              <Flame className="h-10 w-10 text-orange-500" />
            </div>
            <div>
              <p className="text-lg font-medium">No burns recorded yet</p>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Burnt tokens are removed from circulation permanently.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 border rounded-lg bg-background/50"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 p-2 rounded-full">
                    <Flame className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-bold">
                      {item.amount} {item.token}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.type} {item.lockId ? `(ID: ${item.lockId})` : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {item.date.toLocaleTimeString()}
                  </p>
                  <a
                    href={`https://solscan.io/tx/${item.id}?cluster=devnet`}
                    target="_blank"
                    className="text-xs text-blue-500 hover:underline"
                  >
                    View Tx
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
