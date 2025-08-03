import { vi } from 'vitest'

// Mock router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  }),
  useRoute: () => ({
    params: {},
    query: {},
    path: '/',
    name: 'home'
  })
}))

// Mock GitHub API
vi.mock('../utils/github', () => ({
  fetchGistData: vi.fn().mockResolvedValue({
    files: [
      { filename: 'participants.txt', content: 'Alice\nBob\nCharlie' }
    ],
    hasStrictFile: false,
    saltContent: null
  })
}))

// Mock blockchain
vi.mock('../utils/blockchain', () => ({
  blockchainContract: {
    requestRandomness: vi.fn().mockResolvedValue('mock-transaction-id'),
    fetchRandomness: vi.fn().mockResolvedValue(0.5)
  }
}))

// Mock hashing
vi.mock('../utils/hashing', () => ({
  sha256Hash: vi.fn().mockResolvedValue('mock-hash-value')
}))