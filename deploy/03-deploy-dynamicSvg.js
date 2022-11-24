const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config");
const fs = require("fs");

module.exports = async (hre) => {
  const { getNamedAccounts, deployments } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy, log } = deployments;

  const chainId = network.config.chainId;
  let ethUsdPriceFeedAddress;

  if (developmentChains.includes(network.name)) {
    // when we deploy this all mocks would have been deployed
    const ethUsdAggregator = await ethers.getContract("MockV3Contract");
    ethUsdPriceFeedAddress = ethUsdAggregator.address;
  } else {
    ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
  }
  log("Got priceFeed Address");
  log("Getting SVG Images ..");
  const lowSvg = fs.readFileSync("./images/dynamicNft/frown.svg", {
    encoding: "utf8",
  });
  const highSvg = fs.readFileSync("./images/dynamicNft/happy.svg", {
    encoding: "utf8",
  });
  args = [ethUsdPriceFeedAddress, lowSvg, highSvg];
  const dynamicSvgNft = await deploy("DynamicSvgContract", {
    contract: "DynamicSvgNft",
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations,
  });
  // Verify the deployment
  log("SvgNft Contract deployed Successfully.");
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying on Etherscan...");
    await verify(dynamicSvgNft.address, args);
    log("----------Verified ----------------------");
  }
};

module.exports.tags = ["all", "dynamicsvg"];
