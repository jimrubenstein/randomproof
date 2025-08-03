# RandomProof Developer Guide: Implementing Custom Randomness Drivers

This guide explains how to extend RandomProof with custom randomness sources by implementing your own blockchain drivers. Whether you want to integrate with a different blockchain, use a different VRF provider, or create a custom randomness oracle, this guide covers everything you need to know.

## Table of Contents

1. [Overview](#overview)
2. [The BlockchainContract Interface](#the-blockchaincontract-interface)
3. [Driver Architecture](#driver-architecture)
4. [Implementation Examples](#implementation-examples)
5. [Integration Points](#integration-points)
6. [Testing Your Driver](#testing-your-driver)
7. [Best Practices](#best-practices)
8. [Deployment Considerations](#deployment-considerations)

## Overview

RandomProof uses a driver-based architecture to support different randomness sources. All drivers implement the same `BlockchainContract` interface, allowing for seamless swapping between implementations without changing any application logic.

### Current Implementations

- **MathRandomDriver**: Uses `Math.random()` for local testing and development
- **MockBlockchainContract**: Legacy mock implementation for basic testing
- **[Future] ChainLinkVRFDriver**: Production blockchain implementation using ChainLink VRF on Polygon

## The BlockchainContract Interface

All randomness drivers must implement the `BlockchainContract` interface:

```typescript
export interface BlockchainContract {
  requestRandomness(entityHash: string, saltBytes32: string): Promise<string>;
  fetchRandomness(entityHash: string): Promise<number>;
}
```

### Method Specifications

#### `requestRandomness(entityHash: string, saltBytes32: string): Promise<string>`

**Purpose**: Initiates a randomness request and returns a transaction ID for tracking.

**Parameters**:
- `entityHash`: SHA-256 hash of the processed participant data **PLUS original salt string** (data+salt hashed together)
- `saltBytes32`: The salt value converted to keccak256 bytes32 format for Solidity compatibility (0x-prefixed hex string)

**Returns**: A unique transaction ID string (typically prefixed with `0x` for blockchain compatibility)

**Behavior Requirements**:
- MUST return a unique transaction ID for each request
- SHOULD validate that the same entityHash hasn't been used before (anti-tampering)
- MAY include artificial delays to simulate blockchain transaction times
- MUST be idempotent - same inputs should return the same transaction ID if called multiple times

**Critical Implementation Notes**: 
- The `entityHash` parameter already includes the original salt string via SHA-256 hashing
- The `saltBytes32` parameter is the keccak256 hash of the original salt string for Solidity bytes32 compatibility
- Use the provided `saltToBytes32()` utility function to convert user salt strings to the required format

#### `fetchRandomness(entityHash: string): Promise<number>`

**Purpose**: Retrieves the random number for a given entity hash.

**Parameters**:
- `entityHash`: The same entity hash used in `requestRandomness` (data+salt already hashed together)

**Returns**: 
- `0`: Randomness not yet available (still pending)
- `> 0`: The random number (typically a large integer)

**Behavior Requirements**:
- MUST return `0` when randomness is not yet available
- MUST return the same random number for the same entity hash on subsequent calls
- SHOULD return a cryptographically secure random number (for production implementations)
- MAY cache results to avoid redundant blockchain calls
- Uses entity hash (not transaction ID) as the key for fetching randomness

## Driver Architecture

### File Structure

```
src/
├── types/
│   └── blockchain.ts           # Interface definition
├── utils/
│   ├── blockchain.ts           # Driver registry/export
│   ├── mathRandomDriver.ts     # Math.random() implementation
│   └── yourCustomDriver.ts     # Your implementation
└── components/
    └── ResultsPage.vue         # Consumer of the driver
```

### Integration Flow

1. **Data Processing Phase**: User submits data → Data processed (sorted if enabled) → Data+salt hashed together → Entity hash generated
2. **Request Phase**: `requestRandomness(entityHash, salt)` called → Transaction ID returned
3. **Polling Phase**: `ResultsPage` polls `fetchRandomness(entityHash)` until randomness is available
4. **Processing Phase**: Random number used as seed for Mersenne Twister shuffling algorithm

**Critical Hash Flow**: 
```
processedData + salt → SHA-256 → entityHash (for fetching randomness)
salt → keccak256 → saltBytes32 (for Solidity contract)
entityHash used for both requestRandomness() and fetchRandomness()
```

### Salt Conversion Utilities

RandomProof provides utilities for converting user salt strings to Solidity-compatible bytes32:

```typescript
import { saltToBytes32, stringToBytes32 } from '../utils/keccak'

// Convert user salt to bytes32 for contract
const saltBytes32 = saltToBytes32(userSalt) // Handles empty/null salts
// Result: "0x1234..." or "0x0000..." for empty salt

// Or directly convert any string to bytes32
const bytes32 = stringToBytes32("my-salt-value")
// Result: "0x1234..."
```

## Implementation Examples

### Example 1: Basic Custom Driver

```typescript
import type { BlockchainContract } from '../types/blockchain'

export class CustomRandomDriver implements BlockchainContract {
  private requests: Map<string, number> = new Map() // entityHash -> randomness
  
  async requestRandomness(entityHash: string, saltBytes32: string): Promise<string> {
    // Generate unique transaction ID
    const txId = `custom_${Date.now()}_${Math.random().toString(36)}`
    
    // Store the request using entityHash as key (entityHash already includes data+salt)
    this.requests.set(entityHash, 0) // 0 = pending
    
    // Simulate async randomness generation
    setTimeout(() => {
      const randomValue = this.generateSecureRandom(entityHash, saltBytes32)
      this.requests.set(entityHash, randomValue) // Store by entityHash, not txId
    }, 3000) // 3 second delay
    
    return txId
  }
  
  async fetchRandomness(entityHash: string): Promise<number> {
    return this.requests.get(entityHash) || 0
  }
  
  private generateSecureRandom(entityHash: string, saltBytes32: string): number {
    // Your custom randomness logic here
    // Example: Hash-based deterministic randomness
    const combined = entityHash + saltBytes32 + Date.now()
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash + combined.charCodeAt(i)) & 0xffffffff
    }
    return Math.abs(hash)
  }
}
```

### Example 2: Ethereum VRF Driver

```typescript
import type { BlockchainContract } from '../types/blockchain'
import { ethers } from 'ethers'

export class EthereumVRFDriver implements BlockchainContract {
  private provider: ethers.Provider
  private contract: ethers.Contract
  private signer: ethers.Signer
  
  constructor(contractAddress: string, abi: any[], providerUrl: string) {
    this.provider = new ethers.JsonRpcProvider(providerUrl)
    this.contract = new ethers.Contract(contractAddress, abi, this.provider)
  }
  
  async requestRandomness(entityHash: string, saltBytes32: string): Promise<string> {
    // Connect signer (would typically use MetaMask in real implementation)
    const signer = await this.getSigner()
    const contractWithSigner = this.contract.connect(signer)
    
    // Call smart contract to request randomness with bytes32 salt
    try {
      const tx = await contractWithSigner.requestRandomWords(entityHash, saltBytes32)
      await tx.wait() // Wait for transaction to be mined
      return tx.hash
    } catch (error) {
      throw new Error(`Failed to request randomness: ${error}`)
    }
  }
  
  async fetchRandomness(entityHash: string): Promise<number> {
    try {
      // Query contract for randomness by entity hash
      const result = await this.contract.getRandomnessForEntityHash(entityHash)
      return result.toNumber()
    } catch (error) {
      // Randomness not available yet
      return 0
    }
  }
  
  private async getSigner(): Promise<ethers.Signer> {
    // Implementation depends on wallet connection method
    // This is a simplified example
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      return provider.getSigner()
    }
    throw new Error('No wallet connected')
  }
}
```

### Example 3: API-Based Randomness Service

```typescript
import type { BlockchainContract } from '../types/blockchain'

export class APIRandomnessDriver implements BlockchainContract {
  private apiBaseUrl: string
  private apiKey: string
  
  constructor(baseUrl: string, apiKey: string) {
    this.apiBaseUrl = baseUrl
    this.apiKey = apiKey
  }
  
  async requestRandomness(entityHash: string, saltBytes32: string): Promise<string> {
    const response = await fetch(`${this.apiBaseUrl}/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        entityHash,
        saltBytes32,
        timestamp: Date.now()
      })
    })
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.requestId
  }
  
  async fetchRandomness(entityHash: string): Promise<number> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/result/${entityHash}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })
      
      if (response.status === 404) {
        return 0 // Not ready yet
      }
      
      if (!response.ok) {
        throw new Error(`API fetch failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.randomValue || 0
    } catch (error) {
      console.error('Error fetching randomness:', error)
      return 0
    }
  }
}
```

## Integration Points

### 1. Driver Registration

To use your custom driver, update `src/utils/blockchain.ts`:

```typescript
import type { BlockchainContract } from '../types/blockchain'
import { MathRandomDriver } from './mathRandomDriver'
import { YourCustomDriver } from './yourCustomDriver'

// Switch between drivers based on environment or configuration
const isDevelopment = import.meta.env.DEV
const useCustomDriver = import.meta.env.VITE_USE_CUSTOM_DRIVER === 'true'

export const blockchainContract: BlockchainContract = 
  isDevelopment && !useCustomDriver 
    ? new MathRandomDriver()
    : new YourCustomDriver(/* configuration parameters */)
```

### 2. Environment Configuration

Add environment variables to control driver selection:

```bash
# .env.development
VITE_USE_CUSTOM_DRIVER=false

# .env.production
VITE_USE_CUSTOM_DRIVER=true
VITE_BLOCKCHAIN_RPC_URL=https://polygon-rpc.com
VITE_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
```

### 3. Component Integration

The driver is automatically used by `ResultsPage.vue` through the polling mechanism:

```typescript
// In ResultsPage.vue
import { blockchainContract } from '../utils/blockchain'

async function pollForRandomness() {
  const randomValue = await blockchainContract.fetchRandomness(store.entityHash)
  // Application logic remains unchanged regardless of driver
}
```

## Testing Your Driver

### 1. Unit Tests

Create comprehensive tests for your driver:

```typescript
// src/tests/drivers/yourCustomDriver.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { YourCustomDriver } from '../../utils/yourCustomDriver'

describe('YourCustomDriver', () => {
  let driver: YourCustomDriver
  
  beforeEach(() => {
    driver = new YourCustomDriver()
  })
  
  it('should return unique transaction IDs', async () => {
    const txId1 = await driver.requestRandomness('hash1', '0x1234567890123456789012345678901234567890123456789012345678901234')
    const txId2 = await driver.requestRandomness('hash2', '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef')
    
    expect(txId1).not.toBe(txId2)
    expect(txId1).toMatch(/^0x[a-fA-F0-9]+$/) // Example format validation
  })
  
  it('should return 0 for pending randomness', async () => {
    const entityHash = 'test-entity-hash-with-salt'
    const saltBytes32 = '0x1234567890123456789012345678901234567890123456789012345678901234'
    await driver.requestRandomness(entityHash, saltBytes32)
    const randomness = await driver.fetchRandomness(entityHash)
    
    expect(randomness).toBe(0) // Should be pending initially
  })
  
  it('should return consistent randomness for same entity hash', async () => {
    const entityHash = 'test-entity-hash-with-salt'
    const saltBytes32 = '0x1234567890123456789012345678901234567890123456789012345678901234'
    await driver.requestRandomness(entityHash, saltBytes32)
    
    // Wait for randomness to be available
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    const randomness1 = await driver.fetchRandomness(entityHash)
    const randomness2 = await driver.fetchRandomness(entityHash)
    
    expect(randomness1).toBeGreaterThan(0)
    expect(randomness1).toBe(randomness2)
  })
  
  it('should prevent duplicate entity hash usage', async () => {
    const entityHash = 'same-entity-hash-including-salt'
    const saltBytes32 = '0x1234567890123456789012345678901234567890123456789012345678901234'
    const txId1 = await driver.requestRandomness(entityHash, saltBytes32)
    
    // Attempting to reuse the same entity hash should either:
    // 1. Return the same transaction ID, or
    // 2. Throw an error (depending on your anti-tampering strategy)
    await expect(
      driver.requestRandomness(entityHash, saltBytes32)
    ).rejects.toThrow() // or .resolves.toBe(txId1)
  })
})
```

### 2. Integration Tests

Test the complete flow with your driver:

```typescript
// src/tests/integration/customDriverFlow.test.ts
import { describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRandomProofStore } from '../../stores/useRandomProofStore'

describe('Custom Driver Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should complete full randomization flow', async () => {
    const store = useRandomProofStore()
    
    // Set up test data
    store.setInputData('Alice\nBob\nCharlie')
    store.setSalt('test-salt')
    
    // Test the complete flow that would happen in the UI
    // This implicitly tests your driver through the application
    
    // Note: You'll need to mock or provide actual driver functionality
    // depending on whether your driver requires external services
  }, 30000) // Longer timeout for blockchain operations
})
```

### 3. Manual Testing

Create a test page to manually verify your driver:

```typescript
// src/components/DriverTestPage.vue
<script setup lang="ts">
import { ref } from 'vue'
import { blockchainContract } from '../utils/blockchain'

const entityHash = ref('test-hash-123')
const salt = ref('test-salt')
const transactionId = ref('')
const randomness = ref(0)
const loading = ref(false)

async function testRequest() {
  loading.value = true
  try {
    transactionId.value = await blockchainContract.requestRandomness(
      entityHash.value, 
      salt.value
    )
  } catch (error) {
    console.error('Request failed:', error)
  }
  loading.value = false
}

async function testFetch() {
  if (!entityHash.value) return
  
  loading.value = true
  try {
    randomness.value = await blockchainContract.fetchRandomness(entityHash.value)
  } catch (error) {
    console.error('Fetch failed:', error)
  }
  loading.value = false
}
</script>

<template>
  <div class="p-6 max-w-md mx-auto">
    <h2 class="text-xl font-bold mb-4">Driver Test Page</h2>
    
    <div class="space-y-4">
      <input v-model="entityHash" placeholder="Entity Hash" class="w-full p-2 border rounded" />
      <input v-model="salt" placeholder="Salt" class="w-full p-2 border rounded" />
      
      <button @click="testRequest" :disabled="loading" class="w-full p-2 bg-blue-500 text-white rounded">
        Request Randomness
      </button>
      
      <div v-if="transactionId" class="p-2 bg-gray-100 rounded">
        <strong>Transaction ID:</strong> {{ transactionId }}
      </div>
      
      <button @click="testFetch" :disabled="!entityHash || loading" class="w-full p-2 bg-green-500 text-white rounded">
        Fetch Randomness
      </button>
      
      <div v-if="randomness > 0" class="p-2 bg-yellow-100 rounded">
        <strong>Random Value:</strong> {{ randomness }}
      </div>
    </div>
  </div>
</template>
```

## Best Practices

### 1. Error Handling

Implement robust error handling:

```typescript
export class RobustDriver implements BlockchainContract {
  async requestRandomness(entityHash: string, salt: string): Promise<string> {
    try {
      // Validate inputs
      if (!entityHash || entityHash.length !== 64) {
        throw new Error('Invalid entity hash format')
      }
      
      // Implement your logic here
      return await this.makeRequest(entityHash, salt)
      
    } catch (error) {
      // Log error for debugging
      console.error('Request randomness failed:', error)
      
      // Provide meaningful error messages
      if (error instanceof NetworkError) {
        throw new Error('Network connection failed. Please check your internet connection.')
      } else if (error instanceof AuthenticationError) {
        throw new Error('Authentication failed. Please check your API key.')
      } else {
        throw new Error(`Randomness request failed: ${error.message}`)
      }
    }
  }
  
  async fetchRandomness(transactionID: string): Promise<number> {
    try {
      return await this.retrieveRandomness(transactionID)
    } catch (error) {
      // For fetch operations, return 0 on error (indicates pending/unavailable)
      console.warn('Fetch randomness failed:', error)
      return 0
    }
  }
}
```

### 2. Caching and Performance

Implement intelligent caching:

```typescript
export class CachedDriver implements BlockchainContract {
  private cache = new Map<string, number>()
  private requestCache = new Map<string, Promise<string>>()
  
  async requestRandomness(entityHash: string, salt: string): Promise<string> {
    const cacheKey = `${entityHash}:${salt}`
    
    // Avoid duplicate requests
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey)!
    }
    
    const promise = this.performRequest(entityHash, salt)
    this.requestCache.set(cacheKey, promise)
    
    return promise
  }
  
  async fetchRandomness(transactionID: string): Promise<number> {
    // Check cache first
    if (this.cache.has(transactionID)) {
      return this.cache.get(transactionID)!
    }
    
    const randomness = await this.retrieveFromSource(transactionID)
    
    // Cache successful results
    if (randomness > 0) {
      this.cache.set(transactionID, randomness)
    }
    
    return randomness
  }
}
```

### 3. Configuration Management

Make your driver configurable:

```typescript
export interface DriverConfig {
  apiUrl?: string
  apiKey?: string
  timeout?: number
  retryAttempts?: number
  cacheTTL?: number
}

export class ConfigurableDriver implements BlockchainContract {
  private config: Required<DriverConfig>
  
  constructor(config: DriverConfig = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'https://api.randomness.service',
      apiKey: config.apiKey || '',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      cacheTTL: config.cacheTTL || 300000 // 5 minutes
    }
  }
  
  // Implementation using this.config...
}
```

### 4. Anti-Tampering Implementation

Prevent entity hash reuse:

```typescript
export class AntiTamperingDriver implements BlockchainContract {
  private usedEntityHashes = new Set<string>()
  
  async requestRandomness(entityHash: string, saltBytes32: string): Promise<string> {
    // Check if this entity hash has been used before
    // (entityHash already includes data+salt, so this prevents any duplicate usage)
    if (this.usedEntityHashes.has(entityHash)) {
      throw new Error('This entity hash has already been used. RandomProof prevents result manipulation by blocking duplicate requests.')
    }
    
    // Mark as used
    this.usedEntityHashes.add(entityHash)
    
    // Proceed with request...
    return this.performRequest(entityHash, saltBytes32)
  }
  
  async fetchRandomness(entityHash: string): Promise<number> {
    // Implementation here...
    return 0
  }
}
```

## Deployment Considerations

### 1. Environment Variables

Set up proper environment configuration:

```typescript
// src/config/driver.ts
export const getDriverConfig = () => {
  const env = import.meta.env
  
  return {
    driverType: env.VITE_DRIVER_TYPE || 'math',
    blockchainRPC: env.VITE_BLOCKCHAIN_RPC_URL,
    contractAddress: env.VITE_CONTRACT_ADDRESS,
    apiKey: env.VITE_RANDOMNESS_API_KEY,
    isProduction: env.PROD
  }
}
```

### 2. Build-Time Driver Selection

Configure different drivers for different environments:

```typescript
// src/utils/blockchain.ts
import { getDriverConfig } from '../config/driver'
import { MathRandomDriver } from './mathRandomDriver'
import { ChainLinkVRFDriver } from './chainlinkVRFDriver'
import { APIRandomnessDriver } from './apiRandomnessDriver'

const config = getDriverConfig()

export const blockchainContract: BlockchainContract = (() => {
  switch (config.driverType) {
    case 'chainlink':
      return new ChainLinkVRFDriver(config.contractAddress!, config.blockchainRPC!)
    case 'api':
      return new APIRandomnessDriver(config.apiUrl!, config.apiKey!)
    case 'math':
    default:
      return new MathRandomDriver()
  }
})()
```

### 3. Monitoring and Logging

Add proper monitoring:

```typescript
export class MonitoredDriver implements BlockchainContract {
  async requestRandomness(entityHash: string, salt: string): Promise<string> {
    const startTime = Date.now()
    
    try {
      const result = await this.actualRequest(entityHash, salt)
      
      // Log successful request
      this.logMetric('randomness_request_success', {
        duration: Date.now() - startTime,
        entityHash: entityHash.substring(0, 8) // Only log partial hash for privacy
      })
      
      return result
    } catch (error) {
      // Log failed request
      this.logMetric('randomness_request_failure', {
        duration: Date.now() - startTime,
        error: error.message
      })
      throw error
    }
  }
  
  private logMetric(event: string, data: any) {
    // Send to your monitoring service
    console.log(`[${event}]`, data)
  }
}
```

## Conclusion

The RandomProof driver architecture provides a flexible foundation for integrating with any randomness source. Whether you're implementing blockchain-based VRF, integrating with external APIs, or creating custom randomness oracles, following this guide will ensure your driver integrates seamlessly with the RandomProof application.

Key principles to remember:

1. **Interface Compliance**: Always implement the complete `BlockchainContract` interface
2. **Error Handling**: Return `0` from `fetchRandomness` for pending/unavailable states
3. **Anti-Tampering**: Implement mechanisms to prevent entity hash reuse
4. **Testing**: Thoroughly test both success and failure scenarios
5. **Configuration**: Make your driver configurable for different environments
6. **Monitoring**: Add appropriate logging and metrics for production use

For questions or contributions, please refer to the main RandomProof repository documentation or create an issue describing your use case.