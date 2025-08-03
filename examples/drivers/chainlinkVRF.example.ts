/**
 * Chainlink VRF Driver - Production Example
 * 
 * This driver integrates with Chainlink VRF v2 for verifiable randomness
 * on Ethereum-compatible networks.
 * 
 * Prerequisites:
 * - Ethereum wallet with ETH for gas
 * - Chainlink VRF subscription
 * - Contract deployed with VRF coordinator
 */

import type { BlockchainContract } from '../../types/blockchain'
import { ethers } from 'ethers'

interface ChainlinkConfig {
  providerUrl: string
  contractAddress: string
  privateKey: string
  subscriptionId: string
  gasLimit?: number
  confirmations?: number
}

// Contract ABI for VRF requests
const VRF_CONTRACT_ABI = [
  "function requestRandomWords(string entityHash, string salt) external returns (uint256)",
  "function getRandomResult(uint256 requestId) external view returns (uint256, bool)",
  "event RandomWordsRequested(uint256 indexed requestId, string entityHash, string salt)",
  "event RandomWordsFulfilled(uint256 indexed requestId, uint256 randomWord)"
]

export class ChainlinkVRFDriver implements BlockchainContract {
  private provider: ethers.Provider
  private contract: ethers.Contract
  private signer: ethers.Signer
  private config: Required<ChainlinkConfig>
  private entityHashToTxId = new Map<string, string>()

  constructor(config: ChainlinkConfig) {
    this.config = {
      gasLimit: 300000,
      confirmations: 3,
      ...config
    }

    this.provider = new ethers.JsonRpcProvider(this.config.providerUrl)
    this.signer = new ethers.Wallet(this.config.privateKey, this.provider)
    this.contract = new ethers.Contract(
      this.config.contractAddress,
      VRF_CONTRACT_ABI,
      this.signer
    )
  }

  async requestRandomness(entityHash: string, salt: string): Promise<string> {
    try {
      console.log('Requesting Chainlink VRF randomness...', { entityHash, salt })

      // Validate inputs
      this.validateInputs(entityHash, salt)

      // Check wallet balance
      await this.checkBalance()

      // Request randomness from VRF contract
      const tx = await this.contract.requestRandomWords(
        entityHash,
        salt,
        {
          gasLimit: this.config.gasLimit
        }
      )

      console.log('Transaction submitted:', tx.hash)

      // Wait for confirmation
      const receipt = await tx.wait(this.config.confirmations)
      
      if (!receipt) {
        throw new Error('Transaction failed to confirm')
      }

      console.log('VRF request confirmed:', {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      })

      // Store mapping for later retrieval
      this.entityHashToTxId.set(entityHash, tx.hash)

      return tx.hash
    } catch (error) {
      console.error('Chainlink VRF request failed:', error)
      
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient ETH balance for gas fees')
      }
      
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new Error('Contract call would fail - check VRF subscription')
      }

      throw new Error(`VRF request failed: ${error.message}`)
    }
  }

  async fetchRandomness(entityHash: string): Promise<number> {
    try {
      console.log('Fetching Chainlink VRF result...', { entityHash })

      // Find the transaction ID for this entity hash
      const transactionID = this.findTransactionForEntityHash(entityHash)
      
      if (!transactionID) {
        console.log('No transaction found for entity hash')
        return 0
      }

      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(transactionID)
      
      if (!receipt) {
        console.log('Transaction not found or still pending')
        return 0
      }

      // Look for VRF fulfillment event
      const fulfillmentEvent = this.findVRFFulfillmentEvent(receipt)
      
      if (!fulfillmentEvent) {
        console.log('VRF not yet fulfilled by Chainlink oracle')
        return 0
      }

      // Extract random number from event
      const randomNumber = this.extractRandomNumber(fulfillmentEvent)
      
      console.log('VRF fulfilled:', {
        entityHash,
        transactionHash: transactionID,
        randomNumber: randomNumber.toString(),
        blockNumber: receipt.blockNumber
      })

      return Number(randomNumber)
      
    } catch (error) {
      console.error('Failed to fetch VRF result:', error)
      return 0
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

  private async checkBalance(): Promise<void> {
    const balance = await this.provider.getBalance(this.signer.address)
    const minBalance = ethers.parseEther('0.01') // 0.01 ETH minimum
    
    if (balance < minBalance) {
      throw new Error(`Insufficient balance: ${ethers.formatEther(balance)} ETH`)
    }
  }

  private findVRFFulfillmentEvent(receipt: ethers.TransactionReceipt): ethers.Log | null {
    // Look for RandomWordsFulfilled event
    const eventTopic = this.contract.interface.getEventTopic('RandomWordsFulfilled')
    
    return receipt.logs.find(log => 
      log.topics[0] === eventTopic && 
      log.address.toLowerCase() === this.config.contractAddress.toLowerCase()
    ) || null
  }

  private findTransactionForEntityHash(entityHash: string): string | null {
    return this.entityHashToTxId.get(entityHash) || null
  }

  private extractRandomNumber(event: ethers.Log): bigint {
    try {
      const decoded = this.contract.interface.parseLog({
        topics: event.topics,
        data: event.data
      })
      
      if (!decoded || !decoded.args.randomWord) {
        throw new Error('Invalid event data')
      }
      
      return BigInt(decoded.args.randomWord)
    } catch (error) {
      throw new Error(`Failed to decode VRF event: ${error.message}`)
    }
  }

  // Utility method to get VRF subscription info
  async getSubscriptionInfo(): Promise<any> {
    try {
      // This would call a view function on your VRF contract
      // to check subscription balance and status
      const info = await this.contract.getSubscriptionDetails(this.config.subscriptionId)
      return info
    } catch (error) {
      console.error('Failed to get subscription info:', error)
      return null
    }
  }
}

// Usage example:
// const driver = new ChainlinkVRFDriver({
//   providerUrl: process.env.ETHEREUM_RPC_URL!,
//   contractAddress: process.env.VRF_CONTRACT_ADDRESS!,
//   privateKey: process.env.PRIVATE_KEY!,
//   subscriptionId: process.env.VRF_SUBSCRIPTION_ID!,
//   gasLimit: 350000,
//   confirmations: 3
// })