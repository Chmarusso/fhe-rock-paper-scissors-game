"use client";

import { useMemo, useState } from "react";
import { useFhevm } from "@fhevm-sdk";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import {
  Choice,
  GameStatus,
  useFHERockPaperScissorsWagmi,
} from "~~/hooks/fheRockPaperScissors/useFHERockPaperScissorsWagmi";

/*
 * Main FHE Rock Paper Scissors React component
 *  - "Start Game" button: allows you to start a new game
 *  - "Join Game" button: allows you to join an existing game
 *  - Choice buttons: allows you to submit encrypted choices (Rock, Paper, Scissors)
 *  - "Decrypt Results" button: allows you to decrypt the game outcome
 */
export const FHERockPaperScissorsDemo = () => {
  const { isConnected, chain } = useAccount();

  const chainId = chain?.id;

  //////////////////////////////////////////////////////////////////////////////
  // FHEVM instance
  //////////////////////////////////////////////////////////////////////////////

  // Create EIP-1193 provider from wagmi for FHEVM
  const provider = useMemo(() => {
    if (typeof window === "undefined") return undefined;

    // Get the wallet provider from window.ethereum
    return (window as any).ethereum;
  }, []);

  const initialMockChains = { 31337: "http://localhost:8545" };

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true, // use enabled to dynamically create the instance on-demand
  });

  //////////////////////////////////////////////////////////////////////////////
  // useFHERockPaperScissorsWagmi is a custom hook containing all the game logic
  //////////////////////////////////////////////////////////////////////////////

  const game = useFHERockPaperScissorsWagmi({
    instance: fhevmInstance,
    initialMockChains,
  });

  //////////////////////////////////////////////////////////////////////////////
  // UI Stuff
  //////////////////////////////////////////////////////////////////////////////

  const buttonClass =
    "inline-flex items-center justify-center px-6 py-3 font-semibold shadow-lg " +
    "transition-all duration-200 hover:scale-105 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 " +
    "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed";

  // Primary (accent) button — #FFD208 with dark text and warm hover #A38025
  const primaryButtonClass =
    buttonClass + " bg-[#FFD208] text-[#2D2D2D] hover:bg-[#A38025] focus-visible:ring-[#2D2D2D] cursor-pointer";

  // Secondary (neutral dark) button — #2D2D2D with light text and accent focus
  const secondaryButtonClass =
    buttonClass + " bg-black text-[#F4F4F4] hover:bg-[#1F1F1F] focus-visible:ring-[#FFD208] cursor-pointer";

  // Success/confirmed state — deeper gold #A38025 with dark text
  const successButtonClass =
    buttonClass + " bg-[#A38025] text-[#2D2D2D] hover:bg-[#8F6E1E] focus-visible:ring-[#2D2D2D]";

  // Choice button style
  const choiceButtonClass =
    "inline-flex items-center justify-center px-8 py-4 font-semibold shadow-lg rounded-lg " +
    "transition-all duration-200 hover:scale-105 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 " +
    "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed " +
    "bg-gradient-to-br from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 " +
    "focus-visible:ring-blue-400";

  const titleClass = "font-bold text-gray-900 text-xl mb-4 border-b-1 border-gray-700 pb-2";
  const sectionClass = "bg-[#f4f4f4] shadow-lg p-6 mb-6 text-gray-900 rounded-lg";

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-gray-900">
        <div className="flex items-center justify-center">
          <div className="bg-white border shadow-xl p-8 text-center rounded-lg">
            <div className="mb-4">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-900/30 text-amber-400 text-3xl">
                ⚠️
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Wallet not connected</h2>
            <p className="text-gray-700 mb-6">Connect your wallet to play FHE Rock Paper Scissors.</p>
            <div className="flex items-center justify-center">
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusText = (status: GameStatus) => {
    switch (status) {
      case GameStatus.Waiting:
        return "⏳ Waiting for player 2";
      case GameStatus.InProgress:
        return "🎮 Game in progress";
      case GameStatus.Completed:
        return "✅ Game completed";
      default:
        return "No game";
    }
  };

  const getWinnerText = () => {
    if (!game.gameData || !game.decryptedResults) return null;
    if (game.decryptedResults.isTie) {
      return "🤝 It's a tie!";
    }
    if (game.decryptedResults.p1Wins) {
      return `🏆 Player 1 (${game.gameData.player1.slice(0, 6)}...${game.gameData.player1.slice(-4)}) wins!`;
    } else {
      return `🏆 Player 2 (${game.gameData.player2.slice(0, 6)}...${game.gameData.player2.slice(-4)}) wins!`;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 text-[rgb(255,255,254)]">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-[rgb(255,255,254)] text-lg font-semibold">
          Play Rock Paper Scissors with fully encrypted moves using FHE
        </p>
      </div>

      {/* Submit Choice Section */}
      {game.isPlayer && game.gameData && game.gameData.status !== GameStatus.Completed && (
        <div className={sectionClass}>
          <h3 className={titleClass}>
            {game.hasCurrentPlayerSubmitted ? "✅ Choice Submitted" : "🎲 Submit Your Choice"}
          </h3>
          {game.hasCurrentPlayerSubmitted ? (
            <div className="p-4 bg-green-100 border border-green-300 rounded-lg text-center">
              <p className="text-green-800 font-semibold">
                Your choice has been encrypted and submitted! Waiting for the other player...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-700 mb-4">Choose your move (encrypted):</p>
              <div className="grid grid-cols-3 gap-4">
                <button
                  className={choiceButtonClass}
                  disabled={!game.canSubmitChoice}
                  onClick={() => game.submitChoice(Choice.Rock)}
                >
                  🪨 Rock
                </button>
                <button
                  className={choiceButtonClass}
                  disabled={!game.canSubmitChoice}
                  onClick={() => game.submitChoice(Choice.Paper)}
                >
                  📄 Paper
                </button>
                <button
                  className={choiceButtonClass}
                  disabled={!game.canSubmitChoice}
                  onClick={() => game.submitChoice(Choice.Scissors)}
                >
                  ✂️ Scissors
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game State Display */}
      <div className={sectionClass}>
        <h3 className={titleClass}>🎮 Game State</h3>
        <div className="space-y-3">
          {printProperty("Status", game.gameData ? getStatusText(game.gameData.status) : "No game")}
          {game.gameData && (
            <>
              {printProperty("Player 1", game.gameData.player1 || "Not set")}
              {printProperty("Player 2", game.gameData.player2 || "Waiting...")}
            </>
          )}
          {printProperty("Your Address", game.address || "N/A")}
          {printProperty("You are", game.isPlayer1 ? "Player 1" : game.isPlayer2 ? "Player 2" : "Not a player")}
        </div>
      </div>

      {/* Game Actions */}
      <div className={sectionClass}>
        <h3 className={titleClass}>🎯 Game Actions</h3>
        {!game.hasContract && (
          <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
            <p className="text-yellow-800 font-semibold mb-2">⚠️ Contract Not Found</p>
            <p className="text-yellow-700 text-sm">
              The FHERockPaperScissors contract is not registered in deployedContracts.ts. Please:
            </p>
            <ol className="list-decimal list-inside text-yellow-700 text-sm mt-2 space-y-1">
              <li>
                Deploy the contract:{" "}
                <code className="bg-yellow-200 px-1 rounded">cd packages/hardhat && npx hardhat deploy</code>
              </li>
              <li>
                Generate contract types: <code className="bg-yellow-200 px-1 rounded">npm run generate</code>
              </li>
            </ol>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            className={game.canStartGame ? primaryButtonClass : secondaryButtonClass}
            disabled={!game.canStartGame}
            onClick={game.startGame}
            title={game.startGameReason}
          >
            {game.canStartGame
              ? "🚀 Start New Game"
              : game.isProcessing
                ? "⏳ Processing..."
                : `❌ ${game.startGameReason}`}
          </button>

          <button
            className={game.canJoinGame ? primaryButtonClass : secondaryButtonClass}
            disabled={!game.canJoinGame}
            onClick={game.joinGame}
          >
            {game.canJoinGame ? "👥 Join Game" : game.isProcessing ? "⏳ Processing..." : "❌ Cannot join game"}
          </button>
        </div>
      </div>

      {/* Decrypt Results Section */}
      {game.gameData && game.gameData.status === GameStatus.Completed && (
        <div className={sectionClass}>
          <h3 className={titleClass}>🔓 Game Results</h3>
          <div className="space-y-4">
            {game.isDecrypted ? (
              <div className="space-y-3">
                {printProperty("Player 1 Wins", game.decryptedResults?.p1Wins ? "Yes" : "No")}
                {printProperty("Is Tie", game.decryptedResults?.isTie ? "Yes" : "No")}
                {getWinnerText() && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300 rounded-lg">
                    <p className="text-xl font-bold text-center text-gray-900">{getWinnerText()}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-700">
                  The game is completed! Decrypt the results to see who won. The individual moves remain encrypted.
                </p>
                <button
                  className={game.canDecrypt ? primaryButtonClass : secondaryButtonClass}
                  disabled={!game.canDecrypt}
                  onClick={game.decryptGameResults}
                >
                  {game.canDecrypt
                    ? "🔓 Decrypt Results"
                    : game.isDecrypting
                      ? "⏳ Decrypting..."
                      : game.isDecrypted
                        ? "✅ Already decrypted"
                        : "❌ Cannot decrypt"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      {game.message && (
        <div className={sectionClass}>
          <h3 className={titleClass}>💬 Messages</h3>
          <div className="border bg-white border-gray-200 p-4 rounded">
            <p className="text-gray-800">{game.message}</p>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={sectionClass}>
          <h3 className={titleClass}>🔧 FHEVM Instance</h3>
          <div className="space-y-3">
            {printProperty("Instance Status", fhevmInstance ? "✅ Connected" : "❌ Disconnected")}
            {printProperty("Status", fhevmStatus)}
            {printProperty("Error", fhevmError ?? "No errors")}
          </div>
        </div>

        <div className={sectionClass}>
          <h3 className={titleClass}>📊 Game Status</h3>
          <div className="space-y-3">
            {printProperty("Contract Found", game.hasContract)}
            {printProperty("Contract Loading", game.isLoadingContract)}
            {printProperty("Contract Address", game.contractAddress || "Not found")}
            {printProperty("Start Game Reason", game.startGameReason)}
            {printProperty("Refreshing", game.isRefreshing)}
            {printProperty("Decrypting", game.isDecrypting)}
            {printProperty("Processing", game.isProcessing)}
            {printProperty("Can Get Game", game.canGetGame)}
            {printProperty("Can Decrypt", game.canDecrypt)}
            {printProperty("Can Start Game", game.canStartGame)}
            {printProperty("Can Join Game", game.canJoinGame)}
            {printProperty("Can Submit Choice", game.canSubmitChoice)}
          </div>
        </div>
      </div>
    </div>
  );
};

function printProperty(name: string, value: unknown) {
  let displayValue: string;

  if (typeof value === "boolean") {
    return printBooleanProperty(name, value);
  } else if (typeof value === "string" || typeof value === "number") {
    displayValue = String(value);
  } else if (typeof value === "bigint") {
    displayValue = String(value);
  } else if (value === null) {
    displayValue = "null";
  } else if (value === undefined) {
    displayValue = "undefined";
  } else if (value instanceof Error) {
    displayValue = value.message;
  } else {
    displayValue = JSON.stringify(value);
  }
  return (
    <div className="flex justify-between items-center py-2 px-3 bg-white border border-gray-200 w-full rounded">
      <span className="text-gray-800 font-medium">{name}</span>
      <span className="ml-2 font-mono text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-1 border border-gray-300 rounded">
        {displayValue}
      </span>
    </div>
  );
}

function printBooleanProperty(name: string, value: boolean) {
  return (
    <div className="flex justify-between items-center py-2 px-3 bg-white border border-gray-200 w-full rounded">
      <span className="text-gray-700 font-medium">{name}</span>
      <span
        className={`font-mono text-sm font-semibold px-2 py-1 border rounded ${
          value ? "text-green-800 bg-green-100 border-green-300" : "text-red-800 bg-red-100 border-red-300"
        }`}
      >
        {value ? "✓ true" : "✗ false"}
      </span>
    </div>
  );
}
