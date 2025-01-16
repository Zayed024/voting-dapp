//import { PartialAccounts } from './../node_modules/@coral-xyz/anchor/dist/cjs/program/namespace/methods.d';
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { Votingdapp } from '../target/types/voting';
import { startAnchor } from "solana-bankrun";
import { BankrunProvider } from "anchor-bankrun";

const IDL = require('../target/idl/votingdapp.json');

const votingAddress = new PublicKey("3eioGsPP5yxvRULWdqSkyhcK3jHu2a1MqCynESYzniUE");

describe('Voting', () => {

  let context;
  let provider;
  //let votingProgram;
  anchor.setProvider(anchor.AnchorProvider.env());
  let votingProgram = anchor.workspace.Votingdapp as Program<Votingdapp>;

  beforeAll(async () => {
    context = await startAnchor("", [{name: "votingdapp", programId: votingAddress}], []);
    provider = new BankrunProvider(context);

     votingProgram = new Program<Votingdapp>(
      IDL,
      provider,
    );
  })

  it('Initialize Poll', async () => {
    await votingProgram.methods.initializePoll(
      new anchor.BN(1),
      "Who is your preffered candidate?",
      new anchor.BN(0),
      new anchor.BN(1821246480),
    ).rpc();

    const [pollAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8)],
      votingAddress,
    )

    const poll = await votingProgram.account.poll.fetch(pollAddress);

    console.log(poll);

    expect(poll.pollId.toNumber()).toEqual(1);
    expect(poll.description).toEqual("Who is your preffered candidate?");
    expect(poll.pollStart.toNumber()).toBeLessThan(poll.pollEnd.toNumber());
  });

  it("initialize candidate", async() => {
    await votingProgram.methods.initializeCandidate(
      "Trump",
      new anchor.BN(1),
    ).rpc();
    await votingProgram.methods.initializeCandidate(
      "Biden",
      new anchor.BN(1),
    ).rpc();

    const [bidenAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Biden")],
      votingAddress,
    );
    const bidenCandidate = await votingProgram.account.candidate.fetch(bidenAddress);
    console.log(bidenCandidate);
    expect(bidenCandidate.candidateVotes.toNumber()).toEqual(0);

    const [trumpAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Trump")],
      votingAddress,
    );
    const trumpCandidate = await votingProgram.account.candidate.fetch(trumpAddress);
    console.log(trumpCandidate);
    expect(trumpCandidate.candidateVotes.toNumber()).toEqual(0);
  });

  it("vote", async() => {
    await votingProgram.methods
      .vote(
        "Trump",
        new anchor.BN(1)
      ).rpc()

    const [trumpAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("Trump")],
      votingAddress,
    );
    const trumpCandidate = await votingProgram.account.candidate.fetch(trumpAddress);
    console.log(trumpCandidate);
    expect(trumpCandidate.candidateVotes.toNumber()).toEqual(1);
  });

});