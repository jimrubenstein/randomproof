import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import HomeView from '../../views/HomeView.vue'

describe('HomeView - Pre-Shuffle State Documentation (Verification Focus)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Understanding Results section structure', () => {
    it('renders Understanding Results section with correct header', () => {
      const wrapper = mount(HomeView)
      
      const resultsSection = wrapper.find('[class*="bg-orange-50"]')
      expect(resultsSection.exists()).toBe(true)
      
      const header = resultsSection.find('h3')
      expect(header.text()).toContain('🎯 Understanding the Shuffle Results')
      expect(header.classes()).toContain('text-orange-900')
    })

    it('includes critical verification explanation', () => {
      const wrapper = mount(HomeView)
      const resultsSection = wrapper.find('[class*="bg-orange-50"]')
      
      // Check for critical verification box
      const criticalBox = resultsSection.find('[class*="bg-orange-100"]')
      expect(criticalBox.exists()).toBe(true)
      expect(criticalBox.text()).toContain('🔍 Critical for Verification')
    })
  })

  describe('Pre-shuffle state emphasis', () => {
    it('emphasizes Input Tab shows pre-shuffle state', () => {
      const wrapper = mount(HomeView)
      const text = wrapper.text()
      
      // Key pre-shuffle terminology
      expect(text).toContain('exact pre-shuffle state')
      expect(text).toContain('pre-shuffle state')
      expect(text).toContain('definitive state used to generate the entity hash')
      expect(text).toContain('exactly as it existed before randomization')
    })

    it('explains pre-shuffle state conditions clearly', () => {
      const wrapper = mount(HomeView)
      const resultsSection = wrapper.find('[class*="bg-orange-50"]')
      const text = resultsSection.text()
      
      // Conditional explanations
      expect(text).toContain('If pre-sorting enabled: Shows alphabetically sorted data')
      expect(text).toContain('If pre-sorting disabled: Shows original order from your input')
      expect(text).toContain('This is the definitive state used to generate the entity hash')
    })

    it('emphasizes verification requirements', () => {
      const wrapper = mount(HomeView)
      const text = wrapper.text()
      
      // Verification emphasis
      expect(text).toContain('Critical for verification')
      expect(text).toContain('must match your original data exactly')
      expect(text).toContain('what gets verified against your original data')
      expect(text).toContain('prove authenticity')
    })
  })

  describe('Reproducibility and verification concepts', () => {
    it('explains reproducible starting point concept', () => {
      const wrapper = mount(HomeView)
      const text = wrapper.text()
      
      // Reproducibility concepts
      expect(text).toContain('definitive, reproducible initial state')
      expect(text).toContain('Makes verification easier and more reliable')
      expect(text).toContain('Eliminates ambiguity about data order')
      expect(text).toContain('anyone can recreate the exact same entity hash')
    })

    it('highlights the verification process importance', () => {
      const wrapper = mount(HomeView)
      const resultsSection = wrapper.find('[class*="bg-orange-50"]')
      
      // Look for verification icons explanation
      const text = resultsSection.text()
      expect(text).toContain('Verification Icons:')
      expect(text).toContain('✓ Green = Input data verified authentic')
      expect(text).toContain('✗ Red = Input data does NOT match original source')
      expect(text).toContain('? Gray = Unable to verify')
    })

    it('explains reproducible results principle', () => {
      const wrapper = mount(HomeView)
      const text = wrapper.text()
      
      // Reproducible results explanation
      expect(text).toContain('same random number + same pre-shuffle state = identical shuffle results')
      expect(text).toContain('makes the entire process reproducible and verifiable')
    })
  })

  describe('Pre-sorting recommendation rationale', () => {
    it('includes comprehensive pre-sorting benefits', () => {
      const wrapper = mount(HomeView)
      const resultsSection = wrapper.find('[class*="bg-orange-50"]')
      
      // Check for pre-sorting recommendation box
      const preSortBox = resultsSection.find('[class*="bg-green-50"]')
      expect(preSortBox.exists()).toBe(true)
      expect(preSortBox.text()).toContain('✅ Why Pre-Sorting is Recommended')
      
      const text = preSortBox.text()
      expect(text).toContain('definitive, reproducible initial state')
      expect(text).toContain('Makes verification easier and more reliable')
      expect(text).toContain('Eliminates ambiguity about data order')
      expect(text).toContain('Key part of the verifiable randomness process')
    })

    it('connects pre-sorting to verification workflow', () => {
      const wrapper = mount(HomeView)
      const text = wrapper.text()
      
      // Pre-sorting verification connection
      expect(text).toContain('Ensures anyone can recreate the exact same entity hash')
      expect(text).toContain('Key part of the verifiable randomness process')
      expect(text).toContain('Creates a definitive, reproducible initial state')
    })
  })

  describe('Technical accuracy and completeness', () => {
    it('covers all essential verification concepts', () => {
      const wrapper = mount(HomeView)
      const text = wrapper.text()
      
      // Essential verification concepts
      const verificationConcepts = [
        'pre-shuffle state',
        'entity hash generation',
        'reproducible',
        'verification',
        'authenticity',
        'definitive state',
        'Mersenne Twister'
      ]
      
      verificationConcepts.forEach(concept => {
        expect(text.toLowerCase()).toContain(concept.toLowerCase())
      })
    })

    it('explains the complete verification workflow', () => {
      const wrapper = mount(HomeView)
      const text = wrapper.text()
      
      // Workflow components
      expect(text).toContain('Input Tab')
      expect(text).toContain('Shuffled Tab')
      expect(text).toContain('Winner Selection')
      expect(text).toContain('entity hash')
      expect(text).toContain('blockchain randomness')
    })

    it('emphasizes critical verification points', () => {
      const wrapper = mount(HomeView)
      const resultsSection = wrapper.find('[class*="bg-orange-50"]')
      
      // Critical verification warnings/emphasis
      const criticalBox = resultsSection.find('[class*="bg-orange-100"]')
      expect(criticalBox.text()).toContain('Critical for Verification')
      expect(criticalBox.text()).toContain('exact pre-shuffle state')
      expect(criticalBox.text()).toContain('prove authenticity')
    })
  })

  describe('Visual design and accessibility', () => {
    it('uses appropriate styling for verification emphasis', () => {
      const wrapper = mount(HomeView)
      const resultsSection = wrapper.find('[class*="bg-orange-50"]')
      
      // Critical verification box styling
      const criticalBox = resultsSection.find('[class*="bg-orange-100"][class*="border-orange-200"]')
      expect(criticalBox.exists()).toBe(true)
      expect(criticalBox.text()).toContain('🔍')
      
      // Pre-sorting recommendation box styling
      const recommendationBox = resultsSection.find('[class*="bg-green-50"][class*="border-green-200"]')
      expect(recommendationBox.exists()).toBe(true)
      expect(recommendationBox.text()).toContain('✅')
    })

    it('maintains proper information hierarchy', () => {
      const wrapper = mount(HomeView)
      const resultsSection = wrapper.find('[class*="bg-orange-50"]')
      
      // Main section heading (h3)
      const mainHeading = resultsSection.find('h3')
      expect(mainHeading.exists()).toBe(true)
      expect(mainHeading.classes()).toContain('text-xl')
      
      // Subsection headings (h4)
      const subHeadings = resultsSection.findAll('h4')
      expect(subHeadings.length).toBeGreaterThan(1)
      subHeadings.forEach(heading => {
        expect(heading.classes()).toContain('font-semibold')
      })
    })

    it('uses appropriate icon choices for concepts', () => {
      const wrapper = mount(HomeView)
      const text = wrapper.text()
      
      // Verification and process icons
      expect(text).toContain('🔍') // Magnifying glass for verification
      expect(text).toContain('✅') // Check mark for recommendations  
      expect(text).toContain('🎲') // Dice for randomness/results
      expect(text).toContain('✓') // Check for verified
      expect(text).toContain('✗') // X for unverified
    })
  })

  describe('Content flow and integration', () => {
    it('logically connects to other documentation sections', () => {
      const wrapper = mount(HomeView)
      
      // Check that this section appears after other key sections
      const allSections = wrapper.findAll('section')
      expect(allSections.length).toBeGreaterThan(5)
      
      // Results section should come after salt documentation
      const sectionTexts = allSections.map(s => s.text())
      const saltIndex = sectionTexts.findIndex(text => text.includes('Understanding Salt Values'))
      const resultsIndex = sectionTexts.findIndex(text => text.includes('Understanding the Shuffle Results'))
      
      expect(saltIndex).toBeGreaterThan(-1)
      expect(resultsIndex).toBeGreaterThan(-1)
      expect(resultsIndex).toBeGreaterThan(saltIndex)
    })

    it('provides actionable guidance for users', () => {
      const wrapper = mount(HomeView)
      const text = wrapper.text()
      
      // Actionable guidance elements
      expect(text).toContain('Shows your data in its pre-shuffle state')
      expect(text).toContain('exactly as it existed before randomization')
      expect(text).toContain('must match your original data exactly')
      expect(text).toContain('The top N entries from the shuffled list become your final winners')
    })

    it('reinforces key RandomProof concepts', () => {
      const wrapper = mount(HomeView)
      const text = wrapper.text()
      
      // Key concept reinforcement
      expect(text).toContain('verifiable randomness')
      expect(text).toContain('reproducible')
      expect(text).toContain('entity hash')
      expect(text).toContain('blockchain randomness')
      expect(text).toContain('Mersenne Twister')
    })
  })

  describe('Responsive design considerations', () => {
    it('handles content layout appropriately', () => {
      const wrapper = mount(HomeView)
      const resultsSection = wrapper.find('[class*="bg-orange-50"]')
      
      // Check for proper spacing classes
      const spacingContainers = resultsSection.findAll('[class*="space-y"], [class*="mt-"], [class*="mb-"]')
      expect(spacingContainers.length).toBeGreaterThan(0)
    })

    it('maintains readability with proper text structure', () => {
      const wrapper = mount(HomeView)
      const resultsSection = wrapper.find('[class*="bg-orange-50"]')
      
      // Check for list structures and text organization
      const lists = resultsSection.findAll('ul, ol')
      expect(lists.length).toBeGreaterThan(0)
      
      // Check for proper text sizing
      const textElements = resultsSection.findAll('p, li')
      expect(textElements.length).toBeGreaterThan(5)
    })
  })
})