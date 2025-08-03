import type { BlockchainContract } from '../types/blockchain'
import { MathRandomDriver } from './mathRandomDriver'

// Export the driver for easy swapping between implementations
export const blockchainContract: BlockchainContract = new MathRandomDriver()

// Keep the mock class for backward compatibility
export class MockBlockchainContract implements BlockchainContract {
  async requestRandomness(entityHash: string, saltBytes32: string): Promise<string> {
    // Mock implementation - returns a dummy transaction ID
    const timestamp = Date.now()
    return `0x${timestamp.toString(16)}${entityHash.slice(0, 8)}${saltBytes32.slice(2, 10)}`
  }
  
  async fetchRandomness(entityHash: string): Promise<number> {
    // Mock implementation - returns a deterministic "random" number based on entity hash
    let hash = 0
    for (let i = 0; i < entityHash.length; i++) {
      const char = entityHash.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
}