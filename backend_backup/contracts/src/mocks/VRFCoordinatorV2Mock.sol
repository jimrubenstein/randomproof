// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

contract VRFCoordinatorV2Mock is VRFCoordinatorV2Interface {
    uint256 private s_nextRequestId = 1;
    uint256 private s_nextSubId = 1;
    
    struct Subscription {
        address owner;
        uint96 balance;
        uint64 reqCount;
        address[] consumers;
    }
    
    mapping(uint64 => Subscription) private s_subscriptions;
    mapping(uint256 => address) private s_consumers;
    
    event SubscriptionCreated(uint64 indexed subId, address owner);
    event SubscriptionFunded(uint64 indexed subId, uint256 oldBalance, uint256 newBalance);
    event SubscriptionConsumerAdded(uint64 indexed subId, address consumer);
    event RandomWordsRequested(
        bytes32 indexed keyHash,
        uint256 requestId,
        uint256 preSeed,
        uint64 indexed subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords,
        address indexed sender
    );
    event RandomWordsFulfilled(uint256 indexed requestId, uint256 outputSeed, uint96 payment, bool success);
    
    function createSubscription() external override returns (uint64) {
        uint64 subId = uint64(s_nextSubId++);
        s_subscriptions[subId] = Subscription({
            owner: msg.sender,
            balance: 0,
            reqCount: 0,
            consumers: new address[](0)
        });
        emit SubscriptionCreated(subId, msg.sender);
        return subId;
    }
    
    function getSubscription(uint64 subId) 
        external 
        view 
        override 
        returns (
            uint96 balance,
            uint64 reqCount,
            address owner,
            address[] memory consumers
        ) 
    {
        Subscription memory sub = s_subscriptions[subId];
        return (sub.balance, sub.reqCount, sub.owner, sub.consumers);
    }
    
    function requestSubscriptionOwnerTransfer(uint64 subId, address newOwner) external override {
        require(s_subscriptions[subId].owner == msg.sender, "Not subscription owner");
        // In mock, we just do instant transfer
        s_subscriptions[subId].owner = newOwner;
    }
    
    function acceptSubscriptionOwnerTransfer(uint64 subId) external override {
        // In mock, transfer is instant, so nothing to do
    }
    
    function addConsumer(uint64 subId, address consumer) external override {
        require(s_subscriptions[subId].owner == msg.sender, "Not subscription owner");
        s_subscriptions[subId].consumers.push(consumer);
        emit SubscriptionConsumerAdded(subId, consumer);
    }
    
    function removeConsumer(uint64 subId, address consumer) external override {
        require(s_subscriptions[subId].owner == msg.sender, "Not subscription owner");
        address[] storage consumers = s_subscriptions[subId].consumers;
        for (uint i = 0; i < consumers.length; i++) {
            if (consumers[i] == consumer) {
                consumers[i] = consumers[consumers.length - 1];
                consumers.pop();
                break;
            }
        }
    }
    
    function cancelSubscription(uint64 subId, address to) external override {
        require(s_subscriptions[subId].owner == msg.sender, "Not subscription owner");
        uint96 balance = s_subscriptions[subId].balance;
        delete s_subscriptions[subId];
        // In real implementation, would refund LINK
    }
    
    function pendingRequestExists(uint64 subId) external view override returns (bool) {
        return false; // Mock has no pending requests
    }
    
    function getRequestConfig() external view override returns (uint16, uint32, bytes32[] memory) {
        bytes32[] memory keyHashes = new bytes32[](1);
        keyHashes[0] = 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c;
        return (3, 2500000, keyHashes); // minimumRequestConfirmations, maxGasLimit, keyHashes
    }
    
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external override returns (uint256) {
        // Check consumer is authorized
        bool authorized = false;
        address[] memory consumers = s_subscriptions[subId].consumers;
        for (uint i = 0; i < consumers.length; i++) {
            if (consumers[i] == msg.sender) {
                authorized = true;
                break;
            }
        }
        require(authorized, "Not authorized consumer");
        
        uint256 requestId = s_nextRequestId++;
        s_consumers[requestId] = msg.sender;
        s_subscriptions[subId].reqCount++;
        
        emit RandomWordsRequested(
            keyHash,
            requestId,
            block.timestamp,
            subId,
            minimumRequestConfirmations,
            callbackGasLimit,
            numWords,
            msg.sender
        );
        
        return requestId;
    }
    
    // Mock-specific functions for testing
    function fundSubscription(uint64 subId, uint96 amount) external {
        uint256 oldBalance = s_subscriptions[subId].balance;
        s_subscriptions[subId].balance += amount;
        emit SubscriptionFunded(subId, oldBalance, s_subscriptions[subId].balance);
    }
    
    function fulfillRandomWords(uint256 requestId, address consumer, uint256[] memory randomWords) external {
        require(s_consumers[requestId] == consumer, "Wrong consumer");
        
        VRFConsumerBaseV2(consumer).rawFulfillRandomWords(requestId, randomWords);
        
        emit RandomWordsFulfilled(requestId, randomWords[0], 0, true);
    }
    
    function fulfillRandomWordsWithOverride(
        uint256 requestId,
        address consumer,
        uint256[] memory randomWords
    ) external {
        // Skip consumer check for testing
        VRFConsumerBaseV2(consumer).rawFulfillRandomWords(requestId, randomWords);
        emit RandomWordsFulfilled(requestId, randomWords.length > 0 ? randomWords[0] : 0, 0, true);
    }
}