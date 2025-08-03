import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const VRF_COORDINATOR_ABI = [
  "function addConsumer(uint64 subId, address consumer) external",
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)"
];

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const subscriptionId = process.env.VRF_SUBSCRIPTION_ID;
  
  if (!contractAddress || !subscriptionId) {
    throw new Error("Please set CONTRACT_ADDRESS and VRF_SUBSCRIPTION_ID environment variables");
  }
  
  const vrfCoordinatorAddress = network.name === "polygon" 
    ? "0xAE975071Be8F8eE67addBC1A82488F1C24858067"
    : "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed";
  
  const [signer] = await ethers.getSigners();
  console.log("Adding consumer with account:", signer.address);
  
  const vrfCoordinator = new ethers.Contract(
    vrfCoordinatorAddress,
    VRF_COORDINATOR_ABI,
    signer
  );
  
  console.log("\nChecking subscription details...");
  const subscription = await vrfCoordinator.getSubscription(subscriptionId);
  console.log("Subscription owner:", subscription.owner);
  console.log("Current balance:", ethers.formatEther(subscription.balance), "LINK");
  console.log("Request count:", subscription.reqCount.toString());
  console.log("Current consumers:", subscription.consumers);
  
  if (subscription.consumers.includes(contractAddress)) {
    console.log("\n✅ Contract is already a consumer!");
    return;
  }
  
  console.log("\nAdding contract as consumer...");
  const tx = await vrfCoordinator.addConsumer(subscriptionId, contractAddress);
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("\n✅ Contract added as consumer!");
  console.log("Block number:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());
  
  const updatedSubscription = await vrfCoordinator.getSubscription(subscriptionId);
  console.log("\nUpdated consumers:", updatedSubscription.consumers);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });