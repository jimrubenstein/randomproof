const hre = require("hardhat");
const { ethers } = require("ethers");

async function main() {
  const contractAddress = process.env.RANDOMPROOF_ADDRESS;
  
  if (!contractAddress) {
    throw new Error("Please set RANDOMPROOF_ADDRESS environment variable");
  }

  const entityData = process.argv[2];
  const saltInput = process.argv[3];

  if (!entityData || !saltInput) {
    console.error("Usage: npx hardhat run scripts/requestRandomness.js <entityData> <salt>");
    console.error("Note: salt can be a string (will be hashed) or a bytes32 hex string");
    process.exit(1);
  }

  console.log("Requesting randomness for:");
  console.log(`  Entity Data: ${entityData}`);
  console.log(`  Salt Input: ${saltInput}`);

  const RandomProofOptimized = await hre.ethers.getContractFactory("RandomProofOptimized");
  const randomProof = RandomProofOptimized.attach(contractAddress);

  // Calculate entity hash
  const entityHash = ethers.keccak256(ethers.toUtf8Bytes(entityData));
  
  // Handle salt - if it's already a valid bytes32, use it; otherwise hash it
  let salt;
  if (saltInput.startsWith("0x") && saltInput.length === 66) {
    // Already a bytes32 hex string
    salt = saltInput;
  } else {
    // Hash the salt string
    salt = ethers.keccak256(ethers.toUtf8Bytes(saltInput));
  }

  console.log(`  Entity Hash: ${entityHash}`);
  console.log(`  Salt (bytes32): ${salt}`);

  // Check if entity is already processed
  const isProcessed = await randomProof.isEntityProcessed(entityHash);
  if (isProcessed) {
    console.error("Entity has already been processed!");
    
    const requestData = await randomProof.getRequestByEntityHash(entityHash);
    console.log("Existing request data:");
    console.log(`  Request ID: ${requestData.requestId}`);
    console.log(`  Salt: ${requestData.salt}`);
    console.log(`  Randomness: ${requestData.randomness}`);
    console.log(`  Timestamp: ${new Date(Number(requestData.timestamp) * 1000).toISOString()}`);
    console.log(`  Fulfilled: ${requestData.fulfilled}`);
    console.log(`  Requester: ${requestData.requester}`);
    
    process.exit(1);
  }

  // Request randomness
  console.log("Requesting randomness from ChainLink VRF...");
  const tx = await randomProof.requestRandomness(entityHash, salt);
  console.log(`Transaction hash: ${tx.hash}`);
  
  const receipt = await tx.wait();
  console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

  // Extract request ID from events
  const requestEvent = receipt.logs.find(
    log => log.fragment && log.fragment.name === "RandomnessRequested"
  );

  if (requestEvent) {
    const requestId = requestEvent.args[0];
    console.log(`Request ID: ${requestId}`);
    console.log("\nNOTE: The randomness will be fulfilled by ChainLink VRF in a few blocks.");
    console.log("You can check the status using the checkRequest.js script.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });