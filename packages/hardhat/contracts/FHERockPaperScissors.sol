// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title A minimal FHE Rock Paper Scissors contract
/// @notice Both players submit encrypted moves, only the outcome is publicly revealed
/// @dev Rock=0, Paper=1, Scissors=2
contract FHERockPaperScissors is SepoliaConfig {
    enum GameStatus {
        Waiting,
        InProgress,
        Completed
    }

    struct Game {
        address player1;
        address player2;
        euint32 encryptedPlayer1Choice;
        euint32 encryptedPlayer2Choice;
        ebool encryptedP1Wins; // Encrypted result: true if player1 wins
        ebool encryptedIsTie; // Encrypted result: true if tie
        address winner; // Publicly revealed winner (address(0) for tie)
        GameStatus status;
    }

    Game public game;

    event GameStarted(address indexed player1);
    event GameJoined(address indexed player2);
    event EncryptedChoiceSubmitted(address indexed player);
    event GameCompleted(address indexed winner);

    /// @notice Start a new game waiting for another player
    function startGame() external {
        require(game.player1 == address(0), "Game already started");

        game = Game({
            player1: msg.sender,
            player2: address(0),
            encryptedPlayer1Choice: euint32.wrap(0),
            encryptedPlayer2Choice: euint32.wrap(0),
            encryptedP1Wins: ebool.wrap(0),
            encryptedIsTie: ebool.wrap(0),
            winner: address(0),
            status: GameStatus.Waiting
        });

        emit GameStarted(msg.sender);
    }

    /// @notice Join the game as the second player
    function joinGame() external {
        require(game.player1 != address(0), "Game not started");
        require(game.player2 == address(0), "Game already has two players");
        require(game.player1 != msg.sender, "Cannot join your own game");
        require(game.status == GameStatus.Waiting, "Game is not waiting for players");

        game.player2 = msg.sender;
        game.status = GameStatus.InProgress;

        emit GameJoined(msg.sender);
    }

    /// @notice Submit an encrypted choice for the game
    /// @param inputEuint32 the encrypted choice value (0=Rock, 1=Paper, 2=Scissors)
    /// @param inputProof the input proof
    function submitEncryptedChoice(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        require(game.player1 != address(0), "Game not started");
        require(msg.sender == game.player1 || msg.sender == game.player2, "Not a player in this game");
        require(game.status == GameStatus.Waiting || game.status == GameStatus.InProgress, "Game not in valid state");

        euint32 encryptedChoice = FHE.fromExternal(inputEuint32, inputProof);

        if (msg.sender == game.player1) {
            require(euint32.unwrap(game.encryptedPlayer1Choice) == 0, "Player 1 already submitted choice");
            game.encryptedPlayer1Choice = encryptedChoice;
            FHE.allowThis(game.encryptedPlayer1Choice);
        } else {
            require(euint32.unwrap(game.encryptedPlayer2Choice) == 0, "Player 2 already submitted choice");
            game.encryptedPlayer2Choice = encryptedChoice;
            FHE.allowThis(game.encryptedPlayer2Choice);
        }

        emit EncryptedChoiceSubmitted(msg.sender);

        // If both choices are submitted, compute winner using FHE
        bool bothChoicesSubmitted = euint32.unwrap(game.encryptedPlayer1Choice) != 0 &&
            euint32.unwrap(game.encryptedPlayer2Choice) != 0;

        if (bothChoicesSubmitted && game.status == GameStatus.InProgress) {
            _computeWinnerFHE();
        }
    }

    /// @notice Compute winner using FHE operations without decrypting individual moves
    /// @dev Only the outcome (winner) is made publicly decryptable, not the individual moves
    function _computeWinnerFHE() private {
        // Create encrypted constants
        euint32 rock = FHE.asEuint32(0);
        euint32 paper = FHE.asEuint32(1);
        euint32 scissors = FHE.asEuint32(2);

        euint32 p1Choice = game.encryptedPlayer1Choice;
        euint32 p2Choice = game.encryptedPlayer2Choice;

        // Check for tie (encrypted)
        ebool isTie = FHE.eq(p1Choice, p2Choice);
        game.encryptedIsTie = isTie;

        // Compute if player1 wins using FHE operations:
        // P1 wins if:
        //   - (P1=Rock AND P2=Scissors) OR
        //   - (P1=Paper AND P2=Rock) OR
        //   - (P1=Scissors AND P2=Paper)
        ebool p1WinsRock = FHE.and(FHE.eq(p1Choice, rock), FHE.eq(p2Choice, scissors));
        ebool p1WinsPaper = FHE.and(FHE.eq(p1Choice, paper), FHE.eq(p2Choice, rock));
        ebool p1WinsScissors = FHE.and(FHE.eq(p1Choice, scissors), FHE.eq(p2Choice, paper));

        ebool p1Wins = FHE.or(FHE.or(p1WinsRock, p1WinsPaper), p1WinsScissors);
        game.encryptedP1Wins = p1Wins;

        // Make only the outcome publicly decryptable (not the individual moves)
        // This allows anyone to decrypt and see who won, but not the individual choices
        game.encryptedP1Wins = FHE.makePubliclyDecryptable(game.encryptedP1Wins);
        game.encryptedIsTie = FHE.makePubliclyDecryptable(game.encryptedIsTie);

        FHE.allowThis(game.encryptedP1Wins);
        FHE.allowThis(game.encryptedIsTie);

        game.status = GameStatus.Completed;
    }

    /// @notice Get game information
    /// @return player1 The first player's address
    /// @return player2 The second player's address
    /// @return encryptedP1Wins Encrypted result: true if player1 wins (publicly decryptable)
    /// @return encryptedIsTie Encrypted result: true if tie (publicly decryptable)
    /// @return winner The publicly revealed winner (address(0) for tie, or if not yet revealed)
    /// @return status The game status
    function getGame()
        external
        view
        returns (
            address player1,
            address player2,
            ebool encryptedP1Wins,
            ebool encryptedIsTie,
            address winner,
            GameStatus status
        )
    {
        return (game.player1, game.player2, game.encryptedP1Wins, game.encryptedIsTie, game.winner, game.status);
    }
}
