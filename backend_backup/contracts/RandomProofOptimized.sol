// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RandomProofOptimized is VRFConsumerBaseV2Plus, Ownable {
    uint256 private immutable i_subscriptionId;
    bytes32 private immutable i_keyHash;
    uint32 private constant CALLBACK_GAS_LIMIT = 100000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    
    struct RandomnessRequest {
        bytes32 entityHash;
        bytes32 salt;
        uint256 randomness;
        uint64 timestamp;
        bool fulfilled;
        address requester;
    }
    
    mapping(uint256 => RandomnessRequest) public s_requests;
    mapping(bytes32 => uint256) public entityHashToRequestId;
    mapping(bytes32 => bool) public processedEntityHashes;
    
    uint256 public requestCount;
    
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
    
    error EntityAlreadyProcessed(bytes32 entityHash);
    error RequestNotFound(uint256 requestId);
    
    constructor(
        uint256 subscriptionId,
        address vrfCoordinator,
        bytes32 keyHash
    ) VRFConsumerBaseV2Plus(vrfCoordinator) Ownable(msg.sender) {
        i_subscriptionId = subscriptionId;
        i_keyHash = keyHash;
    }
    
    function requestRandomness(
        bytes32 entityHash,
        bytes32 salt
    ) external returns (uint256 requestId) {
        if (processedEntityHashes[entityHash]) {
            revert EntityAlreadyProcessed(entityHash);
        }
        
        processedEntityHashes[entityHash] = true;
        
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: i_keyHash,
                subId: i_subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: CALLBACK_GAS_LIMIT,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );
        
        s_requests[requestId] = RandomnessRequest({
            entityHash: entityHash,
            salt: salt,
            randomness: 0,
            timestamp: uint64(block.timestamp),
            fulfilled: false,
            requester: msg.sender
        });
        
        entityHashToRequestId[entityHash] = requestId;
        unchecked {
            ++requestCount;
        }
        
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
    }
    
    function getRequest(uint256 requestId) 
        external 
        view 
        returns (
            bytes32 entityHash,
            bytes32 salt,
            uint256 randomness,
            uint64 timestamp,
            bool fulfilled,
            address requester
        ) 
    {
        RandomnessRequest memory request = s_requests[requestId];
        return (
            request.entityHash,
            request.salt,
            request.randomness,
            request.timestamp,
            request.fulfilled,
            request.requester
        );
    }
    
    function getRequestByEntityHash(bytes32 entityHash) 
        external 
        view 
        returns (
            uint256 requestId,
            bytes32 salt,
            uint256 randomness,
            uint64 timestamp,
            bool fulfilled,
            address requester
        ) 
    {
        requestId = entityHashToRequestId[entityHash];
        RandomnessRequest memory request = s_requests[requestId];
        return (
            requestId,
            request.salt,
            request.randomness,
            request.timestamp,
            request.fulfilled,
            request.requester
        );
    }
    
    function isEntityProcessed(bytes32 entityHash) 
        external 
        view 
        returns (bool) 
    {
        return processedEntityHashes[entityHash];
    }
    
    function batchCheckEntities(bytes32[] calldata entityHashes)
        external
        view
        returns (bool[] memory results)
    {
        uint256 length = entityHashes.length;
        results = new bool[](length);
        
        for (uint256 i; i < length;) {
            results[i] = processedEntityHashes[entityHashes[i]];
            unchecked { ++i; }
        }
    }
}