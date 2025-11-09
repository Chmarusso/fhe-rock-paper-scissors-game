"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeployedContractInfo } from "../helper";
import { useWagmiEthers } from "../wagmi/useWagmiEthers";
import { FhevmInstance } from "@fhevm-sdk";
import { useFHEDecrypt, useFHEEncryption, useInMemoryStorage } from "@fhevm-sdk";
import { ethers } from "ethers";
import type { Contract } from "~~/utils/helper/contract";
import type { AllowedChainIds } from "~~/utils/helper/networks";
import { useReadContract, useAccount } from "wagmi";

// Game status enum matching the contract
export enum GameStatus {
  Waiting = 0,
  InProgress = 1,
  Completed = 2,
}

// Choice enum
export enum Choice {
  Rock = 0,
  Paper = 1,
  Scissors = 2,
}

// Game result type
export type GameResult = {
  player1: string;
  player2: string;
  encryptedP1Wins: string;
  encryptedIsTie: string;
  winner: string;
  status: GameStatus;
};

/**
 * useFHERockPaperScissorsWagmi - FHE Rock Paper Scissors Game hook for Wagmi
 *
 * What it does:
 * - Reads the current game state
 * - Decrypts encrypted game results (encryptedP1Wins, encryptedIsTie)
 * - Encrypts player choices and submits them
 * - Handles game creation, joining, and choice submission
 */
export const useFHERockPaperScissorsWagmi = (parameters: {
  instance: FhevmInstance | undefined;
  initialMockChains?: Readonly<Record<number, string>>;
}) => {
  const { instance, initialMockChains } = parameters;
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const { address } = useAccount();

  // Wagmi + ethers interop
  const { chainId, accounts, isConnected, ethersReadonlyProvider, ethersSigner } = useWagmiEthers(initialMockChains);

  // Resolve deployed contract info once we know the chain
  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: fheRockPaperScissors, isLoading: isLoadingContract } = useDeployedContractInfo({
    contractName: "FHERockPaperScissors",
    chainId: allowedChainId,
  });

  // Simple status string for UX messages
  const [message, setMessage] = useState<string>("");

  type FHERockPaperScissorsInfo = Contract<"FHERockPaperScissors"> & { chainId?: number };

  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // -------------
  // Helpers
  // -------------
  const hasContract = Boolean(fheRockPaperScissors?.address && fheRockPaperScissors?.abi);
  const hasProvider = Boolean(ethersReadonlyProvider);
  const hasSigner = Boolean(ethersSigner);

  const getContract = (mode: "read" | "write") => {
    if (!hasContract) return undefined;
    const providerOrSigner = mode === "read" ? ethersReadonlyProvider : ethersSigner;
    if (!providerOrSigner) return undefined;
    return new ethers.Contract(
      fheRockPaperScissors!.address,
      (fheRockPaperScissors as FHERockPaperScissorsInfo).abi,
      providerOrSigner,
    );
  };

  // Read game state via wagmi
  const readResult = useReadContract({
    address: (hasContract ? (fheRockPaperScissors!.address as unknown as `0x${string}`) : undefined) as
      | `0x${string}`
      | undefined,
    abi: (hasContract ? ((fheRockPaperScissors as FHERockPaperScissorsInfo).abi as any) : undefined) as any,
    functionName: "getGame" as const,
    query: {
      enabled: Boolean(hasContract && hasProvider),
      refetchOnWindowFocus: false,
    },
  });

  const gameData = useMemo(() => {
    if (!readResult.data) return undefined;
    const data = readResult.data as [string, string, string, string, string, number];
    return {
      player1: data[0],
      player2: data[1],
      encryptedP1Wins: data[2],
      encryptedIsTie: data[3],
      winner: data[4],
      status: data[5] as GameStatus,
    } as GameResult;
  }, [readResult.data]);

  const canGetGame = Boolean(hasContract && hasProvider && !readResult.isFetching);
  const isRefreshing = readResult.isFetching;
  const refreshGame = useCallback(async () => {
    const res = await readResult.refetch();
    if (res.error) setMessage("FHERockPaperScissors.getGame() failed: " + (res.error as Error).message);
  }, [readResult]);

  // Decrypt game results (encryptedP1Wins and encryptedIsTie)
  const requests = useMemo(() => {
    if (!hasContract || !gameData) return undefined;
    const requests = [];
    if (gameData.encryptedP1Wins && gameData.encryptedP1Wins !== ethers.ZeroHash) {
      requests.push({ handle: gameData.encryptedP1Wins, contractAddress: fheRockPaperScissors!.address });
    }
    if (gameData.encryptedIsTie && gameData.encryptedIsTie !== ethers.ZeroHash) {
      requests.push({ handle: gameData.encryptedIsTie, contractAddress: fheRockPaperScissors!.address });
    }
    return requests.length > 0 ? requests : undefined;
  }, [hasContract, fheRockPaperScissors?.address, gameData]);

  const {
    canDecrypt,
    decrypt,
    isDecrypting,
    message: decMsg,
    results,
  } = useFHEDecrypt({
    instance,
    ethersSigner: ethersSigner as any,
    fhevmDecryptionSignatureStorage,
    chainId,
    requests,
  });

  useEffect(() => {
    if (decMsg) setMessage(decMsg);
  }, [decMsg]);

  const decryptedResults = useMemo(() => {
    if (!gameData || !results) return undefined;
    const p1Wins = gameData.encryptedP1Wins && gameData.encryptedP1Wins !== ethers.ZeroHash
      ? results[gameData.encryptedP1Wins]
      : undefined;
    const isTie = gameData.encryptedIsTie && gameData.encryptedIsTie !== ethers.ZeroHash
      ? results[gameData.encryptedIsTie]
      : undefined;
    return { p1Wins, isTie };
  }, [gameData, results]);

  const isDecrypted = Boolean(
    gameData &&
      gameData.status === GameStatus.Completed &&
      decryptedResults &&
      typeof decryptedResults.p1Wins !== "undefined" &&
      typeof decryptedResults.isTie !== "undefined",
  );

  const decryptGameResults = decrypt;

  // Mutations (startGame, joinGame, submitEncryptedChoice)
  const { encryptWith } = useFHEEncryption({
    instance,
    ethersSigner: ethersSigner as any,
    contractAddress: fheRockPaperScissors?.address,
  });

  const canStartGame = useMemo(
    () =>
      Boolean(
        hasContract &&
          instance &&
          hasSigner &&
          !isProcessing &&
          address &&
          (!gameData || gameData.player1 === ethers.ZeroAddress || gameData.status === GameStatus.Completed),
      ),
    [hasContract, instance, hasSigner, isProcessing, address, gameData],
  );

  const canJoinGame = useMemo(
    () =>
      Boolean(
        hasContract &&
          instance &&
          hasSigner &&
          !isProcessing &&
          address &&
          gameData &&
          gameData.status === GameStatus.Waiting &&
          gameData.player1 !== address &&
          gameData.player2 === ethers.ZeroAddress,
      ),
    [hasContract, instance, hasSigner, isProcessing, address, gameData],
  );

  const canSubmitChoice = useMemo(
    () =>
      Boolean(
        hasContract &&
          instance &&
          hasSigner &&
          !isProcessing &&
          address &&
          gameData &&
          (gameData.status === GameStatus.Waiting || gameData.status === GameStatus.InProgress) &&
          (gameData.player1 === address || gameData.player2 === address),
      ),
    [hasContract, instance, hasSigner, isProcessing, address, gameData],
  );

  const startGame = useCallback(async () => {
    if (isProcessing || !canStartGame) return;
    setIsProcessing(true);
    setMessage("Starting a new game...");
    try {
      const writeContract = getContract("write");
      if (!writeContract) return setMessage("Contract info or signer not available");

      const tx = await writeContract.startGame();
      setMessage("Waiting for transaction...");
      await tx.wait();
      setMessage("Game started! Waiting for another player to join...");
      refreshGame();
    } catch (e) {
      setMessage(`Start game failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, canStartGame, getContract, refreshGame]);

  const joinGame = useCallback(async () => {
    if (isProcessing || !canJoinGame) return;
    setIsProcessing(true);
    setMessage("Joining the game...");
    try {
      const writeContract = getContract("write");
      if (!writeContract) return setMessage("Contract info or signer not available");

      const tx = await writeContract.joinGame();
      setMessage("Waiting for transaction...");
      await tx.wait();
      setMessage("Successfully joined the game! You can now submit your choice.");
      refreshGame();
    } catch (e) {
      setMessage(`Join game failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, canJoinGame, getContract, refreshGame]);

  const submitChoice = useCallback(
    async (choice: Choice) => {
      if (isProcessing || !canSubmitChoice || !gameData) return;
      setIsProcessing(true);
      setMessage(`Encrypting and submitting ${Choice[choice]}...`);
      try {
        // Encrypt the choice
        const enc = await encryptWith(builder => {
          (builder as any).add32(choice);
        });
        if (!enc) return setMessage("Encryption failed");

        const writeContract = getContract("write");
        if (!writeContract) return setMessage("Contract info or signer not available");

        // Submit encrypted choice
        const tx = await writeContract.submitEncryptedChoice(enc.handles[0], enc.inputProof);
        setMessage("Waiting for transaction...");
        await tx.wait();
        setMessage(`Choice submitted! ${gameData.player1 === address ? "Waiting for player 2..." : "Waiting for player 1..."}`);
        refreshGame();
      } catch (e) {
        setMessage(`Submit choice failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, canSubmitChoice, gameData, address, encryptWith, getContract, refreshGame],
  );

  // Determine if current user is player1 or player2
  const isPlayer1 = useMemo(() => gameData?.player1 === address, [gameData, address]);
  const isPlayer2 = useMemo(() => gameData?.player2 === address, [gameData, address]);
  const isPlayer = useMemo(() => isPlayer1 || isPlayer2, [isPlayer1, isPlayer2]);

  // Check if player has submitted their choice
  const hasPlayer1Submitted = useMemo(
    () => gameData?.status === GameStatus.Completed || gameData?.status === GameStatus.InProgress,
    [gameData],
  );
  const hasPlayer2Submitted = useMemo(() => gameData?.status === GameStatus.Completed, [gameData]);

  const hasCurrentPlayerSubmitted = useMemo(() => {
    if (!gameData || !isPlayer) return false;
    if (isPlayer1) return hasPlayer1Submitted;
    if (isPlayer2) return hasPlayer2Submitted;
    return false;
  }, [gameData, isPlayer, isPlayer1, isPlayer2, hasPlayer1Submitted, hasPlayer2Submitted]);

  // Debug info for why canStartGame might be false
  const startGameReason = useMemo(() => {
    if (!hasContract) return "Contract not found in deployedContracts.ts";
    if (!instance) return "FHEVM instance not available";
    if (!hasSigner) return "Wallet signer not available";
    if (isProcessing) return "Transaction in progress";
    if (!address) return "Wallet not connected";
    if (gameData && gameData.player1 !== ethers.ZeroAddress && gameData.status !== GameStatus.Completed) {
      return "A game is already in progress";
    }
    return "Ready to start";
  }, [hasContract, instance, hasSigner, isProcessing, address, gameData]);

  return {
    contractAddress: fheRockPaperScissors?.address,
    canStartGame,
    canJoinGame,
    canSubmitChoice,
    canDecrypt,
    canGetGame,
    startGame,
    joinGame,
    submitChoice,
    decryptGameResults,
    refreshGame,
    isDecrypted,
    message,
    gameData,
    decryptedResults,
    isDecrypting,
    isRefreshing,
    isProcessing,
    // Player info
    isPlayer1,
    isPlayer2,
    isPlayer,
    hasCurrentPlayerSubmitted,
    hasPlayer1Submitted,
    hasPlayer2Submitted,
    // Debug info
    startGameReason,
    hasContract,
    isLoadingContract,
    // Wagmi-specific values
    chainId,
    accounts,
    isConnected,
    ethersSigner,
    address,
  };
};

