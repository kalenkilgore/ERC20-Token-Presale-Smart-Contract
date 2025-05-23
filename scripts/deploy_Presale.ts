import { ethers } from 'hardhat'

async function main() {
  const softcap = ethers.parseUnits("300000", 6);
  const hardcap = ethers.parseUnits("1020000", 6);
  const presaleStartTimeInMilliSeconds = new Date("2025-06-01T00:00:00Z");
  const presaleStartTime = Math.floor(presaleStartTimeInMilliSeconds.getTime() / 1000);

  const presaleDuration = 24 * 3600 * 30;  //30 days
  const presaleTokenPercent = 10;
  const ectAddress = "0xCE3594098e2b5Fc930Faf7bb72fbEBBc1eceDc51";   //Deployed on Sepolia

  // Retrieve the first signer, typically the default account in Hardhat, to use as the deployer.
  const [deployer] = await ethers.getSigners();

  const instancePresale = await ethers.deployContract("Presale", [softcap, hardcap, presaleStartTime, presaleDuration, ectAddress, presaleTokenPercent]);
  await instancePresale.waitForDeployment();
  const Presale_Address = await instancePresale.getAddress();
  console.log(`Presale is deployed to ${Presale_Address} and presale start time is ${presaleStartTime}`);
}

// This pattern allows the use of async/await throughout and ensures that errors are caught and handled properly.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
