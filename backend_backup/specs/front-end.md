sed on wireframe.

- **ResultsPage.vue:** Polls blockchain, displays results, and handles data verification.
- **WinnerSelection.vue:** UI to choose and display shuffled winners.

#### Views

- **HomeView.vue:** Combines input page components, implements full form logic, and submission.
- **ResultsView.vue:** Manages results page components, data retrieval, and UI states.

### State Management

- **Pinia Store:** (`useRandomProofStore.ts`)
  - Handles state for user input data, transaction IDs, blockchain results, verification status.

### Routing

- Vue Router configuration (`router/index.ts`) supporting dynamic route handling (`/results/:transactionID`).

### Blockchain Interaction

- Defined via `BlockchainContract` interface to abstract contract calls:

        export interface BlockchainContract {
          requestRandomness(entityHash: string, salt: string): Promise<string>;
          fetchRandomness(transactionID: string): Promise<number>;
        }

### Utility Functions

- `blockchain.ts`: Implementation layer to interact with the blockchain via the defined interface.
- `hashing.ts`: Utility to handle SHA-256 hashing of input data.
- `shuffle.ts`: Implements Mersenne Twister shuffle algorithm.

## Testing

- Implement comprehensive unit tests for components using Vitest and Vue Test Utils.
- Ensure coverage for:
  - User interaction scenarios
  - Blockchain polling and response handling
  - Verification logic
  - Shuffle algorithm correctness

## Success Criteria

- Implementation matches provided wireframe closely.
- All user interactions are responsive and intuitive.
- Components are decoupled, modular, and easily maintainable.
- Blockchain interactions are abstracted and interchangeable via interfaces.
- Unit tests cover critical functionality and pass successfully.
- Application deploys without errors on Netlify and performs as expected in live environment.
