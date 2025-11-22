import { PublicKey, Connection } from "@solana/web3.js";
import {
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";

export async function fetchTokenMetadata(
  connection: Connection,
  mint: PublicKey,
  owner?: PublicKey   // optional owner (wallet) to fetch balance
) {
  // Derive metadata PDA
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  const accountInfo = await connection.getAccountInfo(metadataPda);
  if (!accountInfo) return null;

  const metadata = Metadata.deserialize(accountInfo.data)[0];
  const { name, symbol, uri } = metadata.data;

  // Fetch the JSON metadata
  let image = "";
  try {
    const res = await fetch(uri);
    if (res.ok) {
      const json = await res.json();
      image = json.image || "";
    }
  } catch (e) {
    console.warn("Could not fetch metadata JSON:", e);
  }

  // Fetch decimals + supply
  const mintInfo = await connection.getParsedAccountInfo(mint);
  let decimals = 0;
  let supply = 0;

  if (mintInfo.value) {
    const parsed = (mintInfo.value.data as any).parsed;
    decimals = parsed.info.decimals;
    supply = parseInt(parsed.info.supply) / Math.pow(10, decimals);
  }

  // 🔹 Fetch user balance if owner provided
  let balance = 0;
  if (owner) {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
      mint,
    });

    if (tokenAccounts.value.length > 0) {
      const tokenAccountInfo = tokenAccounts.value[0].account.data.parsed.info;
      balance = parseInt(tokenAccountInfo.tokenAmount.amount) / Math.pow(10, decimals);
    }
  }

  return {
    name: name.replace(/\0/g, ""),
    symbol: symbol.replace(/\0/g, ""),
    uri,
    image,
    decimals,
    supply,
    balance,
  };
}
