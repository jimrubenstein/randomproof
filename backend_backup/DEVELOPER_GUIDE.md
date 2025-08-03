# RandomProof Developer Guide

## 🛠️ Implementing Custom Randomizer Drivers

This guide explains how to create custom randomness drivers for RandomProof, enabling integration with different blockchain networks, oracles, and randomness sources.

---

## Table of Contents

1. [Overview](#overview)
2. [BlockchainContract Interface](#blockchaincontract-interface)
3. [Implementation Examples](#implementation-examples)
4. [Driver Integration](#driver-integration)
5. [Testing Your Driver](#testing-your-driver)
6. [Best Practices](#best-practices)
7. [Contributing](#contributing)

---

## Overview

RandomProof uses a modular driver system that allows developers to implement custom randomness sources while maintaining compatibility with the existing application. All drivers implement the `BlockchainContract` interface, ensuring consistent behavior across different randomness providers.

### Why Custom Drivers?

- **Blockchain Integration**: Connect to different blockchain networks (Ethereum, Polygon, Solana, etc.)
- **Oracle Services**: Integrate with Chainlink VRF, API3 QRNG, or other oracle providers
- **Testing**: Create deterministic drivers for development and testing
- **Privacy**: Implement private randomness sources for sensitive applications

---

## BlockchainContract Interface

All randomizer drivers must implement the `BlockchainContract` interface:

```typescript
export interface BlockchainContract {
  /**
   * Request randomness from the blockchain/oracle service
   * @param entityHash - SHA-256 hash of the processed input data + salt
   * @param salt - Salt value used in entity hash generation
   * @returns Promise resolving to a transaction ID for tracking the request
   */
  requestRandomness(entityHash: string, salt: string): Promise<string>;

  /**
   * Fetch the randomness result for a given entity hash
   * @param entityHash - Entity hash that includes processed data + salt
   * @returns Promise resolving to a random number (0 if still pending)
   */
  fetchRandomness(entityHash: string): Promise<number>;
}
```

### Interface Requirements

#### `requestRandomness(entityHash, salt)`
- **Purpose**: Initiate a randomness request
- **Parameters**:
  - `entityHash`: SHA-256 hash of processed participant data + salt (64-character hex string)
  - `salt`: Salt value that was included in the entity hash generation (string, may be empty)
- **Returns**: Unique transaction ID for tracking the request
- **Behavior**: Should be idempotent - same inputs should return same transaction ID

#### `fetchRandomness(entityHash)`
- **Purpose**: Retrieve randomness result
- **Parameters**:
  - `entityHash`: Entity hash used in the original request (includes processed data + salt)
- **Returns**: 
  - `0`: Request still pending/processing
  - `number > 0`: Random number result
- **Behavior**: Should return the same result for completed requests

---

## Implementation Examples

### 1. Math.random() Driver (Testing)

Perfect for development and testing without external dependencies:

```typescript
import type { BlockchainContract } from '../types/blockchain'

export class MathRandomDriver implements BlockchainContract {
  private pendingRequests = new Map<string, {
    entityHash: string
    salt: string
    timestamp: number
  }>()

  async requestRandomness(entityHash: string, salt: string): Promise<string> {
    // Generate unique transaction ID
    const timestamp = Date.now()
    const randomPart = Math.random().toString(36).substring(2, 9)
    const transactionId = `0x${timestamp.toString(16)}${randomPart}`
    
    // Store request for later retrieval
    this.pendingRequests.set(transactionId, {
      entityHash,
      salt,
      timestamp
    })
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return transactionId
  }

  async fetchRandomness(transactionID: string): Promise<number> {
    const request = this.pendingRequests.get(transactionID)
    
    if (!request) {
      return 0 // Not found
    }
    
    // Simulate confirmation time (2 seconds)
    const elapsedTime = Date.now() - request.timestamp
    if (elapsedTime < 2000) {
      return 0 // Still pending
    }
    
    // Generate random number
    const randomValue = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    
    // Clean up completed request
    this.pendingRequests.delete(transactionID)
    
    return randomValue
  }
  
  // Utility for testing
  clearPendingRequests(): void {
    this.pendingRequests.clear()
  }
}
```

### 2. Ethereum Chainlink VRF Driver

Production-ready driver for Ethereum with Chainlink VRF:

```typescript
import type { BlockchainContract } from '../types/blockchain'
import { ethers } from 'ethers'

export class ChainlinkVRFDriver implements BlockchainContract {
  private provider: ethers.Provider
  private contract: ethers.Contract
  private signer: ethers.Signer

  constructor(
    providerUrl: string,
    contractAddress: string,
    contractAbi: any[],
    privateKey: string
  ) {
    this.provider = new ethers.JsonRpcProvider(providerUrl)
    this.signer = new ethers.Wallet(privateKey, this.provider)
    this.contract = new ethers.Contract(contractAddress, contractAbi, this.signer)
  }

  async requestRandomness(entityHash: string, salt: string): Promise<string> {
    try {
      // Call smart contract to request VRF randomness
      const tx = await this.contract.requestRandomWords(
        entityHash,
        salt,
        { gasLimit: 300000 }
      )
      
      // Wait for transaction confirmation
      await tx.wait()
      
      return tx.hash
    } catch (error) {
      console.error('Failed to request randomness:', error)
      throw new Error('Blockchain request failed')
    }
  }

  async fetchRandomness(transactionID: string): Promise<number> {
    try {
      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(transactionID)
      
      if (!receipt) {
        return 0 // Transaction not found or pending
      }
      
      // Parse VRF response from contract events
      const logs = receipt.logs
      const vrfEvent = logs.find(log => 
        log.topics[0] === this.contract.interface.getEventTopic('RandomWordsFulfilled')
      )
      
      if (!vrfEvent) {
        return 0 // VRF not yet fulfilled
      }
      
      // Decode the random number from event
      const decodedEvent = this.contract.interface.parseLog(vrfEvent)
      return BigInt(decodedEvent.args.randomWords[0])
      
    } catch (error) {
      console.error('Failed to fetch randomness:', error)
      return 0
    }
  }
}
```

### 3. API3 QRNG Driver

Integration with API3's Quantum Random Number Generator:

```typescript
import type { BlockchainContract } from '../types/blockchain'

export class API3QRNGDriver implements BlockchainContract {
  private apiKey: string
  private baseUrl: string
  private pendingRequests = new Map<string, any>()

  constructor(apiKey: string, baseUrl = 'https://qrng-api.api3.org') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  async requestRandomness(entityHash: string, salt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entityHash,
          salt,
          numWords: 1
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'API request failed')
      }

      // Store request for tracking
      this.pendingRequests.set(result.requestId, {
        entityHash,
        salt,
        timestamp: Date.now()
      })

      return result.requestId
    } catch (error) {
      console.error('QRNG request failed:', error)
      throw error
    }
  }

  async fetchRandomness(transactionID: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/status/${transactionID}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      const result = await response.json()

      if (result.status === 'completed' && result.randomNumber) {
        // Clean up completed request
        this.pendingRequests.delete(transactionID)
        return parseInt(result.randomNumber, 10)
      }

      return 0 // Still pending
    } catch (error) {
      console.error('QRNG fetch failed:', error)
      return 0
    }
  }
}
```

### 4. Deterministic Driver (Testing)

Useful for reproducible testing scenarios:

```typescript
import type { BlockchainContract } from '../types/blockchain'
import { createHash } from 'crypto'

export class DeterministicDriver implements BlockchainContract {
  private seed: string

  constructor(seed: string = 'default-test-seed') {
    this.seed = seed
  }

  async requestRandomness(entityHash: string, salt: string): Promise<string> {
    // Create deterministic transaction ID
    const input = `${this.seed}-${entityHash}-${salt}`
    const hash = createHash('sha256').update(input).digest('hex')
    return `0x${hash.substring(0, 16)}`
  }

  async fetchRandomness(transactionID: string): Promise<number> {
    // Generate deterministic random number from transaction ID
    const hash = createHash('sha256').update(transactionID).digest('hex')
    
    // Convert first 8 bytes to number
    const randomHex = hash.substring(0, 16)
    return parseInt(randomHex, 16)
  }
}
```

---

## Driver Integration

### 1. Create Your Driver

Create your driver file in `src/utils/drivers/`:

```typescript
// src/utils/drivers/myCustomDriver.ts
import type { BlockchainContract } from '../../types/blockchain'

export class MyCustomDriver implements BlockchainContract {
  // Implementation here
}
```

### 2. Update Blockchain Configuration

Modify `src/utils/blockchain.ts` to use your driver:

```typescript
import type { BlockchainContract } from '../types/blockchain'
import { MyCustomDriver } from './drivers/myCustomDriver'

// Configure your driver
const driverConfig = {
  // Your driver-specific configuration
}

// Export your driver instance
export const blockchainContract: BlockchainContract = new MyCustomDriver(driverConfig)
```

### 3. Environment Configuration

Add environment variables for your driver configuration:

```typescript
// .env.local
VITE_BLOCKCHAIN_PROVIDER_URL=https://mainnet.infura.io/v3/YOUR_KEY
VITE_CONTRACT_ADDRESS=0x...
VITE_PRIVATE_KEY=your_private_key
```

Access in your driver:

```typescript
const providerUrl = import.meta.env.VITE_BLOCKCHAIN_PROVIDER_URL
const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS
```

---

## Testing Your Driver

### 1. Unit Tests

Create comprehensive tests for your driver:

```typescript
// src/tests/drivers/myCustomDriver.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MyCustomDriver } from '../../utils/drivers/myCustomDriver'

describe('MyCustomDriver', () => {
  let driver: MyCustomDriver

  beforeEach(() => {
    driver = new MyCustomDriver(/* test config */)
  })

  it('should request randomness successfully', async () => {
    const entityHash = 'a'.repeat(64)
    const salt = 'test-salt'
    
    const transactionId = await driver.requestRandomness(entityHash, salt)
    
    expect(transactionId).toBeTruthy()
    expect(typeof transactionId).toBe('string')
  })

  it('should return 0 for pending requests', async () => {
    const fakeTransactionId = 'pending-transaction'
    
    const result = await driver.fetchRandomness(fakeTransactionId)
    
    expect(result).toBe(0)
  })

  it('should return valid random number for completed requests', async () => {
    const entityHash = 'a'.repeat(64)
    const salt = 'test-salt'
    
    const transactionId = await driver.requestRandomness(entityHash, salt)
    
    // Wait for completion (implementation dependent)
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const randomNumber = await driver.fetchRandomness(transactionId)
    
    expect(randomNumber).toBeGreaterThan(0)
    expect(Number.isInteger(randomNumber)).toBe(true)
  })
})
```

### 2. Integration Tests

Test your driver with the full RandomProof application:

```typescript
// src/tests/integration/driverIntegration.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HomeView from '../../views/HomeView.vue'
import { useRandomProofStore } from '../../stores/useRandomProofStore'

describe('Driver Integration', () => {
  it('should complete full randomization flow', async () => {
    const store = useRandomProofStore()
    
    // Set up test data
    store.setInputData('Alice\nBob\nCharlie')
    store.setNumberOfWinners(1)
    
    // Mock form submission
    const wrapper = mount(HomeView)
    
    // Submit and wait for completion
    await wrapper.find('form').trigger('submit')
    
    // Verify results
    expect(store.hasRandomness).toBe(true)
    expect(store.winners.length).toBe(1)
  })
})
```

### 3. Performance Testing

Test your driver's performance characteristics:

```typescript
// src/tests/performance/driverPerformance.test.ts
import { describe, it, expect } from 'vitest'
import { MyCustomDriver } from '../../utils/drivers/myCustomDriver'

describe('Driver Performance', () => {
  it('should handle concurrent requests', async () => {
    const driver = new MyCustomDriver()
    const requests = []
    
    // Create 10 concurrent requests
    for (let i = 0; i < 10; i++) {
      requests.push(
        driver.requestRandomness(
          'a'.repeat(64),
          `salt-${i}`
        )
      )
    }
    
    const results = await Promise.all(requests)
    
    // All should succeed
    expect(results.length).toBe(10)
    results.forEach(result => {
      expect(result).toBeTruthy()
    })
    
    // All should be unique
    const uniqueResults = new Set(results)
    expect(uniqueResults.size).toBe(10)
  })
})
```

---

## Best Practices

### 1. Error Handling

Always implement robust error handling:

```typescript
async requestRandomness(entityHash: string, salt: string): Promise<string> {
  try {
    // Your implementation
    return transactionId
  } catch (error) {
    console.error('Driver error:', error)
    
    // Throw descriptive errors
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('Insufficient funds for transaction')
    }
    
    throw new Error('Randomness request failed')
  }
}
```

### 2. Logging and Monitoring

Add comprehensive logging:

```typescript
import { logger } from '../utils/logger'

async requestRandomness(entityHash: string, salt: string): Promise<string> {
  logger.info('Requesting randomness', { entityHash, salt })
  
  const transactionId = await this.makeRequest(entityHash, salt)
  
  logger.info('Randomness requested', { transactionId })
  
  return transactionId
}
```

### 3. Configuration Management

Use environment-based configuration:

```typescript
interface DriverConfig {
  providerUrl: string
  contractAddress: string
  gasLimit: number
  timeout: number
}

export class MyDriver implements BlockchainContract {
  private config: DriverConfig

  constructor(config?: Partial<DriverConfig>) {
    this.config = {
      providerUrl: import.meta.env.VITE_PROVIDER_URL || 'http://localhost:8545',
      contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS || '',
      gasLimit: parseInt(import.meta.env.VITE_GAS_LIMIT || '300000'),
      timeout: parseInt(import.meta.env.VITE_TIMEOUT || '30000'),
      ...config
    }
  }
}
```

### 4. Rate Limiting

Implement rate limiting for external APIs:

```typescript
class RateLimiter {
  private requests: number[] = []
  private maxRequests: number
  private timeWindow: number

  constructor(maxRequests: number, timeWindowMs: number) {
    this.maxRequests = maxRequests
    this.timeWindow = timeWindowMs
  }

  async checkLimit(): Promise<void> {
    const now = Date.now()
    
    // Remove old requests
    this.requests = this.requests.filter(time => now - time < this.timeWindow)
    
    if (this.requests.length >= this.maxRequests) {
      const waitTime = this.timeWindow - (now - this.requests[0])
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.requests.push(now)
  }
}
```

### 5. Input Validation

Validate all inputs:

```typescript
async requestRandomness(entityHash: string, salt: string): Promise<string> {
  // Validate entity hash
  if (!entityHash || entityHash.length !== 64 || !/^[a-f0-9]+$/i.test(entityHash)) {
    throw new Error('Invalid entity hash: must be 64-character hex string')
  }
  
  // Validate salt
  if (salt && salt.length > 1000) {
    throw new Error('Salt too long: maximum 1000 characters')
  }
  
  // Continue with implementation
}
```

---

## Contributing

### 1. Driver Submission Guidelines

When contributing a new driver:

1. **Follow Interface**: Implement the complete `BlockchainContract` interface
2. **Add Tests**: Include comprehensive unit and integration tests
3. **Document Configuration**: Provide clear setup instructions
4. **Error Handling**: Implement robust error handling and logging
5. **Performance**: Ensure reasonable performance characteristics

### 2. Documentation Requirements

Include these sections in your driver documentation:

- **Purpose**: What randomness source does this driver support?
- **Prerequisites**: Required accounts, API keys, network access
- **Configuration**: Environment variables and setup steps
- **Limitations**: Rate limits, cost considerations, network requirements
- **Examples**: Sample usage and configuration

### 3. Code Review Checklist

Before submitting:

- [ ] Implements complete `BlockchainContract` interface
- [ ] Includes comprehensive tests (>90% coverage)
- [ ] Handles all error conditions gracefully
- [ ] Validates all inputs
- [ ] Includes proper TypeScript types
- [ ] Follows project coding standards
- [ ] Documents configuration requirements
- [ ] Provides usage examples

### 4. Driver Categories

We welcome drivers for:

- **Blockchain Networks**: Ethereum, Polygon, Solana, Avalanche, etc.
- **Oracle Services**: Chainlink VRF, API3 QRNG, Band Protocol
- **Testing**: Deterministic, mock, and simulation drivers
- **Privacy**: zk-SNARK based randomness, secure multi-party computation
- **Hardware**: HSM-based randomness, quantum sources

---

## Support

For questions about driver development:

1. **Issues**: Create a GitHub issue with the `driver-development` label
2. **Discussions**: Use GitHub Discussions for architecture questions
3. **Examples**: Check the `examples/drivers/` directory for reference implementations

---

## License

All contributed drivers must be compatible with the project's MIT license.

---

*This guide helps make RandomProof truly extensible - enabling developers to integrate any randomness source while maintaining consistency and reliability.*