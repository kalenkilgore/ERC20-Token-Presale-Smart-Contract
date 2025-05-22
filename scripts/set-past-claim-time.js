const { ethers } = require("hardhat");

async function main() {
  // Get the presale test contract
  const presaleTestAddress = "0x0b3AA82f654fF8023017e6650fFE4F3560d19934"; // Update to your current address
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("Signer address:", await signer.getAddress());
  
  // Get the PresaleTest contract
  const PresaleTest = await ethers.getContractFactory("PresaleTest");
  const presaleContract = await PresaleTest.attach(presaleTestAddress);
  
  // Get owner address
  const owner = await presaleContract.getOwner();
  console.log("Contract owner:", owner);
  
  // Check if signer is owner
  if ((await signer.getAddress()).toLowerCase() !== owner.toLowerCase()) {
    console.error("You are not the contract owner. Only the owner can set claim time.");
    return;
  }
  
  // Calculate a timestamp from one day ago (current time - 24 hours in seconds)
  const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
  console.log("Setting claim time to one day ago:", new Date(oneDayAgo * 1000).toLocaleString());
  
  // Call the setClaimTimeForTesting function (using a string to avoid BigInt issues)
  console.log("Setting claim time...");
  const tx = await presaleContract.setClaimTimeForTesting(oneDayAgo.toString());
  await tx.wait();
  
  // Verify the new claim time
  const newClaimTime = await presaleContract.claimTime();
  console.log("New claim time set to:", new Date(parseInt(newClaimTime.toString()) * 1000).toLocaleString());
  
  console.log("Claim time successfully set to one day ago!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 