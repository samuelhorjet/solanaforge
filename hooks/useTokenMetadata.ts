// FILE: hooks/useTokenMetadata.ts

import { Connection, PublicKey } from "@solana/web3.js";

export interface TokenMetadata {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
}

const METAPLEX_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export const fetchTokenMetadata = async (
  connection: Connection,
  mintAddress: string
): Promise<TokenMetadata> => {
  try {
    const mint = new PublicKey(mintAddress);
    
    // 1. Derive the Metadata PDA manually
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METAPLEX_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      METAPLEX_PROGRAM_ID
    );

    // 2. Fetch the account info directly
    const accountInfo = await connection.getAccountInfo(metadataPDA);

    if (!accountInfo) {
      return { mint: mintAddress, name: "Unknown", symbol: "UNKN", uri: "" };
    }

    // 3. Manually decode the Buffer
    // The Layout is: 
    //   key(1) | update_auth(32) | mint(32) | data_struct...
    //   data_struct: name_len(4) | name | symbol_len(4) | symbol | uri_len(4) | uri ...
    
    const buffer = accountInfo.data;
    
    // Skip Key (1) + UpdateAuth (32) + Mint (32) = 65 bytes
    let offset = 1 + 32 + 32;

    const readString = () => {
      const len = buffer.readUInt32LE(offset);
      offset += 4;
      const str = buffer.toString('utf8', offset, offset + len);
      offset += len;
      return str.replace(/\0/g, ''); // Remove null bytes
    };

    const name = readString();
    const symbol = readString();
    const uri = readString();

    return {
      mint: mintAddress,
      name,
      symbol,
      uri,
    };

  } catch (error) {
    console.warn("Metadata fetch failed:", error);
    return {
      mint: mintAddress,
      name: "Unknown Token",
      symbol: "UNKN",
      uri: "",
    };
  }
};