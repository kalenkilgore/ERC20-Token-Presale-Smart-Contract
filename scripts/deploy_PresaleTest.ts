import { ethers } from 'hardhat'

async function main() {
  const softcap = ethers.parseUnits("300000", 6);
  const hardcap = ethers.parseUnits("1020000", 6);
  
  // Set start time to 10 minutes from now (just for consistency, but not actually needed)
  const presaleStartTime = Math.floor(Date.now() / 1000) + 600;
  
  const presaleDuration = 24 * 3600 * 30;  // 30 days
  const presaleTokenPercent = 10;
  const ectAddress = "0xCE3594098e2b5Fc930Faf7bb72fbEBBc1eceDc51";   // Deployed on Sepolia
  
  // Deploy the TEST contract
  const instancePresale = await ethers.deployContract("PresaleTest", 
    [softcap, hardcap, presaleStartTime, presaleDuration, ectAddress, presaleTokenPercent]);
  await instancePresale.waitForDeployment();
  const Presale_Address = await instancePresale.getAddress();
  console.log(`PresaleTest is deployed to ${Presale_Address}`);
  console.log(`This contract has the time validations disabled for testing`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  }) 