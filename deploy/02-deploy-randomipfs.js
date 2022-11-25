const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
const {
  storeImages,
  storeTokenUriMetadata,
} = require("../utils/uploadtoPinata");

const MINT_FEE = networkConfig[network.config.chainId]["mintFee"];

const metadataTemplate = {
  name: "",
  description: "",
  image: "",
  attributes: [
    {
      trait_type: "Cuteness",
      value: 100,
    },
  ],
};

const VRF_SUB_FUND_AMOUNT = "3000000000000000000";
module.exports = async (hre) => {
  const { getNamedAccounts, deployments } = hre;
  const { deployer } = await getNamedAccounts();
  const { log, deploy } = deployments;
  log("-------Starting deployment (RandomIPFS NFT)--------------------------");
  const chainId = network.config.chainId;
  var vrfCoordinatorV2MockAddress;
  var vrfCoordinatorV2Mock;
  var subscriptionId;
  // let tokenUris;

  // should be according to the enum indexes of dogs in backend
  let tokenUris = [
    "ipfs://QmTrUxzZwxjmhTnJqRCP4eaW95MaNmiHr9ZFLykurhT2hv", // pug
    "ipfs://QmcPtS5LpWxv6nSA6rmyMmQduvFRriSXkUDPHcjveDKb55", // shiba
    "ipfs://QmW7Xp8Jcxhou2FxVVQwktXRpzuEGEsATSPdfm4gpMbGUQ", // st bernard
  ];
  if (process.env.UPLOAD_TO_PINATA === "true") {
    tokenUris = await handleTokenUris();
  }
  if (developmentChains.includes(network.name)) {
    console.log("Finding VRF contract on local network");

    // get the deployed mock contract (contract for randomness)
    vrfCoordinatorV2Mock = await ethers.getContract("VRFContract");
    console.log("Found the V2 Mock Contract");
    vrfCoordinatorV2MockAddress = vrfCoordinatorV2Mock.address;
    // create a subscription for using VRF
    console.log("creating subscription....");
    const tx = await vrfCoordinatorV2Mock.createSubscription();
    const txReceipt = await tx.wait(1);
    subscriptionId = txReceipt.events[0].args.subId;
    // fund the subscription using subId and amount
    console.log("Subscription created.Funding subscription ...");
    await vrfCoordinatorV2Mock.fundSubscription(
      subscriptionId,
      VRF_SUB_FUND_AMOUNT
    );
    console.log("Funded");
  } else {
    console.log("Finding VRF contract on TestNet (Goerli)");
    vrfCoordinatorV2MockAddress = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId].subscriptionId;
  }
  log("--------------------------------------------------");
  log("Deploying RandomIPFSNFT Contract .....");
  const args = [
    vrfCoordinatorV2MockAddress,
    subscriptionId,
    networkConfig[chainId]["gasLane"],
    networkConfig[chainId]["callbackGasLimit"],
    MINT_FEE,
    tokenUris,
  ];
  const randomIpfsNft = await deploy("IPFSContract", {
    contract: "RandomIpfsNft",
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations,
  });
  console.log("Contract Deployed (RandomIPFSNFT)");
  console.log("Adding RandomIPFS as a consumer to VRF ...");
  await vrfCoordinatorV2Mock.addConsumer(subscriptionId, randomIpfsNft.address);
  console.log("Consumer added....");
  log("---------------------------------------------------");
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying ......");
    await verify(randomIpfsNft.address, args);
  }
};

async function handleTokenUris() {
  tokenUris = [];
  // store the image in IPFS and then store metadata in IPFS
  // upload image to pinata
  const { responses: imageUploadResponses, files } = await storeImages(
    "./images/randomNft"
  );
  // responses is hash responses and files is array of image files(names)
  // for in loop in JS has value of index
  for (let imageUploadResponseIndex in imageUploadResponses) {
    // create metadata and upload metadata
    let tokenUriMetadata = { ...metadataTemplate };
    tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".jpg", "");
    tokenUriMetadata.description = `An Adorable ${tokenUriMetadata.name} pup out there.`;
    tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`;
    console.log(`Got the data for ${tokenUriMetadata.name} . Uploading ...`);
    // upload the metadata to pinata
    const metadataUploadResponse = await storeTokenUriMetadata(
      tokenUriMetadata
    );
    tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`);
  }
  console.log("Token URIs Uploaded successfully. They are :");
  console.log(tokenUris);
  return tokenUris;
}

module.exports.tags = ["all", "randomipfs"];
