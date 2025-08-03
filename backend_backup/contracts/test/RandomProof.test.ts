import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { RandomProofOptimized } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RandomProof", function () {
  async function deployRandomProofFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    
    const mockVRFCoordinator = await ethers.deployContract("MockVRFCoordinator");
    await mockVRFCoordinator.waitForDeployment();
    
    const subscriptionId = 1;
    const keyHash = "0x" + "0".repeat(64);
    const callbackGasLimit = 500000;
    
    const RandomProof = await ethers.getContractFactory("RandomProofOptimized");
    const randomProof = await RandomProof.deploy(
      subscriptionId,
      await mockVRFCoordinator.getAddress(),
      keyHash,
      callbackGasLimit
    );
    await randomProof.waitForDeployment();
    
    return { randomProof, mockVRFCoordinator, owner, user1, user2 };
  }
  
  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      const { randomProof } = await loadFixture(deployRandomProofFixture);
      expect(await randomProof.getAddress()).to.be.properAddress;
    });
  });
  
  describe("Request Randomness", function () {
    it("Should successfully request randomness for valid entity hash", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = "a".repeat(64);
      const salt = "test-salt-123";
      
      const tx = await randomProof.connect(user1).requestRandomness(entityHash, salt);
      const receipt = await tx.wait();
      
      const requestEvent = receipt?.logs.find(
        log => log.topics[0] === randomProof.interface.getEvent("RandomnessRequested").topicHash
      );
      
      expect(requestEvent).to.not.be.undefined;
      
      const isProcessed = await randomProof.isEntityHashProcessed(entityHash);
      expect(isProcessed).to.be.true;
    });
    
    it("Should revert for invalid entity hash length", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const invalidEntityHash = "a".repeat(63);
      const salt = "test-salt";
      
      await expect(
        randomProof.connect(user1).requestRandomness(invalidEntityHash, salt)
      ).to.be.revertedWithCustomError(randomProof, "InvalidEntityHash");
    });
    
    it("Should revert for duplicate entity hash", async function () {
      const { randomProof, user1, user2 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = "b".repeat(64);
      const salt = "test-salt";
      
      await randomProof.connect(user1).requestRandomness(entityHash, salt);
      
      await expect(
        randomProof.connect(user2).requestRandomness(entityHash, salt)
      ).to.be.revertedWithCustomError(randomProof, "EntityHashAlreadyProcessed");
    });
    
    it("Should emit correct events", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = "c".repeat(64);
      const salt = "test-salt";
      
      await expect(randomProof.connect(user1).requestRandomness(entityHash, salt))
        .to.emit(randomProof, "RandomnessRequested")
        .withArgs(
          1,
          ethers.keccak256(ethers.toUtf8Bytes(entityHash)),
          entityHash,
          salt,
          user1.address
        );
    });
  });
  
  describe("Fulfill Randomness", function () {
    it("Should fulfill randomness request", async function () {
      const { randomProof, mockVRFCoordinator, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = "d".repeat(64);
      const salt = "test-salt";
      
      await randomProof.connect(user1).requestRandomness(entityHash, salt);
      
      const requestId = 1;
      const randomness = ethers.toBigInt("0x123456789");
      
      await mockVRFCoordinator.fulfillRandomWords(
        requestId,
        await randomProof.getAddress(),
        [randomness]
      );
      
      const [returnedRandomness, fulfilled] = await randomProof.getRandomnessForEntityHash(entityHash);
      
      expect(fulfilled).to.be.true;
      expect(returnedRandomness).to.equal(randomness);
    });
    
    it("Should emit RandomnessFulfilled event", async function () {
      const { randomProof, mockVRFCoordinator, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = "e".repeat(64);
      const salt = "test-salt";
      
      await randomProof.connect(user1).requestRandomness(entityHash, salt);
      
      const requestId = 1;
      const randomness = ethers.toBigInt("0x987654321");
      
      await expect(
        mockVRFCoordinator.fulfillRandomWords(
          requestId,
          await randomProof.getAddress(),
          [randomness]
        )
      ).to.emit(randomProof, "RandomnessFulfilled")
        .withArgs(
          requestId,
          ethers.keccak256(ethers.toUtf8Bytes(entityHash)),
          randomness
        );
    });
  });
  
  describe("Query Functions", function () {
    it("Should get request details by ID", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = "f".repeat(64);
      const salt = "test-salt";
      
      await randomProof.connect(user1).requestRandomness(entityHash, salt);
      
      const details = await randomProof.getRequestDetails(1);
      
      expect(details.entityHashBytes32).to.equal(ethers.keccak256(ethers.toUtf8Bytes(entityHash)));
      expect(details.saltHash).to.equal(ethers.keccak256(ethers.toUtf8Bytes(salt)));
      expect(details.requester).to.equal(user1.address);
      expect(details.fulfilled).to.be.false;
    });
    
    it("Should get request ID by entity hash", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = "1".repeat(64);
      const salt = "test-salt";
      
      await randomProof.connect(user1).requestRandomness(entityHash, salt);
      
      const requestId = await randomProof.getRequestIdForEntityHash(entityHash);
      expect(requestId).to.equal(1);
    });
    
    it("Should revert for non-existent entity hash", async function () {
      const { randomProof } = await loadFixture(deployRandomProofFixture);
      
      const nonExistentHash = "2".repeat(64);
      
      await expect(
        randomProof.getRandomnessForEntityHash(nonExistentHash)
      ).to.be.revertedWithCustomError(randomProof, "RequestNotFound");
      
      await expect(
        randomProof.getRequestIdForEntityHash(nonExistentHash)
      ).to.be.revertedWithCustomError(randomProof, "RequestNotFound");
    });
    
    it("Should revert for non-existent request ID", async function () {
      const { randomProof } = await loadFixture(deployRandomProofFixture);
      
      await expect(
        randomProof.getRequestDetails(999)
      ).to.be.revertedWithCustomError(randomProof, "RequestNotFound");
    });
  });
  
  describe("Gas Optimization Tests", function () {
    it("Should use minimal gas for storage operations", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = "3".repeat(64);
      const salt = "s";
      
      const tx = await randomProof.connect(user1).requestRandomness(entityHash, salt);
      const receipt = await tx.wait();
      
      console.log("Gas used for requestRandomness:", receipt?.gasUsed.toString());
      
      expect(receipt?.gasUsed).to.be.lessThan(150000);
    });
  });
});