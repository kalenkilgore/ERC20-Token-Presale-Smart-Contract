import { ethers } from 'hardhat'

async function main() {
  const softcap = ethers.parseUnits("300000", 6);
  const hardcap = ethers.parseUnits("1020000", 6);
  
  // Set start time to 10 minutes from now
  const presaleStartTime = Math.floor(Date.now() / 1000) + 600;
  
  const presaleDuration = 24 * 3600 * 30;  // 30 days
  const presaleTokenPercent = 10;
  const ectAddress = "0xCE3594098e2b5Fc930Faf7bb72fbEBBc1eceDc51";   // Deployed on Sepolia
  
  // Deploy the contract
  const instancePresale = await ethers.deployContract("Presale", 
    [softcap, hardcap, presaleStartTime, presaleDuration, ectAddress, presaleTokenPercent]);
  await instancePresale.waitForDeployment();
  const Presale_Address = await instancePresale.getAddress();
  console.log(`Test Presale is deployed to ${Presale_Address} and presale start time is ${presaleStartTime}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  }) 