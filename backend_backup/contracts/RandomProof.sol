// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RandomProof is VRFConsumerBaseV2Plus, Ownable {
    uint256 private s_subscriptionId;
    bytes32 private s_keyHash;
    uint32 private s_callbackGasLimit = 100000;
    uint16 private s_requestConfirmations = 3;
    uint32 private s_numWords = 1;
    
    struct RandomnessRequest {
        bytes32 entityHash;
        bytes32 salt;
        uint256 randomness;
        uint256 timestamp;
        bool fulfilled;
        address requester;
    }
    
    mapping(uint256 => RandomnessRequest) public s_requests;
    mapping(bytes32 => uint256) public entityHashToRequestId;
    mapping(bytes32 => bool) public processedEntityHashes;
    
    uint256[] public requestIds;
    uint256 public lastRequestId;
    
    event RandomnessRequested(
        uint256 indexed requestId,
        bytes32 indexed entityHash,
        bytes32 salt,
        address indexed requester
    );
    
    event RandomnessFulfilled(
        uint256 indexed requestId,
        bytes32 indexed entityHash,
        uint256 randomness
    );
    
    event EntityProcessed(
        bytes32 indexed entityHash,
        bytes32 salt,
        uint256 randomness,
        uint256 timestamp
    );
    
    error EntityAlreadyProcessed(bytes32 entityHash);
    error RequestNotFound(uint256 requestId);
    error UnauthorizedCallback();
    
    constructor(
        uint256 subscriptionId,
        address vrfCoordinator,
        bytes32 keyHash
    ) VRFConsumerBaseV2Plus(vrfCoordinator) Ownable(msg.sender) {
        s_subscriptionId = subscriptionId;
        s_keyHash = keyHash;
    }
    
    function requestRandomness(
        bytes32 entityHash,
        bytes32 salt
    ) external returns (uint256 requestId) {
        if (processedEntityHashes[entityHash]) {
            revert EntityAlreadyProcessed(entityHash);
        }
        
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: s_keyHash,
                subId: s_subscriptionId,
                requestConfirmations: s_requestConfirmations,
                callbackGasLimit: s_callbackGasLimit,
                numWords: s_numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );
        
        s_requests[requestId] = RandomnessRequest({
            entityHash: entityHash,
            salt: salt,
            randomness: 0,
            timestamp: block.timestamp,
            fulfilled: false,
            requester: msg.sender
        });
        
        entityHashToRequestId[entityHash] = requestId;
        processedEntityHashes[entityHash] = true;
        requestIds.push(requestId);
        lastRequestId = requestId;
        
        emit RandomnessRequested(requestId, entityHash, salt, msg.sender);
    }
    
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        RandomnessRequest storage request = s_requests[requestId];
        
        if (request.timestamp == 0) {
            revert RequestNotFound(requestId);
        }
        
        request.randomness = randomWords[0];
        request.fulfilled = true;
        
        emit RandomnessFulfilled(requestId, request.entityHash, randomWords[0]);
        emit EntityProcessed(
            request.entityHash,
            request.salt,
            randomWords[0],
            block.timestamp
        );
    }
    
    function getRequest(uint256 requestId) 
        external 
        view 
        returns (RandomnessRequest memory) 
    {
        return s_requests[requestId];
    }
    
    function getRequestByEntityHash(bytes32 entityHash) 
        external 
        view 
        returns (RandomnessRequest memory) 
    {
        uint256 requestId = entityHashToRequestId[entityHash];
        return s_requests[requestId];
    }
    
    function isEntityProcessed(bytes32 entityHash) 
        external 
        view 
        returns (bool) 
    {
        return processedEntityHashes[entityHash];
    }
    
    function getRequestCount() external view returns (uint256) {
        return requestIds.length;
    }
    
    function getRequestIds(
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory) {
        uint256 length = requestIds.length;
        if (offset >= length) {
            return new uint256[](0);
        }
        
        uint256 end = offset + limit;
        if (end > length) {
            end = length;
        }
        
        uint256[] memory result = new uint256[](end - offset);
        for (uint256 i = 0; i < end - offset; i++) {
            result[i] = requestIds[offset + i];
        }
        
        return result;
    }
    
    function updateSubscriptionId(uint256 subscriptionId) external onlyOwner {
        s_subscriptionId = subscriptionId;
    }
    
    function updateKeyHash(bytes32 keyHash) external onlyOwner {
        s_keyHash = keyHash;
    }
    
    function updateCallbackGasLimit(uint32 callbackGasLimit) external onlyOwner {
        s_callbackGasLimit = callbackGasLimit;
    }
    
    function updateRequestConfirmations(uint16 requestConfirmations) external onlyOwner {
        s_requestConfirmations = requestConfirmations;
    }
}