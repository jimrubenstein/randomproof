<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'

// Warning banner state - dismissible but reappears on refresh
const showWarningBanner = ref(true)

function dismissBanner() {
  showWarningBanner.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 via-accent-50 to-secondary-50">
    <!-- Enhanced Header with Glassmorphism -->
    <header class="sticky top-0 z-50">
      <div class="glassmorphism">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-20">
            <!-- Logo Section -->
            <div class="flex items-center space-x-4">
              <div class="relative">
                <!-- Animated Logo Icon -->
                <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl shadow-glow animate-pulse-slow flex items-center justify-center">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                  </svg>
                </div>
                <!-- Glow Effect -->
                <div class="absolute inset-0 w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl opacity-30 blur-sm animate-float"></div>
              </div>
              <div>
                <h1 class="text-2xl font-bold text-gradient">RandomProof</h1>
                <p class="text-sm text-gray-600 hidden sm:block">Verifiable Random Number Generation</p>
              </div>
            </div>

            <!-- Status Indicator -->
            <div class="hidden md:flex items-center space-x-2">
              <div class="flex items-center space-x-2 px-3 py-1.5 bg-secondary-50 rounded-full border border-secondary-200">
                <div class="w-2 h-2 bg-secondary-500 rounded-full animate-pulse"></div>
                <span class="text-xs font-medium text-secondary-700">Live on Polygon</span>
              </div>
            </div>

            <!-- Mobile Menu Placeholder -->
            <div class="md:hidden">
              <button class="p-2 rounded-lg hover:bg-white/50 transition-colors">
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Subtle Gradient Border -->
      <div class="h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent"></div>
    </header>

    <!-- URGENT: Development Warning Banner -->
    <div v-if="showWarningBanner" class="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 border-b-2 border-orange-500 shadow-lg animate-slide-up">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-start sm:items-center justify-between py-4 gap-4">
          <!-- Warning Content -->
          <div class="flex items-start space-x-3 flex-1">
            <!-- Warning Icon -->
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center animate-pulse">
                <svg class="w-5 h-5 text-orange-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
              </div>
            </div>
            
            <!-- Warning Message -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2 mb-1">
                <h4 class="text-sm font-bold text-orange-900 uppercase tracking-wide">⚠️ DEVELOPMENT WARNING</h4>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-200 text-orange-800 animate-pulse">
                  TEST MODE
                </span>
              </div>
              <p class="text-sm text-orange-900 leading-relaxed font-medium">
                <strong class="text-orange-900">WARNING:</strong> Blockchain integration is under development. This application is currently using a test randomness driver and should 
                <strong class="text-orange-900 underline">NOT be considered a reliable source of randomness for production use yet.</strong>
              </p>
              <p class="text-xs text-orange-800 mt-1 font-medium">
                🔧 <em>Currently using Math.random() driver • Production ChainLink VRF integration coming soon</em>
              </p>
            </div>
          </div>
          
          <!-- Dismiss Button -->
          <div class="flex-shrink-0">
            <button
              @click="dismissBanner"
              class="group p-2 rounded-lg hover:bg-orange-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-1"
              aria-label="Dismiss warning"
            >
              <svg class="w-5 h-5 text-orange-800 group-hover:text-orange-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div class="animate-fade-in">
        <RouterView />
      </div>
    </main>

    <!-- Background Elements -->
    <div class="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <!-- Floating Geometric Shapes -->
      <div class="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-primary-200/20 to-accent-200/20 rounded-full blur-xl animate-float"></div>
      <div class="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-accent-200/20 to-secondary-200/20 rounded-full blur-xl animate-float" style="animation-delay: -2s;"></div>
      <div class="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-br from-secondary-200/20 to-primary-200/20 rounded-full blur-xl animate-float" style="animation-delay: -4s;"></div>
    </div>
  </div>
</template>
