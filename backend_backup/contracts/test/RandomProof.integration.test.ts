import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { RandomProofOptimized } from "../typechain-types";

describe("RandomProof Integration Tests", function () {
  async function deployRandomProofFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();
    
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
    
    return { randomProof, mockVRFCoordinator, owner, user1, user2, user3 };
  }
  
  describe("End-to-End Flow", function () {
    it("Should handle complete flow from request to fulfillment", async function () {
      const { randomProof, mockVRFCoordinator, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const salt = ethers.keccak256(ethers.toUtf8Bytes("mysalt123"));
      
      expect(await randomProof.isEntityHashProcessed(entityHash)).to.be.false;
      
      const tx = await randomProof.connect(user1).requestRandomness(entityHash, salt);
      await tx.wait();
      
      expect(await randomProof.isEntityHashProcessed(entityHash)).to.be.true;
      
      const requestId = await randomProof.getRequestIdForEntityHash(entityHash);
      expect(requestId).to.equal(1);
      
      let [randomness, fulfilled] = await randomProof.getRandomnessForEntityHash(entityHash);
      expect(fulfilled).to.be.false;
      expect(randomness).to.equal(0);
      
      const randomValue = ethers.toBigInt("0x123456789abcdef");
      await mockVRFCoordinator.fulfillRandomWords(
        requestId,
        await randomProof.getAddress(),
        [randomValue]
      );
      
      [randomness, fulfilled] = await randomProof.getRandomnessForEntityHash(entityHash);
      expect(fulfilled).to.be.true;
      expect(randomness).to.equal(randomValue);
      
      const details = await randomProof.getRequestDetails(requestId);
      expect(details.fulfilled).to.be.true;
      expect(details.randomness).to.equal(randomValue);
      expect(details.requester).to.equal(user1.address);
    });
    
    it("Should handle multiple concurrent requests", async function () {
      const { randomProof, mockVRFCoordinator, user1, user2, user3 } = await loadFixture(deployRandomProofFixture);
      
      const requests = [
        { user: user1, entityHash: "1".repeat(64), salt: ethers.keccak256(ethers.toUtf8Bytes("salt1")) },
        { user: user2, entityHash: "2".repeat(64), salt: ethers.keccak256(ethers.toUtf8Bytes("salt2")) },
        { user: user3, entityHash: "3".repeat(64), salt: ethers.keccak256(ethers.toUtf8Bytes("salt3")) }
      ];
      
      for (const req of requests) {
        await randomProof.connect(req.user).requestRandomness(req.entityHash, req.salt);
      }
      
      for (let i = 0; i < requests.length; i++) {
        const requestId = i + 1;
        const randomValue = ethers.toBigInt(`0x${(i + 1).toString(16).padStart(16, '0')}`);
        
        await mockVRFCoordinator.fulfillRandomWords(
          requestId,
          await randomProof.getAddress(),
          [randomValue]
        );
        
        const [randomness, fulfilled] = await randomProof.getRandomnessForEntityHash(requests[i].entityHash);
        expect(fulfilled).to.be.true;
        expect(randomness).to.equal(randomValue);
      }
    });
  });
  
  describe("Browser Integration Scenarios", function () {
    it("Should emit events parseable by web3 libraries", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = "4".repeat(64);
      const salt = ethers.keccak256(ethers.toUtf8Bytes("browser-test"));
      
      const tx = await randomProof.connect(user1).requestRandomness(entityHash, salt);
      const receipt = await tx.wait();
      
      const requestEvent = receipt?.logs.find(
        log => log.topics[0] === randomProof.interface.getEvent("RandomnessRequested").topicHash
      );
      
      expect(requestEvent).to.not.be.undefined;
      expect(requestEvent?.topics.length).to.equal(4);
      
      const decodedLog = randomProof.interface.parseLog({
        topics: requestEvent!.topics as string[],
        data: requestEvent!.data
      });
      
      expect(decodedLog?.args.entityHash).to.equal(entityHash);
      expect(decodedLog?.args.salt).to.equal(salt);
      expect(decodedLog?.args.requester).to.equal(user1.address);
    });
    
    it("Should handle transaction tracking by entity hash", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = "5".repeat(64);
      const salt = ethers.keccak256(ethers.toUtf8Bytes("track-test"));
      
      const tx = await randomProof.connect(user1).requestRandomness(entityHash, salt);
      await tx.wait();
      
      const requestId = await randomProof.getRequestIdForEntityHash(entityHash);
      
      const filter = randomProof.filters.RandomnessRequested(requestId);
      const events = await randomProof.queryFilter(filter);
      
      expect(events.length).to.equal(1);
      expect(events[0].args.requestId).to.equal(requestId);
    });
  });
  
  describe("Error Scenarios", function () {
    it("Should handle invalid coordinator responses gracefully", async function () {
      const { randomProof, mockVRFCoordinator, user1 } = await loadFixture(deployRandomProofFixture);
      
      const entityHash = "6".repeat(64);
      const salt = ethers.keccak256(ethers.toUtf8Bytes("error-test"));
      
      await randomProof.connect(user1).requestRandomness(entityHash, salt);
      
      await expect(
        mockVRFCoordinator.fulfillRandomWords(
          999,
          await randomProof.getAddress(),
          [123]
        )
      ).to.be.revertedWith("Invalid consumer");
    });
    
    it("Should validate entity hash format consistently", async function () {
      const { randomProof, user1 } = await loadFixture(deployRandomProofFixture);
      
      const invalidHashes = [
        "",
        "a",
        "a".repeat(63),
        "a".repeat(65),
        "xyz",
        "0x" + "a".repeat(64)
      ];
      
      const saltBytes32 = ethers.keccak256(ethers.toUtf8Bytes("salt"));
      for (const hash of invalidHashes) {
        await expect(
          randomProof.connect(user1).requestRandomness(hash, saltBytes32)
        ).to.be.revertedWithCustomError(randomProof, "InvalidEntityHash");
      }
    });
  });
  
  describe("Gas Usage Patterns", function () {
    it("Should maintain consistent gas usage across operations", async function () {
      const { randomProof, mockVRFCoordinator, user1 } = await loadFixture(deployRandomProofFixture);
      
      const gasUsage = [];
      
      for (let i = 7; i <= 10; i++) {
        const entityHash = i.toString().repeat(64);
        const salt = ethers.keccak256(ethers.toUtf8Bytes(`gas-test-${i}`));
        
        const tx = await randomProof.connect(user1).requestRandomness(entityHash, salt);
        const receipt = await tx.wait();
        gasUsage.push(receipt!.gasUsed);
      }
      
      const avgGas = gasUsage.reduce((a, b) => a + b, 0n) / BigInt(gasUsage.length);
      const maxDeviation = gasUsage.reduce((max, gas) => {
        const deviation = gas > avgGas ? gas - avgGas : avgGas - gas;
        return deviation > max ? deviation : max;
      }, 0n);
      
      expect(maxDeviation).to.be.lessThan(avgGas / 10n);
    });
  });
});