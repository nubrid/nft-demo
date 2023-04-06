// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/utils/Counters.sol';

contract LimitedNftMinter is ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    uint _mintPeriodInSeconds;
    uint _startTimestamp;
    mapping(address => uint256) public mintedNftWallets;

    constructor(uint mintPeriodInSeconds) ERC721('LimitedNftMinter', 'LNM') payable {
        _startTimestamp = block.timestamp;
        _mintPeriodInSeconds = mintPeriodInSeconds;
    }

    function mintNft(address receiverAddress, string memory metadataJsonUri)
        public
        nonReentrant
        onlyOwner
        returns (uint256)
    {
        require((block.timestamp - _startTimestamp) <= _mintPeriodInSeconds, 'Minting period has ended');
        require(mintedNftWallets[receiverAddress] == 0, 'Cannot mint more than 1 NFT per wallet');

        _tokenIdCounter.increment();
        uint256 currentTokenId = _tokenIdCounter.current();
        require(currentTokenId < 6, 'Cannot mint more than 5 NFTs');

        _mint(receiverAddress, currentTokenId);
        _setTokenURI(currentTokenId, metadataJsonUri);

        mintedNftWallets[receiverAddress] = currentTokenId;

        return currentTokenId;
    }
}
