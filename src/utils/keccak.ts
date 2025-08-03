import keccak from 'keccak'

/**
 * Converts a string to keccak256 hash as hex string (bytes32 compatible)
 * This is used for converting user salt strings to Solidity bytes32 format
 * 
 * @param input - String to hash
 * @returns Hex string prefixed with 0x (bytes32 format)
 */
export function stringToBytes32(input: string): string {
  // Convert to keccak256 hash directly from string
  const hash = keccak('keccak256').update(input).digest()
  
  // Return as hex string with 0x prefix (bytes32 format)
  return '0x' + hash.toString('hex')
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