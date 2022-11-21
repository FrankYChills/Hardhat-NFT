// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// for logging
import "hardhat/console.sol";

//error
error RandomIpfsNft__RangeOutOfBounds();

contract RandomIpfsNft is VRFConsumerBaseV2, ERC721 {
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

    // when anyone mints an NFT, we'll trigger Chainlink VRFs to get us a random number(proovable)
    // using that we'll get Random NFT
    //Pug(super rare), Shiba Inu(rare), St. Bernard(common)

    // Users have to pay to mint an NFT
    //Only the owner can withdraw ETHs
    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("Random IPFS NFT", "RFT") {
        // save vrf contract locally (interface(address) = contractss)
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_callbackGasLimit = callbackGasLimit;
        i_gas = gasLane;
        i_subscriptionId = subscriptionId;
    }

    // we are using requestNft for requesting random words
    function requestNft() public returns (uint256 requestId) {
        // Will revert if subscription is not set and funded.
        requestId = i_vrfCoordinator.requestRandomWords(
            i_gas,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        // map request ID to user address
        s_requestIdToSender[requestId] = msg.sender;
        return requestId;
    }

    // chainlink nodes will call fulfill random words
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {
        // get the user who triggered this function
        address dogOwner = s_requestIdToSender[requestId];
        uint256 newTokenId = s_tokenCounter;

        console.log("Chainlink VRF Responded");
        console.log("word is %s", randomWords[0]);
        // by modding with MAX_CHANCE_VALUE(100) we are ensuring that number will be between 0 and 99
        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE;
        //0-99
        //0-9 ->PUG,10-29 -> Shiba Inu and 30-99 -> St. Bernard
        Breed dogBreed = getBreedFromModdedRng(moddedRng);
        // Mint an NFT for the user
        _safeMint(dogOwner, newTokenId);
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
            if (
                moddedRng >= cummulativeSum &&
                moddedRng < cummulativeSum + chanceArray[i]
            ) {
                return Breed(i);
            }
            cummulativeSum += chanceArray[i];
        }
        // we have to return some index for sure but incase it doesnt return anything revert with error
        revert RandomIpfsNft__RangeOutOfBounds();
    }

    function getChanceArray() public pure returns (uint256[3] memory) {
        // index has 'value' chance of happening -> 10%(PUG) 20%(30-10)(SHIBA INC) 60%(100-40)(ST BERNARD)
        return [10, 30, MAX_CHANCE_VALUE];
    }

    function tokenURI(uint256) public view override returns (string memory) {}
}
