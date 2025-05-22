# ERC20 Token Presale & ICO Smart Contract | Ethereum Crowdsale Platform

Forked from (https://github.com/BTC415/
ERC20-Token-Presale-smart-contract). I've added a front-end as well as price oracle integration.

A comprehensive ERC20 token presale and ICO platform with Chainlink price oracle integration and a user-friendly front-end interface.

## Key Improvements

This project is a fork of [the original ERC20-Token-Presale-smart-contract](https://github.com/BTC415/ERC20-Token-Presale-smart-contract) with significant improvements:

### 1. Fixed Pricing Issues with Chainlink Oracle

The original contract had manual pricing mechanisms that were prone to errors and manipulation. We've integrated Chainlink price oracles to:

- Provide accurate, real-time ETH/USD price feeds for token pricing
- Eliminate potential pricing manipulation by using decentralized oracle data
- Calculate exact token amounts based on current market rates
- Enable precise ETH-to-token conversions without relying on potentially manipulated DEX prices
- Support dynamic pricing based on reliable market data

### 2. Responsive Front-End Implementation

We've built a complete user interface that makes interacting with the presale contract intuitive:

- Wallet connection with Web3/Ethers.js integration
- Real-time display of presale metrics (hardcap, softcap, funds raised)
- Interactive token purchase interface with multiple payment options
- Token claiming functionality
- Progress tracking with visual indicators
- Mobile-responsive design for all device types

The front end is live here: [https://kalenkilgore.github.io/ERC20-Token-Presale-Smart-Contract/](https://kalenkilgore.github.io/ERC20-Token-Presale-Smart-Contract/)

# INSTRUCTIONS:

1. Clone the repository
2. Install dependencies: `npm install`
3. `npx hardhat compile`
4. `npx hardhat run scripts/ScriptName.js --network sepolia` (to run scripts)
5. run deploy token script (same command as above)
6. run deploy presale script (same command as above)
7. run transfer token script (same command as above)
8. run set claim time (sets the claim time to yesterday) (same command as above)
9. run withdraw script to withdraw any ETH from the presale when done testing (same command as above)
10. Update the contract address in the front-end code
11. Run the front-end: `npx serve`




## 🔗 Related Keywords
<i>Ethereum ICO, Token Presale, ERC20 Token Launch, Cryptocurrency Crowdsale, Ethereum Smart Contract, Token Sale Platform, ICO Smart Contract, Ethereum Fundraising, Chainlink Oracle, DeFi</i>

