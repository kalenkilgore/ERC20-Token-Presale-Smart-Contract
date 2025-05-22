const { ethers } = require("hardhat");

async function main() {
  // Get the presale test contract
  const presaleTestAddress = "0x34A918bD50fA87A4b6467b80f4c35f3Ed2D01885"; // Your deployed PresaleTest address
  
  // Create a simple interface with just the functions we need
  const presaleAbi = [
    "function getOwner() view returns (address)",
    // Add a custom function to withdraw ETH
    "function withdrawETH() public"
  ];
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("Signer address:", await signer.getAddress());
  
  // Create contract instance
  const presaleContract = new ethers.Contract(presaleTestAddress, presaleAbi, signer);
  
  // Check contract ETH balance
  const contractBalance = await ethers.provider.getBalance(presaleTestAddress);
  console.log("Contract ETH balance:", ethers.utils.formatEther(contractBalance), "ETH");
  
  // Get owner address
  const owner = await presaleContract.getOwner();
  console.log("Contract owner:", owner);
  
  // Check if signer is owner
  if ((await signer.getAddress()).toLowerCase() !== owner.toLowerCase()) {
    console.error("You are not the contract owner. Only the owner can withdraw funds.");
    return;
  }
  
  // Since there's no built-in withdrawal function, we'll need to add one
  console.log("You need to add a withdrawal function to your contract.");
  console.log("Here's how to do it:");
  console.log("1. Add this function to your PresaleTest.sol contract:");
  console.log(`
    /**
     * @dev Withdraw ETH from the contract to the owner
     */
    function withdrawETH() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        (bool success, ) = payable(_owner).call{value: balance}("");
        require(success, "Transfer failed");
    }
  `);
  console.log("2. Redeploy the contract or use a different approach");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 