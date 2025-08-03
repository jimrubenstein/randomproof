<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRandomProofStore } from '../stores/useRandomProofStore'
import { blockchainContract } from '../utils/blockchain'
import type { VerificationStatus } from '../stores/useRandomProofStore'

const props = defineProps<{
  transactionId: string
}>()

const store = useRandomProofStore()
const isPolling = ref(true)
const pollInterval = ref<number | null>(null)

const polygonScanUrl = (txId: string) => `https://polygonscan.com/tx/${txId}`

const verificationIcon = computed(() => {
  return (status: 'verified' | 'invalid' | 'unable_to_verify') => {
    switch (status) {
      case 'verified':
        return { icon: '✓', class: 'text-green-600' }
      case 'invalid':
        return { icon: '✗', class: 'text-red-600' }
      case 'unable_to_verify':
        return { icon: '?', class: 'text-gray-400' }
    }
  }
})

async function pollForRandomness() {
  try {
    const randomValue = await blockchainContract.fetchRandomness(store.entityHash)
    
    if (randomValue && randomValue > 0) {
      // We have randomness!
      store.setRandomnessData(randomValue, `response_${props.transactionId}`)
      store.setResponseBlockData(Date.now() + 30000, Date.now() + 30000) // Mock response data
      
      // Stop polling
      isPolling.value = false
      if (pollInterval.value) {
        clearInterval(pollInterval.value)
      }
      
      // Trigger verification if we have gist data
      if (store.gistUrl) {
        await verifyData()
      }
    }
  } catch (error) {
    console.error('Error polling for randomness:', error)
  }
}

async function verifyData() {
  // Mock verification for now
  const verificationStatus: VerificationStatus = {
    entityHash: 'verified',
    salt: store.salt ? 'verified' : 'unable_to_verify'
  }
  
  store.setVerificationStatus(verificationStatus)
}

onMounted(() => {
  // Start polling immediately
  pollForRandomness()
  
  // Set up polling interval (every 3 seconds)
  pollInterval.value = window.setInterval(pollForRandomness, 3000)
})

// Clean up on unmount
onUnmounted(() => {
  if (pollInterval.value) {
    clearInterval(pollInterval.value)
  }
})

// Import onUnmounted
import { onUnmounted } from 'vue'
</script>

<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-semibold mb-4">Transaction Details</h3>
    
    <!-- Loading State -->
    <div v-if="isPolling" class="text-center py-8">
      <div class="inline-flex items-center">
        <svg class="animate-spin h-5 w-5 mr-3 text-blue-600" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-gray-600">Fetching Randomness...</span>
      </div>
    </div>
    
    <!-- Results -->
    <div v-else class="space-y-4">
      <!-- Request Transaction -->
      <div>
        <h4 class="font-medium text-gray-700 mb-2">Request Transaction</h4>
        <div class="space-y-1 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-gray-500">Transaction ID:</span>
            <a :href="polygonScanUrl(store.transactionId)" target="_blank" class="text-blue-600 hover:underline font-mono">
              {{ store.transactionId.slice(0, 10) }}...{{ store.transactionId.slice(-8) }}
            </a>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">Block Height:</span>
            <span class="font-mono">{{ store.requestBlockHeight }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">Timestamp:</span>
            <span>{{ new Date(store.requestTimestamp).toLocaleString() }}</span>
          </div>
        </div>
      </div>
      
      <!-- Entity Hash -->
      <div>
        <h4 class="font-medium text-gray-700 mb-2">Entity Hash</h4>
        <div class="flex items-center gap-2">
          <code class="flex-1 p-2 bg-gray-100 rounded text-xs break-all">{{ store.entityHash }}</code>
          <span :class="verificationIcon(store.verificationStatus.entityHash).class" class="text-xl">
            {{ verificationIcon(store.verificationStatus.entityHash).icon }}
          </span>
        </div>
      </div>
      
      <!-- Salt -->
      <div>
        <h4 class="font-medium text-gray-700 mb-2">Salt Value</h4>
        <div class="flex items-center gap-2">
          <code class="flex-1 p-2 bg-gray-100 rounded text-xs">{{ store.salt || '(no salt)' }}</code>
          <span :class="verificationIcon(store.verificationStatus.salt).class" class="text-xl">
            {{ verificationIcon(store.verificationStatus.salt).icon }}
          </span>
        </div>
      </div>
      
      <!-- Response Transaction -->
      <div>
        <h4 class="font-medium text-gray-700 mb-2">Response Transaction</h4>
        <div class="space-y-1 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-gray-500">Transaction ID:</span>
            <a :href="polygonScanUrl(store.responseTransactionId)" target="_blank" class="text-blue-600 hover:underline font-mono">
              {{ store.responseTransactionId.slice(0, 10) }}...{{ store.responseTransactionId.slice(-8) }}
            </a>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">Block Height:</span>
            <span class="font-mono">{{ store.responseBlockHeight }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500">Timestamp:</span>
            <span>{{ new Date(store.responseTimestamp).toLocaleString() }}</span>
          </div>
        </div>
      </div>
      
      <!-- Random Value -->
      <div>
        <h4 class="font-medium text-gray-700 mb-2">Random Value</h4>
        <code class="block p-3 bg-blue-50 rounded text-lg font-mono text-blue-800">
          {{ store.randomValue }}
        </code>
      </div>
    </div>
  </div>
</template>