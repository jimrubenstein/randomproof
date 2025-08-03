import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface GistFile {
  filename: string
  content: string
}

export interface VerificationStatus {
  entityHash: 'verified' | 'invalid' | 'unable_to_verify'
  salt: 'verified' | 'invalid' | 'unable_to_verify'
}

export const useRandomProofStore = defineStore('randomProof', () => {
  // State
  const inputData = ref<string>('')
  const gistUrl = ref<string>('')
  const salt = ref<string>('')
  const preSortEnabled = ref<boolean>(true)
  const numberOfWinners = ref<number>(1)
  
  const transactionId = ref<string>('')
  const entityHash = ref<string>('')
  const requestBlockHeight = ref<number>(0)
  const requestTimestamp = ref<number>(0)
  
  const randomValue = ref<number | null>(null)
  const responseTransactionId = ref<string>('')
  const responseBlockHeight = ref<number>(0)
  const responseTimestamp = ref<number>(0)
  
  const verificationStatus = ref<VerificationStatus>({
    entityHash: 'unable_to_verify',
    salt: 'unable_to_verify'
  })
  
  const shuffledData = ref<string[]>([])
  const winners = ref<string[]>([])
  
  // Computed
  const hasRandomness = computed(() => randomValue.value !== null)
  const dataLines = computed(() => {
    if (!inputData.value) return []
    return inputData.value.split('\n').filter(line => line.trim())
  })
  
  // Actions
  function setInputData(data: string) {
    inputData.value = data
  }
  
  function setGistUrl(url: string) {
    gistUrl.value = url
  }
  
  function setSalt(value: string) {
    salt.value = value
  }
  
  function setPreSortEnabled(enabled: boolean) {
    preSortEnabled.value = enabled
  }
  
  function setNumberOfWinners(num: number) {
    numberOfWinners.value = num
  }
  
  function setTransactionData(txId: string, hash: string) {
    transactionId.value = txId
    entityHash.value = hash
  }
  
  function setRequestBlockData(height: number, timestamp: number) {
    requestBlockHeight.value = height
    requestTimestamp.value = timestamp
  }
  
  function setRandomnessData(value: number, txId: string) {
    randomValue.value = value
    responseTransactionId.value = txId
  }
  
  function setResponseBlockData(height: number, timestamp: number) {
    responseBlockHeight.value = height
    responseTimestamp.value = timestamp
  }
  
  function setVerificationStatus(status: VerificationStatus) {
    verificationStatus.value = status
  }
  
  function setShuffledData(data: string[]) {
    shuffledData.value = data
  }
  
  function setWinners(winnerList: string[]) {
    winners.value = winnerList
  }
  
  function reset() {
    inputData.value = ''
    gistUrl.value = ''
    salt.value = ''
    preSortEnabled.value = true
    numberOfWinners.value = 1
    transactionId.value = ''
    entityHash.value = ''
    requestBlockHeight.value = 0
    requestTimestamp.value = 0
    randomValue.value = null
    responseTransactionId.value = ''
    responseBlockHeight.value = 0
    responseTimestamp.value = 0
    verificationStatus.value = {
      entityHash: 'unable_to_verify',
      salt: 'unable_to_verify'
    }
    shuffledData.value = []
    winners.value = []
  }
  
  return {
    // State
    inputData,
    gistUrl,
    salt,
    preSortEnabled,
    numberOfWinners,
    transactionId,
    entityHash,
    requestBlockHeight,
    requestTimestamp,
    randomValue,
    responseTransactionId,
    responseBlockHeight,
    responseTimestamp,
    verificationStatus,
    shuffledData,
    winners,
    
    // Computed
    hasRandomness,
    dataLines,
    
    // Actions
    setInputData,
    setGistUrl,
    setSalt,
    setPreSortEnabled,
    setNumberOfWinners,
    setTransactionData,
    setRequestBlockData,
    setRandomnessData,
    setResponseBlockData,
    setVerificationStatus,
    setShuffledData,
    setWinners,
    reset
  }
})