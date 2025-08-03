<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRandomProofStore } from '../stores/useRandomProofStore'
import { fetchGistData } from '../utils/github'

const store = useRandomProofStore()

const inputMethod = ref<'direct' | 'gist'>('direct')
const localInputData = ref('')
const localGistUrl = ref('')
const localSalt = ref('')
const localNumberOfWinners = ref(1)
const isLoadingGist = ref(false)
const gistError = ref('')

const isFormValid = computed(() => {
  if (inputMethod.value === 'direct') {
    return localInputData.value.trim().length > 0
  } else {
    return localGistUrl.value.trim().length > 0
  }
})

watch(inputMethod, () => {
  gistError.value = ''
})

async function loadGistData() {
  if (!localGistUrl.value.trim()) return
  
  isLoadingGist.value = true
  gistError.value = ''
  
  try {
    const { files, hasStrictFile, saltContent } = await fetchGistData(localGistUrl.value)
    
    // Combine all non-special files into input data
    const dataFiles = files.filter(f => f.filename !== '_strict' && f.filename !== '_salt')
    const combinedData = dataFiles.map(f => f.content).join('\n')
    
    localInputData.value = combinedData
    store.setInputData(combinedData)
    store.setGistUrl(localGistUrl.value)
    
    // Handle special files
    if (hasStrictFile) {
      store.setPreSortEnabled(false)
    }
    
    if (saltContent !== null) {
      localSalt.value = saltContent
      store.setSalt(saltContent)
    }
    
    inputMethod.value = 'direct'
  } catch (error) {
    gistError.value = error instanceof Error ? error.message : 'Failed to load gist'
  } finally {
    isLoadingGist.value = false
  }
}

function updateStoreData() {
  store.setInputData(localInputData.value)
  store.setSalt(localSalt.value)
  store.setNumberOfWinners(localNumberOfWinners.value)
}

const emit = defineEmits<{
  submit: []
}>()

function handleSubmit() {
  updateStoreData()
  emit('submit')
}
</script>

<template>
  <div class="card animate-slide-up">
    <!-- Header Section -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h3 class="text-2xl font-bold text-gray-900 mb-2">Input Data</h3>
        <p class="text-gray-600">Enter participant data for verifiable randomness</p>
      </div>
      <div class="hidden sm:block">
        <div class="w-12 h-12 bg-gradient-to-br from-primary-100 to-accent-100 rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
      </div>
    </div>
    
    <!-- Input Method Toggle -->
    <div class="mb-8">
      <label class="block text-sm font-medium text-gray-700 mb-4">Data Input Method</label>
      <div class="relative bg-gray-100 rounded-2xl p-1 inline-flex">
        <button
          @click="inputMethod = 'direct'"
          :class="[
            'relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300',
            inputMethod === 'direct'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          ]"
        >
          <span class="relative z-10">Direct Input</span>
        </button>
        <button
          @click="inputMethod = 'gist'"
          :class="[
            'relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300',
            inputMethod === 'gist'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          ]"
        >
          <span class="relative z-10">GitHub Gist</span>
        </button>
      </div>
    </div>
    
    <!-- Direct Input Section -->
    <div v-if="inputMethod === 'direct'" class="mb-8 animate-fade-in">
      <div class="space-y-4">
        <div class="relative">
          <label class="block text-sm font-medium text-gray-700 mb-3">
            Participant Data
            <span class="text-gray-500 font-normal">(one entry per line)</span>
          </label>
          <div class="relative">
            <textarea
              v-model="localInputData"
              class="input-field resize-none scrollbar-thin"
              rows="10"
              placeholder="Alice&#10;Bob&#10;Charlie&#10;David&#10;Eve&#10;Frank"
            ></textarea>
            <!-- Character counter -->
            <div class="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md">
              {{ localInputData.split('\n').filter(line => line.trim()).length }} entries
            </div>
          </div>
          <!-- Helper text -->
          <p class="mt-2 text-sm text-gray-500">
            Enter names, emails, or any identifiers - one per line
          </p>
        </div>
      </div>
    </div>
    
    <!-- Gist URL Input Section -->
    <div v-else class="mb-8 animate-fade-in">
      <div class="space-y-4">
        <label class="block text-sm font-medium text-gray-700 mb-3">
          GitHub Gist URL
          <span class="text-gray-500 font-normal">(public gist containing participant data)</span>
        </label>
        <div class="flex gap-3">
          <div class="flex-1 relative">
            <input
              type="url"
              v-model="localGistUrl"
              class="input-field pr-12"
              placeholder="https://gist.github.com/username/gist-id"
            >
            <!-- URL validation icon -->
            <div class="absolute inset-y-0 right-0 flex items-center pr-4">
              <svg v-if="localGistUrl && !localGistUrl.includes('gist.github.com')" class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <svg v-else-if="localGistUrl && localGistUrl.includes('gist.github.com')" class="w-5 h-5 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
          <button
            @click="loadGistData"
            :disabled="isLoadingGist || !localGistUrl.trim()"
            class="btn-primary min-w-[120px] flex items-center justify-center"
          >
            <svg v-if="isLoadingGist" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isLoadingGist ? 'Loading...' : 'Load Gist' }}
          </button>
        </div>
        
        <!-- Error message with better styling -->
        <div v-if="gistError" class="p-4 bg-red-50 border border-red-200 rounded-xl animate-slide-up">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <h4 class="text-sm font-medium text-red-800">Failed to load gist</h4>
              <p class="text-sm text-red-600 mt-1">{{ gistError }}</p>
            </div>
          </div>
        </div>
        
        <!-- Success message when gist is loaded -->
        <div v-if="localInputData && inputMethod === 'gist'" class="p-4 bg-secondary-50 border border-secondary-200 rounded-xl animate-slide-up">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-secondary-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <h4 class="text-sm font-medium text-secondary-800">Gist loaded successfully</h4>
              <p class="text-sm text-secondary-600 mt-1">{{ localInputData.split('\n').filter(line => line.trim()).length }} entries found</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Advanced Settings Section -->
    <div class="space-y-6 mb-8">
      <!-- Salt Input -->
      <div class="space-y-3">
        <label class="block text-sm font-medium text-gray-700">
          Salt Value
          <span class="text-gray-500 font-normal">(optional - for additional entropy)</span>
        </label>
        <div class="relative">
          <input
            type="text"
            v-model="localSalt"
            :disabled="!!(store.gistUrl && localSalt === store.salt)"
            class="input-field"
            :class="{ 'bg-gray-50': store.gistUrl && localSalt === store.salt }"
            placeholder="Enter custom salt for extra randomness"
          >
          <div v-if="store.gistUrl && localSalt === store.salt" class="absolute inset-y-0 right-0 flex items-center pr-4">
            <div class="badge-neutral">From Gist</div>
          </div>
        </div>
        <p v-if="store.gistUrl && localSalt === store.salt" class="text-sm text-gray-500 flex items-center">
          <svg class="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Salt value automatically loaded from _salt file in gist
        </p>
      </div>
      
      <!-- Settings Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <!-- Pre-sort Option -->
        <div class="space-y-3">
          <label class="block text-sm font-medium text-gray-700">Data Processing</label>
          <div class="relative">
            <label class="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl border border-gray-200 transition-colors hover:bg-gray-100 cursor-pointer">
              <div class="flex items-center h-5">
                <input
                  type="checkbox"
                  v-model="store.preSortEnabled"
                  :disabled="!!(store.gistUrl && !store.preSortEnabled)"
                  class="w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500 focus:ring-2 disabled:opacity-50"
                >
              </div>
              <div class="flex-1 min-w-0">
                <span class="text-sm font-medium text-gray-900">Pre-sort alphabetically</span>
                <p class="text-xs text-gray-600 mt-1">Sort entries before randomization for consistency</p>
              </div>
            </label>
            <p v-if="store.gistUrl && !store.preSortEnabled" class="mt-2 text-sm text-gray-500 flex items-center">
              <svg class="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              Disabled by _strict file in gist
            </p>
          </div>
        </div>
        
        <!-- Number of Winners -->
        <div class="space-y-3">
          <label class="block text-sm font-medium text-gray-700">Winners to Select</label>
          <div class="relative">
            <input
              type="number"
              v-model.number="localNumberOfWinners"
              min="1"
              class="input-field text-center text-lg font-semibold w-full sm:w-32"
            >
            <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Submit Section -->
    <div class="border-t border-gray-200 pt-8">
      <div class="flex flex-col sm:flex-row gap-4">
        <button
          @click="handleSubmit"
          :disabled="!isFormValid"
          class="btn-primary flex-1 sm:flex-none sm:min-w-[200px] flex items-center justify-center group"
        >
          <svg class="w-5 h-5 mr-2 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Request Randomness
        </button>
        
        <!-- Form validation info -->
        <div class="flex items-center text-sm text-gray-500 sm:ml-4">
          <div v-if="isFormValid" class="flex items-center text-secondary-600">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Ready to submit
          </div>
          <div v-else class="flex items-center text-gray-400">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {{ inputMethod === 'direct' ? 'Enter participant data' : 'Load gist data' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>