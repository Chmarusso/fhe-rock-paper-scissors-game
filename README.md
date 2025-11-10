# FHE Rock Paper Scissors Game

A privacy-preserving Rock Paper Scissors game built with fhEVM (Fully Homomorphic EVM). This dApp demonstrates how to build interactive games where player choices remain encrypted until both players have submitted, ensuring fair gameplay through cryptographic privacy.

![fhe-paper-game-1](https://github.com/user-attachments/assets/e5ee48c1-c95b-40c6-b0d0-60d6091859e0)

## Project Structure

This repository has a monorepo structure with the following components:

```
dapp/
├── packages/
│   ├── hardhat/                   # FHERockPaperScissors smart contract & tests
│   ├── fhevm-sdk/                 # FHEVM SDK package
│   └── rock-paper-scissors/        # Rock Paper Scissors game frontend
└── scripts/                       # Build and deployment scripts
```

## About the Game

The Rock Paper Scissors game uses fully homomorphic encryption (FHE) to ensure that player choices remain private until both players have submitted their moves. This prevents cheating and ensures fair gameplay.

### How It Works

1. **Game Creation**: One player creates a new game
2. **Joining**: Another player joins the game
3. **Encrypted Submissions**: Both players submit their choices (Rock, Paper, or Scissors) as encrypted values
4. **Winner Computation**: Once both choices are submitted, the smart contract computes the winner using homomorphic operations on encrypted data
5. **Public Decryption**: The game outcome becomes publicly decryptable, allowing anyone to verify the result

### Features

- **Privacy-Preserving**: Player choices remain encrypted until both players submit
- **Fair Play**: Cryptographic guarantees prevent cheating
- **Transparent Results**: Game outcomes are publicly verifiable
- **User-Friendly Interface**: React-based frontend with wallet integration
- **Full Test Coverage**: Comprehensive test suite for the smart contract

## 🛠️ Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
pnpm install
```

### 2. Environment Configuration

Set up your Hardhat environment variables by following the [FHEVM documentation](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional):

- `MNEMONIC`: Your wallet mnemonic phrase
- `INFURA_API_KEY`: Your Infura API key for Sepolia

### 3. Start Development Environment

**Option A: Local Development (Recommended for testing)**

```bash
# Terminal 1: Start local Hardhat node
pnpm chain
# RPC URL: http://127.0.0.1:8545 | Chain ID: 31337

# Terminal 2: Deploy contracts to localhost
pnpm deploy:localhost

# Terminal 3: Start the frontend
pnpm run start
```

**Option B: Sepolia Testnet**

```bash
# Deploy to Sepolia testnet
pnpm deploy:sepolia

# Start the frontend
pnpm run start
```

### 4. Connect MetaMask

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Click "Connect Wallet" and select MetaMask
3. If using localhost, add the Hardhat network to MetaMask:
   - **Network Name**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`

### ⚠️ Sepolia Production note

- In production, `NEXT_PUBLIC_ALCHEMY_API_KEY` must be set (see `packages/rock-paper-scissors/scaffold.config.ts`). The app throws if missing.
- Ensure `packages/rock-paper-scissors/contracts/deployedContracts.ts` points to your live contract addresses.
- Optional: set `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` for better WalletConnect reliability.
- Optional: add per-chain RPCs via `rpcOverrides` in `packages/rock-paper-scissors/scaffold.config.ts`.

### Running contract tests

Run the smart contract test suite to verify the game logic:

```bash
# Run all contract tests
pnpm run hardhat:test

# Or use the shorthand
pnpm test
```

The test suite includes:

- Game creation and joining logic
- Encrypted choice submission
- Winner computation for all game outcomes (Rock vs Paper, Paper vs Scissors, etc.)
- Tie detection
- Public decryption of game results
- Access control and validation

All tests run against a local Hardhat network with mock FHEVM, so no external dependencies are required.

## 🔧 Troubleshooting

### Common MetaMask + Hardhat Issues

When developing with MetaMask and Hardhat, you may encounter these common issues:

#### ❌ Nonce Mismatch Error

**Problem**: MetaMask tracks transaction nonces, but when you restart Hardhat, the node resets while MetaMask doesn't update its tracking.

**Solution**:

1. Open MetaMask extension
2. Select the Hardhat network
3. Go to **Settings** → **Advanced**
4. Click **"Clear Activity Tab"** (red button)
5. This resets MetaMask's nonce tracking

#### ❌ Cached View Function Results

**Problem**: MetaMask caches smart contract view function results. After restarting Hardhat, you may see outdated data.

**Solution**:

1. **Restart your entire browser** (not just refresh the page)
2. MetaMask's cache is stored in extension memory and requires a full browser restart to clear

> 💡 **Pro Tip**: Always restart your browser after restarting Hardhat to avoid cache issues.

For more details, see the [MetaMask development guide](https://docs.metamask.io/wallet/how-to/run-devnet/).

## Contributing

This repository serves as an example of building privacy-preserving games with fhEVM. Feel free to explore the code, run the tests, and use it as a foundation for your own FHE-based dApps.

## 📄 License

This project is licensed under the **BSD-3-Clause-Clear License**. See the [LICENSE](LICENSE) file for details.
