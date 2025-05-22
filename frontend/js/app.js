// Add this at the top of your app.js file
const ethers = window.ethers || {};

// Contract ABIs (simplified versions - you'll need the full ABIs)
const presaleAbi = [
  "function softcap() view returns (uint256)",
  "function hardcap() view returns (uint256)",
  "function startTime() view returns (uint256)",
  "function endTime() view returns (uint256)",
  "function claimTime() view returns (uint256)",
  "function fundsRaised() view returns (uint256)",
  "function presaleSupply() view returns (uint256)",
  "function totalTokensSold() view returns (uint256)",
  "function getRemainingTimeForPresaleStart() view returns (uint256)",
  "function getRemainingTimeForPresaleEnd() view returns (uint256)",
  "function getRemainingTimeForClaimStart() view returns (uint256)",
  "function buyWithETH() payable",
  "function buyWithUSDT(uint256 tokenAmount)",
  "function buyWithUSDC(uint256 tokenAmount)",
  "function buyWithDAI(uint256 tokenAmount)",
  "function getTokenAmountForInvestor(address investor) view returns (uint256)",
  "function estimatedTokenAmountAvailableWithETH(uint256 ethAmount) view returns (uint256)",
  "function estimatedEthAmountForTokenAmount(uint256 tokenAmount) view returns (uint256)",
  "function claim(address investor)",
  "function buyWithETHForExactTokens(uint256 tokenAmount) payable",
  "function debugClaim()"
];

const tokenAbi = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

// Contract addresses - UPDATE THIS AFTER DEPLOYING THE TEST CONTRACT
const presaleAddress = "0x0b3AA82f654fF8023017e6650fFE4F3560d19934"; 
const tokenAddress = "0xCE3594098e2b5Fc930Faf7bb72fbEBBc1eceDc51";

// Stablecoin addresses (Sepolia testnet)
const usdtAddress = "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0";
const usdcAddress = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";
const daiAddress = "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357";

// Global variables
let provider, signer, presaleContract, tokenContract;
let userAddress = null;

// Initialize the app
async function init() {
  // Check if MetaMask is installed
  if (typeof window.ethereum === 'undefined') {
    alert('MetaMask is not installed. Please install MetaMask to use this dApp.');
    return;
  }

  // Setup event listeners
  document.getElementById('connect-wallet').addEventListener('click', connectWallet);
  document.getElementById('payment-method').addEventListener('change', updateCostEstimate);
  document.getElementById('token-amount').addEventListener('input', updateCostEstimate);
  document.getElementById('buy-tokens').addEventListener('click', buyTokens);
  document.getElementById('claim-tokens').addEventListener('click', claimTokens);

  // Create a provider
  provider = new ethers.providers.Web3Provider(window.ethereum);
  
  // Create contract instances (read-only)
  presaleContract = new ethers.Contract(presaleAddress, presaleAbi, provider);
  tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);

  // Load presale information
  await loadPresaleInfo();
  
  // Check if already connected
  try {
    const accounts = await provider.listAccounts();
    if (accounts.length > 0) {
      userAddress = accounts[0];
      await onWalletConnected(userAddress);
    }
  } catch (error) {
    console.error("Error checking wallet connection:", error);
  }
}

// Connect to MetaMask
async function connectWallet() {
  try {
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    userAddress = accounts[0];
    await onWalletConnected(userAddress);
  } catch (error) {
    console.error("User denied account access or error occurred", error);
  }
}

// After wallet is connected
async function onWalletConnected(address) {
  // Update UI
  document.getElementById('connect-wallet').classList.add('d-none');
  document.getElementById('wallet-address').classList.remove('d-none');
  document.getElementById('wallet-address').textContent = `Connected: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  document.getElementById('purchase-container').classList.remove('d-none');
  
  // Get signer
  signer = provider.getSigner();
  
  // Create contract instances with signer
  presaleContract = new ethers.Contract(presaleAddress, presaleAbi, signer);
  tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
  
  // Load user's investment info
  await loadUserInvestment();
}

// Load presale information
async function loadPresaleInfo() {
  try {
    const [softcap, hardcap, startTime, endTime, fundsRaised, presaleSupply, totalTokensSold] = await Promise.all([
      presaleContract.softcap(),
      presaleContract.hardcap(),
      presaleContract.startTime(),
      presaleContract.endTime(),
      presaleContract.fundsRaised(),
      presaleContract.presaleSupply(),
      presaleContract.totalTokensSold()
    ]);
    
    // Format dates
    const startDate = new Date(startTime * 1000);
    const endDate = new Date(endTime * 1000);
    
    // Update UI
    document.getElementById('presale-start').textContent = startDate.toLocaleString();
    document.getElementById('presale-end').textContent = endDate.toLocaleString();
    document.getElementById('softcap').textContent = ethers.utils.formatUnits(softcap, 6) + " USDT";
    document.getElementById('hardcap').textContent = ethers.utils.formatUnits(hardcap, 6) + " USDT";
    document.getElementById('funds-raised').textContent = ethers.utils.formatUnits(fundsRaised, 6);
    document.getElementById('hardcap-display').textContent = ethers.utils.formatUnits(hardcap, 6);
    
    // Calculate and update progress
    const progressPercentage = fundsRaised.mul(100).div(hardcap);
    document.getElementById('progress-bar').style.width = `${progressPercentage}%`;
    document.getElementById('progress-bar').textContent = `${progressPercentage}%`;
    
  } catch (error) {
    console.error("Error loading presale info:", error);
  }
}

// Add this helper function to format token amounts with decimals
function formatTokenAmount(amount) {
  // Check if amount is a BigInt or a string representation of a large number
  if (typeof amount === 'bigint' || (typeof amount === 'string' && amount.length > 15)) {
    // Format with ethers.js utility
    return ethers.utils.formatUnits(amount, 18);
  }
  // For smaller numbers or if not a BigInt
  return (Number(amount) / 1e18).toFixed(6);
}

// Load user's investment information
async function loadUserInvestment() {
  if (!userAddress) return;
  
  try {
    // Get user's token balance
    const tokenBalance = await presaleContract.getTokenAmountForInvestor(userAddress);
    
    // Format and display the token balance
    const tokensElement = document.getElementById('tokens-purchased');
    if (tokensElement) {
      tokensElement.textContent = formatTokenAmount(tokenBalance);
    }
    
    // Check if user has tokens to claim
    const hasTokens = !tokenBalance.isZero();
    
    // Check if tokens can be claimed (time-wise)
    const claimTime = await presaleContract.claimTime();
    const currentTime = Math.floor(Date.now() / 1000);
    const canClaimTime = currentTime >= claimTime;
    
    // Update claim time display
    const claimTimeElement = document.getElementById('claim-time');
    const claimStatusElement = document.getElementById('claim-status');
    
    if (currentTime < claimTime && claimTimeElement) {
      const timeToClaimStart = await presaleContract.getRemainingTimeForClaimStart();
      claimTimeElement.textContent = formatTime(timeToClaimStart);
      
      // Only update if element exists
      if (claimStatusElement) {
        claimStatusElement.textContent = "Claiming not available yet";
        claimStatusElement.className = "text-warning";
      }
    } else if (claimTimeElement) {
      claimTimeElement.textContent = "Now!";
      
      // Only update if element exists
      if (claimStatusElement) {
        claimStatusElement.textContent = "Claiming is available";
        claimStatusElement.className = "text-success";
      }
    }
    
    // Update claim button state
    const claimButton = document.getElementById('claim-tokens');
    if (claimButton) {
      if (hasTokens && canClaimTime) {
        // User has tokens and claim time has passed
        claimButton.disabled = false;
        claimButton.classList.remove('btn-secondary');
        claimButton.classList.add('btn-success');
        claimButton.textContent = "Claim Tokens";
      } else if (!hasTokens) {
        // User has no tokens
        claimButton.disabled = true;
        claimButton.classList.remove('btn-success');
        claimButton.classList.add('btn-secondary');
        claimButton.textContent = "No Tokens to Claim";
      } else {
        // User has tokens but claim time hasn't passed
        claimButton.disabled = true;
        claimButton.classList.remove('btn-success');
        claimButton.classList.add('btn-secondary');
        claimButton.textContent = "Claiming Not Available Yet";
      }
    }
  } catch (error) {
    console.error("Error loading user investment:", error);
  }
}

// Helper function to format time
function formatTime(seconds) {
  if (!seconds || seconds.isZero()) {
    return "Now!";
  }
  
  const secondsNum = parseInt(seconds.toString());
  const days = Math.floor(secondsNum / 86400);
  const hours = Math.floor((secondsNum % 86400) / 3600);
  const minutes = Math.floor((secondsNum % 3600) / 60);
  const secs = secondsNum % 60;
  
  let result = "";
  if (days > 0) result += `${days}d `;
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  if (secs > 0) result += `${secs}s`;
  
  return result.trim();
}

// Update cost estimate when token amount or payment method changes
async function updateCostEstimate() {
  const tokenAmount = document.getElementById('token-amount').value;
  if (!tokenAmount || tokenAmount <= 0) {
    document.getElementById('cost-estimate').textContent = "0";
    return;
  }
  
  try {
    const tokenAmountInWei = ethers.utils.parseUnits(tokenAmount, 18);
    const paymentMethod = document.getElementById('payment-method').value;
    
    if (paymentMethod === 'eth') {
      // For ETH, get the estimated ETH cost
      const ethCost = await presaleContract.estimatedEthAmountForTokenAmount(tokenAmountInWei);
      document.getElementById('cost-estimate').textContent = ethers.utils.formatEther(ethCost);
      document.getElementById('cost-currency').textContent = "ETH";
      
      // Calculate exactly how many tokens will be received for this ETH amount
      const tokensToReceive = await presaleContract.estimatedTokenAmountAvailableWithETH(ethCost);
      
      // Show this amount to the user so they know exactly what they'll get
      const formattedTokens = formatTokenAmount(tokensToReceive);
      document.getElementById('actual-tokens-to-receive').textContent = formattedTokens;
    } else {
      // For simplicity, we're using a fixed price for stablecoins
      // In a real implementation, you'd get the exact cost from the contract
      document.getElementById('cost-estimate').textContent = (tokenAmount * 0.0001).toFixed(6);
      document.getElementById('cost-currency').textContent = paymentMethod.toUpperCase();
      document.getElementById('actual-tokens-to-receive').textContent = tokenAmount;
    }
  } catch (error) {
    console.error("Error updating cost estimate:", error);
  }
}

// Buy tokens
async function buyTokens() {
  if (!userAddress) {
    alert("Please connect your wallet first!");
    return;
  }
  
  const tokenAmount = document.getElementById('token-amount').value;
  if (!tokenAmount || tokenAmount <= 0) {
    alert("Please enter a valid token amount");
    return;
  }
  
  try {
    let tx;
    const paymentMethod = document.getElementById('payment-method').value;
    
    if (paymentMethod === 'eth') {
      // Convert the requested token amount to wei
      const tokenAmountInWei = ethers.utils.parseUnits(tokenAmount, 18);
      
      // Call the buyWithETHForExactTokens function instead of buyWithETH
      // This function will ensure the user gets exactly the requested token amount
      // You'll need to add this function to your contract
      const ethCost = await presaleContract.estimatedEthAmountForTokenAmount(tokenAmountInWei);
      
      // Add a small buffer to ensure the transaction succeeds (3% extra)
      const ethCostWithBuffer = ethCost.mul(103).div(100);
      
      // Send the transaction with the exact token amount requested
      tx = await presaleContract.buyWithETHForExactTokens(tokenAmountInWei, { value: ethCostWithBuffer });
    } else {
      // Buy with stablecoins
      let stablecoinContract;
      let buyFunction;
      
      if (paymentMethod === 'usdt') {
        stablecoinContract = new ethers.Contract(usdtAddress, ["function approve(address spender, uint256 amount) returns (bool)"], signer);
        buyFunction = presaleContract.buyWithUSDT;
      } else if (paymentMethod === 'usdc') {
        stablecoinContract = new ethers.Contract(usdcAddress, ["function approve(address spender, uint256 amount) returns (bool)"], signer);
        buyFunction = presaleContract.buyWithUSDC;
      } else if (paymentMethod === 'dai') {
        stablecoinContract = new ethers.Contract(daiAddress, ["function approve(address spender, uint256 amount) returns (bool)"], signer);
        buyFunction = presaleContract.buyWithDAI;
      }
      
      // Approve the presale contract to spend the tokens
      const approveTx = await stablecoinContract.approve(presaleAddress, ethers.utils.parseUnits(tokenAmount, 18));
      await approveTx.wait();
      
      // Buy tokens
      tx = await buyFunction(ethers.utils.parseUnits(tokenAmount, 18));
    }
    
    await tx.wait();
    alert("Transaction successful! Tokens purchased.");
    
    // Reload presale info and user investment
    await loadPresaleInfo();
    await loadUserInvestment();
  } catch (error) {
    console.error("Error buying tokens:", error);
    alert(`Error: ${error.message}`);
  }
}

// Claim tokens
async function claimTokens() {
  if (!userAddress) {
    alert("Please connect your wallet first!");
    return;
  }
  
  try {
    // Use debugClaim instead of claim(userAddress)
    const tx = await presaleContract.debugClaim();
    await tx.wait();
    alert("Tokens claimed successfully!");
    
    // Reload user investment
    await loadUserInvestment();
  } catch (error) {
    console.error("Error claiming tokens:", error);
    alert(`Error: ${error.message}`);
  }
}

// Initialize the app when the page loads
window.addEventListener('load', init);

// Handle account changes
if (window.ethereum) {
  window.ethereum.on('accountsChanged', function (accounts) {
    window.location.reload();
  });
  
  window.ethereum.on('chainChanged', function (chainId) {
    window.location.reload();
  });
}

// Update the token amount display when the user enters an amount
document.getElementById('token-amount').addEventListener('input', async function() {
  const tokenAmount = this.value;
  if (!tokenAmount || tokenAmount <= 0) {
    document.getElementById('tokens-to-receive').textContent = "0";
    return;
  }
  
  try {
    const tokenAmountInWei = ethers.utils.parseUnits(tokenAmount, 18);
    const paymentMethod = document.getElementById('payment-method').value;
    
    if (paymentMethod === 'eth') {
      // For ETH, we need to calculate exactly how many tokens will be received
      const ethCost = await presaleContract.estimatedEthAmountForTokenAmount(tokenAmountInWei);
      const tokensToReceive = await presaleContract.estimatedTokenAmountAvailableWithETH(ethCost);
      document.getElementById('tokens-to-receive').textContent = formatTokenAmount(tokensToReceive);
    }
  } catch (error) {
    console.error("Error calculating tokens to receive:", error);
  }
}); 