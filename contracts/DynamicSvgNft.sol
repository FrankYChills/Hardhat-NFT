//SPDX-License-Identifier: MIT
// JSON and IMAGE URIs are stored onchain in this contract
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "base64-sol/base64.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract DynamicSvgNft is ERC721 {
    uint256 private s_tokenCounter;
    string private i_lowImageUri;
    string private i_highImageUri;
    string private constant BASE64_ENCODED_SVG_PREFIX =
        "data:image/svg+xml;base64,";
    AggregatorV3Interface internal immutable i_priceFeed;
    // mapping of token to its threshold value according to which(highvalue) token's(nft) image URI is choosed
    mapping(uint256 => int256) public s_tokenIdToHighValue;

    event CreatedNFT(uint256 indexed tokenId, int256 highValue);

    constructor(
        address priceFeedAddress,
        string memory lowSvg,
        string memory highSvg
    ) ERC721("Dynamic SVG NFT", "DSN") {
        s_tokenCounter = 0;
        i_lowImageUri = svgToImageUri(lowSvg);
        i_highImageUri = svgToImageUri(highSvg);
        i_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    // Encode(base64) Image URI (args - svg image)
    function svgToImageUri(string memory svg)
        public
        pure
        returns (string memory)
    {
        string memory svgBase64Encoded = Base64.encode(
            bytes(string(abi.encodePacked(svg)))
        );
        return
            string(
                abi.encodePacked(BASE64_ENCODED_SVG_PREFIX, svgBase64Encoded)
            );
    }

    function mintNft(int256 highValue) public {
        s_tokenIdToHighValue[s_tokenCounter] = highValue;
        s_tokenCounter += 1;
        _safeMint(msg.sender, s_tokenCounter);
        emit CreatedNFT(s_tokenCounter, highValue);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,";
    }

    // Encode(base64) JSON URI (args - nft's tokenId)
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        // check if tokenId is valid
        require(_exists(tokenId), "URI Query for non-existent token");
        // string memory imageURI = "hello";

        // set the image URI according to chainlink priceFeed
        // get price using chainlik pricefeed
        string memory imageURI;
        (, int256 price, , , ) = i_priceFeed.latestRoundData();
        if (price >= s_tokenIdToHighValue[tokenId]) {
            imageURI = i_highImageUri;
        } else {
            imageURI = i_lowImageUri;
        }
        return
            string(
                abi.encodePacked(
                    _baseURI(),
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"',
                                name(),
                                '","description":"An NFT that changes based on Chainlink Feed",',
                                '"attributes":[{"trait_type":"coolness", "value":100}],"image":"',
                                imageURI,
                                '"}'
                            )
                        )
                    )
                )
            );
    }
}
