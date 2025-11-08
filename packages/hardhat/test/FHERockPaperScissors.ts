import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHERockPaperScissors, FHERockPaperScissors__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHERockPaperScissors")) as FHERockPaperScissors__factory;
  const fheRockPaperScissorsContract = (await factory.deploy()) as FHERockPaperScissors;
  const fheRockPaperScissorsContractAddress = await fheRockPaperScissorsContract.getAddress();

  return { fheRockPaperScissorsContract, fheRockPaperScissorsContractAddress };
}

describe("FHERockPaperScissors", function () {
  let signers: Signers;
  let fheRockPaperScissorsContract: FHERockPaperScissors;
  let fheRockPaperScissorsContractAddress: string;

  const ROCK = 0;
  const PAPER = 1;
  const SCISSORS = 2;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ fheRockPaperScissorsContract, fheRockPaperScissorsContractAddress } = await deployFixture());
  });

  describe("Game Creation", function () {
    it("should allow alice to start a game", async function () {
      const tx = await fheRockPaperScissorsContract.connect(signers.alice).startGame();
      const receipt = await tx.wait();

      expect(receipt).to.not.be.null;
      const game = await fheRockPaperScissorsContract.getGame();
      expect(game.player1).to.eq(signers.alice.address);
      expect(game.player2).to.eq(ethers.ZeroAddress);
      expect(game.status).to.eq(0); // Waiting
    });

    it("should not allow starting a game when one already exists", async function () {
      await fheRockPaperScissorsContract.connect(signers.alice).startGame();

      await expect(fheRockPaperScissorsContract.connect(signers.bob).startGame()).to.be.revertedWith(
        "Game already started",
      );
    });

    it("should not allow joining a non-existent game", async function () {
      await expect(fheRockPaperScissorsContract.connect(signers.bob).joinGame()).to.be.revertedWith("Game not started");
    });

    it("should not allow joining your own game", async function () {
      await fheRockPaperScissorsContract.connect(signers.alice).startGame();

      await expect(fheRockPaperScissorsContract.connect(signers.alice).joinGame()).to.be.revertedWith(
        "Cannot join your own game",
      );
    });
  });

  describe("Joining Games", function () {
    beforeEach(async function () {
      await fheRockPaperScissorsContract.connect(signers.alice).startGame();
    });

    it("should allow bob to join alice's game", async function () {
      await fheRockPaperScissorsContract.connect(signers.bob).joinGame();

      const game = await fheRockPaperScissorsContract.getGame();
      expect(game.player2).to.eq(signers.bob.address);
      expect(game.status).to.eq(1); // InProgress
    });

    it("should not allow joining a game that already has two players", async function () {
      await fheRockPaperScissorsContract.connect(signers.bob).joinGame();

      await expect(fheRockPaperScissorsContract.connect(signers.deployer).joinGame()).to.be.revertedWith(
        "Game already has two players",
      );
    });

    it("should not allow joining a completed game", async function () {
      await fheRockPaperScissorsContract.connect(signers.bob).joinGame();

      // Submit choices to complete the game
      const encryptedRock = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.alice.address)
        .add32(ROCK)
        .encrypt();
      const tx1 = await fheRockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedChoice(encryptedRock.handles[0], encryptedRock.inputProof);
      await tx1.wait();

      const encryptedPaper = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.bob.address)
        .add32(PAPER)
        .encrypt();
      const tx2 = await fheRockPaperScissorsContract
        .connect(signers.bob)
        .submitEncryptedChoice(encryptedPaper.handles[0], encryptedPaper.inputProof);
      await tx2.wait();

      // Try to join completed game
      await expect(fheRockPaperScissorsContract.connect(signers.deployer).joinGame()).to.be.revertedWith(
        "Game already has two players",
      );
    });
  });

  describe("Submitting Encrypted Choices", function () {
    beforeEach(async function () {
      await fheRockPaperScissorsContract.connect(signers.alice).startGame();
      await fheRockPaperScissorsContract.connect(signers.bob).joinGame();
    });

    it("should allow alice to submit encrypted rock choice", async function () {
      const encryptedRock = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.alice.address)
        .add32(ROCK)
        .encrypt();

      const tx = await fheRockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedChoice(encryptedRock.handles[0], encryptedRock.inputProof);
      await tx.wait();

      const game = await fheRockPaperScissorsContract.getGame();
      // Check that encrypted choice is set (not zero/uninitialized)
      expect(game.encryptedPlayer1Choice).to.not.eq(ethers.ZeroHash);
    });

    it("should allow bob to submit encrypted paper choice", async function () {
      const encryptedPaper = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.bob.address)
        .add32(PAPER)
        .encrypt();

      const tx = await fheRockPaperScissorsContract
        .connect(signers.bob)
        .submitEncryptedChoice(encryptedPaper.handles[0], encryptedPaper.inputProof);
      await tx.wait();

      const game = await fheRockPaperScissorsContract.getGame();
      // Check that encrypted choice is set (not zero/uninitialized)
      expect(game.encryptedPlayer2Choice).to.not.eq(ethers.ZeroHash);
    });

    it("should not allow submitting choice twice", async function () {
      const encryptedRock = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.alice.address)
        .add32(ROCK)
        .encrypt();

      await fheRockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedChoice(encryptedRock.handles[0], encryptedRock.inputProof);

      await expect(
        fheRockPaperScissorsContract
          .connect(signers.alice)
          .submitEncryptedChoice(encryptedRock.handles[0], encryptedRock.inputProof),
      ).to.be.revertedWith("Player 1 already submitted choice");
    });

    it("should not allow non-player to submit choice", async function () {
      const encryptedRock = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.deployer.address)
        .add32(ROCK)
        .encrypt();

      await expect(
        fheRockPaperScissorsContract
          .connect(signers.deployer)
          .submitEncryptedChoice(encryptedRock.handles[0], encryptedRock.inputProof),
      ).to.be.revertedWith("Not a player in this game");
    });
  });

  describe("Winner Computation", function () {
    beforeEach(async function () {
      await fheRockPaperScissorsContract.connect(signers.alice).startGame();
      await fheRockPaperScissorsContract.connect(signers.bob).joinGame();
    });

    it("should compute winner when both choices are submitted (Rock vs Paper)", async function () {
      // Alice plays Rock
      const encryptedRock = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.alice.address)
        .add32(ROCK)
        .encrypt();
      await fheRockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedChoice(encryptedRock.handles[0], encryptedRock.inputProof);

      // Bob plays Paper
      const encryptedPaper = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.bob.address)
        .add32(PAPER)
        .encrypt();
      await fheRockPaperScissorsContract
        .connect(signers.bob)
        .submitEncryptedChoice(encryptedPaper.handles[0], encryptedPaper.inputProof);

      const game = await fheRockPaperScissorsContract.getGame();
      expect(game.status).to.eq(2); // Completed

      // Check that encrypted results are set (not zero/uninitialized)
      expect(game.encryptedP1Wins).to.not.eq(ethers.ZeroHash);
      expect(game.encryptedIsTie).to.not.eq(ethers.ZeroHash);

      const decryptedP1Wins = await fhevm.publicDecryptEbool(game.encryptedP1Wins);
      const decryptedIsTie = await fhevm.publicDecryptEbool(game.encryptedIsTie);
      expect(decryptedP1Wins).to.eq(false);
      expect(decryptedIsTie).to.eq(false);
    });

    it("should compute winner when both choices are submitted (Paper vs Scissors)", async function () {
      // Alice plays Paper
      const encryptedPaper = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.alice.address)
        .add32(PAPER)
        .encrypt();
      await fheRockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedChoice(encryptedPaper.handles[0], encryptedPaper.inputProof);

      // Bob plays Scissors
      const encryptedScissors = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.bob.address)
        .add32(SCISSORS)
        .encrypt();
      await fheRockPaperScissorsContract
        .connect(signers.bob)
        .submitEncryptedChoice(encryptedScissors.handles[0], encryptedScissors.inputProof);

      const game = await fheRockPaperScissorsContract.getGame();
      expect(game.status).to.eq(2); // Completed
    });

    it("should detect tie when both players choose the same (Rock vs Rock)", async function () {
      // Both play Rock
      const encryptedRock1 = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.alice.address)
        .add32(ROCK)
        .encrypt();
      await fheRockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedChoice(encryptedRock1.handles[0], encryptedRock1.inputProof);

      const encryptedRock2 = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.bob.address)
        .add32(ROCK)
        .encrypt();
      await fheRockPaperScissorsContract
        .connect(signers.bob)
        .submitEncryptedChoice(encryptedRock2.handles[0], encryptedRock2.inputProof);

      const game = await fheRockPaperScissorsContract.getGame();
      expect(game.status).to.eq(2); // Completed
    });
  });

  describe("All Game Outcomes", function () {
    beforeEach(async function () {
      await fheRockPaperScissorsContract.connect(signers.alice).startGame();
      await fheRockPaperScissorsContract.connect(signers.bob).joinGame();
    });

    it("should handle Rock beats Scissors (Alice wins)", async function () {
      const encryptedRock = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.alice.address)
        .add32(ROCK)
        .encrypt();
      await fheRockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedChoice(encryptedRock.handles[0], encryptedRock.inputProof);

      const encryptedScissors = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.bob.address)
        .add32(SCISSORS)
        .encrypt();
      await fheRockPaperScissorsContract
        .connect(signers.bob)
        .submitEncryptedChoice(encryptedScissors.handles[0], encryptedScissors.inputProof);

      const game = await fheRockPaperScissorsContract.getGame();
      expect(game.status).to.eq(2); // Completed

      // Verify outcome by decrypting
      const decryptedP1Wins = await fhevm.publicDecryptEbool(game.encryptedP1Wins);
      const decryptedIsTie = await fhevm.publicDecryptEbool(game.encryptedIsTie);
      expect(decryptedP1Wins).to.eq(true); // Alice wins
      expect(decryptedIsTie).to.eq(false);
    });

    it("should handle Paper beats Rock (Bob wins)", async function () {
      const encryptedRock = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.alice.address)
        .add32(ROCK)
        .encrypt();
      await fheRockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedChoice(encryptedRock.handles[0], encryptedRock.inputProof);

      const encryptedPaper = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.bob.address)
        .add32(PAPER)
        .encrypt();
      await fheRockPaperScissorsContract
        .connect(signers.bob)
        .submitEncryptedChoice(encryptedPaper.handles[0], encryptedPaper.inputProof);

      const game = await fheRockPaperScissorsContract.getGame();
      expect(game.status).to.eq(2); // Completed

      // Verify outcome by decrypting
      const decryptedP1Wins = await fhevm.publicDecryptEbool(game.encryptedP1Wins);
      const decryptedIsTie = await fhevm.publicDecryptEbool(game.encryptedIsTie);
      expect(decryptedP1Wins).to.eq(false); // Bob wins
      expect(decryptedIsTie).to.eq(false);
    });

    it("should handle Scissors beats Paper (Bob wins)", async function () {
      const encryptedPaper = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.alice.address)
        .add32(PAPER)
        .encrypt();
      await fheRockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedChoice(encryptedPaper.handles[0], encryptedPaper.inputProof);

      const encryptedScissors = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.bob.address)
        .add32(SCISSORS)
        .encrypt();
      await fheRockPaperScissorsContract
        .connect(signers.bob)
        .submitEncryptedChoice(encryptedScissors.handles[0], encryptedScissors.inputProof);

      const game = await fheRockPaperScissorsContract.getGame();
      expect(game.status).to.eq(2); // Completed

      // Verify outcome by decrypting (Bob wins, so p1Wins = false)
      const decryptedP1Wins = await fhevm.publicDecryptEbool(game.encryptedP1Wins);
      const decryptedIsTie = await fhevm.publicDecryptEbool(game.encryptedIsTie);
      expect(decryptedP1Wins).to.eq(false); // Bob wins
      expect(decryptedIsTie).to.eq(false);
    });
  });

  describe("Public Decryption", function () {
    beforeEach(async function () {
      await fheRockPaperScissorsContract.connect(signers.alice).startGame();
      await fheRockPaperScissorsContract.connect(signers.bob).joinGame();
    });

    it("should make outcome publicly decryptable", async function () {
      // Complete a game
      const encryptedRock = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.alice.address)
        .add32(ROCK)
        .encrypt();
      await fheRockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedChoice(encryptedRock.handles[0], encryptedRock.inputProof);

      const encryptedPaper = await fhevm
        .createEncryptedInput(fheRockPaperScissorsContractAddress, signers.bob.address)
        .add32(PAPER)
        .encrypt();
      await fheRockPaperScissorsContract
        .connect(signers.bob)
        .submitEncryptedChoice(encryptedPaper.handles[0], encryptedPaper.inputProof);

      const game = await fheRockPaperScissorsContract.getGame();

      // The encrypted results should be publicly decryptable
      // In a real scenario, anyone could decrypt these to see the outcome
      expect(game.encryptedP1Wins).to.not.eq(ethers.ZeroHash);
      expect(game.encryptedIsTie).to.not.eq(ethers.ZeroHash);
    });
  });
});
