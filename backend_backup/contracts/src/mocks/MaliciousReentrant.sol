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