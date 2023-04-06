import { ethers } from 'hardhat'
require('dotenv').config()

const main = async () => {
  const [deployer] = await ethers.getSigners()

  console.log('Deploying contracts with the account: ', deployer.address)
  console.log('Account balance: ', (await deployer.getBalance()).toString())

  const limitedNftMinterContractFactory = await ethers.getContractFactory('LimitedNftMinter')
  const limitedNftMinterContract = await limitedNftMinterContractFactory.deploy(+(process.env.MINT_PERIOD_IN_SECONDS || 31536000), {
    value: ethers.utils.parseEther('0.001'),
  })
  await limitedNftMinterContract.deployed()

  console.log('LimitedNftMinter contract address: ', limitedNftMinterContract.address)
}

const runMain = async () => {
  try {
    await main()
    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

runMain()
