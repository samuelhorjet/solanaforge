// FILE: types/token.ts

export interface Token {
  id: string; 
  mintAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: number; 
  balance: number; 
  image?: string; 
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  isMintable: boolean; 
  programId: string; 
  authority?: string; 
  status: "active" | "inactive";
  createdAt?: string; 
}
