// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

contract RandomProof is VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_keyHash;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    
    struct RandomnessRequest {
        string entityHash;
        string salt;
        uint256 randomness;
        bool fulfilled;
        address requester;
        uint256 requestBlock;
        uint256 fulfilledBlock;
    }
    
    mapping(uint256 => RandomnessRequest) private s_requests;
    
    mapping(string => uint256) private s_entityHashToRequestId;
    
    mapping(string => bool) private s_entityHashProcessed;
    
    event RandomnessRequested(
        uint256 indexed requestId,
        string entityHash,
        string salt,
        address indexed requester,
        uint256 blockNumber
    );
    
    event RandomnessFulfilled(
        uint256 indexed requestId,
        string entityHash,
        uint256 randomness,
        uint256 blockNumber
    );
    
    error EntityHashAlreadyProcessed(string entityHash);
    error InvalidEntityHash();
    error RequestNotFound();
    error RandomnessNotFulfilled();
    
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
        string memory entityHash,
        string memory salt
    ) external returns (uint256 requestId) {
        if (bytes(entityHash).length != 64) {
            revert InvalidEntityHash();
        }
        
        if (s_entityHashProcessed[entityHash]) {
            revert EntityHashAlreadyProcessed(entityHash);
        }
        
        requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        
        s_requests[requestId] = RandomnessRequest({
            entityHash: entityHash,
            salt: salt,
            randomness: 0,
            fulfilled: false,
            requester: msg.sender,
            requestBlock: block.number,
            fulfilledBlock: 0
        });
        
        s_entityHashToRequestId[entityHash] = requestId;
        s_entityHashProcessed[entityHash] = true;
        
        emit RandomnessRequested(
            requestId,
            entityHash,
            salt,
            msg.sender,
            block.number
        );
    }
    
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        RandomnessRequest storage request = s_requests[requestId];
        
        request.randomness = randomWords[0];
        request.fulfilled = true;
        request.fulfilledBlock = block.number;
        
        emit RandomnessFulfilled(
            requestId,
            request.entityHash,
            randomWords[0],
            block.number
        );
    }
    
    function getRandomnessForEntityHash(
        string memory entityHash
    ) external view returns (uint256 randomness, bool fulfilled) {
        uint256 requestId = s_entityHashToRequestId[entityHash];
        if (requestId == 0) {
            revert RequestNotFound();
        }
        
        RandomnessRequest memory request = s_requests[requestId];
        return (request.randomness, request.fulfilled);
    }
    
    function getRequestDetails(
        uint256 requestId
    ) external view returns (RandomnessRequest memory) {
        RandomnessRequest memory request = s_requests[requestId];
        if (bytes(request.entityHash).length == 0) {
            revert RequestNotFound();
        }
        return request;
    }
    
    function getRequestIdForEntityHash(
        string memory entityHash
    ) external view returns (uint256) {
        uint256 requestId = s_entityHashToRequestId[entityHash];
        if (requestId == 0) {
            revert RequestNotFound();
        }
        return requestId;
    }
    
    function isEntityHashProcessed(
        string memory entityHash
    ) external view returns (bool) {
        return s_entityHashProcessed[entityHash];
    }
}