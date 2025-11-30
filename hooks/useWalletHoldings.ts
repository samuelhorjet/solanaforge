// FILE: hooks/useWalletHoldings.ts

import { useState, useCallback, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  unpackMint,
} from "@solana/spl-token";
import { fetchTokenMetadata } from "@/hooks/useTokenMetadata";
import { Token } from "@/types/token";

export function useWalletHoldings() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [holdings, setHoldings] = useState<Token[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHoldings = useCallback(async () => {
    if (!publicKey) return;
    setIsLoading(true);

    try {
      // 1. Fetch SOL Balance
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / LAMPORTS_PER_SOL);

      // 2. Fetch All Token Accounts
      const [legacyAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        }),
        connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      ]);

      const allTokenAccounts = [
        ...legacyAccounts.value,
        ...token2022Accounts.value,
      ];

      // 3. Initial Filter
      const activeAccounts = allTokenAccounts.filter((t) => {
        return t.account.data.parsed.info.tokenAmount.uiAmount > 0;
      });

      if (activeAccounts.length === 0) {
        setHoldings([]);
        setIsLoading(false);
        return;
      }

      // 4. Batch Fetch Mint Info
      const mintAddresses = activeAccounts.map(
        (t) => new PublicKey(t.account.data.parsed.info.mint)
      );

      const mintInfos = await connection.getMultipleAccountsInfo(mintAddresses);

      // 5. Map Data
      const holdingsPromises = activeAccounts.map(async (t, index) => {
        const info = t.account.data.parsed.info;
        const mint = info.mint;
        const ownerProgram = t.account.owner;
        const decimals = info.tokenAmount.decimals;

        const mintAccountInfo = mintInfos[index];
        let isMintable = false;
        let mintAuthority = "";
        let supply = 0;

        if (mintAccountInfo) {
          try {
            const mintData = unpackMint(
              new PublicKey(mint),
              mintAccountInfo,
              mintAccountInfo.owner
            );

            supply = Number(mintData.supply) / 10 ** decimals; // Normalized supply

            // Filter out NFTs (Decimals 0 AND Supply 1)
            // Note: Using raw supply for check, normalized for display
            if (decimals === 0 && Number(mintData.supply) === 1) {
              return null;
            }

            if (mintData.mintAuthority) {
              mintAuthority = mintData.mintAuthority.toBase58();
              if (mintData.mintAuthority.equals(publicKey)) {
                isMintable = true;
              }
            }
          } catch (e) {
            console.warn("Failed to unpack mint for", mint);
          }
        }

        // Metadata Fetching
        const meta = await fetchTokenMetadata(connection, mint);

        // --- UPDATED: FETCH FULL JSON CONTENT ---
        let imageUrl = "";
        let description = "";
        let website = "";
        let twitter = "";
        let telegram = "";

        if (meta.uri) {
          try {
            const cleanUri = meta.uri.replace(/\0/g, "").trim();
            if (cleanUri) {
              const response = await fetch(cleanUri);
              if (response.ok) {
                const json = await response.json();

                // 1. Image
                imageUrl = json.image || "";

                // 2. Description
                description = json.description || "";

                // 3. External URL (Website)
                website = json.external_url || "";

                // 4. Attributes (Socials)
                if (Array.isArray(json.attributes)) {
                  const twitAttr = json.attributes.find(
                    (a: any) => a.trait_type === "Twitter"
                  );
                  if (twitAttr) twitter = twitAttr.value;

                  const teleAttr = json.attributes.find(
                    (a: any) => a.trait_type === "Telegram"
                  );
                  if (teleAttr) telegram = teleAttr.value;
                }
              }
            }
          } catch (e) {
            // silent fail
          }
        }

        return {
          id: t.pubkey.toBase58(),
          name: meta.name || "Unknown",
          symbol: meta.symbol || "UNK",
          supply: supply,
          balance: info.tokenAmount.uiAmount,
          decimals: decimals,
          mintAddress: mint,
          createdAt: new Date().toISOString(),
          status: "active",
          programId: ownerProgram.toBase58(),
          image: imageUrl,
          isMintable: isMintable,
          authority: mintAuthority,
          // --- NEW FIELDS ---
          description,
          website,
          twitter,
          telegram,
        } as Token;
      });

      const resolvedHoldings = await Promise.all(holdingsPromises);
      const cleanedHoldings = resolvedHoldings.filter(
        (t): t is Token => t !== null
      );

      setHoldings(cleanedHoldings);
    } catch (error) {
      console.error("Error loading holdings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  return { holdings, balance, isLoading, refreshHoldings: fetchHoldings };
}
