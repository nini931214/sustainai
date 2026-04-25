// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AnchorRegistry {
    event Anchored(
        string batchId,
        bytes32 batchVersionHash,
        uint256 ts,
        address indexed by
    );

    // 可選：防重（同 hash 不重複）
    mapping(bytes32 => bool) public anchored;

    function anchor(string calldata batchId, bytes32 batchVersionHash) external {
        require(!anchored[batchVersionHash], "ALREADY_ANCHORED");
        anchored[batchVersionHash] = true;
        emit Anchored(batchId, batchVersionHash, block.timestamp, msg.sender);
    }
}