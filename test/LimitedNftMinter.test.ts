import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('LimitedNftMinter Contract', () => {
    const deployContractFixture = (mintPeriodInSeconds: number = 365 * 24 * 60 * 60) => async function deployContractFixture() {
        const limitedNftMinterContractFactory = await ethers.getContractFactory('LimitedNftMinter')
        const limitedNftMinterContract = await limitedNftMinterContractFactory.deploy(mintPeriodInSeconds)
        await limitedNftMinterContract.deployed()

        const [owner, address1] = await ethers.getSigners()

        return { limitedNftMinterContract, owner, address1 }
    }

    describe('Deployment', () => {
        it('Should set the correct owner', async () => {
            const { limitedNftMinterContract, owner } = await loadFixture(deployContractFixture())

            expect(await limitedNftMinterContract.owner()).to.equal(owner.address)
        })
    })

    describe('mintNft', () => {
        const METADATA_JSON_URI = 'https://example.com/metadata.json'

        it('Should not allow non-owner from minting', async () => {
            const { limitedNftMinterContract, owner, address1 } = await loadFixture(deployContractFixture())

            await expect(limitedNftMinterContract.connect(address1).mintNft(owner.address, METADATA_JSON_URI)).to.be.revertedWith('Ownable: caller is not the owner')
        })

        it('Should mint & transfer a new NFT to the specified wallet', async () => {
            const { limitedNftMinterContract, address1 } = await loadFixture(deployContractFixture())

            const mintNftTransaction = await limitedNftMinterContract.mintNft(address1.address, METADATA_JSON_URI)
            await mintNftTransaction.wait()

            expect(await limitedNftMinterContract.balanceOf(address1.address)).to.equal(1)
            expect(await limitedNftMinterContract.ownerOf(1)).to.equal(address1.address)
        })

        it('Should mint only once for each wallet', async () => {
            const { limitedNftMinterContract, address1 } = await loadFixture(deployContractFixture())

            let mintNftTransaction = await limitedNftMinterContract.mintNft(address1.address, METADATA_JSON_URI)
            await mintNftTransaction.wait()

            await expect(limitedNftMinterContract.mintNft(address1.address, METADATA_JSON_URI)).to.be.revertedWith('Cannot mint more than 1 NFT per wallet')
        })

        const MAX_NFT_ALLOWED = 5
        it(`Should mint only ${MAX_NFT_ALLOWED} NTFs max`, async () => {
            const FAKE_WALLET_ADDRESS = '0x000000000000000000000000000000000000000'

            const { limitedNftMinterContract } = await loadFixture(deployContractFixture())

            let mintNftTransaction
            for (let i = 1; i <= MAX_NFT_ALLOWED; i++) {
                mintNftTransaction = await limitedNftMinterContract.mintNft(FAKE_WALLET_ADDRESS + i, METADATA_JSON_URI)
                await mintNftTransaction.wait()
            }

            await expect(limitedNftMinterContract.mintNft(FAKE_WALLET_ADDRESS + (MAX_NFT_ALLOWED + 1), METADATA_JSON_URI)).to.be.revertedWith('Cannot mint more than 5 NFTs')
        })

        it('Should not allow minting once duration has lapsed', (done) => {
            const MINT_PERIOD_IN_SECONDS = 1

            loadFixture(deployContractFixture(MINT_PERIOD_IN_SECONDS)).then(
                ({ limitedNftMinterContract, owner }) =>
                    setTimeout(() => {
                        expect(limitedNftMinterContract.mintNft(owner.address, METADATA_JSON_URI)).to.be.revertedWith('Minting period has ended')
                            .then(done)
                            .catch(done)
                    }, (MINT_PERIOD_IN_SECONDS + 1) * 1000)
            )
        })
    })
})
