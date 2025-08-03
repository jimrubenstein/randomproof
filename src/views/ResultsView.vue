<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRandomProofStore } from '../stores/useRandomProofStore'
import ResultsPage from '../components/ResultsPage.vue'
import WinnerSelection from '../components/WinnerSelection.vue'
import { fetchGistData } from '../utils/github'
import { sha256Hash } from '../utils/hashing'

const props = defineProps<{
  transactionID: string
}>()

const route = useRoute()
const store = useRandomProofStore()

const showManualVerification = ref(false)
const manualInputData = ref('')
const manualSalt = ref('')
const manualPreSort = ref(true)
const verificationResult = ref<'pending' | 'success' | 'failed'>('pending')
const showCopySuccess = ref(false)

// Check if we have gist URL from query params
const gistUrl = computed(() => route.query.gg as string | undefined)

onMounted(async () => {
  // Store transaction ID
  store.transactionId = props.transactionID
  
  // Read winner count from URL if provided
  const winnersParam = route.query.winners as string
  if (winnersParam) {
    const winnerCount = parseInt(winnersParam)
    if (!isNaN(winnerCount) && winnerCount > 0) {
      store.setNumberOfWinners(winnerCount)
    }
  }
  
  // If we have a gist URL, try to fetch and verify data
  if (gistUrl.value) {
    store.setGistUrl(gistUrl.value)
    await verifyWithGist()
  }
})

async function verifyWithGist() {
  try {
    const { files, hasStrictFile, saltContent } = await fetchGistData(store.gistUrl)
    
    // Reconstruct data from gist
    const dataFiles = files.filter(f => f.filename !== '_strict' && f.filename !== '_salt')
    const combinedData = dataFiles.map(f => f.content).join('\n')
    
    // Apply same processing as original
    let processedData = combinedData
    if (!hasStrictFile) {
      const lines = processedData.split('\n').filter(line => line.trim())
      lines.sort()
      processedData = lines.join('\n')
    }
    
    // Verify entity hash (data+salt hashed together)
    const computedHash = await sha256Hash(processedData + (saltContent || ''))
    const entityHashValid = computedHash === store.entityHash
    
    // Verify salt
    const saltValid = saltContent === store.salt || (!saltContent && !store.salt)
    
    store.setVerificationStatus({
      entityHash: entityHashValid ? 'verified' : 'invalid',
      salt: saltValid ? 'verified' : 'invalid'
    })
    
    // Store the verified data
    store.setInputData(combinedData)
  } catch (error) {
    console.error('Failed to verify with gist:', error)
    store.setVerificationStatus({
      entityHash: 'unable_to_verify',
      salt: 'unable_to_verify'
    })
  }
}

async function verifyManually() {
  // Process manual input
  let processedData = manualInputData.value
  if (manualPreSort.value) {
    const lines = processedData.split('\n').filter(line => line.trim())
    lines.sort()
    processedData = lines.join('\n')
  }
  
  // Compute hash (data+salt hashed together)
  const computedHash = await sha256Hash(processedData + manualSalt.value)
  const entityHashValid = computedHash === store.entityHash
  const saltValid = manualSalt.value === store.salt
  
  verificationResult.value = entityHashValid && saltValid ? 'success' : 'failed'
  
  if (entityHashValid && saltValid) {
    store.setInputData(manualInputData.value)
    store.setVerificationStatus({
      entityHash: 'verified',
      salt: 'verified'
    })
    showManualVerification.value = false
  }
}

async function copyShareableUrl() {
  const currentUrl = window.location.href
  try {
    await navigator.clipboard.writeText(currentUrl)
    showCopySuccess.value = true
    setTimeout(() => {
      showCopySuccess.value = false
    }, 3000)
  } catch (error) {
    console.error('Failed to copy URL:', error)
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold mb-6">Randomness Results</h2>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left Column: Results -->
      <div>
        <ResultsPage :transaction-id="transactionID" />
        
        <!-- Manual Verification for Direct Input -->
        <div v-if="!gistUrl" class="mt-6 bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">Data Verification</h3>
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          
          <div v-if="!showManualVerification" class="space-y-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 class="font-semibold text-blue-900 mb-2">🔗 Shareable Results</h4>
              <p class="text-blue-700 text-sm mb-3">
                Anyone can verify these results by entering the original participant data and settings.
              </p>
              <div class="flex items-center justify-between text-blue-600 text-xs mb-3">
                <span>Winner count: <strong>{{ store.numberOfWinners }}</strong></span>
                <code class="bg-blue-100 px-2 py-1 rounded text-xs">{{ transactionID }}</code>
              </div>
              <button
                @click="copyShareableUrl"
                :class="[
                  'w-full px-3 py-2 text-sm rounded-lg transition-all',
                  showCopySuccess 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200'
                ]"
              >
                {{ showCopySuccess ? '✅ URL Copied!' : '📋 Copy Shareable URL' }}
              </button>
            </div>
            
            <p class="text-center text-gray-600 text-sm">
              🔍 Want to verify these results are authentic?
            </p>
            <button
              @click="showManualVerification = true"
              class="btn-primary w-full"
            >
              🛡️ Verify Original Data
            </button>
            <p class="text-center text-xs text-gray-500">
              Independent verification proves results haven't been tampered with
            </p>
          </div>
          
          <div v-else class="space-y-4">
            <div class="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p class="text-blue-800 text-sm">
                <strong>🔍 Verification Process:</strong> Paste the original participant data exactly as you entered it. 
                We'll process it the same way and compare the entity hash to verify authenticity.
              </p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Original Participant Data
                <span class="text-gray-500 font-normal">(paste exactly as you entered it)</span>
              </label>
              <textarea
                v-model="manualInputData"
                class="input-field resize-none"
                rows="8"
                placeholder="Alice&#10;Bob&#10;Charlie&#10;David"
              ></textarea>
              <p class="text-xs text-gray-500 mt-1">
                Enter one participant per line, exactly as in your original input
              </p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Salt Value
              </label>
              <input
                type="text"
                v-model="manualSalt"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter salt value (if any)"
              >
            </div>
            
            <div>
              <label class="flex items-center">
                <input
                  type="checkbox"
                  v-model="manualPreSort"
                  class="mr-2"
                >
                <span class="text-sm">Pre-sort data alphabetically</span>
              </label>
            </div>
            
            <div class="flex gap-2">
              <button
                @click="verifyManually"
                class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Verify
              </button>
              <button
                @click="showManualVerification = false"
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
            
            <!-- Verification Results -->
            <div v-if="verificationResult === 'success'" class="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div class="flex items-center space-x-2 mb-2">
                <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <h4 class="font-semibold text-green-800">✅ Verification Successful!</h4>
              </div>
              <p class="text-sm text-green-700">
                The data matches perfectly! This confirms the results are authentic and haven't been tampered with.
              </p>
            </div>
            
            <div v-else-if="verificationResult === 'failed'" class="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div class="flex items-center space-x-2 mb-2">
                <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
                <h4 class="font-semibold text-red-800">❌ Verification Failed</h4>
              </div>
              <p class="text-sm text-red-700 mb-2">
                The data doesn't match the entity hash. Please check:
              </p>
              <ul class="text-xs text-red-600 list-disc list-inside space-y-1">
                <li>Participant data is exactly as originally entered</li>
                <li>Salt value matches (if used)</li>
                <li>Pre-sort setting matches original selection</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Right Column: Winner Selection -->
      <div>
        <WinnerSelection />
      </div>
    </div>
    
    <!-- Back to Home -->
    <div class="mt-8 text-center">
      <router-link
        to="/"
        class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
      >
        ← New Random Generation
      </router-link>
    </div>
  </div>
</template>