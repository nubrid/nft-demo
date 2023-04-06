import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
require('dotenv').config()

const config: HardhatUserConfig = {
  solidity: '0.8.18',
  networks: {
    goerli: {
      url: process.env.NODE_URL_GOERLI,
      accounts: [process.env.CONTRACT_OWNER_PRIVATE_KEY || ''],
    },
    sepolia: {
      url: process.env.NODE_URL_SEPOLIA,
      accounts: [process.env.CONTRACT_OWNER_PRIVATE_KEY || ''],
    },
    hardhat: {
      ...process.env.CHAIN_ID && { chainId: +process.env.CHAIN_ID },
    },
  },
}

export default config
