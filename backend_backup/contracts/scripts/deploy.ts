import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

interface NetworkConfig {
  vrfCoordinator: string;
  keyHash: string;
  subscriptionId: string;
  callbackGasLimit: number;
}

const networkConfigs: Record<string, NetworkConfig> = {
  polygon: {
    vrfCoordinator: "0xAE975071Be8F8eE67addBC1A82488F1C24858067",
    keyHash: "0x6e099d640cde6de9d40ac749b4b594126b0169747122711109c9985d47751f93",
    subscriptionId: process.env.VRF_SUBSCRIPTION_ID || "0",
    callbackGasLimit: 500000
  },
  mumbai: {
    vrfCoordinator: "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed",
    keyHash: "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f",
    subscriptionId: process.env.VRF_SUBSCRIPTION_ID || "0",
    callbackGasLimit: 500000
  },
  localhost: {
    vrfCoordinator: "0x0000000000000000000000000000000000000000",
    keyHash: "0x" + "0".repeat(64),
    subscriptionId: "1",
    callbackGasLimit: 500000
  }
};

async function main() {
  console.log(`Deploying to network: ${network.name}`);
  
  const config = networkConfigs[network.name];
  if (!config) {
    throw new Error(`Network ${network.name} not configured`);
  }
  
  if (network.name === "localhost") {
    console.log("Deploying mock VRF coordinator for local testing...");
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
    const mockCoordinator = await MockVRFCoordinator.deploy();
    await mockCoordinator.waitForDeployment();
    config.vrfCoordinator = await mockCoordinator.getAddress();
    console.log(`Mock VRF Coordinator deployed to: ${config.vrfCoordinator}`);
  }
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  
  console.log("\nDeployment Configuration:");
  console.log("- VRF Coordinator:", config.vrfCoordinator);
  console.log("- Key Hash:", config.keyHash);
  console.log("- Subscription ID:", config.subscriptionId);
  console.log("- Callback Gas Limit:", config.callbackGasLimit);
  
  const RandomProof = await ethers.getContractFactory("RandomProofOptimized");
  
  console.log("\nDeploying RandomProof contract...");
  const randomProof = await RandomProof.deploy(
    config.subscriptionId,
    config.vrfCoordinator,
    config.keyHash,
    config.callbackGasLimit
  );
  
  await randomProof.waitForDeployment();
  const contractAddress = await randomProof.getAddress();
  
  console.log("\n✅ RandomProof deployed to:", contractAddress);
  
  console.log("\n📋 Deployment Summary:");
  console.log("====================");
  console.log("Network:", network.name);
  console.log("Contract Address:", contractAddress);
  console.log("Deployer:", deployer.address);
  console.log("Block Number:", await ethers.provider.getBlockNumber());
  
  if (network.name !== "localhost" && network.name !== "hardhat") {
    console.log("\n🔍 Verify contract on Etherscan:");
    console.log(`npx hardhat verify --network ${network.name} ${contractAddress} ${config.subscriptionId} ${config.vrfCoordinator} ${config.keyHash} ${config.callbackGasLimit}`);
    
    console.log("\n⚠️  Important Next Steps:");
    console.log("1. Add this contract as a consumer to your VRF subscription");
    console.log(`   Visit: https://vrf.chain.link/`);
    console.log(`2. Fund your VRF subscription with LINK tokens`);
    console.log(`3. Update the frontend configuration with the contract address`);
  }
  
  const deploymentInfo = {
    network: network.name,
    contractAddress,
    deployer: deployer.address,
    vrfCoordinator: config.vrfCoordinator,
    keyHash: config.keyHash,
    subscriptionId: config.subscriptionId,
    deploymentBlock: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString()
  };
  
  console.log("\n💾 Save this deployment info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });