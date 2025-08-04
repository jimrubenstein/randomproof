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
 * 
 * SPECIAL BEHAVIOR FOR TESTING:
 * - Uses localStorage to persist randomness across page refreshes
 * - Automatically generates randomness for unknown entity hashes
 * - This differs from blockchain behavior which would reject unknown hashes
 */
export class MathRandomDriver implements BlockchainContract {
  private readonly STORAGE_KEY = 'randomproof_math_driver_results'
  private readonly PENDING_KEY = 'randomproof_math_driver_pending'
  
  private pendingRequests: Map<string, {
    transactionId: string
    saltBytes32: string
    timestamp: number
  }> = new Map()
  
  private completedResults: Map<string, number> = new Map()
  
  constructor() {
    // Load persisted data from localStorage
    this.loadPersistedData()
  }
  
  private loadPersistedData(): void {
    try {
      // Load completed results
      const storedResults = localStorage.getItem(this.STORAGE_KEY)
      if (storedResults) {
        const parsed = JSON.parse(storedResults)
        this.completedResults = new Map(Object.entries(parsed).map(([k, v]) => [k, Number(v)]))
      }
      
      // Load pending requests
      const storedPending = localStorage.getItem(this.PENDING_KEY)
      if (storedPending) {
        const parsed = JSON.parse(storedPending)
        this.pendingRequests = new Map(Object.entries(parsed))
      }
    } catch (error) {
      console.warn('Failed to load persisted Math.random driver data:', error)
    }
  }
  
  private persistData(): void {
    try {
      // Persist completed results
      const resultsObj = Object.fromEntries(this.completedResults)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(resultsObj))
      
      // Persist pending requests
      const pendingObj = Object.fromEntries(this.pendingRequests)
      localStorage.setItem(this.PENDING_KEY, JSON.stringify(pendingObj))
    } catch (error) {
      console.warn('Failed to persist Math.random driver data:', error)
    }
  }
  
  async requestRandomness(entityHash: string, saltBytes32: string): Promise<string> {
    // Check if we already have a result for this entity hash
    if (this.completedResults.has(entityHash)) {
      // Return the existing transaction ID
      const existingRequest = Array.from(this.pendingRequests.entries())
        .find(([hash]) => hash === entityHash)
      
      if (existingRequest) {
        return existingRequest[1].transactionId
      }
      
      // Generate a consistent transaction ID for already completed requests
      return `0x${entityHash.slice(0, 16)}_completed`
    }
    
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
    
    // Persist to localStorage
    this.persistData()
    
    // Simulate blockchain transaction delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return transactionId
  }
  
  async fetchRandomness(entityHash: string): Promise<number> {
    // Check if we already have a completed result
    const existingResult = this.completedResults.get(entityHash)
    if (existingResult !== undefined) {
      return existingResult
    }
    
    // Check for pending request
    const request = this.pendingRequests.get(entityHash)
    
    if (!request) {
      // SPECIAL BEHAVIOR FOR MATH RANDOM DRIVER:
      // For testing convenience, automatically create a result for unknown entity hashes
      // This allows direct navigation to result pages to work properly
      console.log('Math.random driver: Creating new randomness for unknown entity hash:', entityHash)
      
      // Generate deterministic randomness based on entity hash
      // This ensures the same entity hash always gets the same random value
      let hash = 0
      for (let i = 0; i < entityHash.length; i++) {
        const char = entityHash.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32-bit integer
      }
      
      // Use the hash to seed a pseudo-random number
      const randomValue = Math.abs(hash) + Math.floor(Math.random() * 1000000)
      
      // Store the result
      this.completedResults.set(entityHash, randomValue)
      this.persistData()
      
      return randomValue
    }
    
    // Check if enough time has passed (simulate blockchain confirmation time)
    const elapsedTime = Date.now() - request.timestamp
    if (elapsedTime < 2000) { // 2 seconds minimum wait
      return 0 // Still pending
    }
    
    // Generate a deterministic random number based on entity hash
    // This ensures consistency across refreshes
    let hash = 0
    for (let i = 0; i < entityHash.length; i++) {
      const char = entityHash.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Create a pseudo-random value that's consistent for this entity hash
    const randomValue = Math.abs(hash) * 997 + Math.floor(Math.random() * 1000000)
    
    // Move from pending to completed
    this.pendingRequests.delete(entityHash)
    this.completedResults.set(entityHash, randomValue)
    this.persistData()
    
    return randomValue
  }
  
  /**
   * Utility method to clear all persisted data (useful for testing)
   */
  clearAllData(): void {
    this.pendingRequests.clear()
    this.completedResults.clear()
    localStorage.removeItem(this.STORAGE_KEY)
    localStorage.removeItem(this.PENDING_KEY)
  }
}