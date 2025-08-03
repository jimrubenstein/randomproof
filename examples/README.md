# RandomProof Driver Examples

This directory contains example implementations and testing patterns for RandomProof drivers. These examples demonstrate how to create custom randomness sources while maintaining compatibility with the RandomProof application.

## 📁 Directory Structure

```
examples/
├── drivers/                    # Example driver implementations
│   ├── chainlinkVRF.example.ts       # Ethereum Chainlink VRF integration
│   ├── api3QRNG.example.ts           # API3 Quantum RNG integration
│   └── deterministicTest.example.ts  # Testing and development driver
├── testing/                    # Testing examples and utilities
│   └── driverTests.example.ts        # Comprehensive test patterns
└── README.md                   # This file
```

## 🚀 Quick Start

### 1. Choose Your Driver Type

- **Production**: Use `chainlinkVRF.example.ts` for Ethereum mainnet
- **API-based**: Use `api3QRNG.example.ts` for quantum randomness
- **Testing**: Use `deterministicTest.example.ts` for development

### 2. Copy and Customize

```bash
# Copy example to your project
cp examples/drivers/chainlinkVRF.example.ts src/utils/drivers/myDriver.ts

# Customize configuration and implementation
# Update src/utils/blockchain.ts to use your driver
```

### 3. Test Your Driver

```bash
# Copy test examples
cp examples/testing/driverTests.example.ts src/tests/drivers/myDriver.test.ts

# Run tests
npm test drivers/myDriver.test.ts
```

## 🛠️ Driver Examples

### Chainlink VRF Driver (`chainlinkVRF.example.ts`)

**Purpose**: Production-ready integration with Chainlink VRF on Ethereum-compatible networks.

**Features**:
- ✅ Verifiable randomness from Chainlink oracles
- ✅ Gas optimization and error handling
- ✅ Transaction confirmation tracking
- ✅ Subscription management

**Prerequisites**:
- Ethereum wallet with ETH for gas
- Chainlink VRF subscription
- Contract deployed with VRF coordinator

**Configuration**:
```typescript
const driver = new ChainlinkVRFDriver({
  providerUrl: 'https://mainnet.infura.io/v3/YOUR_KEY',
  contractAddress: '0x...',
  privateKey: 'your_private_key',
  subscriptionId: 'vrf_subscription_id',
  gasLimit: 350000,
  confirmations: 3
})
```

### API3 QRNG Driver (`api3QRNG.example.ts`)

**Purpose**: Quantum random number generation via API3's HTTP API.

**Features**:
- ✅ True quantum randomness
- ✅ HTTP API integration
- ✅ Rate limiting and retry logic
- ✅ Queue position tracking

**Prerequisites**:
- API3 QRNG API key
- Network access to api3.org

**Configuration**:
```typescript
const driver = new API3QRNGDriver({
  apiKey: 'your_api_key',
  timeout: 60000,
  retryAttempts: 5,
  retryDelay: 2000
})
```

### Deterministic Test Driver (`deterministicTest.example.ts`)

**Purpose**: Reproducible randomness for testing and development.

**Features**:
- ✅ Deterministic results for testing
- ✅ Configurable delays and failure rates
- ✅ Request tracking and statistics
- ✅ Multiple test scenarios

**Configuration**:
```typescript
const driver = new DeterministicTestDriver({
  seed: 'test-scenario-123',
  delay: 1000,
  failureRate: 0.1, // 10% failure rate
  maxRequests: 1000
})
```

## 🧪 Testing Examples

### Basic Compliance Testing

```typescript
import { testDriverCompliance } from './examples/testing/driverTests.example'

const driver = new MyCustomDriver(config)
const isCompliant = await testDriverCompliance(driver)
console.log('Driver compliant:', isCompliant)
```

### Performance Benchmarking

```typescript
import { benchmarkDriver } from './examples/testing/driverTests.example'

const results = await benchmarkDriver(driver, 100)
console.log('Benchmark results:', results)
// Output: { averageRequestTime: 150, averageFetchTime: 50, successRate: 0.98 }
```

### Integration Testing

```typescript
// Test with actual RandomProof components
const wrapper = mount(HomeView)
// ... simulate user interaction
expect(store.hasRandomness).toBe(true)
```

## 📋 Implementation Checklist

When creating a custom driver, ensure:

- [ ] **Interface Compliance**: Implements `BlockchainContract` interface
- [ ] **Input Validation**: Validates entity hash and salt parameters
- [ ] **Error Handling**: Graceful handling of network/API failures
- [ ] **Async Operations**: Proper Promise handling and timeouts
- [ ] **Resource Management**: Cleanup of completed requests
- [ ] **Configuration**: Environment-based configuration
- [ ] **Logging**: Comprehensive logging for debugging
- [ ] **Testing**: Unit and integration tests
- [ ] **Documentation**: Clear setup and usage instructions
- [ ] **Security**: Secure handling of API keys and private keys

## 🔧 Development Workflow

### 1. Create Driver

```typescript
// src/utils/drivers/myDriver.ts
import type { BlockchainContract } from '../../types/blockchain'

export class MyCustomDriver implements BlockchainContract {
  async requestRandomness(entityHash: string, salt: string): Promise<string> {
    // Your implementation
  }

  async fetchRandomness(transactionID: string): Promise<number> {
    // Your implementation
  }
}
```

### 2. Update Configuration

```typescript
// src/utils/blockchain.ts
import { MyCustomDriver } from './drivers/myDriver'

export const blockchainContract: BlockchainContract = new MyCustomDriver({
  // Configuration
})
```

### 3. Add Tests

```typescript
// src/tests/drivers/myDriver.test.ts
import { describe, it, expect } from 'vitest'
import { MyCustomDriver } from '../../utils/drivers/myDriver'

describe('MyCustomDriver', () => {
  it('should implement BlockchainContract', async () => {
    const driver = new MyCustomDriver(config)
    // Test implementation
  })
})
```

### 4. Test Integration

```bash
# Run driver tests
npm test drivers/myDriver.test.ts

# Run full integration tests
npm test

# Start development server
npm run dev
```

## 🌐 Supported Randomness Sources

These examples demonstrate integration with:

- **Blockchain Oracles**: Chainlink VRF, Band Protocol
- **API Services**: API3 QRNG, NIST Beacon
- **Hardware Sources**: HSM, TPM, quantum devices
- **Testing Sources**: Deterministic, mock, simulation

## 🤝 Contributing

To contribute a new driver example:

1. **Create Implementation**: Follow the driver interface
2. **Add Tests**: Include comprehensive test coverage
3. **Write Documentation**: Document setup and configuration
4. **Submit PR**: Include example in this directory

### Example Submission Structure

```
examples/drivers/
├── myService.example.ts        # Driver implementation
├── myService.config.example.ts # Configuration template
└── myService.README.md         # Specific documentation
```

## 📚 Additional Resources

- [Main Developer Guide](../../DEVELOPER_GUIDE.md) - Complete implementation guide
- [BlockchainContract Interface](../../src/types/blockchain.ts) - Type definitions
- [RandomProof Documentation](../../README.md) - Project overview
- [Testing Guide](../testing/) - Testing best practices

## 🔗 Useful Links

- [Chainlink VRF Documentation](https://docs.chain.link/vrf/v2/introduction)
- [API3 QRNG Documentation](https://docs.api3.org/qrng/)
- [Ethereum Development](https://ethereum.org/developers/)
- [Vue 3 Testing](https://test-utils.vuejs.org/)

---

*These examples make RandomProof extensible to any randomness source while maintaining reliability and user trust.*