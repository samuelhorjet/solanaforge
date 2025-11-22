// FILE: types/token.ts

export interface Token {
  id: string;
  name: string;
  symbol: string;
  supply: number;
  decimals: number;
  mintAddress: string;
  createdAt: string;
  status: "active" | "inactive";
  balance: number;
  description?: string; // Optional description
}