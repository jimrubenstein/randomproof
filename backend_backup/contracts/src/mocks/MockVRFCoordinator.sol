// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

contract MockVRFCoordinator {
    uint256 private s_nextRequestId = 1;
    
    mapping(uint256 => address) private s_consumers;
    
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
            msg.sender
        );
        
        return requestId;
    }
    
    function fulfillRandomWords(
        uint256 requestId,
        address consumer,
        uint256[] memory randomWords
    ) external {
        require(s_consumers[requestId] == consumer, "Invalid consumer");
        
        VRFConsumerBaseV2(consumer).rawFulfillRandomWords(requestId, randomWords);
    }
    
    function fulfillRandomWordsWithOverride(
        uint256 requestId,
        address consumer,
        uint256[] memory randomWords
    ) external {
        VRFConsumerBaseV2(consumer).rawFulfillRandomWords(requestId, randomWords);
    }
}