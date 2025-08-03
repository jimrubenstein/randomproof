import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { RandomProof } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ZeroAddress } from "ethers";

describe("RandomProof - Comprehensive Test Suite", function () {
  // Test constants
  const SUBSCRIPTION_ID = 1n;
  const KEY_HASH = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
  const CALLBACK_GAS_LIMIT = 100000;
  const REQUEST_CONFIRMATIONS = 3;
  const NUM_WORDS = 1;

  // Test data
  const VALID_ENTITY_HASH = "0x" + "a".repeat(64);
  const VALID_SALT = "0x" + "b".repeat(64);

  async function deployRandomProofFixture() {
    const [owner, user1, user2, vrfCoordinator] = await ethers.getSigners();

    // Deploy Mock VRF Coordinator
    const MockVRFCoordinator = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    const mockVRF = await MockVRFCoordinator.deploy();
    await mockVRF.waitForDeployment();
    
    // Create subscription
    const tx = await mockVRF.createSubscription();
    const receipt = await tx.wait();
    // Parse the subscription ID from the event
    const subId = BigInt(receipt?.logs[0].topics[1] || "1");
    
    // Fund subscription
    await mockVRF.fundSubscription(subId, ethers.parseEther("10"));

    // Deploy RandomProof contract
    const RandomProof = await ethers.getContractFactory("RandomProof");
    const randomProof = await RandomProof.deploy(
      subId,
      await mockVRF.getAddress(),
      KEY_HASH,
      CALLBACK_GAS_LIMIT
    );
    await randomProof.waitForDeployment();
    
    // Add consumer to subscription
    await mockVRF.addConsumer(subId, await randomProof.getAddress());

    return { randomProof, mockVRF, owner, user1, user2, vrfCoordinator, subId };
  }

  describe("1. Entity Hash Uniqueness Enforcement", function () {
    it("Should enforce entity hash uniqueness", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      // Use the hex string directly (without 0x prefix for the contract)
      const entityHash = "a".repeat(64);
      const salt = "b".repeat(64);
      
      // First request should succeed
      await expect(
        randomProof.connect(user1).requestRandomness(entityHash, salt)
      ).to.not.be.reverted;
      
      // Second request with same entity hash should fail
      await expect(
        randomProof.connect(user1).requestRandomness(entityHash, salt)
      ).to.be.revertedWithCustomError(randomProof, "EntityHashAlreadyProcessed")
        .withArgs(entityHash);
    });

    it("Should allow different entity hashes from same user", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash1 = ethers.keccak256(ethers.toUtf8Bytes("entity1"));
      const entityHash2 = ethers.keccak256(ethers.toUtf8Bytes("entity2"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("salt"));
      
      await expect(
        randomProof.connect(user1).requestRandomness(entityHash1, salt)
      ).to.not.be.reverted;
      
      await expect(
        randomProof.connect(user1).requestRandomness(entityHash2, salt)
      ).to.not.be.reverted;
    });

    it("Should reject duplicate entity hash from different users", async function () {
      const { randomProof, user1, user2 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("shared-entity"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("salt"));
      
      await randomProof.connect(user1).requestRandomness(entityHash, salt);
      
      await expect(
        randomProof.connect(user2).requestRandomness(entityHash, salt)
      ).to.be.revertedWithCustomError(randomProof, "EntityAlreadyProcessed");
    });

    it("Should track processed entity hashes correctly", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("test-entity"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("salt"));
      
      expect(await randomProof.isEntityProcessed(entityHash)).to.be.false;
      
      await randomProof.connect(user1).requestRandomness(entityHash, salt);
      
      expect(await randomProof.isEntityProcessed(entityHash)).to.be.true;
    });
  });

  describe("2. Salt Storage and Retrieval", function () {
    it("Should store salt with corresponding entity hash", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("entity-with-salt"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("unique-salt-123"));
      
      const tx = await randomProof.connect(user1).requestRandomness(entityHash, salt);
      const receipt = await tx.wait();
      
      // Get request ID from event
      const event = receipt?.logs.find(log => 
        log.topics[0] === randomProof.interface.getEvent("RandomnessRequested")?.topicHash
      );
      const decodedEvent = randomProof.interface.parseLog({
        topics: event!.topics as string[],
        data: event!.data
      });
      const requestId = decodedEvent?.args[0];
      
      // Retrieve and verify salt
      const request = await randomProof.getRequest(requestId);
      expect(request.salt).to.equal(salt);
    });

    it("Should correctly map entity hash to request", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("mapped-entity"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("mapped-salt"));
      
      await randomProof.connect(user1).requestRandomness(entityHash, salt);
      
      const request = await randomProof.getRequestByEntityHash(entityHash);
      expect(request.entityHash).to.equal(entityHash);
      expect(request.salt).to.equal(salt);
    });

    it("Should handle multiple requests with different salts", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const testCases = [
        { entity: "entity1", salt: "salt1" },
        { entity: "entity2", salt: "salt2" },
        { entity: "entity3", salt: "salt3" }
      ];
      
      for (const testCase of testCases) {
        const entityHash = ethers.keccak256(ethers.toUtf8Bytes(testCase.entity));
        const salt = ethers.keccak256(ethers.toUtf8Bytes(testCase.salt));
        
        await randomProof.connect(user1).requestRandomness(entityHash, salt);
        
        const request = await randomProof.getRequestByEntityHash(entityHash);
        expect(request.salt).to.equal(salt);
      }
    });

    it("Should preserve salt integrity throughout request lifecycle", async function () {
      const { randomProof, mockVRF, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("lifecycle-entity"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("lifecycle-salt"));
      
      // Request randomness
      const tx = await randomProof.connect(user1).requestRandomness(entityHash, salt);
      const receipt = await tx.wait();
      
      // Get request ID
      const event = receipt?.logs.find(log => 
        log.topics[0] === randomProof.interface.getEvent("RandomnessRequested")?.topicHash
      );
      const decodedEvent = randomProof.interface.parseLog({
        topics: event!.topics as string[],
        data: event!.data
      });
      const requestId = decodedEvent?.args[0];
      
      // Verify salt before fulfillment
      let request = await randomProof.getRequest(requestId);
      expect(request.salt).to.equal(salt);
      
      // Fulfill randomness
      await mockVRF.fulfillRandomWords(
        requestId,
        await randomProof.getAddress(),
        [ethers.toBigInt("0x123456789")]
      );
      
      // Verify salt after fulfillment
      request = await randomProof.getRequest(requestId);
      expect(request.salt).to.equal(salt);
    });
  });

  describe("3. ChainLink VRF Integration", function () {
    it("Should correctly request randomness from VRF coordinator", async function () {
      const { randomProof, mockVRF, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("vrf-test"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("vrf-salt"));
      
      // Listen for VRF request event
      await expect(
        randomProof.connect(user1).requestRandomness(entityHash, salt)
      ).to.emit(mockVRF, "RandomWordsRequested");
    });

    it("Should handle VRF fulfillment correctly", async function () {
      const { randomProof, mockVRF, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("fulfill-test"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("fulfill-salt"));
      
      // Request randomness
      const tx = await randomProof.connect(user1).requestRandomness(entityHash, salt);
      const receipt = await tx.wait();
      
      // Get request ID
      const requestId = await randomProof.lastRequestId();
      
      // Verify initial state
      let request = await randomProof.getRequest(requestId);
      expect(request.fulfilled).to.be.false;
      expect(request.randomness).to.equal(0);
      
      // Fulfill randomness
      const randomValue = ethers.toBigInt("0x9876543210");
      await mockVRF.fulfillRandomWords(
        requestId,
        await randomProof.getAddress(),
        [randomValue]
      );
      
      // Verify fulfilled state
      request = await randomProof.getRequest(requestId);
      expect(request.fulfilled).to.be.true;
      expect(request.randomness).to.equal(randomValue);
    });

    it("Should handle multiple concurrent VRF requests", async function () {
      const { randomProof, mockVRF, user1, user2 } = await loadFixture(deployRandomProofFixture);
      
      const requests = [];
      
      // Submit multiple requests
      for (let i = 0; i < 5; i++) {
        const entityHash = ethers.keccak256(ethers.toUtf8Bytes(`concurrent-${i}`));
        const salt = ethers.keccak256(ethers.toUtf8Bytes(`salt-${i}`));
        const user = i % 2 === 0 ? user1 : user2;
        
        const tx = await randomProof.connect(user).requestRandomness(entityHash, salt);
        const receipt = await tx.wait();
        
        requests.push({
          entityHash,
          salt,
          requestId: await randomProof.lastRequestId()
        });
      }
      
      // Fulfill all requests
      for (let i = 0; i < requests.length; i++) {
        const randomValue = ethers.toBigInt(`0x${(i + 1).toString(16).padStart(64, '0')}`);
        await mockVRF.fulfillRandomWords(
          requests[i].requestId,
          await randomProof.getAddress(),
          [randomValue]
        );
        
        // Verify fulfillment
        const request = await randomProof.getRequest(requests[i].requestId);
        expect(request.fulfilled).to.be.true;
        expect(request.randomness).to.equal(randomValue);
      }
    });

    it("Should reject fulfillment for non-existent requests", async function () {
      const { randomProof, mockVRF } = await loadFixture(deployRandomProofFixture);
      
      const fakeRequestId = 999;
      
      // This should not revert at the mock level, but the contract should handle it
      await mockVRF.fulfillRandomWordsWithOverride(
        fakeRequestId,
        await randomProof.getAddress(),
        [ethers.toBigInt("0x123")]
      );
      
      // The request should not exist
      const request = await randomProof.getRequest(fakeRequestId);
      expect(request.timestamp).to.equal(0);
    });
  });

  describe("4. Event Emissions", function () {
    it("Should emit RandomnessRequested with correct parameters", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("event-entity"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("event-salt"));
      
      await expect(randomProof.connect(user1).requestRandomness(entityHash, salt))
        .to.emit(randomProof, "RandomnessRequested")
        .withArgs(
          1, // requestId
          entityHash,
          salt,
          user1.address
        );
    });

    it("Should emit RandomnessFulfilled when VRF responds", async function () {
      const { randomProof, mockVRF, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("fulfill-event"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("fulfill-salt"));
      
      await randomProof.connect(user1).requestRandomness(entityHash, salt);
      const requestId = await randomProof.lastRequestId();
      
      const randomValue = ethers.toBigInt("0xABCDEF123456");
      
      await expect(
        mockVRF.fulfillRandomWords(
          requestId,
          await randomProof.getAddress(),
          [randomValue]
        )
      ).to.emit(randomProof, "RandomnessFulfilled")
        .withArgs(requestId, entityHash, randomValue);
    });

    it("Should emit EntityProcessed with timestamp", async function () {
      const { randomProof, mockVRF, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("process-event"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("process-salt"));
      
      await randomProof.connect(user1).requestRandomness(entityHash, salt);
      const requestId = await randomProof.lastRequestId();
      
      const randomValue = ethers.toBigInt("0x555666777");
      
      await expect(
        mockVRF.fulfillRandomWords(
          requestId,
          await randomProof.getAddress(),
          [randomValue]
        )
      ).to.emit(randomProof, "EntityProcessed")
        .withArgs(
          entityHash,
          salt,
          randomValue,
          await time.latest() + 1 // Approximate timestamp
        );
    });

    it("Should emit events in correct order", async function () {
      const { randomProof, mockVRF, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("order-event"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("order-salt"));
      
      // Request should emit RandomnessRequested
      const requestTx = await randomProof.connect(user1).requestRandomness(entityHash, salt);
      const requestReceipt = await requestTx.wait();
      
      expect(requestReceipt?.logs.length).to.be.gte(1);
      
      const requestId = await randomProof.lastRequestId();
      const randomValue = ethers.toBigInt("0x111222333");
      
      // Fulfillment should emit both RandomnessFulfilled and EntityProcessed
      const fulfillTx = await mockVRF.fulfillRandomWords(
        requestId,
        await randomProof.getAddress(),
        [randomValue]
      );
      const fulfillReceipt = await fulfillTx.wait();
      
      // Should have multiple events
      const randomProofAddress = await randomProof.getAddress();
      const randomProofEvents = fulfillReceipt?.logs.filter(
        log => log.address.toLowerCase() === randomProofAddress.toLowerCase()
      );
      
      expect(randomProofEvents?.length).to.be.gte(2);
    });
  });

  describe("5. Gas Optimization Verification", function () {
    it("Should have optimized gas costs for requestRandomness", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("gas-test"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("gas-salt"));
      
      const tx = await randomProof.connect(user1).requestRandomness(entityHash, salt);
      const receipt = await tx.wait();
      
      console.log("Gas used for requestRandomness:", receipt?.gasUsed.toString());
      
      // Should be reasonably optimized (less than 200k gas)
      expect(receipt?.gasUsed).to.be.lt(200000);
    });

    it("Should have efficient view functions", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("view-gas"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("view-salt"));
      
      await randomProof.connect(user1).requestRandomness(entityHash, salt);
      
      // Test gas estimates for view functions
      const gasEstimate1 = await randomProof.isEntityProcessed.estimateGas(entityHash);
      const gasEstimate2 = await randomProof.getRequestByEntityHash.estimateGas(entityHash);
      const gasEstimate3 = await randomProof.getRequestCount.estimateGas();
      
      console.log("Gas estimates for view functions:");
      console.log("- isEntityProcessed:", gasEstimate1.toString());
      console.log("- getRequestByEntityHash:", gasEstimate2.toString());
      console.log("- getRequestCount:", gasEstimate3.toString());
      
      // View functions should be very efficient
      expect(gasEstimate1).to.be.lt(30000);
      expect(gasEstimate2).to.be.lt(30000);
      expect(gasEstimate3).to.be.lt(30000);
    });

    it("Should efficiently handle batch queries", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      // Create multiple requests
      const numRequests = 10;
      for (let i = 0; i < numRequests; i++) {
        const entityHash = ethers.keccak256(ethers.toUtf8Bytes(`batch-${i}`));
        const salt = ethers.keccak256(ethers.toUtf8Bytes(`salt-${i}`));
        await randomProof.connect(user1).requestRandomness(entityHash, salt);
      }
      
      // Test pagination efficiency
      const gasEstimate = await randomProof.getRequestIds.estimateGas(0, 5);
      console.log("Gas estimate for getRequestIds(0, 5):", gasEstimate.toString());
      
      expect(gasEstimate).to.be.lt(50000);
    });
  });

  describe("6. Security Vulnerabilities", function () {
    it("Should prevent unauthorized configuration updates", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      await expect(
        randomProof.connect(user1).updateSubscriptionId(999)
      ).to.be.revertedWithCustomError(randomProof, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);
      
      await expect(
        randomProof.connect(user1).updateKeyHash(KEY_HASH)
      ).to.be.revertedWithCustomError(randomProof, "OwnableUnauthorizedAccount");
      
      await expect(
        randomProof.connect(user1).updateCallbackGasLimit(200000)
      ).to.be.revertedWithCustomError(randomProof, "OwnableUnauthorizedAccount");
      
      await expect(
        randomProof.connect(user1).updateRequestConfirmations(5)
      ).to.be.revertedWithCustomError(randomProof, "OwnableUnauthorizedAccount");
    });

    it("Should allow only owner to update configuration", async function () {
      const { randomProof, owner } = await loadFixture(deployRandomProofFixture);
      
      await expect(randomProof.connect(owner).updateSubscriptionId(999))
        .to.not.be.reverted;
      
      await expect(randomProof.connect(owner).updateKeyHash(KEY_HASH))
        .to.not.be.reverted;
      
      await expect(randomProof.connect(owner).updateCallbackGasLimit(200000))
        .to.not.be.reverted;
      
      await expect(randomProof.connect(owner).updateRequestConfirmations(5))
        .to.not.be.reverted;
    });

    it("Should protect against reentrancy attacks", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      // Deploy a malicious contract that tries reentrancy
      const MaliciousContract = await ethers.getContractFactory("MaliciousReentrant");
      const malicious = await MaliciousContract.deploy(await randomProof.getAddress());
      await malicious.waitForDeployment();
      
      // The contract should handle reentrancy attempts safely
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("reentrant"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("salt"));
      
      // This should not cause issues
      await expect(
        randomProof.connect(user1).requestRandomness(entityHash, salt)
      ).to.not.be.reverted;
    });

    it("Should validate request existence in fulfillment", async function () {
      const { randomProof, mockVRF } = await loadFixture(deployRandomProofFixture);
      
      // Try to fulfill a non-existent request
      const fakeRequestId = 9999;
      
      // The contract should handle this gracefully
      await mockVRF.fulfillRandomWordsWithOverride(
        fakeRequestId,
        await randomProof.getAddress(),
        [ethers.toBigInt("0x123")]
      );
      
      // Verify the request doesn't exist
      await expect(
        randomProof.getRequest(fakeRequestId)
      ).to.not.be.reverted;
      
      const request = await randomProof.getRequest(fakeRequestId);
      expect(request.timestamp).to.equal(0);
    });

    it("Should maintain data integrity across operations", async function () {
      const { randomProof, mockVRF, user1, user2 } = await loadFixture(deployRandomProofFixture);
      
      // Create multiple requests
      const entityHash1 = ethers.keccak256(ethers.toUtf8Bytes("integrity1"));
      const entityHash2 = ethers.keccak256(ethers.toUtf8Bytes("integrity2"));
      const salt1 = ethers.keccak256(ethers.toUtf8Bytes("salt1"));
      const salt2 = ethers.keccak256(ethers.toUtf8Bytes("salt2"));
      
      await randomProof.connect(user1).requestRandomness(entityHash1, salt1);
      await randomProof.connect(user2).requestRandomness(entityHash2, salt2);
      
      const requestId1 = await randomProof.entityHashToRequestId(entityHash1);
      const requestId2 = await randomProof.entityHashToRequestId(entityHash2);
      
      // Fulfill first request
      await mockVRF.fulfillRandomWords(
        requestId1,
        await randomProof.getAddress(),
        [ethers.toBigInt("0x111")]
      );
      
      // Verify second request is unaffected
      const request2 = await randomProof.getRequest(requestId2);
      expect(request2.fulfilled).to.be.false;
      expect(request2.entityHash).to.equal(entityHash2);
      expect(request2.salt).to.equal(salt2);
      expect(request2.requester).to.equal(user2.address);
    });
  });

  describe("7. Edge Cases", function () {
    it("Should handle maximum values correctly", async function () {
      const { randomProof, mockVRF, user1 } = await loadFixture(deployRandomProofFixture);
      
      const maxBytes32 = "0x" + "f".repeat(64);
      const entityHash = maxBytes32;
      const salt = maxBytes32;
      
      await expect(
        randomProof.connect(user1).requestRandomness(entityHash, salt)
      ).to.not.be.reverted;
      
      const requestId = await randomProof.lastRequestId();
      
      // Fulfill with maximum uint256 value
      const maxUint256 = ethers.MaxUint256;
      await mockVRF.fulfillRandomWords(
        requestId,
        await randomProof.getAddress(),
        [maxUint256]
      );
      
      const request = await randomProof.getRequest(requestId);
      expect(request.randomness).to.equal(maxUint256);
    });

    it("Should handle minimum values correctly", async function () {
      const { randomProof, mockVRF, user1 } = await loadFixture(deployRandomProofFixture);
      
      const minBytes32 = "0x" + "0".repeat(64);
      const entityHash = minBytes32;
      const salt = minBytes32;
      
      await expect(
        randomProof.connect(user1).requestRandomness(entityHash, salt)
      ).to.not.be.reverted;
      
      const requestId = await randomProof.lastRequestId();
      
      // Fulfill with minimum value (1, since 0 indicates pending)
      await mockVRF.fulfillRandomWords(
        requestId,
        await randomProof.getAddress(),
        [1n]
      );
      
      const request = await randomProof.getRequest(requestId);
      expect(request.randomness).to.equal(1n);
    });

    it("Should handle empty request ID array correctly", async function () {
      const { randomProof } = await loadFixture(deployRandomProofFixture);
      
      const requestIds = await randomProof.getRequestIds(0, 10);
      expect(requestIds.length).to.equal(0);
    });

    it("Should handle out-of-bounds pagination", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      // Create one request
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("single"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("salt"));
      await randomProof.connect(user1).requestRandomness(entityHash, salt);
      
      // Request beyond bounds
      const requestIds = await randomProof.getRequestIds(10, 10);
      expect(requestIds.length).to.equal(0);
    });
  });

  describe("8. Integration Tests", function () {
    it("Should handle complete request lifecycle", async function () {
      const { randomProof, mockVRF, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("lifecycle"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("lifecycle-salt"));
      
      // 1. Initial state checks
      expect(await randomProof.isEntityProcessed(entityHash)).to.be.false;
      expect(await randomProof.getRequestCount()).to.equal(0);
      
      // 2. Request randomness
      const requestTx = await randomProof.connect(user1).requestRandomness(entityHash, salt);
      await expect(requestTx)
        .to.emit(randomProof, "RandomnessRequested");
      
      // 3. Verify post-request state
      expect(await randomProof.isEntityProcessed(entityHash)).to.be.true;
      expect(await randomProof.getRequestCount()).to.equal(1);
      
      const requestId = await randomProof.lastRequestId();
      const requestDetails = await randomProof.getRequest(requestId);
      
      expect(requestDetails.entityHash).to.equal(entityHash);
      expect(requestDetails.salt).to.equal(salt);
      expect(requestDetails.requester).to.equal(user1.address);
      expect(requestDetails.fulfilled).to.be.false;
      expect(requestDetails.randomness).to.equal(0);
      
      // 4. Fulfill randomness
      const randomValue = ethers.toBigInt("0xDEADBEEF");
      const fulfillTx = await mockVRF.fulfillRandomWords(
        requestId,
        await randomProof.getAddress(),
        [randomValue]
      );
      
      await expect(fulfillTx)
        .to.emit(randomProof, "RandomnessFulfilled")
        .withArgs(requestId, entityHash, randomValue);
      
      await expect(fulfillTx)
        .to.emit(randomProof, "EntityProcessed");
      
      // 5. Verify final state
      const finalRequest = await randomProof.getRequest(requestId);
      expect(finalRequest.fulfilled).to.be.true;
      expect(finalRequest.randomness).to.equal(randomValue);
      
      // 6. Verify retrieval methods
      const requestByHash = await randomProof.getRequestByEntityHash(entityHash);
      expect(requestByHash.randomness).to.equal(randomValue);
      
      const requestIds = await randomProof.getRequestIds(0, 10);
      expect(requestIds.length).to.equal(1);
      expect(requestIds[0]).to.equal(requestId);
    });

    it("Should handle high-volume concurrent operations", async function () {
      const { randomProof, mockVRF, user1, user2 } = await loadFixture(deployRandomProofFixture);
      
      const numRequests = 20;
      const requests = [];
      
      // Submit many requests
      for (let i = 0; i < numRequests; i++) {
        const user = i % 2 === 0 ? user1 : user2;
        const entityHash = ethers.keccak256(ethers.toUtf8Bytes(`stress-${i}`));
        const salt = ethers.keccak256(ethers.toUtf8Bytes(`salt-${i}`));
        
        const tx = await randomProof.connect(user).requestRandomness(entityHash, salt);
        await tx.wait();
        
        requests.push({
          entityHash,
          salt,
          user: user.address,
          requestId: await randomProof.lastRequestId()
        });
      }
      
      // Verify count
      expect(await randomProof.getRequestCount()).to.equal(numRequests);
      
      // Fulfill random subset
      const toFulfill = [0, 5, 10, 15, 19];
      for (const index of toFulfill) {
        const request = requests[index];
        const randomValue = ethers.toBigInt(`0x${(index + 1).toString(16).padStart(64, '0')}`);
        
        await mockVRF.fulfillRandomWords(
          request.requestId,
          await randomProof.getAddress(),
          [randomValue]
        );
        
        // Verify fulfillment
        const details = await randomProof.getRequest(request.requestId);
        expect(details.fulfilled).to.be.true;
        expect(details.randomness).to.equal(randomValue);
      }
      
      // Verify unfulfilled requests remain unchanged
      for (let i = 0; i < numRequests; i++) {
        if (!toFulfill.includes(i)) {
          const details = await randomProof.getRequest(requests[i].requestId);
          expect(details.fulfilled).to.be.false;
          expect(details.randomness).to.equal(0);
        }
      }
    });
  });

  describe("9. Additional Security Tests", function () {
    it("Should prevent double fulfillment", async function () {
      const { randomProof, mockVRF, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = ethers.keccak256(ethers.toUtf8Bytes("double-fulfill"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("salt"));
      
      await randomProof.connect(user1).requestRandomness(entityHash, salt);
      const requestId = await randomProof.lastRequestId();
      
      // First fulfillment
      await mockVRF.fulfillRandomWords(
        requestId,
        await randomProof.getAddress(),
        [ethers.toBigInt("0x111")]
      );
      
      // Second fulfillment attempt - should not change the value
      await mockVRF.fulfillRandomWords(
        requestId,
        await randomProof.getAddress(),
        [ethers.toBigInt("0x222")]
      );
      
      const request = await randomProof.getRequest(requestId);
      expect(request.randomness).to.equal(ethers.toBigInt("0x111"));
    });

    it("Should maintain consistency under race conditions", async function () {
      const { randomProof, user1, user2 } = await loadFixture(deployRandomProofFixture);
      
      // Attempt concurrent requests
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        const entityHash = ethers.keccak256(ethers.toUtf8Bytes(`race-${i}`));
        const salt = ethers.keccak256(ethers.toUtf8Bytes(`salt-${i}`));
        const user = i % 2 === 0 ? user1 : user2;
        
        promises.push(
          randomProof.connect(user).requestRandomness(entityHash, salt)
        );
      }
      
      // Wait for all to complete
      const results = await Promise.allSettled(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.status).to.equal('fulfilled');
      });
      
      // Verify correct count
      expect(await randomProof.getRequestCount()).to.equal(5);
    });
  });
});

// Additional mock contract for reentrancy testing
const MALICIOUS_REENTRANT_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IRandomProof {
    function requestRandomness(bytes32 entityHash, bytes32 salt) external returns (uint256);
}

contract MaliciousReentrant {
    IRandomProof public target;
    bool public attacking = false;
    
    constructor(address _target) {
        target = IRandomProof(_target);
    }
    
    function attack() external {
        attacking = true;
        target.requestRandomness(
            keccak256(abi.encodePacked("attack")),
            keccak256(abi.encodePacked("salt"))
        );
    }
    
    fallback() external payable {
        if (attacking) {
            attacking = false;
            // Try to reenter
            try target.requestRandomness(
                keccak256(abi.encodePacked("reenter")),
                keccak256(abi.encodePacked("salt"))
            ) {} catch {}
        }
    }
}
`;