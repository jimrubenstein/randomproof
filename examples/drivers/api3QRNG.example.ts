/**
 * API3 QRNG Driver
 * 
 * This driver integrates with API3's Quantum Random Number Generator
 * for high-quality quantum randomness via HTTP API.
 * 
 * Prerequisites:
 * - API3 QRNG API key
 * - Network access to api3.org
 */

import type { BlockchainContract } from '../../types/blockchain'

interface API3Config {
  apiKey: string
  baseUrl?: string
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}

interface QRNGRequest {
  requestId: string
  entityHash: string
  salt: string
  timestamp: number
  status: 'pending' | 'completed' | 'failed'
}

interface QRNGResponse {
  requestId: string
  status: 'pending' | 'completed' | 'failed'
  randomNumber?: string
  error?: string
  queuePosition?: number
  estimatedWaitTime?: number
}

export class API3QRNGDriver implements BlockchainContract {
  private apiKey: string
  private baseUrl: string
  private timeout: number
  private retryAttempts: number
  private retryDelay: number
  private pendingRequests = new Map<string, QRNGRequest>()
  private entityHashToRequestId = new Map<string, string>()

  constructor(config: API3Config) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://qrng-api.api3.org'
    this.timeout = config.timeout || 30000 // 30 seconds
    this.retryAttempts = config.retryAttempts || 3
    this.retryDelay = config.retryDelay || 1000 // 1 second
  }

  async requestRandomness(entityHash: string, salt: string): Promise<string> {
    this.validateInputs(entityHash, salt)

    let lastError: Error | null = null

    // Retry logic for network resilience
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        console.log(`API3 QRNG request attempt ${attempt + 1}/${this.retryAttempts}`)
        
        const requestId = await this.makeQRNGRequest(entityHash, salt)
        
        console.log('API3 QRNG request successful:', {
          requestId,
          entityHash,
          salt,
          attempt: attempt + 1
        })

        return requestId
      } catch (error) {
        lastError = error as Error
        console.warn(`API3 QRNG attempt ${attempt + 1} failed:`, error.message)
        
        if (attempt < this.retryAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)))
        }
      }
    }

    throw new Error(`API3 QRNG request failed after ${this.retryAttempts} attempts: ${lastError?.message}`)
  }

  async fetchRandomness(entityHash: string): Promise<number> {
    try {
      // Find request ID for this entity hash
      const requestId = this.entityHashToRequestId.get(entityHash)
      
      if (!requestId) {
        console.log('No request found for entity hash')
        return 0
      }

      const response = await this.makeAPICall<QRNGResponse>(`/v1/status/${requestId}`, 'GET')

      switch (response.status) {
        case 'completed':
          if (!response.randomNumber) {
            throw new Error('Completed request missing random number')
          }
          
          // Clean up completed request
          this.pendingRequests.delete(requestId)
          this.entityHashToRequestId.delete(entityHash)
          
          const randomNumber = this.parseRandomNumber(response.randomNumber)
          
          console.log('API3 QRNG completed:', {
            entityHash,
            requestId,
            randomNumber
          })
          
          return randomNumber

        case 'pending':
          console.log('API3 QRNG pending:', {
            entityHash,
            requestId,
            queuePosition: response.queuePosition,
            estimatedWait: response.estimatedWaitTime
          })
          return 0

        case 'failed':
          console.error('API3 QRNG request failed:', response.error)
          this.pendingRequests.delete(requestId)
          this.entityHashToRequestId.delete(entityHash)
          return 0

        default:
          console.warn('Unknown API3 QRNG status:', response.status)
          return 0
      }
    } catch (error) {
      console.error('Failed to fetch API3 QRNG result:', error)
      return 0
    }
  }

  private async makeQRNGRequest(entityHash: string, salt: string): Promise<string> {
    const requestData = {
      entityHash,
      salt,
      numWords: 1,
      metadata: {
        source: 'RandomProof',
        timestamp: new Date().toISOString()
      }
    }

    const response = await this.makeAPICall<{ requestId: string }>('/v1/request', 'POST', requestData)

    // Store request for tracking
    this.pendingRequests.set(response.requestId, {
      requestId: response.requestId,
      entityHash,
      salt,
      timestamp: Date.now(),
      status: 'pending'
    })

    // Store mapping for entity hash lookup
    this.entityHashToRequestId.set(entityHash, response.requestId)

    return response.requestId
  }

  private async makeAPICall<T>(
    endpoint: string, 
    method: 'GET' | 'POST', 
    data?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'RandomProof/1.0'
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        
        // Handle specific error cases
        switch (response.status) {
          case 401:
            throw new Error('Invalid API key')
          case 429:
            throw new Error('Rate limit exceeded')
          case 503:
            throw new Error('API3 QRNG service temporarily unavailable')
          default:
            throw new Error(`API error (${response.status}): ${errorText}`)
        }
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`)
      }
      
      throw error
    }
  }

  private validateInputs(entityHash: string, salt: string): void {
    if (!entityHash || entityHash.length !== 64 || !/^[a-f0-9]+$/i.test(entityHash)) {
      throw new Error('Invalid entity hash: must be 64-character hex string')
    }
    
    if (salt && salt.length > 1000) {
      throw new Error('Salt too long: maximum 1000 characters')
    }
  }

  private parseRandomNumber(randomHex: string): number {
    try {
      // Remove '0x' prefix if present
      const hex = randomHex.replace(/^0x/, '')
      
      // Convert to number, ensuring it's within safe integer range
      const value = parseInt(hex, 16)
      
      if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error('Invalid random number range')
      }
      
      return value
    } catch (error) {
      throw new Error(`Failed to parse random number: ${randomHex}`)
    }
  }

  // Utility methods

  /**
   * Get API quota information
   */
  async getQuotaInfo(): Promise<any> {
    try {
      return await this.makeAPICall('/v1/quota', 'GET')
    } catch (error) {
      console.error('Failed to get quota info:', error)
      return null
    }
  }

  /**
   * Get pending requests count
   */
  getPendingRequestsCount(): number {
    return this.pendingRequests.size
  }

  /**
   * Get all pending requests
   */
  getPendingRequests(): QRNGRequest[] {
    return Array.from(this.pendingRequests.values())
  }

  /**
   * Cancel a pending request (if supported by API)
   */
  async cancelRequest(requestId: string): Promise<boolean> {
    try {
      await this.makeAPICall(`/v1/cancel/${requestId}`, 'POST')
      this.pendingRequests.delete(requestId)
      return true
    } catch (error) {
      console.error(`Failed to cancel request ${requestId}:`, error)
      return false
    }
  }

  /**
   * Health check for API3 service
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeAPICall('/v1/health', 'GET')
      return true
    } catch (error) {
      console.error('API3 QRNG health check failed:', error)
      return false
    }
  }

  /**
   * Get service status and queue information
   */
  async getServiceStatus(): Promise<any> {
    try {
      return await this.makeAPICall('/v1/status', 'GET')
    } catch (error) {
      console.error('Failed to get service status:', error)
      return null
    }
  }
}

// Usage example:
// const driver = new API3QRNGDriver({
//   apiKey: process.env.API3_QRNG_API_KEY!,
//   timeout: 60000, // 1 minute timeout
//   retryAttempts: 5,
//   retryDelay: 2000
// })

// Example integration with error handling:
export class ResilientAPI3Driver extends API3QRNGDriver {
  private maxRetries: number = 10
  private baseDelay: number = 1000

  constructor(config: API3Config & { maxRetries?: number; baseDelay?: number }) {
    super(config)
    this.maxRetries = config.maxRetries || 10
    this.baseDelay = config.baseDelay || 1000
  }

  async fetchRandomnessWithRetry(transactionID: string): Promise<number> {
    let retries = 0
    
    while (retries < this.maxRetries) {
      const result = await this.fetchRandomness(transactionID)
      
      if (result > 0) {
        return result // Success
      }
      
      // Exponential backoff for retries
      const delay = this.baseDelay * Math.pow(2, retries)
      await new Promise(resolve => setTimeout(resolve, delay))
      
      retries++
    }
    
    throw new Error(`Failed to get randomness after ${this.maxRetries} retries`)
  }
}