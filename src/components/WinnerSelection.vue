<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRandomProofStore } from '../stores/useRandomProofStore'
import { shuffleArray } from '../utils/shuffle'

const store = useRandomProofStore()
const activeTab = ref<'input' | 'shuffled'>('input')
const localNumberOfWinners = ref(store.numberOfWinners)
const winnersSelected = ref(false)
const winnersRevealed = ref(false)
const isRevealing = ref(false)
const showConfetti = ref(false)

// Compute shuffled data when random value is available
const shuffledEntries = computed(() => {
  if (!store.randomValue || !store.inputData) return []
  
  const lines = store.inputData.split('\n').filter(line => line.trim())
  return shuffleArray(lines, store.randomValue)
})

// Update store when shuffled data changes and auto-pick winners
watch(shuffledEntries, (newShuffled) => {
  store.setShuffledData(newShuffled)
  
  // Auto-pick winners when shuffled data is available
  if (newShuffled.length > 0 && store.numberOfWinners > 0) {
    autoPickWinners()
  }
})

// Update number of winners from store
watch(() => store.numberOfWinners, (newNumber) => {
  localNumberOfWinners.value = newNumber
  if (shuffledEntries.value.length > 0) {
    autoPickWinners()
  }
})

function autoPickWinners() {
  const winners = shuffledEntries.value.slice(0, store.numberOfWinners)
  store.setWinners(winners)
  winnersSelected.value = true
  winnersRevealed.value = false // Keep hidden initially
}

async function revealWinners() {
  isRevealing.value = true
  
  // Add dramatic pause
  await new Promise(resolve => setTimeout(resolve, 800))
  
  // Start the reveal
  winnersRevealed.value = true
  
  // Show confetti after reveal
  await nextTick()
  showConfetti.value = true
  
  // Automatically switch to shuffled tab if not already there
  if (activeTab.value !== 'shuffled') {
    activeTab.value = 'shuffled'
  }
  
  isRevealing.value = false
  
  // Hide confetti after celebration
  setTimeout(() => {
    showConfetti.value = false
  }, 3000)
}

// Generate confetti particles
const confettiParticles = computed(() => {
  if (!showConfetti.value) return []
  
  return Array.from({ length: 20 }, (_, i) => ({
    id: i,
    emoji: ['🎉', '🎊', '✨', '🌟', '💫', '🎈'][Math.floor(Math.random() * 6)],
    left: Math.random() * 100,
    delay: Math.random() * 1000
  }))
})

const originalEntries = computed(() => {
  if (!store.inputData) return []
  return store.inputData.split('\n').filter(line => line.trim())
})
</script>

<template>
  <!-- Suspense Backdrop -->
  <div v-if="isRevealing" class="suspense-backdrop"></div>
  
  <!-- Confetti Particles -->
  <div v-if="showConfetti" class="fixed inset-0 pointer-events-none z-50">
    <div
      v-for="particle in confettiParticles"
      :key="particle.id"
      class="confetti-particle"
      :style="{
        left: particle.left + '%',
        animationDelay: particle.delay + 'ms'
      }"
    >
      {{ particle.emoji }}
    </div>
  </div>

  <div class="card animate-slide-up relative">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h3 class="text-2xl font-bold text-gray-900 mb-2">Data & Winners</h3>
        <p v-if="winnersSelected && !winnersRevealed" class="text-gray-600 animate-pulse">
          🎭 Winners have been selected... ready for the big reveal?
        </p>
        <p v-else-if="winnersRevealed" class="text-secondary-600 font-medium">
          🎉 Congratulations to our winners!
        </p>
        <p v-else class="text-gray-600">
          View your input data and shuffled results
        </p>
      </div>
      <div v-if="winnersSelected && winnersRevealed" class="hidden sm:block">
        <div class="w-12 h-12 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl flex items-center justify-center animate-float">
          <span class="text-2xl">🏆</span>
        </div>
      </div>
    </div>
    
    <!-- Tab Navigation -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="-mb-px flex space-x-8">
        <button
          @click="activeTab = 'input'"
          :class="[
            'py-3 px-2 border-b-2 font-medium text-sm transition-all duration-200',
            activeTab === 'input'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          <span class="flex items-center space-x-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span>Input ({{ originalEntries.length }})</span>
          </span>
        </button>
        <button
          @click="activeTab = 'shuffled'"
          :class="[
            'py-3 px-2 border-b-2 font-medium text-sm transition-all duration-200',
            activeTab === 'shuffled'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
          :disabled="!store.hasRandomness"
        >
          <span class="flex items-center space-x-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v16.5a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1h2a1 1 0 011 1v1m8-2h2m-10 4h8m-8 4h8m-8 4h8"/>
            </svg>
            <span>Shuffled ({{ shuffledEntries.length }})</span>
            <span v-if="winnersSelected && !winnersRevealed" class="animate-pulse">✨</span>
          </span>
        </button>
      </nav>
    </div>
    
    <!-- Tab Content -->
    <div class="mb-6">
      <!-- Input Tab -->
      <div v-if="activeTab === 'input'" class="space-y-2">
        <div class="max-h-64 overflow-y-auto border rounded-md p-3 bg-gray-50">
          <div v-if="originalEntries.length === 0" class="text-gray-400 text-sm">
            No input data available
          </div>
          <div v-else class="space-y-1">
            <div
              v-for="(entry, index) in originalEntries"
              :key="`original-${index}`"
              class="text-sm font-mono"
            >
              {{ index + 1 }}. {{ entry }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Shuffled Tab -->
      <div v-else-if="activeTab === 'shuffled'" class="space-y-4">
        <div v-if="!store.hasRandomness" class="text-center py-12">
          <div class="inline-flex items-center">
            <svg class="animate-spin h-5 w-5 mr-3 text-primary-600" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-gray-600">Waiting for blockchain randomness...</span>
          </div>
        </div>
        <div v-else class="max-h-80 overflow-y-auto scrollbar-thin">
          <div class="space-y-2">
            <div
              v-for="(entry, index) in shuffledEntries"
              :key="`shuffled-${index}`"
              :class="[
                'relative p-3 rounded-xl transition-all duration-500',
                winnersSelected && index < store.numberOfWinners
                  ? (winnersRevealed 
                      ? 'winner-spotlight bg-gradient-to-r from-yellow-50 via-yellow-100 to-yellow-50 border-2 border-yellow-300' 
                      : 'winner-hidden bg-gradient-to-r from-purple-50 via-pink-50 to-yellow-50 border-2 border-purple-200'
                    )
                  : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
              ]"
              :style="winnersRevealed && winnersSelected && index < store.numberOfWinners 
                ? { animationDelay: (index * 200) + 'ms' } 
                : {}"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div :class="[
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold',
                    winnersSelected && index < store.numberOfWinners && winnersRevealed
                      ? 'bg-yellow-400 text-yellow-900'
                      : 'bg-gray-200 text-gray-600'
                  ]">
                    {{ index + 1 }}
                  </div>
                  <span :class="[
                    'font-mono text-sm',
                    winnersSelected && index < store.numberOfWinners && winnersRevealed
                      ? 'font-bold text-gray-900 text-lg'
                      : 'text-gray-700'
                  ]">
                    {{ entry }}
                  </span>
                </div>
                
                <!-- Winner Badge -->
                <div v-if="winnersSelected && index < store.numberOfWinners && winnersRevealed" 
                     class="flex items-center space-x-2 winner-revealed">
                  <span class="text-2xl">🏆</span>
                  <div class="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                    WINNER
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Winner Selection Status -->
    <div v-if="store.hasRandomness" class="space-y-4">
      <!-- Auto-selection Status -->
      <div v-if="winnersSelected" class="text-center space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p class="text-blue-800 font-medium mb-2">
            🎲 Winners Automatically Selected! 
            <span class="text-sm font-normal">({{ store.numberOfWinners }} winner{{ store.numberOfWinners > 1 ? 's' : '' }})</span>
          </p>
          <p class="text-blue-600 text-sm">
            Switch to the <strong>Shuffled</strong> tab to see the randomized order.
          </p>
        </div>
        
        <!-- THE DRAMATIC REVEAL SECTION -->
        <div v-if="!winnersRevealed" class="space-y-6 py-8">
          <div class="text-center space-y-4">
            <div class="flex justify-center">
              <div class="w-16 h-16 bg-gradient-to-br from-purple-100 to-yellow-100 rounded-full flex items-center justify-center animate-pulse">
                <span class="text-3xl">🎭</span>
              </div>
            </div>
            <div>
              <h4 class="text-2xl font-bold text-gray-900 mb-2">The Moment of Truth</h4>
              <p class="text-lg text-gray-600 mb-2">
                {{ store.numberOfWinners }} winner{{ store.numberOfWinners > 1 ? 's have' : ' has' }} been selected from {{ shuffledEntries.length }} entries...
              </p>
              <p class="text-sm text-gray-500 animate-pulse">
                ✨ The anticipation builds... who will be revealed? ✨
              </p>
            </div>
          </div>
          
          <!-- THE SPECTACULAR REVEAL BUTTON -->
          <div class="flex justify-center">
            <button
              @click="revealWinners"
              :disabled="isRevealing"
              class="btn-reveal disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
            >
              <span v-if="isRevealing" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="animate-pulse">The moment arrives...</span>
              </span>
              <span v-else class="text-xl font-bold tracking-wide">
                🎊 REVEAL THE WINNERS 🎊
              </span>
            </button>
          </div>
          
          <div class="text-center">
            <p class="text-xs text-gray-400">Click when you're ready for the big moment!</p>
          </div>
        </div>
        
        <!-- CELEBRATION! Winners Revealed -->
        <div v-else class="space-y-6 py-6">
          <div class="text-center space-y-4">
            <div class="flex justify-center">
              <div class="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center animate-float">
                <span class="text-3xl">🎉</span>
              </div>
            </div>
            <div>
              <h4 class="text-3xl font-bold text-secondary-600 mb-2">Winners Revealed!</h4>
              <p class="text-gray-600 text-lg">
                The moment we've all been waiting for! 🎊
              </p>
            </div>
          </div>
          
          <!-- Champions Showcase -->
          <div class="bg-gradient-to-r from-yellow-50 via-yellow-100 to-yellow-50 border-2 border-yellow-300 rounded-2xl p-8">
            <h5 class="text-2xl font-bold text-yellow-900 mb-6 text-center">🏆 Our Champions 🏆</h5>
            <div class="space-y-4">
              <div
                v-for="(winner, index) in store.winners"
                :key="`champion-${index}`"
                class="winner-revealed flex items-center justify-between py-4 px-6 bg-white rounded-xl border-2 border-yellow-200 shadow-sm"
                :style="{ animationDelay: (index * 300 + 800) + 'ms' }"
              >
                <div class="flex items-center space-x-4">
                  <div class="w-12 h-12 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center font-bold text-lg">
                    {{ index + 1 }}
                  </div>
                  <span class="text-xl font-bold text-gray-900">{{ winner }}</span>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-2xl">🎊</span>
                  <div class="bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-sm font-bold">
                    WINNER
                  </div>
                </div>
              </div>
            </div>
            
            <div class="text-center mt-6 space-y-2">
              <p class="text-yellow-800 font-medium">
                Results are verifiable on the blockchain! 🔗
              </p>
              <p class="text-yellow-700 text-sm">
                Check the shuffled tab to see the complete randomized order
              </p>
            </div>
          </div>
          
          <!-- Action Options -->
          <div class="flex justify-center space-x-4">
            <button
              @click="winnersRevealed = false"
              class="btn-secondary text-sm"
            >
              🎭 Hide & Reveal Again
            </button>
            <button
              @click="activeTab = 'shuffled'"
              class="btn-primary text-sm"
            >
              📊 View Full Results
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- No Randomness Message -->
    <div v-else class="text-center py-4 text-gray-500 text-sm">
      Waiting for blockchain randomness to enable winner selection...
    </div>
  </div>
</template>