// FILE: hooks/useCreatedTokens.ts

import { useState, useCallback, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  unpackMint,
} from "@solana/spl-token";
import { Token } from "@/types/token";

// Standard Metaplex Program ID
const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export function useCreatedTokens() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [createdTokens, setCreatedTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Optimistic UI Helper
  const addToken = (token: Token) => {
    setCreatedTokens((prev) => {
      if (prev.some((t) => t.mintAddress === token.mintAddress)) return prev;
      return [token, ...prev];
    });
  };

  const fetchCreatedTokens = useCallback(async () => {
    if (!publicKey) return;
    setIsLoading(true);

    try {
      // 1. Get all token accounts owned by user
      const [legacyAccounts, token22Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        }),
        connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      ]);

      const allTokenAccounts = [
        ...legacyAccounts.value,
        ...token22Accounts.value,
      ];

      if (allTokenAccounts.length === 0) {
        setIsLoading(false);
        return;
      }

      // 2. Prepare Data for Fetching
      const mintsToFetch: PublicKey[] = [];
      const balanceMap = new Map<string, number>();

      allTokenAccounts.forEach((t) => {
        const info = t.account.data.parsed.info;
        const mintKey = new PublicKey(info.mint);
        mintsToFetch.push(mintKey);
        balanceMap.set(info.mint, info.tokenAmount.uiAmount || 0);
      });

      // 3. Derive Metadata PDAs
      const metadataPDAs = mintsToFetch.map((mint) => {
        const [pda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
          ],
          METADATA_PROGRAM_ID
        );
        return pda;
      });

      // 4. Batch Fetch: Get Mints AND Metadata
      const [mintInfos, metadataInfos] = await Promise.all([
        connection.getMultipleAccountsInfo(mintsToFetch),
        connection.getMultipleAccountsInfo(metadataPDAs),
      ]);

      // 5. Filter & Unpack
      const myCreatedTokensData: any[] = [];

      for (let i = 0; i < mintsToFetch.length; i++) {
        const mintPubkey = mintsToFetch[i];
        const mintAddress = mintPubkey.toBase58();
        const mintAccount = mintInfos[i];
        const metaAccount = metadataInfos[i];

        let mintData = null;
        let metaData = null;
        let isMintAuth = false;
        let isUpdateAuth = false;

        // A. Unpack Mint
        if (mintAccount && mintAccount.owner) {
          try {
            mintData = unpackMint(mintPubkey, mintAccount, mintAccount.owner);

            // --- CHECK: Ignore NFTs ---
            if (mintData.decimals === 0 && mintData.supply === BigInt(1)) {
              continue;
            }

            if (mintData.mintAuthority?.equals(publicKey)) {
              isMintAuth = true;
            }
          } catch (e) {
            continue;
          }
        } else {
          continue;
        }

        // B. Unpack Metadata
        if (metaAccount) {
          const bufferData = Buffer.isBuffer(metaAccount.data)
            ? metaAccount.data
            : Buffer.from(metaAccount.data);

          metaData = unpackMetadata(bufferData);

          if (metaData && metaData.updateAuthority === publicKey.toBase58()) {
            isUpdateAuth = true;
          }
        }

        // C. Check Ownership
        if (isMintAuth || isUpdateAuth) {
          myCreatedTokensData.push({
            mintAddress,
            mintData,
            metaData,
            isMintable: isMintAuth,
            programId: mintAccount.owner.toBase58(),
          });
        }
      }

      // 6. Fetch Images AND Description/Socials (Hydrate)
      const finalTokens: Token[] = await Promise.all(
        myCreatedTokensData.map(async (item) => {
          let imageUrl = "";
          // --- NEW VARIABLES ---
          let description = "";
          let website = "";
          let twitter = "";
          let telegram = "";

          const rawUri = item.metaData?.uri;
          const uri = rawUri ? rawUri.replace(/\0/g, "").trim() : "";

          if (uri) {
            try {
              const response = await fetch(uri);

              if (response.ok) {
                const json = await response.json();

                // 1. Image
                imageUrl = json.image || "";

                // --- 2. EXTRACT DESCRIPTION & SOCIALS ---
                description = json.description || "";
                website = json.external_url || ""; // Standard field for website

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
            } catch (e) {
              console.warn("Failed to fetch metadata for", item.mintAddress);
            }
          }

          const decimals = item.mintData?.decimals || 9;
          const supply = item.mintData
            ? Number(item.mintData.supply) / 10 ** decimals
            : 0;

          return {
            id: item.mintAddress,
            mintAddress: item.mintAddress,
            name: item.metaData?.name || "Unknown",
            symbol: item.metaData?.symbol || "UNK",
            decimals: decimals,
            supply: supply,
            balance: balanceMap.get(item.mintAddress) || 0,
            image: imageUrl,
            isMintable: item.isMintable,
            programId: item.programId,
            status: "active",
            authority: publicKey.toBase58(),
            // --- MAPPING NEW FIELDS TO TOKEN OBJECT ---
            description,
            website,
            twitter,
            telegram,
          };
        })
      );

      setCreatedTokens((prev) => {
        const existingOptimistic = prev.filter(
          (p) => !finalTokens.find((f) => f.mintAddress === p.mintAddress)
        );
        return [...existingOptimistic, ...finalTokens];
      });
    } catch (error) {
      console.error("Error fetching created tokens:", error);
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    fetchCreatedTokens();
  }, [fetchCreatedTokens]);

  return {
    createdTokens,
    isLoadingCreated: isLoading,
    refreshCreatedTokens: fetchCreatedTokens,
    addToken,
  };
}

// === HELPER ===
function unpackMetadata(data: Buffer) {
  try {
    if (data[0] !== 4) return null;
    const updateAuthority = new PublicKey(data.subarray(1, 33)).toBase58();
    let offset = 65;

    const readString = () => {
      if (offset + 4 > data.length) return "";
      const len = data.readUInt32LE(offset);
      offset += 4;
      if (offset + len > data.length) return "";
      const str = data.toString("utf8", offset, offset + len);
      offset += len;
      return str.replace(/\0/g, "");
    };

    const name = readString();
    const symbol = readString();
    const uri = readString();

    return { name, symbol, uri, updateAuthority };
  } catch (e) {
    return null;
  }
}
