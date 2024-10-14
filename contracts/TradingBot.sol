// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TradingBot is Ownable {
    IERC20 public token;
    uint256 public constant MINIMUM_TOKENS = 100 * 10**18;  // 100 tokens, assuming 18 decimals

    mapping(address => uint256) public userBalances;

    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }

    function deposit(uint256 amount) external {
        require(token.balanceOf(msg.sender) >= MINIMUM_TOKENS, "Insufficient token balance");
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        userBalances[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        require(userBalances[msg.sender] >= amount, "Insufficient balance");
        userBalances[msg.sender] -= amount;
        require(token.transfer(msg.sender, amount), "Transfer failed");
        emit Withdrawal(msg.sender, amount);
    }

    function getUserBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }

    // Add more functions as needed for interacting with the trading agent
}