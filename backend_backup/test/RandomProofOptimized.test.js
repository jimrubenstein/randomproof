const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("RandomProofOptimized", function () {
  async function deployRandomProofFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    
    // Mock VRF Coordinator for testing
    const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinatorV2Plus");
    const vrfCoordinator = await MockVRFCoordinator.deploy();
    await vrfCoordinator.waitForDeployment();
    
    const subscriptionId = 1;
    const keyHash = "0x" + "0".repeat(64);
    
    const RandomProofOptimized = await ethers.getContractFactory("RandomProofOptimized");
    const randomProof = await RandomProofOptimized.deploy(
      subscriptionId,
      vrfCoordinator.target,
      keyHash
    );
    await randomProof.waitForDeployment();

    return { randomProof, vrfCoordinator, owner, user1, user2, subscriptionId, keyHash };
  }

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      const { randomProof, owner } = await loadFixture(deployRandomProofFixture);
      expect(await randomProof.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero request count", async function () {
      const { randomProof } = await loadFixture(deployRandomProofFixture);
      expect(await randomProof.requestCount()).to.equal(0);
    });
  });

  describe("Request Randomness", function () {
    it("Should successfully request randomness for a new entity", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("test-entity-1"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("random-salt-123"));

      await expect(
        randomProof.connect(user1).requestRandomness(entityHash, salt)
      ).to.emit(randomProof, "RandomnessRequested");
      
      expect(await randomProof.isEntityProcessed(entityHash)).to.be.true;
      expect(await randomProof.requestCount()).to.equal(1);
    });

    it("Should revert when requesting randomness for already processed entity", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("test-entity-2"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("random-salt-456"));

      await randomProof.connect(user1).requestRandomness(entityHash, salt);
      
      await expect(
        randomProof.connect(user1).requestRandomness(entityHash, salt)
      ).to.be.revertedWithCustomError(randomProof, "EntityAlreadyProcessed")
        .withArgs(entityHash);
    });

    it("Should store request data correctly", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("test-entity-3"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("random-salt-789"));

      const tx = await randomProof.connect(user1).requestRandomness(entityHash, salt);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RandomnessRequested"
      );
      const requestId = event.args[0];

      const request = await randomProof.getRequest(requestId);
      expect(request.entityHash).to.equal(entityHash);
      expect(request.salt).to.equal(salt);
      expect(request.randomness).to.equal(0);
      expect(request.fulfilled).to.be.false;
      expect(request.requester).to.equal(user1.address);
    });
  });

  describe("Batch Operations", function () {
    it("Should check multiple entities in batch", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHashes = [];
      const salts = [];
      
      // Create 5 entity hashes
      for (let i = 0; i < 5; i++) {
        entityHashes.push(ethers.keccak256(ethers.toUtf8Bytes(`test-entity-batch-${i}`)));
        salts.push(ethers.keccak256(ethers.toUtf8Bytes(`salt-batch-${i}`)));
      }

      // Process first 3 entities
      for (let i = 0; i < 3; i++) {
        await randomProof.connect(user1).requestRandomness(entityHashes[i], salts[i]);
      }

      // Check all 5 entities in batch
      const results = await randomProof.batchCheckEntities(entityHashes);
      
      expect(results[0]).to.be.true;
      expect(results[1]).to.be.true;
      expect(results[2]).to.be.true;
      expect(results[3]).to.be.false;
      expect(results[4]).to.be.false;
    });
  });

  describe("Query Functions", function () {
    it("Should retrieve request by entity hash", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("test-entity-query"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("random-salt-query"));

      const tx = await randomProof.connect(user1).requestRandomness(entityHash, salt);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RandomnessRequested"
      );
      const expectedRequestId = event.args[0];

      const result = await randomProof.getRequestByEntityHash(entityHash);
      expect(result.requestId).to.equal(expectedRequestId);
      expect(result.salt).to.equal(salt);
      expect(result.requester).to.equal(user1.address);
    });
  });

  describe("Access Control", function () {
    it("Should only allow owner to update configuration", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      await expect(
        randomProof.connect(user1).transferOwnership(user1.address)
      ).to.be.revertedWithCustomError(randomProof, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to transfer ownership", async function () {
      const { randomProof, owner, user1 } = await loadFixture(deployRandomProofFixture);
      
      await randomProof.connect(owner).transferOwnership(user1.address);
      expect(await randomProof.owner()).to.equal(user1.address);
    });
  });
});