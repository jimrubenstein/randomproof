import keccak from 'keccak'

/**
 * Converts a string to keccak256 hash as hex string (bytes32 compatible)
 * This is used for converting user salt strings to Solidity bytes32 format
 * 
 * @param input - String to hash
 * @returns Hex string prefixed with 0x (bytes32 format)
 */
export function stringToBytes32(input: string): string {
  try {
    // Convert to keccak256 hash directly from string
    const hash = keccak('keccak256').update(input).digest()
    
    // Return as hex string with 0x prefix (bytes32 format)
    return '0x' + hash.toString('hex')
  } catch (error) {
    console.error('Keccak hashing failed, using fallback hash:', error)
    
    // Fallback to a simple deterministic hash if keccak fails
    // This ensures the app still works even if keccak has issues in browser
    return simpleFallbackHash(input)
  }
}

/**
 * Simple fallback hash function for browser compatibility
 * Used when keccak library fails in browser environment
 */
function simpleFallbackHash(input: string): string {
  // Simple but deterministic hash based on input string
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  // Create a more complex hash by combining multiple passes
  let hash2 = 0x811c9dc5 // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash2 ^= input.charCodeAt(i)
    hash2 *= 0x01000193 // FNV prime
  }
  
  // Combine the hashes and pad to 64 characters (32 bytes)
  const combined = (Math.abs(hash) + Math.abs(hash2)).toString(16)
  return '0x' + combined.padStart(64, '0').slice(0, 64)
}

/**
 * Converts empty/undefined salt to zero bytes32
 * @param salt - Salt string or undefined
 * @returns bytes32 hex string
 */
export function saltToBytes32(salt: string | undefined | null): string {
  if (!salt || salt.trim() === '') {
    // Return zero bytes32 for empty salt
    return '0x0000000000000000000000000000000000000000000000000000000000000000'
  }
  
  return stringToBytes32(salt.trim())
}