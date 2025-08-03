import MersenneTwister from 'mersenne-twister'

export function shuffleArray(array: string[], seed: number): string[] {
  const mt = new MersenneTwister(seed)
  const shuffled = [...array]
  
  // Fisher-Yates shuffle algorithm with Mersenne Twister
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(mt.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  return shuffled
}