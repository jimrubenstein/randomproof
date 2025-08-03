# Product Specification: RandomProof – Serverless Web Application for Verifiable Random Number Generation

## Objective

Develop a self-contained serverless web application named **RandomProof** using VueJS (v3), Typescript, TailwindCSS, and blockchain technology (EVM-compatible, specifically Polygon) for generating reproducible, predictable, and verifiable random numbers. The application will utilize ChainLink VRF for randomness, interact with GitHub gists for data input, and deploy on Netlify.

## Requirements

### Technologies

- Frontend: VueJS v3, Typescript
- Styling: TailwindCSS
- Blockchain: Polygon (EVM-compatible)
- Randomness Source: ChainLink VRF
- Data Source: Direct input or GitHub gists
- Deployment: Netlify
- Build Process: Vite

### Functional Requirements

#### Input Page

- Users must input data either by pasting directly into a textbox or by providing a GitHub gist URL.
- If a gist URL is provided:
  - Fetch data from GitHub using their API.
  - If multiple files exist, apply special treatment based on filenames:
    - `_strict`: If present, data will not be pre-sorted and the pre-sort option will be disabled.
    - `_salt`: If present, use its content as the salt value.

#### Randomness Request

- Allow users to optionally provide a salt value unless provided via `_salt` file (non-editable).
- Allow users to specify whether data should be pre-sorted alphabetically unless `_strict` file is present (option disabled).
- Allow users to select the number of winners to pick from the shuffled results.
- Upon user interaction (`Request Random` button), submit blockchain transaction via:

        function requestRandomness(bytes32 entityHash, bytes32 salt)

- Entity hash is a SHA-256 hash of the pre-sorted data (if applicable) or raw input data.
- After submission, navigate to:

        /results/{{transactionID}}[?gg={{gistURL}}]

#### Results Page

- Poll blockchain for random number via:

        function fetchRandomness(bytes32 transactionID): uint256

- Display "Fetching Randomness…" indicator until result is available.

### Result Display

- Display transaction and response details clearly:
  - Request transaction ID (link to polygonscan)
  - Entity hash
  - Salt value
  - Request transaction block height and timestamp
  - Response transaction ID (link to polygonscan)
  - Response transaction block height and timestamp
  - Random value obtained
- Display icons next to salt and entity hash indicating:
  - Verified authentic
  - NOT authentic/invalid
  - Unable to verify

#### Verification

- Automatically verify data if available via GitHub gist:
  - Re-fetch data from gist and confirm entity hash and salt authenticity.
- Allow manual verification if no gist provided:
  - Users can input data manually and specify sorting/salt conditions for verification.

#### Shuffling and Winner Selection

- Two-tab interface (`Input` and `Shuffled`):
  - `Input` shows original user-provided data.
  - `Shuffled` applies mersenne twister algorithm seeded with blockchain randomness to shuffle data.
- Provide interface to select the number of winners (default based on initial input).
- `Pick Winners` button displays the top N shuffled entries as winners.

## Deliverables

### VueJS Application

- Fully functional frontend VueJS (v3) application in Typescript.
- Styled neatly using TailwindCSS.
- Single-page components structured logically and clearly.

### Blockchain Integration

- Integration with ChainLink VRF on Polygon blockchain.
- Metamask (or equivalent) support for transaction submissions.

### GitHub Integration

- Data fetching logic for GitHub gists, including special file handling (`_strict`, `_salt`).

### Deployment

- Application configured and ready for deployment via Netlify.
- Build process managed by Vite.

### Documentation

- Inline code documentation.
- README file outlining setup, deployment, and usage.

## Acceptance Criteria

- Users can seamlessly provide input via textbox or GitHub gist URL.
- Salt handling matches specification (user-provided or gist-based).
- Pre-sort option respects gist-based special files (`_strict`).
- Blockchain transactions successfully submitted via frontend.
- Result fetching correctly polls and retrieves randomness from blockchain.
- Results page clearly displays all transaction, randomness, and authenticity details.
- Verification icons accurately reflect the data authenticity state.
- Shuffling algorithm consistently produces verifiable results using mersenne twister seeded by blockchain randomness.
- Winner selection correctly returns the top specified entries from shuffled data.
- Application deploys cleanly to Netlify and runs without issues.
- Interface is intuitive, tidy, and responsive, meeting design and usability expectations.
