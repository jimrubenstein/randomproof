import type { BlockchainContract } from '../types/blockchain'

/**
 * Math.random() driver for testing without blockchain
 * 
 * IMPORTANT: This is a pure drop-in replacement for the blockchain contract.
 * It implements the exact same interface (BlockchainContract) and maintains
 * identical behavior except for the randomness source.
 * 
 * The only difference is:
 * - Blockchain: Uses ChainLink VRF for verifiable randomness
 * - This driver: Uses entity hash as deterministic seed for testing
 * 
 * Application behavior remains unchanged - this can be swapped with a real
 * blockchain implementation without modifying any other code.
 * 
 * SIMPLIFIED APPROACH:
 * - Uses entity hash (hex to decimal) as the random seed
 * - No localStorage needed - deterministic based on entity hash
 * - Perfect for testing/illustration (not production randomness)
 */
export class MathRandomDriver implements BlockchainContract {
  private pendingRequests: Map<string, {
    transactionId: string
    saltBytes32: string
    timestamp: number
  }> = new Map()
  
  async requestRandomness(entityHash: string, saltBytes32: string): Promise<string> {
    // Generate a unique transaction ID
    const timestamp = Date.now()
    const hashPart = entityHash.slice(0, 8)
    const transactionId = `0x${timestamp.toString(16)}${hashPart}`
    
    // Store the request using entityHash as key
    this.pendingRequests.set(entityHash, {
      transactionId,
      saltBytes32,
      timestamp
    })
    
    // Simulate blockchain transaction delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return transactionId
  }
  
  async fetchRandomness(entityHash: string): Promise<number> {
    // For testing convenience, always return a deterministic value based on entity hash
    // This allows direct navigation to result pages and consistent results on refresh
    
    // Convert hex entity hash to a number (use first 16 chars to avoid overflow)
    const hexPart = entityHash.slice(0, 16)
    const seed = parseInt(hexPart, 16)
    
    // If the entity hash was "requested" check for minimum wait time
    const request = this.pendingRequests.get(entityHash)
    if (request) {
      const elapsedTime = Date.now() - request.timestamp
      if (elapsedTime < 2000) { // 2 seconds minimum wait
        return 0 // Still pending
      }
    }
    
    // Return the seed as the "random" value
    // This is deterministic: same entity hash always returns same value
    // Perfect for testing/illustration purposes
    return seed || 12345 // Fallback in case parsing fails
  }
}