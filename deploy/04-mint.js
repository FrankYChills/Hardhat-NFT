const { ethers, network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

// Mints each NFTs
module.exports = async (hre) => {
  const { getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  //Mint Basic NFT
  // we need to pass deployer to identify the contracts in the testnet
  console.log("Minting all NFTS ...");
  console.log("Getting BasicNFT Contract...");
  const basicNft = await ethers.getContract("NFTContract", deployer);
  console.log("Got BasicNFT Contract");
  console.log("Minting NFT ...");
  const basicMintTx = await basicNft.mintNft();
  await basicMintTx.wait(1);
  console.log("NFT Minted");
  console.log(
    `Basic NFT is at URI (tokenURI index 0) : ${await basicNft.tokenURI(0)}`
  );

  //Mint RandomIPFS NFT
  console.log("Getting RandomIPFSNFT Contract....");
  const randomIpfsNft = await ethers.getContract("IPFSContract", deployer);
  const mintFee = await randomIpfsNft.getMintFee();
  console.log("Got RandomIPFS Contract");
  console.log("Minting NFT ...");
  // we have to wait for chainlink VRF to fulfill random words so that our contract do further ops
  await new Promise(async (resolve, reject) => {
    setTimeout(resolve, 300000); //5 mins
    randomIpfsNft.once("NftMinted", async function () {
      console.log("NFT Minted");

      resolve();
    });
    const randomIpfsNftMintTx = await randomIpfsNft.requestNft({
      value: mintFee.toString(),
    });
    const randomIpfsNftMintTxReceipt = await randomIpfsNftMintTx.wait(1);
    if (developmentChains.includes(network.name)) {
      // if on local network call chainlink vrf fulfillrandomwords manually locally
      // in testnet such as goerli chainlink vrf will auto call fulfillrandomwords to our contract and our contract will do further operations
      const requestId =
        randomIpfsNftMintTxReceipt.events[1].args.requestId.toString();
      const vrfCoordinatorV2Mock = await ethers.getContract(
        "VRFContract",
        deployer
      );
      await vrfCoordinatorV2Mock.fulfillRandomWords(
        requestId,
        randomIpfsNft.address
      );
      // after random number is generated dog breed is decided and nft is minted.Event NftMinted gets triggered then.
    }
  });
  console.log(
    `Random IPFS NFT is at URI (tokenURI index 0) : ${await randomIpfsNft.tokenURI(
      0
    )}`
  );

  //Mint Dynamic SVG NFT
  console.log("Getting DynamicSVGNFT Contract....");
  const highValue = ethers.utils.parseEther("4000"); //4000 US$/ETH
  const dynamicSvgNft = await ethers.getContract(
    "DynamicSvgContract",
    deployer
  );
  console.log("Got DynamicSVGNFT Contract");
  console.log("Minting NFT ...");

  const dynamicSvgNftMintTx = await dynamicSvgNft.mintNft(highValue.toString());
  await dynamicSvgNftMintTx.wait(1);
  console.log("NFT Minted");
  console.log(
    `Dynamic SVG NFT is at URI (tokenURI index 0) : ${await dynamicSvgNft.tokenURI(
      0
    )}`
  );
};
