import { run, network } from "hardhat";

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Please set CONTRACT_ADDRESS environment variable");
  }
  
  const subscriptionId = process.env.VRF_SUBSCRIPTION_ID || "1";
  const vrfCoordinator = process.env.VRF_COORDINATOR || "";
  const keyHash = process.env.KEY_HASH || "";
  const callbackGasLimit = process.env.CALLBACK_GAS_LIMIT || "500000";
  
  console.log(`Verifying contract on ${network.name}...`);
  console.log("Contract address:", contractAddress);
  
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [
        subscriptionId,
        vrfCoordinator,
        keyHash,
        parseInt(callbackGasLimit)
      ],
      contract: "contracts/src/RandomProofOptimized.sol:RandomProofOptimized"
    });
    
    console.log("✅ Contract verified successfully!");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  Contract is already verified");
    } else {
      console.error("❌ Verification failed:", error);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });