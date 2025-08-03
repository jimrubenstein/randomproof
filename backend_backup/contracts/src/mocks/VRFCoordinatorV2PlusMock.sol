// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

contract VRFCoordinatorV2PlusMock {
    uint256 private s_nextRequestId = 1;
    mapping(uint256 => address) private s_consumers;
    
    struct Subscription {
        uint96 balance;
        uint64 reqCount;
        address owner;
        address[] consumers;
    }
    
    mapping(uint256 => Subscription) private s_subscriptions;
    
    event RandomWordsRequested(
        bytes32 indexed keyHash,
        uint256 requestId,
        uint256 preSeed,
        uint256 indexed subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords,
        bytes extraArgs,
        address indexed sender
    );
    
    event RandomWordsFulfilled(
        uint256 indexed requestId,
        uint256 outputSeed,
        uint256 indexed subId,
        uint96 payment,
        bool success,
        bool onlyPremium
    );
    
    function createSubscription() external returns (uint256) {
        uint256 subId = block.timestamp;
        s_subscriptions[subId] = Subscription({
            balance: 0,
            reqCount: 0,
            owner: msg.sender,
            consumers: new address[](0)
        });
        return subId;
    }
    
    function addConsumer(uint256 subId, address consumer) external {
        s_subscriptions[subId].consumers.push(consumer);
    }
    
    function fundSubscription(uint256 subId, uint96 amount) external {
        s_subscriptions[subId].balance += amount;
    }
    
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256) {
        uint256 requestId = s_nextRequestId++;
        s_consumers[requestId] = msg.sender;
        
        emit RandomWordsRequested(
            keyHash,
            requestId,
            block.timestamp,
            subId,
            minimumRequestConfirmations,
            callbackGasLimit,
            numWords,
            "", // extraArgs
            msg.sender
        );
        
        s_subscriptions[subId].reqCount++;
        
        return requestId;
    }
    
    function fulfillRandomWords(
        uint256 requestId,
        address consumer
    ) external {
        fulfillRandomWordsWithOverride(requestId, consumer, new uint256[](1));
    }
    
    function fulfillRandomWordsWithOverride(
        uint256 requestId,
        address consumer,
        uint256[] memory randomWords
    ) public {
        require(s_consumers[requestId] == consumer || consumer != address(0), "Invalid consumer");
        
        if (randomWords.length == 0) {
            randomWords = new uint256[](1);
            randomWords[0] = uint256(keccak256(abi.encode(requestId, block.timestamp)));
        }
        
        VRFConsumerBaseV2(consumer).rawFulfillRandomWords(requestId, randomWords);
        
        emit RandomWordsFulfilled(
            requestId,
            randomWords[0],
            0, // subId
            0, // payment
            true, // success
            false // onlyPremium
        );
    }
    
    function getSubscription(uint256 subId) 
        external 
        view 
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
}