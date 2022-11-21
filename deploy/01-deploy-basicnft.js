const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async (hre) => {
  const { getNamedAccounts, deployments } = hre;
  const { deployer } = await getNamedAccounts();
  const { log, deploy } = deployments;
  log("-------Starting deployment --------------------------");
  const args = [];
  const basicNft = await deploy("NFTContract", {
    contract: "BasicNFT",
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations,
  });
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(basicNft.address, args);
  }
  log("-----------------------------------------------------------");
};
module.exports.tags = ["all", "basic"];
