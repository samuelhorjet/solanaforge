// FILE: components/token-list.tsx

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Coins,
  Search,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Send,
  Plus,
  Lock,
  LockOpen,
  Flame,
  Wallet,
  Loader2,
  Eye,
} from "lucide-react";
import { Token } from "@/types/token";
import Image from "next/image";
import { TokenActionModal } from "@/components/token-action-modal";
import { TokenDetails } from "@/components/token-details"; // <--- IMPORT NEW COMPONENT

interface TokenListProps {
  tokens: Token[];
  isLoading?: boolean;
  onTokenAction: (
    action: "view" | "refresh" | "lock" | "burn",
    token?: Token
  ) => void;
}

export function TokenList({
  tokens,
  isLoading,
  onTokenAction,
}: TokenListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // --- Modal State ---
  const [activeToken, setActiveToken] = useState<Token | null>(null);
  const [actionType, setActionType] = useState<"transfer" | "mint" | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- View State ---
  const [selectedDetailToken, setSelectedDetailToken] = useState<Token | null>(
    null
  );

  // Filter Tokens
  const filteredTokens = tokens.filter(
    (token) =>
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.mintAddress.includes(searchTerm)
  );

  const formatNumber = (num: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(num);

  const copyToClipboard = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent row click
    navigator.clipboard.writeText(text);
  };

  const handleOpenAction = (token: Token, type: "transfer" | "mint") => {
    setActiveToken(token);
    setActionType(type);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    onTokenAction("refresh");
    setIsModalOpen(false);
  };

  // --- RENDER DETAIL VIEW ---
  if (selectedDetailToken) {
    return (
      <TokenDetails
        token={selectedDetailToken}
        onBack={() => setSelectedDetailToken(null)}
      />
    );
  }

  // --- RENDER LOADING ---
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // --- RENDER EMPTY STATE ---
  if (tokens.length === 0) {
    return (
      <Card className="border-dashed animate-slide-up">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Coins className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-lg font-semibold">No tokens created yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-2">
            Use the "Create Token" button above to mint your first asset on
            Solana Devnet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // --- RENDER LIST ---
  return (
    <>
      <Card className="animate-slide-up">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-serif text-xl">
                Your Token List
              </CardTitle>
              <CardDescription>
                Manage supply, view balances, and transfer assets.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-6">Asset</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Total Supply</TableHead>
                  <TableHead>Mint Authority</TableHead>
                  <TableHead>Your Balance</TableHead>
                  <TableHead className="w-[100px] text-right pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTokens.map((token) => (
                  <TableRow
                    key={token.id}
                    className="group cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedDetailToken(token)} // Click row to view details
                  >
                    {/* COL 1: ASSET */}
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted border shrink-0">
                          {token.image ? (
                            <Image
                              src={token.image}
                              alt={token.symbol}
                              layout="fill"
                              objectFit="cover"
                            />
                          ) : (
                            <Coins className="h-5 w-5 text-muted-foreground absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold">{token.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {token.symbol}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* COL 2: ADDRESS */}
                    <TableCell>
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:text-primary group/addr w-fit"
                        onClick={(e) => copyToClipboard(token.mintAddress, e)}
                        title={token.mintAddress}
                      >
                        <code className="bg-muted px-2 py-1 rounded text-xs group-hover/addr:bg-primary/10 transition-colors font-mono">
                          {token.mintAddress.slice(0, 4)}...
                          {token.mintAddress.slice(-4)}
                        </code>
                        <Copy className="h-3 w-3 opacity-0 group-hover/addr:opacity-100 transition-opacity" />
                      </div>
                    </TableCell>

                    {/* COL 3: SUPPLY */}
                    <TableCell>
                      <div className="font-mono text-sm">
                        {formatNumber(token.supply)}
                      </div>
                    </TableCell>

                    {/* COL 4: MINT AUTHORITY */}
                    <TableCell>
                      {token.isMintable ? (
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 text-green-600 border-green-200 gap-1 pr-3"
                        >
                          <LockOpen className="h-3 w-3" /> Mintable
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-red-500/10 text-red-600 border-red-200 gap-1 pr-3"
                        >
                          <Lock className="h-3 w-3" /> Fixed
                        </Badge>
                      )}
                    </TableCell>

                    {/* COL 5: BALANCE */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Wallet className="h-3 w-3 text-muted-foreground" />
                        <span
                          className={
                            token.balance > 0
                              ? "font-bold text-foreground"
                              : "text-muted-foreground"
                          }
                        >
                          {formatNumber(token.balance)}
                        </span>
                      </div>
                    </TableCell>

                    {/* COL 6: ACTIONS */}
                    <TableCell className="text-right pr-6">
                      <div onClick={(e) => e.stopPropagation()}>
                        {" "}
                        {/* Prevent row click */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-background"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>

                            <DropdownMenuItem
                              onClick={() => setSelectedDetailToken(token)}
                            >
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => onTokenAction("view", token)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" /> Explorer
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                handleOpenAction(token, "transfer")
                              }
                              disabled={token.balance <= 0}
                            >
                              <Send className="h-4 w-4 mr-2" /> Transfer
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleOpenAction(token, "mint")}
                              disabled={!token.isMintable}
                            >
                              <Plus className="h-4 w-4 mr-2" /> Mint Supply
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => onTokenAction("lock", token)}
                              disabled={token.balance <= 0}
                            >
                              <Lock className="h-4 w-4 mr-2 text-blue-500" />{" "}
                              Lock Liquidity
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => onTokenAction("burn", token)}
                              disabled={token.balance <= 0}
                            >
                              <Flame className="h-4 w-4 mr-2 text-orange-500" />{" "}
                              Burn Token
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* --- Reusable Token Action Modal --- */}
      <TokenActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        token={activeToken}
        action={actionType}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}
