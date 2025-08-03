// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFCoordinatorV2_5.sol";

contract MockVRFCoordinatorV2Plus is VRFCoordinatorV2_5 {
    uint256 private constant BASE_FEE = 100000000000000000;
    uint256 private constant GAS_PRICE = 1000000000;
    uint96 private constant LINK_ETH_FEED = 4000000000000000;

    constructor() VRFCoordinatorV2_5(address(0)) {
        // Set mock configuration
        setConfig(
            1,     // minimumRequestConfirmations
            1000000, // maxGasLimit
            600,    // stalenessSeconds
            50000   // gasAfterPaymentCalculation
        );
        
        setLINKAndLINKETHFeed(address(0), address(0));
    }

    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest calldata req
    ) external override returns (uint256 requestId) {
        requestId = s_requestId++;
        
        // Store request details
        s_requests[requestId] = RequestCommitment({
            blockNum: uint64(block.number),
            subId: req.subId,
            callbackGasLimit: req.callbackGasLimit,
            numWords: req.numWords,
            sender: msg.sender,
            extraArgs: req.extraArgs
        });

        emit RandomWordsRequested(
            bytes32(0), // keyHash
            requestId,
            0, // preSeed
            req.subId,
            1, // minimumRequestConfirmations
            req.callbackGasLimit,
            req.numWords,
            req.extraArgs,
            msg.sender
        );

        return requestId;
    }

    function fulfillRandomWordsWithOverride(
        uint256 requestId,
        address consumer,
        uint256[] memory words
    ) external {
        RequestCommitment memory rc = s_requests[requestId];
        require(rc.sender != address(0), "request not found");
        
        VRFConsumerBaseV2Plus v = VRFConsumerBaseV2Plus(consumer);
        v.rawFulfillRandomWords(requestId, words);
        
        delete s_requests[requestId];
    }

    function fundSubscription(uint256 subId, uint96 amount) external override {
        s_subscriptions[subId].balance += amount;
    }

    function createSubscription() external override returns (uint256 subId) {
        subId = s_currentSubNonce++;
        s_subscriptions[subId] = Subscription({
            balance: 0,
            reqCount: 0,
            subOwner: msg.sender,
            consumers: new address[](0)
        });
        
        emit SubscriptionCreated(subId, msg.sender);
        return subId;
    }

    function addConsumer(uint256 subId, address consumer) external override {
        s_subscriptionConfigs[subId].consumers.push(consumer);
        emit SubscriptionConsumerAdded(subId, consumer);
    }
}