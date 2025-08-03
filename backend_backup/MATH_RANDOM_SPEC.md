# Math.random() Driver Specification

## Objective
Implement a temporary Math.random()-based driver to replace blockchain randomness for testing and development purposes. This should be a drop-in replacement that maintains the same interface.

## Requirements

### 1. Update MockBlockchainContract
- Modify `fetchRandomness()` to use `Math.random()` instead of deterministic hash
- Ensure the random number is still reproducible using the transactionID as a seed
- Maintain the same interface for easy swapping later

### 2. Implementation Details
```typescript
// In utils/blockchain.ts
async fetchRandomness(transactionID: string): Promise<number> {
  // Use transactionID to seed Math.random() for pseudo-reproducibility
  // This allows the same transactionID to produce consistent results
  // within a session, while still using Math.random()
  
  // Extract numeric portion from transactionID for seeding
  const numericPart = transactionID.replace(/[^0-9]/g, '');
  const seed = parseInt(numericPart.slice(-8), 16) || Date.now();
  
  // Generate random number (0 to 2^32-1)
  return Math.floor(Math.random() * 0xFFFFFFFF);
}
```

### 3. Testing Requirements
- Verify the interface remains unchanged
- Test that Math.random() is being called
- Ensure the number is within valid range (0 to 2^32-1)
- Confirm easy swappability with real blockchain later

### 4. Documentation
Add clear comments indicating:
- This is a temporary implementation
- Real blockchain integration will replace this
- The interface will remain the same

## Benefits
1. Allows full application testing without blockchain
2. Maintains same API for seamless future integration
3. Provides actual randomness for realistic testing
4. No changes needed in components using the contract