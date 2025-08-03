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
 * - This driver: Uses Math.random() for local testing
 * 
 * Application behavior remains unchanged - this can be swapped with a real
 * blockchain implementation without modifying any other code.
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
    const randomPart = Math.random().toString(36).substring(2, 9)
    const transactionId = `0x${timestamp.toString(16)}${randomPart}`
    
    // Store the request using entityHash as key (entityHash includes data+salt)
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
    const request = this.pendingRequests.get(entityHash)
    
    if (!request) {
      // Return 0 to indicate no randomness available yet
      return 0
    }
    
    // Check if enough time has passed (simulate blockchain confirmation time)
    const elapsedTime = Date.now() - request.timestamp
    if (elapsedTime < 2000) { // 2 seconds minimum wait
      return 0 // Still pending
    }
    
    // Generate a random number using Math.random()
    // This is a temporary replacement for blockchain randomness
    const randomValue = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    
    // Clean up the request after returning the value
    this.pendingRequests.delete(entityHash)
    
    return randomValue
  }
  
  /**
   * Utility method to clear all pending requests (useful for testing)
   */
  clearPendingRequests(): void {
    this.pendingRequests.clear()
  }
}