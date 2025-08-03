import keccak from 'keccak'

export async function sha256Hash(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

export function keccak256Hash(input: string): string {
  // Hash it with keccak256 directly from string
  const hash = keccak('keccak256').update(input).digest()
  // Return as hex string with 0x prefix
  return '0x' + hash.toString('hex')
}