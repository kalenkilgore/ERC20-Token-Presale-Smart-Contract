const { ethers } = require("hardhat");

async function main() {
  // Get deployed contracts
  const ECT = await ethers.getContractFactory("ECT");
  const ectContract = await ECT.attach("0xCE3594098e2b5Fc930Faf7bb72fbEBBc1eceDc51");
  
  // Get the address of your deployed PresaleTest contract - replace with your actual address
  // after you deploy the PresaleTest contract
  const presaleTestAddress = "0x34A918bD50fA87A4b6467b80f4c35f3Ed2D01885"; // Your deployed PresaleTest address
  
  const PresaleTest = await ethers.getContractFactory("PresaleTest");
  const presaleTestContract = await PresaleTest.attach(presaleTestAddress);
  
  // Get total supply
  const totalSupply = await ectContract.totalSupply();
  console.log("Total supply:", totalSupply.toString());
  
  // Calculate 10% for presale
  const presaleAmount = totalSupply * BigInt(10) / BigInt(100);
  console.log("Presale amount:", presaleAmount.toString());
  
  // Approve the presale test contract to spend tokens
  console.log("Approving tokens...");
  const approveTx = await ectContract.approve(presaleTestAddress, presaleAmount);
  await approveTx.wait();
  console.log("Approved presale test contract to spend tokens");
  
  // Call the transferTokensToPresale function
  console.log("Transferring tokens to presale test contract...");
  const transferTx = await presaleTestContract.transferTokensToPresale(presaleAmount);
  await transferTx.wait();
  console.log("Transferred tokens to presale test contract");
  
  // Check balance of presale test contract to confirm
  const presaleBalance = await ectContract.balanceOf(presaleTestAddress);
  console.log("Presale test contract balance:", presaleBalance.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 