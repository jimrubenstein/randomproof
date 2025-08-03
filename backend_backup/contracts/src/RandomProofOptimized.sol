// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

contract RandomProofOptimized is VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_keyHash;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    
    struct RandomnessRequest {
        bytes32 entityHashBytes32;
        bytes32 salt;
        uint256 randomness;
        address requester;
        uint32 requestBlock;
        uint32 fulfilledBlock;
        bool fulfilled;
    }
    
    mapping(uint256 => RandomnessRequest) private s_requests;
    
    mapping(bytes32 => uint256) private s_entityHashToRequestId;
    
    event RandomnessRequested(
        uint256 indexed requestId,
        bytes32 indexed entityHashBytes32,
        string entityHash,
        bytes32 salt,
        address indexed requester
    );
    
    event RandomnessFulfilled(
        uint256 indexed requestId,
        bytes32 indexed entityHashBytes32,
        uint256 randomness
    );
    
    error EntityHashAlreadyProcessed(bytes32 entityHashBytes32);
    error InvalidEntityHash();
    error RequestNotFound();
    
    constructor(
        uint64 subscriptionId,
        address vrfCoordinator,
        bytes32 keyHash,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinator) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinator);
        i_subscriptionId = subscriptionId;
        i_keyHash = keyHash;
        i_callbackGasLimit = callbackGasLimit;
    }
    
    function requestRandomness(
        string calldata entityHash,
        bytes32 salt
    ) external returns (uint256 requestId) {
        if (bytes(entityHash).length != 64) {
            revert InvalidEntityHash();
        }
        
        bytes32 entityHashBytes32 = keccak256(bytes(entityHash));
        
        if (s_entityHashToRequestId[entityHashBytes32] != 0) {
            revert EntityHashAlreadyProcessed(entityHashBytes32);
        }
        
        requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        
        s_requests[requestId] = RandomnessRequest({
            entityHashBytes32: entityHashBytes32,
            salt: salt,
            randomness: 0,
            requester: msg.sender,
            requestBlock: uint32(block.number),
            fulfilledBlock: 0,
            fulfilled: false
        });
        
        s_entityHashToRequestId[entityHashBytes32] = requestId;
        
        emit RandomnessRequested(
            requestId,
            entityHashBytes32,
            entityHash,
            salt,
            msg.sender
        );
    }
    
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        RandomnessRequest storage request = s_requests[requestId];
        
        request.randomness = randomWords[0];
        request.fulfilled = true;
        request.fulfilledBlock = uint32(block.number);
        
        emit RandomnessFulfilled(
            requestId,
            request.entityHashBytes32,
            randomWords[0]
        );
    }
    
    function getRandomnessForEntityHash(
        string calldata entityHash
    ) external view returns (uint256 randomness, bool fulfilled) {
        bytes32 entityHashBytes32 = keccak256(bytes(entityHash));
        uint256 requestId = s_entityHashToRequestId[entityHashBytes32];
        
        if (requestId == 0) {
            revert RequestNotFound();
        }
        
        RandomnessRequest memory request = s_requests[requestId];
        return (request.randomness, request.fulfilled);
    }
    
    function getRequestDetails(
        uint256 requestId
    ) external view returns (
        bytes32 entityHashBytes32,
        bytes32 salt,
        uint256 randomness,
        address requester,
        uint32 requestBlock,
        uint32 fulfilledBlock,
        bool fulfilled
    ) {
        RandomnessRequest memory request = s_requests[requestId];
        
        if (request.requester == address(0)) {
            revert RequestNotFound();
        }
        
        return (
            request.entityHashBytes32,
            request.salt,
            request.randomness,
            request.requester,
            request.requestBlock,
            request.fulfilledBlock,
            request.fulfilled
        );
    }
    
    function getRequestIdForEntityHash(
        string calldata entityHash
    ) external view returns (uint256) {
        bytes32 entityHashBytes32 = keccak256(bytes(entityHash));
        uint256 requestId = s_entityHashToRequestId[entityHashBytes32];
        
        if (requestId == 0) {
            revert RequestNotFound();
        }
        
        return requestId;
    }
    
    function isEntityHashProcessed(
        string calldata entityHash
    ) external view returns (bool) {
        bytes32 entityHashBytes32 = keccak256(bytes(entityHash));
        return s_entityHashToRequestId[entityHashBytes32] != 0;
    }
}