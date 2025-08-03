# RandomProof Smart Contracts

This directory contains the ChainLink VRF integration smart contracts for RandomProof, providing verifiable on-chain randomness for entity hash processing.

## Overview

The RandomProof smart contract integrates with ChainLink VRF v2 to provide:
- **Verifiable randomness** for entity hash processing
- **One-entity-hash-one-result** rule enforcement
- **On-chain storage** of entity hashes and salts
- **Event emissions** optimized for browser detection
- **Gas-optimized** implementation for production use

## Contract Architecture

### Core Contract: `RandomProofOptimized.sol`

The main contract that handles:
- VRF randomness requests
- Entity hash validation and storage
- Salt hash storage for verification
- Event emissions for frontend tracking
- Query functions for result retrieval

### Key Features

1. **Entity Hash Uniqueness**: Each entity hash can only be processed once
2. **Gas Optimization**: Uses bytes32 for storage, calldata for parameters
3. **Event Indexing**: Optimized events for efficient web3 filtering
4. **Secure Randomness**: ChainLink VRF ensures unpredictable, verifiable results

## Setup Instructions

### 1. Install Dependencies

```bash
cd contracts
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```bash
# Network RPC URLs
POLYGON_RPC_URL=your_polygon_rpc_url
MUMBAI_RPC_URL=your_mumbai_testnet_rpc_url

# Deployment account private key
PRIVATE_KEY=your_private_key_without_0x

# Polygonscan API key for verification
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# ChainLink VRF Subscription ID
VRF_SUBSCRIPTION_ID=your_subscription_id
```

### 3. Compile Contracts

```bash
npm run compile
```

## Testing

### Run All Tests

```bash
npm test
```

### Run with Coverage

```bash
npm run coverage
```

### Test Structure

- `test/RandomProof.test.ts`: Unit tests for core functionality
- `test/RandomProof.integration.test.ts`: End-to-end integration tests

## Deployment

### Deploy to Mumbai Testnet

```bash
npm run deploy:mumbai
```

### Deploy to Polygon Mainnet

```bash
npm run deploy:polygon
```

### Deploy to Local Network

```bash
npm run deploy:localhost
```

### Post-Deployment Steps

1. **Add Contract as VRF Consumer**:
   ```bash
   CONTRACT_ADDRESS=0x... npm run scripts/add-consumer.ts
   ```

2. **Verify Contract**:
   ```bash
   CONTRACT_ADDRESS=0x... npm run verify
   ```

3. **Fund VRF Subscription**: Visit [ChainLink VRF](https://vrf.chain.link) to fund your subscription

## Frontend Integration

### Contract Interface

```typescript
interface RandomProof {
  // Request randomness for entity hash
  // Note: salt must be bytes32 (keccak256 hash of original salt)
  requestRandomness(entityHash: string, salt: bytes32): Promise<TransactionResponse>
  
  // Get randomness result
  getRandomnessForEntityHash(entityHash: string): Promise<[bigint, boolean]>
  
  // Check if entity hash is processed
  isEntityHashProcessed(entityHash: string): Promise<boolean>
  
  // Get request ID for entity hash
  getRequestIdForEntityHash(entityHash: string): Promise<bigint>
}
```

### Example Usage

```typescript
import { ethers } from 'ethers';

// Connect to contract
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

// Request randomness
const entityHash = "a".repeat(64); // 64-character hex string
const userSalt = "user-provided-salt";
// Hash the salt to bytes32 using keccak256
const saltBytes32 = ethers.keccak256(ethers.toUtf8Bytes(userSalt));
const tx = await contract.requestRandomness(entityHash, saltBytes32);
await tx.wait();

// Poll for result
let fulfilled = false;
while (!fulfilled) {
  const [randomness, isFullfilled] = await contract.getRandomnessForEntityHash(entityHash);
  fulfilled = isFullfilled;
  if (!fulfilled) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
  }
}
```

### Event Listening

```typescript
// Listen for randomness requests
contract.on("RandomnessRequested", (requestId, entityHashBytes32, entityHash, salt, requester) => {
  console.log("New request:", { requestId, entityHash, salt, requester });
});

// Listen for fulfillment
contract.on("RandomnessFulfilled", (requestId, entityHashBytes32, randomness) => {
  console.log("Request fulfilled:", { requestId, randomness });
});
```

## Gas Costs

Typical gas usage on Polygon:
- `requestRandomness`: ~120,000 gas
- `getRandomnessForEntityHash`: ~30,000 gas (view function)
- VRF Callback: ~100,000 gas (paid by ChainLink)

## Security Considerations

1. **Entity Hash Format**: Must be exactly 64 characters (SHA-256 hex)
2. **Salt Format**: Must be bytes32 (keccak256 hash) - hash long salts client-side
3. **Subscription Funding**: Ensure VRF subscription has sufficient LINK
4. **One-Time Use**: Each entity hash can only be processed once
5. **No Modification**: Results cannot be modified after fulfillment

## Troubleshooting

### Common Issues

1. **"EntityHashAlreadyProcessed"**: The entity hash has been used before
2. **"InvalidEntityHash"**: Entity hash must be 64 characters
3. **"RequestNotFound"**: No request exists for the given entity hash
4. **VRF Request Fails**: Check subscription funding and consumer status

### Debug Commands

```bash
# Check contract on explorer
npx hardhat verify --network polygon CONTRACT_ADDRESS

# Run specific test
npx hardhat test test/RandomProof.test.ts --grep "request randomness"

# Get gas report
npm run test -- --gas-reporter
```

## Contract Addresses

### Mainnet Deployments
- Polygon: `[To be deployed]`

### Testnet Deployments
- Mumbai: `[To be deployed]`

## License

MIT