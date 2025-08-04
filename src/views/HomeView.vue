<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useRandomProofStore } from '../stores/useRandomProofStore'
import InputForm from '../components/InputForm.vue'
import { sha256Hash } from '../utils/hashing'
import { blockchainContract } from '../utils/blockchain'
import { saltToBytes32 } from '../utils/keccak'

const router = useRouter()
const store = useRandomProofStore()

async function handleSubmit() {
  // Pre-sort data if enabled
  let processedData = store.inputData
  if (store.preSortEnabled) {
    const lines = processedData.split('\n').filter(line => line.trim())
    lines.sort()
    processedData = lines.join('\n')
  }
  
  // Generate entity hash including salt (data+salt hashed together)
  const entityHash = await sha256Hash(processedData + store.salt)
  
  // Convert user salt to bytes32 for Solidity compatibility
  const saltBytes32 = saltToBytes32(store.salt)
  
  // Request randomness from blockchain
  try {
    const transactionId = await blockchainContract.requestRandomness(entityHash, saltBytes32)
    
    // Store transaction data
    store.setTransactionData(transactionId, entityHash)
    store.setRequestBlockData(Date.now(), Date.now()) // Mock block data for now
    
    // Navigate to results page
    const query: Record<string, string> = {}
    if (store.gistUrl) {
      query.gg = store.gistUrl
    }
    // Add winner count to URL for shareable results
    query.winners = store.numberOfWinners.toString()
    
    // Add salt to URL for verification
    if (store.salt) {
      query.salt = store.salt
    }
    
    // Add entity hash for direct verification
    query.entityHash = entityHash
    
    // Add pre-sort flag
    query.preSort = store.preSortEnabled ? '1' : '0'
    
    router.push({
      name: 'results',
      params: { transactionID: transactionId },
      query
    })
  } catch (error) {
    console.error('Failed to request randomness:', error)
    alert('Failed to submit transaction. Please try again.')
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold mb-6">Generate Verifiable Random Numbers</h2>
    <InputForm @submit="handleSubmit" />
    
    <!-- Documentation Section -->
    <div class="mt-12 space-y-8">
      <!-- What is RandomProof -->
      <section class="bg-blue-50 rounded-lg p-6">
        <h3 class="text-xl font-semibold mb-3 text-blue-900">🎲 What is RandomProof?</h3>
        <p class="text-gray-700 leading-relaxed">
          RandomProof is a serverless web application that generates <strong>verifiable random numbers</strong> using blockchain technology. 
          Perfect for raffles, lotteries, and any situation requiring provably fair randomness. Unlike traditional random number generators, 
          RandomProof's results can be independently verified by anyone, ensuring complete transparency and fairness.
        </p>
      </section>
      
      <!-- How It Works -->
      <section class="bg-gray-50 rounded-lg p-6">
        <h3 class="text-xl font-semibold mb-3">🔐 How Does Verifiable Randomness Work?</h3>
        <ol class="space-y-3 text-gray-700">
          <li class="flex">
            <span class="font-semibold mr-2">1.</span>
            <span><strong>Data Hashing:</strong> Your input data is processed (optionally sorted) and hashed using SHA-256, creating a unique "entity hash".</span>
          </li>
          <li class="flex">
            <span class="font-semibold mr-2">2.</span>
            <span><strong>Blockchain Request:</strong> The hash and optional salt are sent to the blockchain, which returns a transaction ID.</span>
          </li>
          <li class="flex">
            <span class="font-semibold mr-2">3.</span>
            <span><strong>Random Generation:</strong> ChainLink VRF (Verifiable Random Function) generates a random number on-chain.</span>
          </li>
          <li class="flex">
            <span class="font-semibold mr-2">4.</span>
            <span><strong>Verification:</strong> Anyone can verify the results by checking that the same input produces the same hash.</span>
          </li>
        </ol>
      </section>
      
      <!-- Step by Step Guide -->
      <section class="bg-green-50 rounded-lg p-6">
        <h3 class="text-xl font-semibold mb-3 text-green-900">📋 Step-by-Step Usage Guide</h3>
        <div class="space-y-4 text-gray-700">
          <div>
            <h4 class="font-semibold mb-2">Option A: Direct Input</h4>
            <ol class="list-decimal list-inside space-y-1 ml-4">
              <li>Enter participant names or items (one per line) in the text area</li>
              <li>Optionally add a salt value for extra randomness</li>
              <li>Choose whether to pre-sort data alphabetically</li>
              <li>Set the number of winners to select</li>
              <li>Click "Request Random" to generate verifiable randomness</li>
            </ol>
          </div>
          
          <div>
            <h4 class="font-semibold mb-2">Option B: GitHub Gist</h4>
            <ol class="list-decimal list-inside space-y-1 ml-4">
              <li>Create a GitHub gist with your participant data</li>
              <li>Paste the gist URL and click "Load"</li>
              <li>The system will fetch data and apply any special file rules</li>
              <li>Review settings and click "Request Random"</li>
            </ol>
          </div>
        </div>
      </section>
      
      <!-- GitHub Gist Format -->
      <section class="bg-purple-50 rounded-lg p-6">
        <h3 class="text-xl font-semibold mb-3 text-purple-900">📁 GitHub Gist Format Requirements</h3>
        <div class="space-y-3 text-gray-700">
          <p>When using a GitHub gist, you can include special files to control behavior:</p>
          
          <div class="bg-white rounded p-4 space-y-3 font-mono text-sm">
            <div>
              <code class="text-purple-600">_salt</code>
              <p class="text-gray-600 mt-1">Contains the salt value. If present, the salt field becomes read-only.</p>
            </div>
            <div>
              <code class="text-purple-600">_strict</code>
              <p class="text-gray-600 mt-1">If this file exists, data will NOT be pre-sorted (preserves original order).</p>
            </div>
            <div>
              <code class="text-gray-600">participants.txt</code> (or any other filename)
              <p class="text-gray-600 mt-1">Contains your actual data, one entry per line.</p>
            </div>
          </div>
          
          <p class="text-sm italic">All files except _salt and _strict are combined as input data.</p>
        </div>
      </section>
      
      <!-- Salt Values Explanation -->
      <section class="bg-indigo-50 rounded-lg p-6">
        <h3 class="text-xl font-semibold mb-3 text-indigo-900">🧂 Understanding Salt Values</h3>
        <div class="space-y-4 text-gray-700">
          <div>
            <h4 class="font-semibold mb-2 text-indigo-800">What is a Salt Value?</h4>
            <p>A salt is an additional piece of data that gets mixed with your participant list before generating the entity hash. This creates a unique "fingerprint" for each random request, even with identical participant data.</p>
          </div>
          
          <div>
            <h4 class="font-semibold mb-2 text-indigo-800">Why Salt is CRITICAL for Fair Randomness</h4>
            <div class="bg-red-50 border border-red-200 rounded p-3 mb-3">
              <p class="font-semibold text-red-800 mb-2">🚨 The Anti-Tampering Rule:</p>
              <p class="text-red-700 text-sm">Our on-chain implementation using ChainLink VRF <strong>never allows the same entity hash to be used twice</strong>. Once an entity hash has been used for randomness, it's permanently blocked from future requests by our smart contract.</p>
            </div>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li><strong>Prevents "Cooking" Results:</strong> Without salt, bad actors could repeatedly submit the same participant list until they get a favorable outcome</li>
              <li><strong>One Shot Only:</strong> Each entity hash gets exactly one chance at randomness - no do-overs, no retries</li>
              <li><strong>Forces Commitment:</strong> You must decide on your final participant list AND salt before requesting randomness</li>
              <li><strong>Ensures Fairness:</strong> Nobody can game the system by trying multiple times with the same data</li>
            </ul>
          </div>
          
          <div>
            <h4 class="font-semibold mb-2 text-indigo-800">How Salt Prevents Manipulation</h4>
            <div class="bg-yellow-50 border border-yellow-200 rounded p-3 mb-2">
              <p class="text-yellow-800 text-sm font-medium">⚠️ Without Salt: Same participant list = Same entity hash = BLOCKED after first use</p>
            </div>
            <p class="mb-2">With salt, the anti-tampering process works like this:</p>
            <ol class="list-decimal list-inside space-y-1 ml-4 text-sm">
              <li>Your data + salt is processed and hashed into a unique entity hash</li>
              <li>Our smart contract checks if this entity hash has been used before</li>
              <li>If unused, the contract requests randomness from ChainLink VRF using this hash</li>
              <li>Our contract marks this entity hash as "used forever" to prevent reuse</li>
              <li>Any future attempt to use the same entity hash will be rejected by our contract</li>
            </ol>
            <p class="mt-2 text-sm font-medium text-indigo-800">Result: Salt ensures you can run multiple contests with the same participants fairly</p>
          </div>
          
          <div>
            <h4 class="font-semibold mb-2 text-indigo-800">Examples: How Salt Enables Multiple Fair Draws</h4>
            <div class="bg-white rounded p-4 space-y-3">
              <p class="text-sm text-gray-600 mb-3">Same participant list, different salt = Different entity hash = Multiple valid requests to our contract</p>
              
              <div class="grid grid-cols-1 gap-3 text-sm">
                <div class="bg-green-50 p-3 rounded border border-green-200">
                  <div class="font-mono text-green-800">
                    <strong>Participants:</strong> Alice, Bob, Charlie<br>
                    <strong>Salt:</strong> "Weekly-Draw-2024-01"<br>
                    <span class="text-xs text-green-600">→ Entity Hash: abc123... ✓ Accepted by our contract</span>
                  </div>
                </div>
                
                <div class="bg-green-50 p-3 rounded border border-green-200">
                  <div class="font-mono text-green-800">
                    <strong>Participants:</strong> Alice, Bob, Charlie<br>
                    <strong>Salt:</strong> "Weekly-Draw-2024-02"<br>
                    <span class="text-xs text-green-600">→ Entity Hash: def456... ✓ Accepted by our contract</span>
                  </div>
                </div>
              </div>
              
              <div class="bg-red-50 p-3 rounded border border-red-200 mt-3">
                <div class="font-mono text-red-800">
                  <strong>Participants:</strong> Alice, Bob, Charlie<br>
                  <strong>Salt:</strong> "Weekly-Draw-2024-01" <em>(reused)</em><br>
                  <span class="text-xs text-red-600">→ Entity Hash: abc123... ✗ BLOCKED by our contract</span>
                </div>
              </div>
              
              <p class="text-xs text-gray-600 mt-3">
                <strong>Key Point:</strong> Each unique salt allows one fair draw. Without salt, you could only ever do ONE draw with the same participants. 
                Salt enables legitimate multiple contests while preventing result manipulation.
              </p>
            </div>
          </div>
          
          <div class="bg-indigo-100 border border-indigo-200 rounded p-3">
            <p class="text-sm font-medium text-indigo-800">
              🔒 <strong>Our Trust Mechanism:</strong> Salt isn't just about security - it's about enabling multiple fair draws with the same participants. 
              Without salt, our contract's one-hash-one-result rule would prevent legitimate repeat contests. Salt solves this while maintaining anti-tampering protection.
            </p>
          </div>
        </div>
      </section>
      
      <!-- Understanding Results -->
      <section class="bg-orange-50 rounded-lg p-6">
        <h3 class="text-xl font-semibold mb-3 text-orange-900">🎯 Understanding the Shuffle Results</h3>
        <div class="space-y-4 text-gray-700">
          <p>After randomness is received from the blockchain:</p>
          
          <div class="bg-orange-100 border border-orange-200 rounded p-3 mb-4">
            <h4 class="font-semibold text-orange-800 mb-2">🔍 Critical for Verification</h4>
            <p class="text-orange-700 text-sm">The Input Tab shows the <strong>exact pre-shuffle state</strong> used for entity hash generation. This is what gets verified against your original data to prove authenticity.</p>
          </div>
          
          <ul class="list-disc list-inside space-y-3 ml-4">
            <li>
              <strong>Input Tab:</strong> Shows your data in its <strong>pre-shuffle state</strong> - exactly as it existed before randomization
              <ul class="list-none ml-6 mt-1 space-y-1 text-sm text-gray-600">
                <li>• If pre-sorting enabled: Shows alphabetically sorted data</li>
                <li>• If pre-sorting disabled: Shows original order from your input</li>
                <li>• This is the definitive state used to generate the entity hash</li>
                <li>• Critical for verification - must match your original data exactly</li>
              </ul>
            </li>
            <li><strong>Shuffled Tab:</strong> Shows the same data after Mersenne Twister shuffling using blockchain randomness as the seed</li>
            <li><strong>Winner Selection:</strong> The top N entries from the shuffled list become your final winners</li>
          </ul>
          
          <div class="bg-green-50 border border-green-200 rounded p-3 mt-4">
            <h4 class="font-semibold text-green-800 mb-2">✅ Why Pre-Sorting is Recommended</h4>
            <ul class="text-green-700 text-sm space-y-1">
              <li>• Creates a <strong>definitive, reproducible initial state</strong></li>
              <li>• Makes verification easier and more reliable</li>
              <li>• Eliminates ambiguity about data order</li>
              <li>• Ensures anyone can recreate the exact same entity hash</li>
              <li>• Key part of the verifiable randomness process</li>
            </ul>
          </div>
          
          <ul class="list-disc list-inside space-y-2 ml-4 mt-4">
            <li><strong>Verification Icons:</strong>
              <ul class="list-none ml-6 mt-1 space-y-1">
                <li>✓ Green = Input data verified authentic (matches original)</li>
                <li>✗ Red = Input data does NOT match original source</li>
                <li>? Gray = Unable to verify (no gist provided for comparison)</li>
              </ul>
            </li>
          </ul>
          
          <p class="mt-4 font-semibold text-orange-800">🎲 The same random number + same pre-shuffle state = identical shuffle results every time. This makes the entire process reproducible and verifiable!</p>
        </div>
      </section>
      
      <!-- Footer Note -->
      <div class="text-center py-8 text-gray-500 text-sm">
        <p>RandomProof uses blockchain technology to ensure fairness and transparency in random selection.</p>
        <p class="mt-1">Built with Vue 3, TypeScript, and ChainLink VRF on Polygon.</p>
      </div>
    </div>
  </div>
</template>