# RandomProof Documentation Requirements

## Overview
Add comprehensive user documentation directly to the homepage (HomeView.vue) to help users understand the RandomProof lottery/raffle system.

## Documentation Sections Required

### 1. What is RandomProof?
- Brief explanation of verifiable random number generation
- How it ensures fairness in lotteries/raffles
- Blockchain-based transparency (currently using Math.random() for testing)

### 2. How Does It Work?
- Entity hash generation from participant data
- Salt for additional randomness
- Blockchain request and response cycle
- Mersenne Twister shuffle algorithm

### 3. Step-by-Step Usage Guide
1. **Enter Participants**: 
   - Direct text entry (one per line)
   - GitHub gist URL option
2. **Optional Settings**:
   - Salt value for extra randomness
   - Pre-sorting option for consistent hashing
   - Number of winners to select
3. **Request Random Number**:
   - Submit to blockchain (or test driver)
   - Wait for confirmation
4. **View Results**:
   - See transaction details
   - Review shuffled participants
   - Select winners

### 4. GitHub Gist Format
- How to format participant lists
- Special files:
  - `_strict`: Disable pre-sorting
  - `_salt`: Provide salt value
- Multiple file handling

### 5. Fairness & Verification
- How to verify results
- Entity hash validation
- Reproducible randomness

## Implementation Details
- Add as a new section at bottom of HomeView.vue
- Use clear, user-friendly language
- Include visual separators
- Make it scannable with headers
- Consider collapsible sections for cleaner UI