'use client';

import { getVotingdappProgram, getVotingdappProgramId } from '../../votingdapp-exports';
import { useConnection } from '@solana/wallet-adapter-react';
import { Cluster, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { useCluster } from '../cluster/cluster-data-access';
import { useAnchorProvider } from '../solana/solana-provider';
import { useTransactionToast } from '../ui/ui-layout';
import BN from 'bn.js';

export function useVotingdappProgram() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const provider = useAnchorProvider();

  // Get program ID and instance
  const programId = useMemo(() => getVotingdappProgramId(cluster.network as Cluster), [cluster]);
  const program = useMemo(() => getVotingdappProgram(provider, programId), [provider, programId]);

  // Fetch all Poll accounts
  const polls = useQuery({
    queryKey: ['Poll', 'all', { cluster }],
    queryFn: async () => {
      try {
        return await program.account.poll.all();
      } catch (error) {
        console.error('Error fetching polls:', error);
        toast.error('Failed to fetch polls');
        throw error;
      }
    },
  });

  // Fetch all Candidate accounts
  const candidates = useQuery({
    queryKey: ['Candidate', 'all', { cluster }],
    queryFn: async () => {
      try {
        return await program.account.candidate.all();
      } catch (error) {
        console.error('Error fetching candidates:', error);
        toast.error('Failed to fetch candidates');
        throw error;
      }
    },
  });

  // Initialize a new poll
  const initializePoll = useMutation({
    mutationKey: ['Poll', 'initialize', { cluster }],
    mutationFn: async (params: { pollId: number; description: string; pollStart: number; pollEnd: number }) => {
      const { pollId, description, pollStart, pollEnd } = params;

      // Derive the poll PDA
      const [pollPDA] = await PublicKey.findProgramAddress(
        [Buffer.from(`poll-${pollId}`)], // Use a unique seed (e.g., "poll-<pollId>")
        program.programId
      );

      // Call the Anchor method
      return await program.methods
        .initializePoll(
          new BN(pollId), // Convert pollId to BN
          description,
          new BN(pollStart), // Convert pollStart to BN
          new BN(pollEnd) // Convert pollEnd to BN
        )
        .accounts({
          poll: pollPDA,
          signer: provider.wallet.publicKey, // Wallet signer
          systemProgram: SystemProgram.programId, // System program
        })
        .rpc();
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      polls.refetch(); // Update poll list
    },
    onError: (error) => {
      console.error('Error initializing poll:', error);
      toast.error('Failed to initialize poll');
    },
  });

  // Initialize a new candidate
  const initializeCandidate = useMutation({
    mutationKey: ['Candidate', 'initialize', { cluster }],
    mutationFn: async (params: { pollId: number; candidateName: string }) => {
      const { pollId, candidateName } = params;

      // Derive the candidate Keypair
      const candidateKeypair = Keypair.generate();

      return await program.methods
        .initializeCandidate(candidateName, new BN(pollId)) // Ensure pollId is a BN
        .accounts({
          candidate: candidateKeypair.publicKey,
          poll: new PublicKey(pollId),
          signer: provider.wallet.publicKey,
        })
        .signers([candidateKeypair])
        .rpc();
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      candidates.refetch(); // Update candidate list
    },
    onError: (error) => {
      console.error('Error initializing candidate:', error);
      toast.error('Failed to initialize candidate');
    },
  });

  // Cast a vote
  const vote = useMutation({
    mutationKey: ['Vote', 'cast', { cluster }],
    mutationFn: async (params: { pollId: number; candidatePublicKey: string }) => {
      const { pollId, candidatePublicKey } = params;

      return await program.methods
        .vote(new BN(pollId), new PublicKey(candidatePublicKey))
        .accounts({
          poll: new PublicKey(pollId),
          candidate: new PublicKey(candidatePublicKey),
          signer: provider.wallet.publicKey,
        })
        .rpc();
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      candidates.refetch(); // Update candidate list
    },
    onError: (error) => {
      console.error('Error casting vote:', error);
      toast.error('Failed to cast vote');
    },
  });

  return {
    program,
    programId,
    polls,
    candidates,
    initializePoll,
    initializeCandidate,
    vote,
  };
}
