'use client';

import { getVotingdappProgram, getVotingdappProgramId } from '../../votingdapp-exports';
import { useConnection } from '@solana/wallet-adapter-react';
import { Cluster, Keypair, PublicKey } from '@solana/web3.js';
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
  const programId = useMemo(() => getVotingdappProgramId(cluster.network as Cluster), [cluster]);
  const program = useMemo(() => getVotingdappProgram(provider, programId), [provider, programId]);

  // Fetch all Poll accounts
  const polls = useQuery({
    queryKey: ['Poll', 'all', { cluster }],
    queryFn: () => program.account.poll.all(),
  });

  // Fetch all Candidate accounts
  const candidates = useQuery({
    queryKey: ['Candidate', 'all', { cluster }],
    queryFn: () => program.account.candidate.all(),
  });

  // Initialize a new poll
  const initializePoll = useMutation({
  mutationKey: ['Poll', 'initialize', { cluster }],
  mutationFn: (params: { pollId: number; description: string; pollStart: number; pollEnd: number }) => {
    const { pollId, description, pollStart, pollEnd } = params;
    const pollKeypair = Keypair.generate();
    return program.methods
      .initializePoll(
        new BN(pollId), // Convert to BN
        description,
        new BN(pollStart), // Convert to BN
        new BN(pollEnd) // Convert to BN
      )
      .accounts({ poll: pollKeypair.publicKey, signer: provider.wallet.publicKey })
      .signers([pollKeypair])
      .rpc();
  },
  onSuccess: (signature) => {
    transactionToast(signature);
    return polls.refetch();
  },
  onError: () => toast.error('Failed to initialize poll'),
});

  // Initialize a new candidate
  const initializeCandidate = useMutation({
    mutationKey: ['Candidate', 'initialize', { cluster }],
    mutationFn: (params: { pollId: number; candidateName: string }) => {
      const { pollId, candidateName } = params;
      const candidateKeypair = Keypair.generate();
      return program.methods
        .initializeCandidate(candidateName, pollId)
        .accounts({ candidate: candidateKeypair.publicKey, poll: new PublicKey(pollId), signer: provider.wallet.publicKey })
        .signers([candidateKeypair])
        .rpc();
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      return candidates.refetch();
    },
    onError: () => toast.error('Failed to initialize candidate'),
  });

  // Cast a vote
  const vote = useMutation({
    mutationKey: ['Vote', 'cast', { cluster }],
    mutationFn: (params: { pollId: number; candidateName: string }) => {
      const { pollId, candidateName } = params;
      return program.methods
        .vote(candidateName, pollId)
        .accounts({ poll: new PublicKey(pollId), candidate: new PublicKey(candidateName), signer: provider.wallet.publicKey })
        .rpc();
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      return candidates.refetch();
    },
    onError: () => toast.error('Failed to cast vote'),
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
