# FHE Rock Paper Scissors - Design Document

## Architecture Overview

The FHE Rock Paper Scissors dApp is a privacy-preserving game built on fhEVM (Fully Homomorphic EVM) that allows two players to play Rock Paper Scissors without revealing their choices until both have submitted. The application consists of:

- **Smart Contract** (`FHERockPaperScissors.sol`): Handles game state, encrypted choice submission, and FHE-based winner computation
- **Frontend** (Next.js + React): Provides UI for game interactions, wallet connection, and encrypted data handling
- **FHEVM SDK Integration**: Manages encryption, decryption, and interaction with the FHEVM network

## 1. If I Had More Time: Extensions and Polish

### High-Priority Extensions

**1. Real-Time Game State Updates**

- **Current State**: Users must manually refresh or wait for polling intervals to see game state changes
- **Enhancement**: Implement WebSocket subscriptions or event listeners for real-time updates when:
  - A second player joins
  - A choice is submitted
  - The game completes
- **Why**: Significantly improves UX by eliminating the need for manual refreshes and providing instant feedback

**2. Multiple Concurrent Games Support**

- **Current State**: Only one game can exist at a time (single `Game` struct in contract)
- **Enhancement**:
  - Add game IDs and mapping to support multiple games
  - Implement game discovery/listing UI
  - Add game filtering (open games, my games, completed games)
- **Why**: Enables a true multiplayer experience where multiple pairs can play simultaneously

**3. Transaction Retry and Error Recovery**

- **Current State**: Failed transactions require manual retry; no automatic handling of network issues
- **Enhancement**:
  - Implement exponential backoff retry logic for transient failures
  - Add transaction status tracking and recovery mechanisms
  - Handle nonce conflicts automatically (detect and increment)
- **Why**: Reduces user frustration from network hiccups and improves reliability

**4. Game History and Leaderboard**

- **Enhancement**:
  - Store completed games in local storage or a backend
  - Display win/loss statistics per player
  - Show game replay information (outcomes, timestamps)
- **Why**: Adds gamification and allows players to track their performance

**5. Better Error Messages**

- **Current State**: Generic error messages from contract reverts
- **Enhancement**:
  - Parse and translate contract errors into user-friendly messages
  - Add context-specific help text
  - Provide actionable suggestions (e.g., "Wait for another player" vs "Game already in progress")
- **Why**: Reduces confusion and support burden

**6. Mobile Responsiveness**

- **Enhancement**: Optimize UI for mobile devices, ensure wallet connection works smoothly on mobile browsers
- **Why**: Expands accessibility and user base

**7. Testing Infrastructure**

- **Enhancement**:
  - Add E2E tests with Playwright + wallet simulator (Synpress)
  - Integration tests for the full encryption → submission → decryption flow
  - Load testing for concurrent games
- **Why**: Ensures reliability as features are added

## 2. AI Coding Assistance: What Worked and What Didn't

### What Worked Well

**1. Code Generation for Boilerplate**

- **Use Case**: Generating React hooks, TypeScript types, and component structures
- **Result**: Significantly accelerated initial development by generating consistent patterns based on https://github.com/zama-ai/dapps repo

**2. Understanding FHEVM SDK Patterns**

- **Use Case**: Learning how to use `useFHEEncryption`, `useFHEDecrypt`, and `useFhevm` hooks
- **Result**: AI helped interpret SDK documentation and examples, providing working code snippets
- **Example**: Understanding the encryption flow with `encryptWith(builder => builder.add32(value))`

**3. TypeScript Type Definitions**

- **Use Case**: Creating types for game state, choices, and contract interactions
- **Result**: Generated accurate types that matched contract ABIs and reduced type errors
- **Example**: `GameResult` type matching the contract's `getGame()` return structure

**4. Error Handling Patterns**

- **Use Case**: Implementing try-catch blocks and error state management
- **Result**: Consistent error handling across async operations
- **Example**: Transaction error handling in `startGame()`, `joinGame()`, and `submitChoice()`

**5. React Hook Optimization**

- **Use Case**: Using `useMemo`, `useCallback` to prevent unnecessary re-renders
- **Result**: AI suggested memoization for expensive computations and callbacks
- **Example**: Memoizing `canStartGame`, `canJoinGame` based on dependencies

### What Didn't Work Well

**1. Best practicies for local development**

- **Issue**: AI generated code didn't work in local env
- **Example**: Confusion whtere `fhevem-sdk` or `relayer-sdk` should be used
- **Solution**: Manually reviewed recent repos from `zama-ai` and used `dapps` repo as reference.

## 3. Issue Triage Process

### General Triage Process

1. **Reproduce**: Can you consistently reproduce the issue? Write playwright test for it if possible.
2. **Isolate**: Which component is failing? (Frontend, Contract, FHEVM SDK, Network, Wallet)
3. **Hypothesize**: What's the most likely cause based on error messages and logs?
4. **Validate**: Test the hypothesis with targeted checks
5. **Fix**: Implement solution (code fix, workaround, or documentation)
6. **Verify**: Test fix thoroughly, including edge cases
7. **Document**: Update troubleshooting guide if it's a common issue
