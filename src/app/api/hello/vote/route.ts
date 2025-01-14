import { ActionGetResponse, ActionPostRequest, createPostResponse } from "@solana/actions";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Voting } from "@/../anchor/target/types/voting";
import { BN, Program } from "@coral-xyz/anchor";

export const ACTIONS_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://dial.to", // Only allow requests from https://dial.to
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS", // Allow required methods
  "Access-Control-Allow-Headers": "Content-Type", // Allow custom headers
  "Access-Control-Max-Age": "86400", // Cache preflight response for 24 hours
};



const IDL = require('@/../anchor/target/idl/voting.json');

//export const OPTIONS = GET;


export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://dial.to",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}



export async function GET(request: Request) {
  const actionMetdata: ActionGetResponse = {
    icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT-57yiXRWKvpfpV_iGOt88doZ1r_rNAtaWSQ&s",
    title: "Vote for your favorite candidate",
    description: "Trump or Biden.",
    label: "Vote",
    links: {
      actions: [
        {
          label: "Vote for Trump",
          href: "/api/hello/vote?candidate=Trump",
        },
        {
          label: "Vote for Biden",
          href: "/api/hello/vote?candidate=Biden",
        }
      ]
    }
  };
  return Response.json(actionMetdata, { headers: ACTIONS_CORS_HEADERS});
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const candidate = url.searchParams.get("candidate");

  if (candidate != "Trump" && candidate != "Biden") {
    return new Response("Invalid candidate", { status: 400, headers: ACTIONS_CORS_HEADERS });
  }

  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const program: Program<Voting> = new Program(IDL, {connection});

  const body: ActionPostRequest = await request.json(); 
  let voter;

  try {
    voter = new PublicKey(body.account);
  } catch (error) {
    return new Response("Invalid account", { status: 400, headers: ACTIONS_CORS_HEADERS });
  }

  const instruction = await program.methods
    .vote(candidate, new BN(1))
    .accounts({
      signer: voter,
    })
    .instruction();

  const blockhash = await connection.getLatestBlockhash();

  const transaction = new Transaction({
      feePayer: voter,
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
    }).add(instruction);

  const response = await createPostResponse({
    fields: {
      transaction: transaction
    }
  });

  return Response.json(response, { headers: ACTIONS_CORS_HEADERS });

}