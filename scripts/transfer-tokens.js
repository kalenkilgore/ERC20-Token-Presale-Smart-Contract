const { ethers } = require("hardhat");

async function main() {
  // Get deployed contracts
  const ECT = await ethers.getContractFactory("ECT");
  const ectContract = await ECT.attach("0xCE3594098e2b5Fc930Faf7bb72fbEBBc1eceDc51");
  
  const Presale = await ethers.getContractFactory("Presale");
  const presaleContract = await Presale.attach("0x986B295E7C4d1D3615490fa00AB6C930C21AA0C3"); // Replace with your deployed address
  
  // Get total supply
  const totalSupply = await ectContract.totalSupply();
  console.log("Total supply:", totalSupply.toString());
  
  // Calculate 10% for presale
  const presaleAmount = totalSupply * BigInt(10) / BigInt(100);
  console.log("Presale amount:", presaleAmount.toString());
  
  // Approve the presale contract to spend tokens
  console.log("Approving tokens...");
  const approveTx = await ectContract.approve(await presaleContract.getAddress(), presaleAmount);
  await approveTx.wait();
  console.log("Approved presale contract to spend tokens");
  
  // Call the transferTokensToPresale function if it exists
  console.log("Transferring tokens to presale...");
  const transferTx = await presaleContract.transferTokensToPresale(presaleAmount);
  await transferTx.wait();
  console.log("Transferred tokens to presale contract");
  
  // Check balance of presale contract to confirm
  const presaleBalance = await ectContract.balanceOf(await presaleContract.getAddress());
  console.log("Presale contract balance:", presaleBalance.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 
