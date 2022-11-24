// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// we are importing onlyOwner modifier from openZepplin
// for logging
import "hardhat/console.sol";

//error
error RandomIpfsNft__RangeOutOfBounds();
error RandomIpfsNft__NeedMoreETH();
error RandomIpfsNft__TransferFailed();

contract RandomIpfsNft is VRFConsumerBaseV2, ERC721URIStorage, Ownable {
    //Custom type declarations
    enum Breed {
        PUG, //0
        SHIBA_INU, //1
        ST_BERNARD //2
    }

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    // for requesting random words we need below specifies variables
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gas;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    // requestId for each request
    uint256 public requestId;
    // since we need to know which user called the requestNft for generating random number through VRF, we need mapping for that as requestId => address
    mapping(uint256 => address) public s_requestIdToSender;
    // NFT Variables
    uint256 public s_tokenCounter;
    uint256 internal constant MAX_CHANCE_VALUE = 100;
    string[] internal s_dogTokenUris;
    uint256 internal i_MintFee;
    bool internal s_initialized;

    //Events
    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(Breed dogBreed, address minter);

    // when anyone mints an NFT, we'll trigger Chainlink VRFs to get us a random number(proovable)
    // using that we'll get Random NFT
    //Pug(super rare), Shiba Inu(rare), St. Bernard(common)

    // Users have to pay to mint an NFT
    //Only the owner can withdraw ETHs
    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint32 callbackGasLimit,
        uint256 mintFee,
        string[3] memory dogTokenUris
    ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("Random IPFS NFT", "RFT") {
        // save vrf contract locally (interface(address) = contractss)
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_callbackGasLimit = callbackGasLimit;
        i_gas = gasLane;
        i_subscriptionId = subscriptionId;
        s_dogTokenUris = dogTokenUris;
        i_MintFee = mintFee;
        s_tokenCounter = 0;
        s_initialized = true;
    }

    function requestNft() public payable returns (uint256 requestId) {
        if (msg.value < i_MintFee) {
            revert RandomIpfsNft__NeedMoreETH();
        }
        console.log("Fee Paid. Getting Random Number from Chainlink VRF");
        // Will revert if subscription is not set and funded.
        // we are using requestNft for requesting random words

        requestId = i_vrfCoordinator.requestRandomWords(
            i_gas,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        // map request ID to user address
        s_requestIdToSender[requestId] = msg.sender;
        emit NftRequested(requestId, msg.sender);
    }

    // chainlink nodes will call fulfill random words
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {
        // get the user who triggered this function
        address dogOwner = s_requestIdToSender[requestId];

        s_tokenCounter += 1;
        uint256 newTokenId = s_tokenCounter;
        console.log("Chainlink VRF Responded");
        console.log("word is %s", randomWords[0]);
        // by modding with MAX_CHANCE_VALUE(100) we are ensuring that number will be between 0 and 99
        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE;
        //0-99
        //0-9 ->PUG,10-29 -> Shiba Inu and 30-99 -> St. Bernard
        Breed dogBreed = getBreedFromModdedRng(moddedRng);
        // dogbreed is Breed type of value 0|1|2 .Convert that into uint256
        console.log("Got dog breed.Minting an NFT");
        // Mint an NFT for the user
        _safeMint(dogOwner, newTokenId);
        // set the NFT URI via tokenId . URI's basically points to JSON file

        _setTokenURI(newTokenId, s_dogTokenUris[uint256(dogBreed)]);
        emit NftMinted(dogBreed, dogOwner);
    }

    function getBreedFromModdedRng(uint256 moddedRng)
        public
        pure
        returns (Breed)
    {
        uint256 cummulativeSum = 0;
        uint256[3] memory chanceArray = getChanceArray();
        // return index(Breed enum) according to chance Array
        // find moddedRng value as an index in chanceArray
        //50
        for (uint256 i = 0; i < chanceArray.length; i++) {
            if (moddedRng >= cummulativeSum && moddedRng < chanceArray[i]) {
                // returns 0|1|2
                return Breed(i);
            }
            cummulativeSum = chanceArray[i];
        }
        // we have to return some index for sure but incase it doesnt return anything revert with error
        revert RandomIpfsNft__RangeOutOfBounds();
    }

    function getChanceArray() public pure returns (uint256[3] memory) {
        // index has 'value' chance of happening -> 10%(PUG) 20%(30-10)(SHIBA INC) 60%(100-40)(ST BERNARD)
        return [10, 30, MAX_CHANCE_VALUE];
    }

    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert RandomIpfsNft__TransferFailed();
        }
    }

    function getMintFee() public view returns (uint256) {
        return i_MintFee;
    }

    function getDogTokenUris(uint256 index)
        public
        view
        returns (string memory)
    {
        return s_dogTokenUris[index];
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }

    function getInitialized() public view returns (bool) {
        return s_initialized;
    }
}
