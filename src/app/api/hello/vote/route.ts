import { NextRequest, NextResponse } from "next/server";
import { ActionGetResponse, ActionPostRequest, createPostResponse } from "@solana/actions";
import { clusterApiUrl, Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Votingdapp } from "@/../anchor/target/types/votingdapp";
import { BN, Program, AnchorProvider } from "@coral-xyz/anchor";

const ACTIONS_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://dial.to", // Only allow requests from https://dial.to
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS", // Allow required methods
  "Access-Control-Allow-Headers": "Content-Type", // Allow custom headers
  "Access-Control-Max-Age": "86400", // Cache preflight response for 24 hours
};

const IDL = require("@/../anchor/target/idl/votingdapp.json");

export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS,
  });
}

export async function GET(request: NextRequest) {
 const actionMetadata: ActionGetResponse = {
  icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT-57yiXRWKvpfpV_iGOt88doZ1r_rNAtaWSQ&s",
  title: "Vote for your favorite candidate",
  description: "Trump or Biden.",
  label: "Vote",
  links: {
    actions: [
      { type: "link", label: "Vote for Trump", href: "/api/hello/vote?candidate=Trump" },
      { type: "link", label: "Vote for Biden", href: "/api/hello/vote?candidate=Biden" },
    ],
  },
};


  return NextResponse.json(actionMetadata, { headers: ACTIONS_CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const candidate = url.searchParams.get("candidate");

  if (candidate !== "Trump" && candidate !== "Biden") {
    return NextResponse.json("Invalid candidate", { status: 400, headers: ACTIONS_CORS_HEADERS });
  }

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const wallet = AnchorProvider.local().wallet; // Replace with actual wallet implementation
  const provider = new AnchorProvider(connection, wallet, {});
  const program = new Program<Votingdapp>(IDL, IDL.metadata.address, provider);

  const body: ActionPostRequest = await request.json();
  let voter;

  try {
    voter = new PublicKey(body.account);
  } catch (error) {
    return NextResponse.json("Invalid account", { status: 400, headers: ACTIONS_CORS_HEADERS });
  }

  const instruction = await program.methods
    .vote(candidate, new BN(1))
    .accounts({ signer: voter })
    .instruction();

  const blockhash = await connection.getLatestBlockhash();
  const transaction = new Transaction({
    feePayer: voter,
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight,
  }).add(instruction);

  const response = await createPostResponse({
    fields: {
      transaction: transaction,
    },
  });

  return NextResponse.json(response, { headers: ACTIONS_CORS_HEADERS });
}
