const hre = require("hardhat");

async function main() {
  console.log("Deploying RandomProofOptimized contract...");

  const networkConfig = {
    // Ethereum Mainnet
    1: {
      vrfCoordinator: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
      keyHash: "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef",
      subscriptionId: 0 // Update with your subscription ID
    },
    // Polygon Mainnet
    137: {
      vrfCoordinator: "0x343300b5d84D444B2ADc9116FEF1bED02BE49Cf2",
      keyHash: "0x3f631d5ec60a0ce16203bcd6aff7ffbc423e22f0f6d1807ae7f6f30b6d0f0b2c",
      subscriptionId: 0 // Update with your subscription ID
    },
    // Arbitrum One
    42161: {
      vrfCoordinator: "0x3C0Ca683003b74d1D52A479D77C9D2D4f6D95095",
      keyHash: "0x72d2b016bb5b62912afea35e1e8ccf0b953cb578c6f78f5e0e9f7e1a2f6bfc42",
      subscriptionId: 0 // Update with your subscription ID
    },
    // Ethereum Sepolia Testnet
    11155111: {
      vrfCoordinator: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
      keyHash: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
      subscriptionId: 0 // Update with your subscription ID
    },
    // Polygon Mumbai Testnet
    80001: {
      vrfCoordinator: "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed",
      keyHash: "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f",
      subscriptionId: 0 // Update with your subscription ID
    },
    // Arbitrum Sepolia Testnet
    421614: {
      vrfCoordinator: "0x5CE8D5A2BC84beb22a398CCA51996F7930313D61",
      keyHash: "0x1770bdc7eec7771f7ba4ffd640f34260d7f095b79c92d34a5b2551d6f6cfd2be",
      subscriptionId: 0 // Update with your subscription ID
    }
  };

  const chainId = await hre.ethers.provider.getNetwork().then(network => network.chainId);
  const config = networkConfig[chainId];

  if (!config) {
    throw new Error(`Network ${chainId} not configured`);
  }

  if (config.subscriptionId === 0) {
    throw new Error("Please update the subscription ID for this network");
  }

  const RandomProofOptimized = await hre.ethers.getContractFactory("RandomProofOptimized");
  const randomProof = await RandomProofOptimized.deploy(
    config.subscriptionId,
    config.vrfCoordinator,
    config.keyHash
  );

  await randomProof.waitForDeployment();

  const contractAddress = await randomProof.getAddress();
  console.log(`RandomProofOptimized deployed to: ${contractAddress}`);
  
  console.log("Deployment configuration:");
  console.log(`  Network: ${chainId}`);
  console.log(`  VRF Coordinator: ${config.vrfCoordinator}`);
  console.log(`  Key Hash: ${config.keyHash}`);
  console.log(`  Subscription ID: ${config.subscriptionId}`);

  // Verify contract on Etherscan
  if (chainId !== 31337) { // Not localhost
    console.log("Waiting for block confirmations...");
    await randomProof.deploymentTransaction().wait(6);
    
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
          config.subscriptionId,
          config.vrfCoordinator,
          config.keyHash
        ],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.error("Verification failed:", error);
    }
  }

  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });