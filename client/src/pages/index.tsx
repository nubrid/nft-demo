import axios from 'axios'
import { ethers } from 'ethers'
import { useEffect, useState } from 'react'

import Head from 'next/head'

import LimitedNftMinter from '../../../artifacts/contracts/LimitedNftMinter.sol/LimitedNftMinter.json'

type Config = {
    chainId: string | undefined
    ipfsGatewayEndpointUrl: string | undefined
    ipfsGatewayFileUrl: string | undefined
    ipfsGatewayApiKey: string | undefined
    ipfsGatewayApiSecret: string | undefined
    limitedNftMinterContractAddress: string | undefined
}

export async function getServerSideProps() {
    return {
        props: {
            config: {
                chainId: process.env.CHAIN_ID,
                ipfsGatewayEndpointUrl: process.env.IPFS_GATEWAY_ENDPOINT_URL,
                ipfsGatewayFileUrl: process.env.IPFS_GATEWAY_FILE_URL,
                ipfsGatewayApiKey: process.env.IPFS_GATEWAY_API_KEY,
                ipfsGatewayApiSecret: process.env.IPFS_GATEWAY_API_SECRET,
                limitedNftMinterContractAddress: process.env.LIMITED_NFT_MINTER_CONTRACT_ADDRESS,
            }
        }
    }
}

export default function Home({ config }: { config: Config }) {
    // NOTE: https://javascript.plainenglish.io/fullstack-nft-minting-dapp-using-next-js-hardhat-ethers-js-alchemy-metamask-and-tailwindcss-145e0ef41d26
	const [correctWalletNetwork, setCorrectWalletNetwork] = useState(false)

    const [selectedFileBlob, setSelectedFileBlob] = useState<File>()

    const [ipfsUrl, setIpfsUrl] = useState('')
    let ipfsMetadataUrl = ''

    const [isFirstTimeMinter, setIsFirstTimeMinter] = useState(true)
    const [mintingStatus, setMintingStatus] = useState(0)

    async function connectWallet() {
        const { ethereum } = window

		try {
			if (!ethereum) {
				console.log('Metamask not detected')
				return
			}

            const ethChainId = await ethereum.request({ method: 'eth_chainId' })
			console.log('Connected to chain: ' + ethChainId)

			if (ethChainId !== config.chainId) {
				alert('You are not connected to the correct network!')
				return false
			}

			const ethRequestAccounts = await ethereum.request({ method: 'eth_requestAccounts' })

			console.log('Found account: ', ethRequestAccounts[0])

            return true
		} catch (error) {
			console.log('Error connecting to metamask: ', error)
		}
	}

    async function checkCorrectWalletNetwork() {
        const { ethereum } = window

        const ethChainId = await ethereum.request({ method: 'eth_chainId' })
        console.log('Connected to chain: ' + ethChainId)

		if (ethChainId !== config.chainId) {
			setCorrectWalletNetwork(false)
		} else {
			setCorrectWalletNetwork(true)
		}
	}

    function onFileSelected(fileInputChangeEvent: React.ChangeEvent<HTMLInputElement>) {
        fileInputChangeEvent.preventDefault()

        if (!connectWallet()) return

        const fileInputElement = fileInputChangeEvent.currentTarget as HTMLInputElement
        const selectedFileBlob = (fileInputElement.files || [])[0]

        if (!selectedFileBlob) return

        setSelectedFileBlob(selectedFileBlob)
    }

    // NOTE: https://dev.to/fidalmathew/send-files-to-ipfs-using-pinata-api-in-reactjs-3c3
    async function uploadFiletoIpfs() {
        if (!selectedFileBlob) return

        try {
            const selectedFileData = new FormData()
            selectedFileData.append('file', selectedFileBlob)

            let pinFileToIpfsResponse = await axios({
                method: 'post',
                url: config?.ipfsGatewayEndpointUrl,
                data: selectedFileData,
                headers: {
                    'PINATA_API_KEY': config?.ipfsGatewayApiKey,
                    'PINATA_SECRET_API_KEY': config?.ipfsGatewayApiSecret,
                    'Content-Type': 'multipart/form-data',
                },
            })

            const imageUrl = `${config?.ipfsGatewayFileUrl}/${pinFileToIpfsResponse.data.IpfsHash}`
            setIpfsUrl(imageUrl)

            const selectedFileMetadata = new FormData()
            selectedFileMetadata.append('file', new Blob([JSON.stringify({
                name: selectedFileBlob.name,
                description: 'LNM token',
                image: imageUrl,
              })], {
              type: 'application/json'
            }), `${selectedFileBlob.name}-metadata.json`)

            pinFileToIpfsResponse = await axios({
                method: 'post',
                url: config?.ipfsGatewayEndpointUrl,
                data: selectedFileMetadata,
                headers: {
                    'PINATA_API_KEY': config?.ipfsGatewayApiKey,
                    'PINATA_SECRET_API_KEY': config?.ipfsGatewayApiSecret,
                    'Content-Type': 'multipart/form-data',
                },
            })

            ipfsMetadataUrl = `${config?.ipfsGatewayFileUrl}/${pinFileToIpfsResponse.data.IpfsHash}`

            return true
        } catch (error) {
            console.log('Error sending File to IPFS: ', error)

            return false
        }
    }

    async function onMintNft(formSubmitEvent: React.FormEvent<HTMLFormElement>) {
        formSubmitEvent.preventDefault()

        if (!connectWallet()) return

        const { ethereum } = window

        if (!ethereum) {
            console.log('Metamask not detected')
            return
        }

        const web3Provider = new ethers.providers.Web3Provider(ethereum)
        const signer = web3Provider.getSigner()
        const signerAddress = await signer.getAddress()
        const limitedNftMinterContract = new ethers.Contract(
            config?.limitedNftMinterContractAddress || '',
            LimitedNftMinter.abi,
            signer
        )

        const signerMintedNftToken = await limitedNftMinterContract.mintedNftWallets(signerAddress)
        const isFirstTimeMinter = ethers.utils.formatEther(signerMintedNftToken) === '0.0'
        setIsFirstTimeMinter(isFirstTimeMinter)

        if (!isFirstTimeMinter || !await uploadFiletoIpfs()) {
            if (!isFirstTimeMinter) {
                const { data } = await axios.get(await limitedNftMinterContract.tokenURI(signerMintedNftToken))
                setIpfsUrl(data.image)
            }

            return
        }

        try {
            const mintNftTransaction = await limitedNftMinterContract.mintNft(signerAddress, ipfsMetadataUrl, { gasLimit: 300_000 })
            setMintingStatus(1)
            console.log('Mining...', mintNftTransaction.hash)

            const transactionDetails = await mintNftTransaction.wait()
            setMintingStatus(2)
            console.log('Mined!', transactionDetails)
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
		checkCorrectWalletNetwork()
	})

    return (
      <>
        <Head>
          <title>Limited NFT Minter DEMO</title>
          <meta name="description" content="Limited NFT Minter DEMO" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <main className="container mx-auto p-4">
            <header className="bg-white dark:bg-gray-900">
                <nav className="border-t-4 border-blue-500">
                    <div className="container flex items-center justify-between px-6 py-3 mx-auto">
                        <a href="#">
                            <h2 className="text-3xl font-semibold text-gray-800 dark:text-white lg:text-4xl">Randell Rivera</h2>
                        </a>

                        <a className="my-1 text-sm font-medium text-gray-500 rtl:-scale-x-100 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400 lg:mx-4 lg:my-0" href="#">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                        </a>
                    </div>
                </nav>

                <div className="container px-6 py-16 mx-auto">
                    <div className="items-center lg:flex">
                        <div className="w-full lg:w-1/2">
                            <div className="lg:max-w-lg">
                                <h1 className="text-3xl font-semibold text-gray-800 dark:text-white lg:text-4xl">Upload & <span className="text-blue-500">Mint Your NFT</span></h1>

                                <p className="mt-3 text-gray-600 dark:text-gray-400">Minting requires you to <span className="font-medium text-blue-500">Connect with MetaMask</span> extension</p>

                                <div>
                                <form className="form" onSubmit={onMintNft}>
                                    <input type="file" name="data" onChange={onFileSelected} required className="block w-full px-3 py-2 mt-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg file:bg-gray-200 file:text-gray-700 file:text-sm file:px-4 file:py-1 file:border-none file:rounded-full dark:file:bg-gray-800 dark:file:text-gray-200 dark:text-gray-300 placeholder-gray-400/70 dark:placeholder-gray-500 focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40 dark:border-gray-600 dark:bg-gray-900 dark:focus:border-blue-300" />
                                    { selectedFileBlob && isFirstTimeMinter && correctWalletNetwork &&
                                        <button type="submit" className="px-6 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-300 transform bg-blue-600 rounded-lg hover:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-80 mt-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 float-left mr-2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>
                                            <span>{ mintingStatus === 2 ? 'Minting NFT Done!' : mintingStatus === 1 ? 'Minting NFT ...' : 'Mint NFT'}</span>
                                        </button>
                                    }
                                    { !isFirstTimeMinter && <div><span className="font-medium text-blue-500">Oops! </span><span className="mt-3 text-gray-600 dark:text-gray-400">You&apos;ve already minted your NFT :D</span></div> }
                                    { !correctWalletNetwork && <div><span className="font-medium text-blue-500">Oh no! </span><span className="mt-3 text-gray-600 dark:text-gray-400">You&apos;re in the wrong network XD</span></div> }
                                </form>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center w-full mt-6 lg:mt-0 lg:w-1/2">
                            <img className="w-full h-full max-w-md" src={ ipfsUrl || 'https://merakiui.com/images/components/Catalogue-pana.svg' } alt="email illustration vector art" />
                        </div>
                    </div>
                </div>
            </header>
        </main>
      </>
    )
}
