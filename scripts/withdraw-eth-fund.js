const { ethers } = require("hardhat");

async function main() {
  // Get the presale test contract
  const presaleTestAddress = "0x34A918bD50fA87A4b6467b80f4c35f3Ed2D01885"; // Your deployed PresaleTest address
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("Signer address:", await signer.getAddress());
  
  // Get the PresaleTest contract
  const PresaleTest = await ethers.getContractFactory("PresaleTest");
  const presaleContract = await PresaleTest.attach(presaleTestAddress);
  
  // Check contract ETH balance before withdrawal
  const contractBalanceBefore = await ethers.provider.getBalance(presaleTestAddress);
  console.log("Contract ETH balance before withdrawal:", ethers.formatEther(contractBalanceBefore), "ETH");
  
  // Get owner address
  const owner = await presaleContract.getOwner();
  console.log("Contract owner:", owner);
  
  // Check if signer is owner
  if ((await signer.getAddress()).toLowerCase() !== owner.toLowerCase()) {
    console.error("You are not the contract owner. Only the owner can withdraw funds.");
    return;
  }
  
  // Call the withdrawETHFund function
  console.log("Withdrawing ETH funds...");
  const tx = await presaleContract.withdrawETHFund();
  await tx.wait();
  
  // Check contract ETH balance after withdrawal
  const contractBalanceAfter = await ethers.provider.getBalance(presaleTestAddress);
  console.log("Contract ETH balance after withdrawal:", ethers.formatEther(contractBalanceAfter), "ETH");
  
  console.log("ETH successfully withdrawn to owner address!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 