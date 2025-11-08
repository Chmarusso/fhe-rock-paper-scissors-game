# FHE Rock Paper Scissors Game Implementation Analysis

## Overview

This document analyzes how the frontend React app interacts with the ERC7984Example contract and how the FHERockPaperScissors game support was implemented.

## Current Frontend Architecture

### 1. ERC7984Example Contract Interaction

The frontend interacts with the ERC7984Example contract through a custom hook pattern:

#### Key Components:

1. **`useERC7984Wagmi` Hook** (`hooks/erc7984/useERC7984Wagmi.tsx`)
   - Manages all interactions with the ERC7984Example contract
   - Uses `useFhevm` from `@fhevm-sdk` for FHE operations
   - Integrates with Wagmi for blockchain interactions
   - Handles:
     - Reading encrypted balance handles via `confidentialBalanceOf(address)`
     - Decrypting balance handles using `useFHEDecrypt`
     - Encrypting transfer amounts using `useFHEEncryption`
     - Executing `confidentialTransfer` transactions

2. **`ERC7984Demo` Component** (`app/_components/ERC7984Demo.tsx`)
   - Main UI component for the ERC7984 demo
   - Displays encrypted balance handles
   - Provides decrypt functionality
   - Handles token transfers with encrypted amounts

#### Interaction Flow:

```
User Action → Component → Custom Hook → FHEVM SDK → Contract
                ↓
         Wagmi (read/write)
                ↓
         Ethers.js Contract
                ↓
         Blockchain
```

### 2. Key Patterns Used

1. **FHEVM Instance Creation**:
   ```typescript
   const { instance: fhevmInstance } = useFhevm({
     provider: window.ethereum,
     chainId: chain?.id,
     initialMockChains: { 31337: "http://localhost:8545" },
     enabled: true,
   });
   ```

2. **Contract Info Resolution**:
   ```typescript
   const { data: contract } = useDeployedContractInfo({
     contractName: "ERC7984Example",
     chainId: allowedChainId,
   });
   ```

3. **Reading Encrypted Data**:
   ```typescript
   const readResult = useReadContract({
     address: contract.address,
     abi: contract.abi,
     functionName: "confidentialBalanceOf",
     args: [address],
   });
   ```

4. **Decrypting Handles**:
   ```typescript
   const { decrypt, results } = useFHEDecrypt({
     instance: fhevmInstance,
     ethersSigner,
     requests: [{ handle: balanceHandle, contractAddress }],
   });
   ```

5. **Encrypting Inputs**:
   ```typescript
   const { encryptWith } = useFHEEncryption({
     instance: fhevmInstance,
     ethersSigner,
     contractAddress,
   });
   
   const enc = await encryptWith(builder => {
     builder.add64(amount); // or add32 for uint32
   });
   ```

6. **Writing Transactions**:
   ```typescript
   const contract = new ethers.Contract(address, abi, signer);
   const tx = await contract.confidentialTransfer(to, enc.handles[0], enc.inputProof);
   await tx.wait();
   ```

## FHERockPaperScissors Implementation

### 1. New Hook: `useFHERockPaperScissorsWagmi`

Located at: `hooks/fheRockPaperScissors/useFHERockPaperScissorsWagmi.tsx`

#### Features:

- **Game State Management**:
  - Reads game state via `getGame()` function
  - Tracks game status (Waiting, InProgress, Completed)
  - Manages player information (player1, player2)

- **Game Actions**:
  - `startGame()`: Creates a new game
  - `joinGame()`: Joins an existing game as player 2
  - `submitChoice(choice)`: Submits encrypted choice (Rock=0, Paper=1, Scissors=2)

- **Result Decryption**:
  - Decrypts `encryptedP1Wins` and `encryptedIsTie` after game completion
  - Determines winner based on decrypted results

- **State Helpers**:
  - `isPlayer1`, `isPlayer2`: Check if current user is a player
  - `canStartGame`, `canJoinGame`, `canSubmitChoice`: Action availability checks
  - `hasCurrentPlayerSubmitted`: Tracks if player has submitted (inferred from game status)

#### Key Differences from ERC7984 Hook:

1. **Multiple Encrypted Values**: Decrypts two encrypted booleans (p1Wins, isTie) instead of one balance
2. **Game State Machine**: Tracks game progression through states
3. **Player Role Detection**: Identifies if user is player1 or player2
4. **Choice Encryption**: Encrypts uint32 values (0, 1, 2) instead of uint64 amounts

### 2. New Component: `FHERockPaperScissorsDemo`

Located at: `app/_components/FHERockPaperScissorsDemo.tsx`

#### UI Features:

1. **Game State Display**:
   - Shows current game status
   - Displays player addresses
   - Shows winner after decryption

2. **Game Actions**:
   - "Start New Game" button
   - "Join Game" button
   - Choice buttons (Rock, Paper, Scissors)

3. **Result Display**:
   - Decrypt button for completed games
   - Winner announcement
   - Tie detection

4. **Status Information**:
   - FHEVM instance status
   - Game operation states
   - Error messages

### 3. New Route: `/game`

Located at: `app/game/page.tsx`

- Simple page wrapper that renders `FHERockPaperScissorsDemo`
- Follows the same pattern as the home page (`app/page.tsx`)

### 4. Navigation Updates

**Header Component** (`components/Header.tsx`):
- Added navigation links to both pages
- Responsive design with mobile menu
- Active route highlighting

## Contract Integration Details

### Contract Functions Used:

1. **`startGame()`**
   - No parameters
   - Creates a new game with caller as player1
   - Sets status to `Waiting`

2. **`joinGame()`**
   - No parameters
   - Sets caller as player2
   - Changes status to `InProgress`

3. **`submitEncryptedChoice(externalEuint32 inputEuint32, bytes calldata inputProof)`**
   - Encrypted choice value (0=Rock, 1=Paper, 2=Scissors)
   - Input proof for FHE verification
   - Automatically computes winner when both players submit

4. **`getGame()`**
   - Returns: `(player1, player2, encryptedP1Wins, encryptedIsTie, winner, status)`
   - Used to read current game state

### Encryption Flow:

```
User selects choice (0, 1, or 2)
    ↓
FHEVM encrypts with add32(choice)
    ↓
Creates encrypted handle + input proof
    ↓
Calls submitEncryptedChoice(handle, proof)
    ↓
Contract validates and stores encrypted choice
    ↓
When both submitted, contract computes winner using FHE
    ↓
Makes encryptedP1Wins and encryptedIsTie publicly decryptable
    ↓
Frontend decrypts results to show winner
```

## Important Notes

### Contract Deployment

The `FHERockPaperScissors` contract must be:
1. Deployed to the target network (localhost:31337 or Sepolia)
2. Added to `deployedContracts.ts` via the generation script:
   ```bash
   # From packages/hardhat
   npm run generate
   ```

The contract will appear in `packages/erc7984example/contracts/deployedContracts.ts` after running the generation script.

### Limitations

1. **Choice Submission Detection**: The contract doesn't expose encrypted choices in `getGame()`, so we can't directly check if a player has submitted. We infer from game status:
   - `Waiting`: No choices submitted
   - `InProgress`: At least one choice submitted
   - `Completed`: Both choices submitted

2. **Error Handling**: If a player tries to submit twice, the contract will revert with "Player X already submitted choice" error, which is displayed to the user.

3. **Winner Determination**: The contract computes the winner using FHE but doesn't set the `winner` address field (it remains `address(0)`). The winner is determined off-chain by decrypting `encryptedP1Wins` and `encryptedIsTie`.

### Testing

The implementation follows the same patterns as the ERC7984Example demo, so it should work with:
- Local Hardhat network (mock FHEVM)
- Sepolia testnet (real FHEVM)

Note: The test file shows that tests skip on non-mock environments, but the frontend should work on both.

## File Structure

```
packages/erc7984example/
├── app/
│   ├── _components/
│   │   ├── ERC7984Demo.tsx          # Original ERC7984 demo
│   │   └── FHERockPaperScissorsDemo.tsx  # New game demo
│   ├── game/
│   │   └── page.tsx                 # New game route
│   └── page.tsx                     # Home route (ERC7984)
├── hooks/
│   ├── erc7984/
│   │   └── useERC7984Wagmi.tsx      # Original hook
│   └── fheRockPaperScissors/
│       └── useFHERockPaperScissorsWagmi.tsx  # New game hook
└── components/
    └── Header.tsx                   # Updated with navigation
```

## Usage

1. **Start the app**: `npm run dev` (from erc7984example package)
2. **Connect wallet**: Use the connect button in the header
3. **Navigate**: Use header links to switch between ERC7984 Demo and Rock Paper Scissors
4. **Play game**:
   - Click "Start New Game" (or "Join Game" if one exists)
   - Submit your encrypted choice
   - Wait for other player
   - Decrypt results when game completes

## Future Enhancements

Potential improvements:
1. Real-time game state updates (polling or events)
2. Multiple concurrent games support
3. Game history/leaderboard
4. Better UX for detecting if player has already submitted
5. Visual feedback for encrypted choice submission
6. Game reset functionality

