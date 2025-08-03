/**
 * Deterministic Test Driver
 * 
 * This driver provides reproducible randomness for testing scenarios.
 * Perfect for unit tests, integration tests, and development environments
 * where you need predictable outcomes.
 */

import type { BlockchainContract } from '../../types/blockchain'
import { createHash } from 'crypto'

interface DeterministicConfig {
  seed?: string
  delay?: number
  failureRate?: number
  maxRequests?: number
}

export class DeterministicTestDriver implements BlockchainContract {
  private seed: string
  private delay: number
  private failureRate: number
  private maxRequests: number
  private requestCount: number = 0
  private completedRequests = new Set<string>()

  constructor(config: DeterministicConfig = {}) {
    this.seed = config.seed || 'randomproof-test-seed'
    this.delay = config.delay || 1000 // 1 second default delay
    this.failureRate = config.failureRate || 0 // 0% failure rate by default
    this.maxRequests = config.maxRequests || 1000
  }

  async requestRandomness(entityHash: string, salt: string): Promise<string> {
    // Validate inputs
    if (!entityHash || entityHash.length !== 64) {
      throw new Error('Invalid entity hash')
    }

    // Check request limits
    if (this.requestCount >= this.maxRequests) {
      throw new Error('Maximum requests exceeded')
    }

    // Simulate random failures for testing error handling
    if (Math.random() < this.failureRate) {
      throw new Error('Simulated network failure')
    }

    this.requestCount++

    // Generate deterministic transaction ID
    const transactionId = this.generateTransactionId(entityHash, salt)

    console.log('Deterministic request:', {
      transactionId,
      entityHash,
      salt,
      requestCount: this.requestCount
    })

    // Simulate network delay
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return transactionId
  }

  async fetchRandomness(entityHash: string): Promise<number> {
    // Find the transaction ID for this entity hash
    const transactionID = this.generateTransactionId(entityHash, '') // Extract from entity hash
    
    // Simulate processing delay
    const requestTime = this.extractRequestTime(transactionID)
    const elapsed = Date.now() - requestTime
    
    if (elapsed < this.delay) {
      console.log(`Request ${entityHash} still pending (${elapsed}ms/${this.delay}ms)`)
      return 0
    }

    // Mark as completed and generate result
    this.completedRequests.add(entityHash)
    
    const randomNumber = this.generateRandomNumber(entityHash)
    
    console.log('Deterministic result:', {
      entityHash,
      transactionId: transactionID,
      randomNumber,
      elapsed
    })

    return randomNumber
  }

  private generateTransactionId(entityHash: string, salt: string): string {
    const timestamp = Date.now()
    const input = `${this.seed}-${entityHash}-${salt}-${timestamp}`
    const hash = createHash('sha256').update(input).digest('hex')
    return `0x${hash.substring(0, 16)}`
  }

  private extractRequestTime(transactionID: string): number {
    // Extract timestamp from transaction ID
    // This is a simplified approach - in real implementation,
    // you might store request times separately
    const hash = createHash('sha256').update(transactionID + this.seed).digest('hex')
    const timeOffset = parseInt(hash.substring(0, 8), 16) % 10000
    return Date.now() - timeOffset
  }

  private generateRandomNumber(transactionID: string): number {
    // Generate deterministic random number from transaction ID
    const input = `${this.seed}-${transactionID}-result`
    const hash = createHash('sha256').update(input).digest('hex')
    
    // Convert first 8 bytes to a large integer
    const hexValue = hash.substring(0, 16)
    const randomValue = parseInt(hexValue, 16)
    
    // Ensure it's a positive integer within safe range
    return Math.abs(randomValue) % Number.MAX_SAFE_INTEGER
  }

  // Test utilities

  /**
   * Get reproducible results for testing
   */
  async getReproducibleResult(entityHash: string, salt: string): Promise<number> {
    const transactionId = await this.requestRandomness(entityHash, salt)
    
    // Skip delay for immediate result
    const originalDelay = this.delay
    this.delay = 0
    
    const result = await this.fetchRandomness(transactionId)
    
    // Restore original delay
    this.delay = originalDelay
    
    return result
  }

  /**
   * Reset driver state for fresh tests
   */
  reset(): void {
    this.requestCount = 0
    this.completedRequests.clear()
  }

  /**
   * Get driver statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      completedCount: this.completedRequests.size,
      pendingCount: this.requestCount - this.completedRequests.size,
      seed: this.seed,
      delay: this.delay,
      failureRate: this.failureRate
    }
  }

  /**
   * Set custom seed for different test scenarios
   */
  setSeed(seed: string): void {
    this.seed = seed
    this.reset()
  }

  /**
   * Enable/disable failure simulation
   */
  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate))
  }

  /**
   * Set processing delay for timing tests
   */
  setDelay(delayMs: number): void {
    this.delay = Math.max(0, delayMs)
  }
}

// Test scenario examples:

/**
 * Lottery Test Scenario
 */
export async function testLotteryScenario() {
  const driver = new DeterministicTestDriver({
    seed: 'lottery-test-2024',
    delay: 500
  })

  const participants = ['Alice', 'Bob', 'Charlie', 'David', 'Eve']
  const entityHash = createHash('sha256')
    .update(participants.join('\n'))
    .digest('hex')

  console.log('Testing lottery scenario...')
  
  const transactionId = await driver.requestRandomness(entityHash, 'test-salt')
  console.log('Request submitted:', transactionId)
  
  // Poll for result
  let randomNumber = 0
  while (randomNumber === 0) {
    await new Promise(resolve => setTimeout(resolve, 100))
    randomNumber = await driver.fetchRandomness(transactionId)
  }
  
  console.log('Random number:', randomNumber)
  console.log('Winner index:', randomNumber % participants.length)
  console.log('Winner:', participants[randomNumber % participants.length])
  
  return {
    transactionId,
    randomNumber,
    winner: participants[randomNumber % participants.length]
  }
}

/**
 * Reproducibility Test
 */
export async function testReproducibility() {
  const driver1 = new DeterministicTestDriver({ seed: 'test-123' })
  const driver2 = new DeterministicTestDriver({ seed: 'test-123' })

  const entityHash = 'a'.repeat(64)
  const salt = 'consistent-salt'

  const result1 = await driver1.getReproducibleResult(entityHash, salt)
  const result2 = await driver2.getReproducibleResult(entityHash, salt)

  console.log('Reproducibility test:')
  console.log('Result 1:', result1)
  console.log('Result 2:', result2)
  console.log('Match:', result1 === result2)

  return result1 === result2
}

/**
 * Error Handling Test
 */
export async function testErrorHandling() {
  const driver = new DeterministicTestDriver({
    seed: 'error-test',
    failureRate: 0.5 // 50% failure rate
  })

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < 10; i++) {
    try {
      await driver.requestRandomness('a'.repeat(64), `test-${i}`)
      successCount++
    } catch (error) {
      errorCount++
      console.log(`Request ${i} failed:`, error.message)
    }
  }

  console.log('Error handling test:')
  console.log('Successes:', successCount)
  console.log('Errors:', errorCount)
  console.log('Stats:', driver.getStats())

  return { successCount, errorCount }
}

// Usage in tests:
// const driver = new DeterministicTestDriver({
//   seed: 'my-test-scenario',
//   delay: 100,
//   failureRate: 0.1
// })