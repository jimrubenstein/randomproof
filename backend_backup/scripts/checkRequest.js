const hre = require("hardhat");

async function main() {
  const contractAddress = process.env.RANDOMPROOF_ADDRESS;
  
  if (!contractAddress) {
    throw new Error("Please set RANDOMPROOF_ADDRESS environment variable");
  }

  const requestIdOrEntityHash = process.argv[2];

  if (!requestIdOrEntityHash) {
    console.error("Usage: npx hardhat run scripts/checkRequest.js <requestId|entityHash>");
    process.exit(1);
  }

  const RandomProofOptimized = await hre.ethers.getContractFactory("RandomProofOptimized");
  const randomProof = RandomProofOptimized.attach(contractAddress);

  let requestData;
  let requestId;

  // Check if input is a request ID (number) or entity hash (hex string)
  if (requestIdOrEntityHash.startsWith("0x") && requestIdOrEntityHash.length === 66) {
    // It's an entity hash
    console.log(`Checking request for entity hash: ${requestIdOrEntityHash}`);
    const result = await randomProof.getRequestByEntityHash(requestIdOrEntityHash);
    requestId = result.requestId;
    requestData = {
      entityHash: requestIdOrEntityHash,
      salt: result.salt,
      randomness: result.randomness,
      timestamp: result.timestamp,
      fulfilled: result.fulfilled,
      requester: result.requester
    };
  } else {
    // It's a request ID
    requestId = requestIdOrEntityHash;
    console.log(`Checking request ID: ${requestId}`);
    requestData = await randomProof.getRequest(requestId);
  }

  if (requestData.timestamp == 0) {
    console.error("Request not found!");
    process.exit(1);
  }

  console.log("\nRequest details:");
  console.log(`  Request ID: ${requestId}`);
  console.log(`  Entity Hash: ${requestData.entityHash}`);
  console.log(`  Salt: ${requestData.salt}`);
  console.log(`  Timestamp: ${new Date(Number(requestData.timestamp) * 1000).toISOString()}`);
  console.log(`  Requester: ${requestData.requester}`);
  console.log(`  Fulfilled: ${requestData.fulfilled}`);
  
  if (requestData.fulfilled) {
    console.log(`  Randomness: ${requestData.randomness}`);
    console.log(`  Randomness (hex): 0x${requestData.randomness.toString(16)}`);
  } else {
    console.log("\nRandomness not yet fulfilled. ChainLink VRF will fulfill it in a few blocks.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });