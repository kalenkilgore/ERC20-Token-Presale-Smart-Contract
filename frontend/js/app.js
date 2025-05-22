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
  "function claim(address investor)"
];

const tokenAbi = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

// Contract addresses - UPDATE THIS AFTER DEPLOYING THE TEST CONTRACT
const presaleAddress = "0x34A918bD50fA87A4b6467b80f4c35f3Ed2D01885"; 
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
    document.getElementById('tokens-purchased').textContent = formatTokenAmount(tokenBalance) + " ECT";
    
    // Check if claiming is available
    const claimTimeRemaining = await presaleContract.getRemainingTimeForClaimStart();
    if (claimTimeRemaining.eq(0)) {
      document.getElementById('claim-time').textContent = "Now!";
      document.getElementById('claim-tokens').disabled = false;
    } else {
      const claimDate = new Date((Date.now() / 1000 + claimTimeRemaining.toNumber()) * 1000);
      document.getElementById('claim-time').textContent = claimDate.toLocaleDateString() + " " + claimDate.toLocaleTimeString();
    }
  } catch (error) {
    console.error("Error loading user investment:", error);
  }
}

// Update cost estimate when token amount or payment method changes
async function updateCostEstimate() {
  const tokenAmount = document.getElementById('token-amount').value;
  const paymentMethod = document.getElementById('payment-method').value;
  
  if (!tokenAmount || tokenAmount <= 0) {
    document.getElementById('cost-estimate').textContent = "0";
    return;
  }
  
  try {
    const tokenAmountInWei = ethers.utils.parseEther(tokenAmount);
    
    if (paymentMethod === 'eth') {
      const ethCost = await presaleContract.estimatedEthAmountForTokenAmount(tokenAmountInWei);
      document.getElementById('cost-estimate').textContent = ethers.utils.formatEther(ethCost);
      document.getElementById('cost-currency').textContent = "ETH";
    } else {
      // For simplicity, we're using a fixed price for stablecoins
      // In a real implementation, you'd get the exact cost from the contract
      document.getElementById('cost-estimate').textContent = (tokenAmount * 0.0001).toFixed(6);
      document.getElementById('cost-currency').textContent = paymentMethod.toUpperCase();
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
  
  // Convert to wei (18 decimals)
  const tokenAmountInWei = ethers.utils.parseUnits(tokenAmount, 18);
  const paymentMethod = document.getElementById('payment-method').value;
  
  try {
    let tx;
    
    if (paymentMethod === 'eth') {
      // Buy with ETH - get the estimated ETH cost first
      const ethCost = await presaleContract.estimatedEthAmountForTokenAmount(tokenAmountInWei);
      console.log("Estimated ETH cost:", ethers.utils.formatEther(ethCost));
      
      // Send the transaction with the exact ETH amount
      tx = await presaleContract.buyWithETH({ value: ethCost });
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
      const approveTx = await stablecoinContract.approve(presaleAddress, tokenAmountInWei);
      await approveTx.wait();
      
      // Buy tokens
      tx = await buyFunction(tokenAmountInWei);
    }
    
    await tx.wait();
    alert("Purchase successful! Check your token balance below.");
    
    // Reload information
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
    const tx = await presaleContract.claim(userAddress);
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