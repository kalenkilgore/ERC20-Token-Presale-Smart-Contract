// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import "./ECT.sol";

/**
 * @title PresaleTest contract
 * @notice Create and manage presales of ECT token (test version with time checks disabled)
 */
contract PresaleTest is Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Stable coin address and Uniswap v2 router address on Ethereum mainnet and Ethereum Sepolia testnet
    address private immutable USDT =
        block.chainid == 1
            ? 0xdAC17F958D2ee523a2206206994597C13D831ec7 // Checksummed address for mainnet USDT
            : 0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0; // Checksummed address for sepolia USDT

    address private immutable USDC =
        block.chainid == 1
            ? 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 // Checksummed address for mainnet USDC
            : 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8; // Checksummed address for sepolia USDC

    address private immutable DAI =
        block.chainid == 1
            ? 0x6B175474E89094C44Da98b954EedeAC495271d0F // Checksummed address for Mainnet DAI
            : 0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357; // Checksummed address for Sepolia DAI

    address private immutable ROUTER =
        block.chainid == 1
            ? 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D // Mainnet Uniswap V2
            : 0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008; // Sepolia Uniswap V2

    ///@dev MULTISIGWALLET address
    address private immutable MULTISIG_WALLET_ADDRESS = 0x0000000000000000000000000000000000000000;  //Pre-defined multisig wallet address

    /// @dev owner address
    address private _owner;

    /// @dev Token Interfaces
    ECT public immutable token;
    IERC20 public immutable USDTInterface = IERC20(USDT);
    IERC20 public immutable USDCInterface = IERC20(USDC);
    IERC20 public immutable DAIInterface = IERC20(DAI);
    IUniswapV2Router02 public immutable router = IUniswapV2Router02(ROUTER);

    /// @dev presale parameters
    uint256 public softcap;
    uint256 public hardcap;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public claimTime;
    uint256 public presaleSupply;

    /// @dev Total tokens sold in presale
    uint256 public totalTokensSold;

    /// @dev Amount of funds raised from Presale
    uint256 public fundsRaised;

    /// @dev wallet account for raising funds.
    address public wallet;

    /// @dev Tracks investors
    address[] public investors;

    /// @dev Tracks early investors who invested before reaching softcap. Unsold tokens will be distributed pro-rata to early investors
    address[] public earlyInvestors;

    /// @dev Define thresholds of token amount and prices
    uint256[] public thresholds;
    uint256[] public prices;

    /// @dev Tracks contributions of investors, how the investors invest with which coin
    mapping(address => mapping(address => uint256)) public investments;

    /// @dev Tracks token amount of investors
    mapping(address => uint256) public investorTokenBalance;

    /// @dev Tracks early investors
    mapping(address => bool) private earlyInvestorsMapping;

    /**
     * @dev event for token is bought
     * @param buyer buyer who bought token
     * @param tokensBought   the bought token amount
     * @param amountPaid the amount of payment user spent for buying token
     * @param timestamp  At specific time who buy tx occured
     */
    event TokensBought(
        address indexed buyer,
        uint256 indexed tokensBought,
        uint256 indexed amountPaid,
        uint256 timestamp
    );

    /// @dev event for refunding all funds
    event FundsRefunded(
        address indexed caller,
        uint256 indexed fundsAmount,
        uint256 timestamp
    );

    /// @dev event for claiming tokens
    event TokensClaimed(address indexed caller, uint256 indexed tokenAmount);

    /// @dev event for updating wallet address for withdrawing contract balance
    event WalletUpdated(address indexed oldWallet, address indexed newWallet);

    /// @dev event for setting claim time
    event ClaimTimeUpdated(
        uint256 indexed oldClaimTime,
        uint256 indexed newClaimTime
    );

    /// @dev event for transferring ownership
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    /// @dev validate if address is non-zero
    modifier notZeroAddress(address address_) {
        require(address_ != address(0), "Invalid address");
        _;
    }

    /// @dev validate presale startTime and endTime is valid
    modifier isFuture(uint256 startTime_, uint256 duration_) {
        require(startTime_ >= block.timestamp, "Invalid start time");
        require(duration_ > 0, "Invalid duration");
        _;
    }

    /// @dev validate softcap & hardcap setting
    modifier capSettingValid(uint256 softcap_, uint256 hardcap_) {
        require(softcap_ > 0, "Invalid softcap");
        require(hardcap_ > softcap_, "Invalid hardcap");
        _;
    }

    /// @dev validate if user can purchase certain amount of tokens at timestamp.
    modifier checkSaleState(uint256 tokenAmount_) {
        // COMMENTED OUT FOR TESTING:
        // require(
        //     block.timestamp >= startTime && block.timestamp <= endTime,
        //     "Invalid time for buying the token."
        // );

        uint256 _tokensAvailable = tokensAvailable();

        require(
            tokenAmount_ <= _tokensAvailable && tokenAmount_ > 0,
            "Exceeds available tokens"
        );
        _;
    }

    /// @dev validate if user is owner or not.
    modifier onlyOwner() {
        if (msg.sender != _owner) {
            revert NotOwner(); // Revert with custom error
        }
        _;
    }

    //Define a custom error for not being the owner
    error NotOwner();

    /**
     * @dev constructor for presale
     * @param softcap_ softcap for Presale, // 500,000
     * @param hardcap_ hardcap for Presale, // 1,000,000
     * @param startTime_ Presale start time, // 1662819200000
     * @param duration_ Presale duration, // 1762819200000
     * @param tokenAddress_ deployed ECT token address, // 0x810fa...
     * @param presaleTokenPercent_  ECT Token allocation percent for Presale, // 10%
     */
    constructor(
        uint256 softcap_,
        uint256 hardcap_,
        uint256 startTime_,
        uint256 duration_,
        address tokenAddress_,
        uint8 presaleTokenPercent_
    )
        capSettingValid(softcap_, hardcap_)
        notZeroAddress(tokenAddress_)
        isFuture(startTime_, duration_)
    {
        _owner = msg.sender;
        softcap = softcap_;
        hardcap = hardcap_;
        startTime = startTime_;
        endTime = startTime_ + duration_;

        token = ECT(tokenAddress_);
        presaleSupply = (token.totalSupply() * presaleTokenPercent_) / 100;

        // Initialize the thresholds and prices
        thresholds = [
            3_000_000_000 * 10 ** 18,
            7_000_000_000 * 10 ** 18,
            9_000_000_000 * 10 ** 18,
            presaleSupply
        ];
        prices = [80, 100, 120, 140]; // token price has 6 decimals.
    }

    /**
     * @dev transfer tokens from token contract to presale contract
     * @param presaleSupplyAmount_ amount of tokens for presale
     */
    function transferTokensToPresale(
        uint256 presaleSupplyAmount_
    ) public onlyOwner returns (bool) {
        require(presaleSupplyAmount_ > 0, "Amount must be greater than zero");
        require(
            token.balanceOf(msg.sender) >= presaleSupplyAmount_,
            "Insufficient balance"
        );
        // COMMENTED OUT FOR TESTING:
        // require(block.timestamp < startTime, "Presale has already started");

        //Send the tokens to the presale contract
        SafeERC20.safeTransferFrom(
            token,
            msg.sender,
            address(this),
            presaleSupplyAmount_
        );
        return true;
    }

    /**
     * @dev Internal functions to purchase ECT token with Stable Coin like USDT, USDC, DAI
     * @param coin_ The stablecoin interface being used
     * @param tokenAmount_ ECT token amount users willing to buy with Stable Coin
     */
    function _buyWithCoin(
        IERC20 coin_,
        uint256 tokenAmount_
    ) internal checkSaleState(tokenAmount_) whenNotPaused nonReentrant {
        uint256 _coinAmount = estimatedCoinAmountForTokenAmount(
            tokenAmount_,
            coin_
        );
        uint8 _coinDecimals = getCoinDecimals(coin_);

        //Transfer stable coin from user to contract
        SafeERC20.safeTransferFrom(
            coin_,
            msg.sender,
            address(this),
            _coinAmount
        );

        //Register investors
        if (investments[msg.sender][address(coin_)] == 0) {
            if (investors.length == 0) {
                investors.push(msg.sender);
            } else {
                bool _isExist = false;
                for (uint i = 0; i < investors.length; i++) {
                    if (investors[i] == msg.sender) {
                        _isExist = true;
                        break;
                    }
                }
                if (!_isExist) {
                    investors.push(msg.sender);
                }
            }
        }

        //Check soft cap, if it's an early investor
        if (fundsRaised < softcap) {
            if (!earlyInvestorsMapping[msg.sender]) {
                earlyInvestors.push(msg.sender);
                earlyInvestorsMapping[msg.sender] = true;
            }
        }

        //Add how much amount the user invested
        investments[msg.sender][address(coin_)] += _coinAmount;

        //Add tokens bought
        investorTokenBalance[msg.sender] += tokenAmount_;

        //Count total token sold
        totalTokensSold += tokenAmount_;

        //Count total fund raised
        fundsRaised += (
            _coinAmount * 10 ** (18 - uint256(_coinDecimals))
        );

        //Emit events
        emit TokensBought(
            msg.sender,
            tokenAmount_,
            _coinAmount,
            block.timestamp
        );
    }

    /**
     * @dev buy token with ETH
     */
    function buyWithETH() external payable whenNotPaused nonReentrant {
        // COMMENTED OUT FOR TESTING:
        // require(
        //     block.timestamp >= startTime && block.timestamp <= endTime,
        //     "Invalid time for buying the token"
        // );

        uint256 tokensAvailable = presaleSupply - totalTokensSold;
        uint256 estimatedTokenAmount = estimatedTokenAmountAvailableWithETH(msg.value);
        require(
            estimatedTokenAmount <= tokensAvailable &&
                estimatedTokenAmount > 0,
            "Invalid token amount to buy"
        );

        //Register investors
        if (investments[msg.sender][address(0)] == 0) {
            if (investors.length == 0) {
                investors.push(msg.sender);
            } else {
                bool _isExist = false;
                for (uint i = 0; i < investors.length; i++) {
                    if (investors[i] == msg.sender) {
                        _isExist = true;
                        break;
                    }
                }
                if (!_isExist) {
                    investors.push(msg.sender);
                }
            }
        }

        //Check soft cap, if it's an early investor
        if (fundsRaised < softcap) {
            if (!earlyInvestorsMapping[msg.sender]) {
                earlyInvestors.push(msg.sender);
                earlyInvestorsMapping[msg.sender] = true;
            }
        }

        //Add how much amount the user invested
        investments[msg.sender][address(0)] += msg.value;

        //Add tokens bought
        investorTokenBalance[msg.sender] += estimatedTokenAmount;

        //Count total token sold
        totalTokensSold += estimatedTokenAmount;

        //Count total fund raised
        fundsRaised += msg.value;

        emit TokensBought(
            msg.sender,
            estimatedTokenAmount,
            msg.value,
            block.timestamp
        );
    }

    /**
     * @dev buy token with USDT
     * @param tokenAmount_ token amount
     */
    function buyWithUSDT(
        uint256 tokenAmount_
    ) external whenNotPaused nonReentrant {
        _buyWithCoin(USDTInterface, tokenAmount_);
    }

    /**
     * @dev buy token with USDC
     * @param tokenAmount_ token amount
     */
    function buyWithUSDC(
        uint256 tokenAmount_
    ) external whenNotPaused nonReentrant {
        _buyWithCoin(USDCInterface, tokenAmount_);
    }

    /**
     * @dev buy token with DAI
     * @param tokenAmount_ token amount
     */
    function buyWithDAI(
        uint256 tokenAmount_
    ) external whenNotPaused nonReentrant {
        _buyWithCoin(DAIInterface, tokenAmount_);
    }

    /**
     * @dev claim tokens
     * @param investor user address
     */
    function claim(
        address investor
    ) external nonReentrant returns (bool) {
        // COMMENTED OUT FOR TESTING:
        // require(
        //     block.timestamp >= claimTime,
        //     "Claim time is not reached yet."
        // );
        require(investorTokenBalance[investor] > 0, "No tokens to claim");

        uint256 _tokenAmount = investorTokenBalance[investor];
        investorTokenBalance[investor] = 0;

        SafeERC20.safeTransfer(token, investor, _tokenAmount);

        emit TokensClaimed(investor, _tokenAmount);
        return true;
    }

    /**
     * @dev for setting claim time
     * @param claimTime_ Presale claim time
     */
    function setClaimTime(uint256 claimTime_) external onlyOwner {
        require(
            claimTime_ > block.timestamp,
            "Claim time cannot be in past."
        );
        require(claimTime_ > endTime, "Claim time must be after presale end");

        uint256 _previousClaimTime = claimTime;
        claimTime = claimTime_;

        emit ClaimTimeUpdated(_previousClaimTime, claimTime_);
    }

    /**
     * @dev for calculating tokens available to purchase
     */
    function tokensAvailable() public view returns (uint256) {
        return presaleSupply - totalTokensSold;
    }

    /**
     * @dev for updating wallet address for admin
     * @param newWallet_ new wallet address
     */
    function updateWallet(
        address newWallet_
    ) external onlyOwner notZeroAddress(newWallet_) {
        address _previousWallet = wallet;
        wallet = newWallet_;

        emit WalletUpdated(_previousWallet, newWallet_);
    }

    /**
     * @dev for withdrawing unsold ECT token
     */
    function withdrawUnsoldTokens() external onlyOwner {
        // COMMENTED OUT FOR TESTING:
        // require(
        //     block.timestamp > endTime,
        //     "Cannot withdraw during the presale"
        // );

        uint256 tokenBalance = token.balanceOf(address(this)) -
            totalTokensSold;
        SafeERC20.safeTransfer(token, _owner, tokenBalance);
    }

    /**
     * @dev for withdrawing raised USDT fund
     */
    function withdrawUSDTFund() external onlyOwner {
        // COMMENTED OUT FOR TESTING:
        // require(
        //     block.timestamp > endTime,
        //     "Cannot withdraw during the presale"
        // );
        uint256 usdtBalance = USDTInterface.balanceOf(address(this));
        SafeERC20.safeTransfer(USDTInterface, _owner, usdtBalance);
    }

    /**
     * @dev for withdrawing raised USDC fund
     */
    function withdrawUSDCFund() external onlyOwner {
        // COMMENTED OUT FOR TESTING:
        // require(
        //     block.timestamp > endTime,
        //     "Cannot withdraw during the presale"
        // );
        uint256 usdcBalance = USDCInterface.balanceOf(address(this));
        SafeERC20.safeTransfer(USDCInterface, _owner, usdcBalance);
    }

    /**
     * @dev for withdrawing raised DAI fund
     */
    function withdrawDAIFund() external onlyOwner {
        // COMMENTED OUT FOR TESTING:
        // require(
        //     block.timestamp > endTime,
        //     "Cannot withdraw during the presale"
        // );
        uint256 daiBalance = DAIInterface.balanceOf(address(this));
        SafeERC20.safeTransfer(DAIInterface, _owner, daiBalance);
    }

    /**
     * @dev for withdrawing raised ETH fund
     */
    function withdrawETHFund() external onlyOwner {
        // COMMENTED OUT FOR TESTING:
        // require(
        //     block.timestamp > endTime,
        //     "Cannot withdraw during the presale"
        // );
        address payable _reciever = payable(_owner);
        uint256 balance = address(this).balance;

        // Transfer ETH to the receiver
        (bool sent, ) = _reciever.call{value: balance}("");
        require(sent, "Failed to withdraw ETH");
    }

    /**
     * @dev for calculating available tokens amount available for ETH amount
     * @param ethAmount_ ETH amount in WEI
     */
    function estimatedTokenAmountAvailableWithETH(
        uint256 ethAmount_
    ) public view returns (uint256) {
        require(
            address(router) != address(0),
            "Router address cannot be zero"
        );

        if (ethAmount_ == 0) {
            return 0;
        }

        //Find price of token in ETH
        address[] memory path = new address[](2);
        path[0] = router.WETH();
        path[1] = USDT;

        uint256[] memory amountsOut = router.getAmountsOut(ethAmount_, path);
        uint256 usdtAmount = amountsOut[1];

        //Calculate tokens available for the USDT amount
        uint256 tokensAvailableForEth = estimatedTokenAmountForCoinAmount(
            usdtAmount,
            USDTInterface
        );

        return tokensAvailableForEth;
    }

    /**
     * @dev for calculating token price in ETH
     * @param tokenAmount_ token amount in token decimals
     */
    function estimatedEthAmountForTokenAmount(
        uint256 tokenAmount_
    ) public view returns (uint256) {
        require(
            address(router) != address(0),
            "Router address cannot be zero"
        );

        if (tokenAmount_ == 0) {
            return 0;
        }

        //Calculate USDT amount required for the tokens
        uint256 usdtAmount = estimatedCoinAmountForTokenAmount(
            tokenAmount_,
            USDTInterface
        );

        //Calculate ETH required for the USDT amount
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = router.WETH();

        uint256[] memory amountsOut = router.getAmountsOut(usdtAmount, path);
        uint256 ethAmount = amountsOut[1];

        return ethAmount;
    }

    /**
     * @dev for calculating token price in stable coin
     * @param tokenAmount_ token amount in token decimals
     * @param coin_ IERC20 interface
     */
    function estimatedCoinAmountForTokenAmount(
        uint256 tokenAmount_,
        IERC20 coin_
    ) public view returns (uint256) {
        if (tokenAmount_ == 0) {
            return 0;
        }

        uint8 _coinDecimals = getCoinDecimals(coin_);

        // Get the price based on the current total tokens sold
        uint256 currentTier = totalTokensSold;
        uint256 price = 0;
        uint256 remainingTokens = tokenAmount_;
        uint256 totalCoinAmount = 0;

        for (uint256 i = 0; i < thresholds.length; i++) {
            if (currentTier < thresholds[i]) {
                price = prices[i];

                uint256 availableInThisTier = thresholds[i] - currentTier;
                uint256 tokensToPrice = remainingTokens < availableInThisTier
                    ? remainingTokens
                    : availableInThisTier;

                totalCoinAmount +=
                    (tokensToPrice * price) /
                    (10 ** (18 - uint256(_coinDecimals)));

                remainingTokens -= tokensToPrice;
                currentTier += tokensToPrice;

                if (remainingTokens == 0) {
                    break;
                }
            }
        }

        return totalCoinAmount;
    }

    /**
     * @dev for calculating stable coin amount required for token amount
     * @param coinAmount_ stable coin amount in coin decimals
     * @param coin_ IERC20 interface
     */
    function estimatedTokenAmountForCoinAmount(
        uint256 coinAmount_,
        IERC20 coin_
    ) public view returns (uint256) {
        if (coinAmount_ == 0) {
            return 0;
        }

        uint8 _coinDecimals = getCoinDecimals(coin_);

        // Get the price based on the current total tokens sold
        uint256 currentTier = totalTokensSold;
        uint256 price = 0;
        uint256 remainingCoinAmount = coinAmount_;
        uint256 totalTokenAmount = 0;

        for (uint256 i = 0; i < thresholds.length; i++) {
            if (currentTier < thresholds[i]) {
                price = prices[i];

                uint256 availableInThisTier = thresholds[i] - currentTier;
                uint256 maxTokensInThisTier = (remainingCoinAmount *
                    (10 ** (18 - uint256(_coinDecimals)))) / price;

                uint256 tokensToPrice = maxTokensInThisTier < availableInThisTier
                    ? maxTokensInThisTier
                    : availableInThisTier;

                totalTokenAmount += tokensToPrice;

                remainingCoinAmount -=
                    (tokensToPrice * price) /
                    (10 ** (18 - uint256(_coinDecimals)));
                currentTier += tokensToPrice;

                if (remainingCoinAmount == 0 || tokensToPrice < maxTokensInThisTier) {
                    break;
                }
            }
        }

        return totalTokenAmount;
    }

    /**
     * @dev for getting token balance of investor
     * @param investor investor address
     */
    function getTokenAmountForInvestor(
        address investor
    ) external view returns (uint256) {
        return investorTokenBalance[investor];
    }

    /**
     * @dev get the remaining time for presale to start
     */
    function getRemainingTimeForPresaleStart() external view returns (uint256) {
        if (block.timestamp >= startTime) {
            return 0;
        }
        return startTime - block.timestamp;
    }

    /**
     * @dev get the remaining time for presale to end
     */
    function getRemainingTimeForPresaleEnd() external view returns (uint256) {
        if (block.timestamp >= endTime) {
            return 0;
        }
        return endTime - block.timestamp;
    }

    /**
     * @dev get the remaining time for claiming to start
     */
    function getRemainingTimeForClaimStart() external view returns (uint256) {
        if (block.timestamp >= claimTime) {
            return 0;
        }
        return claimTime - block.timestamp;
    }

    /**
     * @dev pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev get coin decimals
     * @param coin_ IERC20 interface
     */
    function getCoinDecimals(IERC20 coin_) internal view returns (uint8) {
        return coin_ == DAIInterface ? 18 : 6;
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner_) public virtual onlyOwner {
        require(
            newOwner_ != address(0),
            "Ownable: new owner is the zero address"
        );
        address oldOwner = _owner;
        _owner = newOwner_;
        emit OwnershipTransferred(oldOwner, newOwner_);
    }

    /**
     * @dev Helper function to return current owner
     */
    function getOwner() public view returns (address) {
        return _owner;
    }

    receive() external payable {}
    fallback() external payable {}
} 