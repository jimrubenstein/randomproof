import { describe, it, expect } from 'vitest'
import { stringToBytes32, saltToBytes32 } from '../../utils/keccak'

describe('Keccak256 Salt Utilities', () => {
  it('should convert string to proper bytes32 format', () => {
    const result = stringToBytes32('test-salt')
    
    // Should start with 0x and be 66 characters total (64 hex chars + 0x prefix)
    expect(result).toMatch(/^0x[a-fA-F0-9]{64}$/)
    expect(result.length).toBe(66)
  })
  
  it('should return same hash for same input', () => {
    const salt = 'consistent-salt'
    const result1 = stringToBytes32(salt)
    const result2 = stringToBytes32(salt)
    
    expect(result1).toBe(result2)
  })
  
  it('should return different hashes for different inputs', () => {
    const result1 = stringToBytes32('salt1')
    const result2 = stringToBytes32('salt2')
    
    expect(result1).not.toBe(result2)
  })
  
  it('should handle empty salt with saltToBytes32', () => {
    const result = saltToBytes32('')
    
    // Should return zero bytes32
    expect(result).toBe('0x0000000000000000000000000000000000000000000000000000000000000000')
  })
  
  it('should handle null/undefined salt with saltToBytes32', () => {
    const result1 = saltToBytes32(null)
    const result2 = saltToBytes32(undefined)
    
    // Both should return zero bytes32
    const zeroByte32 = '0x0000000000000000000000000000000000000000000000000000000000000000'
    expect(result1).toBe(zeroByte32)
    expect(result2).toBe(zeroByte32)
  })
  
  it('should hash non-empty salt with saltToBytes32', () => {
    const result = saltToBytes32('my-salt')
    
    // Should be proper bytes32 format and not zero
    expect(result).toMatch(/^0x[a-fA-F0-9]{64}$/)
    expect(result).not.toBe('0x0000000000000000000000000000000000000000000000000000000000000000')
  })
  
  it('should trim whitespace from salt', () => {
    const result1 = saltToBytes32('  test-salt  ')
    const result2 = saltToBytes32('test-salt')
    
    expect(result1).toBe(result2)
  })
})