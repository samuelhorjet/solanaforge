// FILE: app/api/upload/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file = data.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const uploadData = new FormData();
    uploadData.append("file", file);

    // Upload to Pinata
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
      body: uploadData,
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Failed to upload to Pinata");
    }

    return NextResponse.json({ 
      ipfsHash: json.IpfsHash, 
      url: `https://gateway.pinata.cloud/ipfs/${json.IpfsHash}` 
    });
    
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}