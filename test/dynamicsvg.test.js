const { assert, expect } = require("chai");
const { network, ethers, deployments } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Dynamic SVG NFT Unit Tests", function () {
      let dynamicSvgNft, deployer, mockV3Aggregator;
      beforeEach(async () => {
        let accounts = await ethers.getSigners();
        deployer = accounts[0];
        // deploy contracts
        await deployments.fixture(["mocks", "dynamicsvg"]);
        dynamicSvgNft = await ethers.getContract("DynamicSvgContract");
        mockV3Aggregator = await ethers.getContract("MockV3Contract");
      });
      describe("constructor", function () {
        it("sets the starting values correctly", async () => {
          const lowSvg = await dynamicSvgNft.getLowSvg();
          const highSvg = await dynamicSvgNft.getHighSvg();
          const priceFeed = await dynamicSvgNft.getPriceFeed();
          assert(lowSvg.includes("data:image/svg+xml;base64"));
          assert(highSvg.includes("data:image/svg+xml;base64"));
          assert.equal(priceFeed, mockV3Aggregator.address);
        });
      });
      describe("Mint NFT", function () {
        it("emits an event and creates an NFT", async () => {
          // threshold value to change nft accordingly
          const highValue = ethers.utils.parseEther("1");
          // here we are meaning 1 USD/ETH
          await expect(dynamicSvgNft.mintNft(highValue)).to.emit(
            dynamicSvgNft,
            "CreatedNFT"
          );
          const tokenCounter = await dynamicSvgNft.getTokenCounter();
          assert.equal(tokenCounter, "1");

          const tokenURI = await dynamicSvgNft.tokenURI(0);
          //since we are passing high value as 1dollar/ETH andon chainlink definately the price of ETH is greater than 1$/ETH so token URI will have highsvg
          assert(tokenURI.includes("data:application/json;base64,"));
        });
        it("shifts the token URI to lower svg when price is below passed highValue", async () => {
          const highValue = ethers.utils.parseEther("100000000");
          // $100,000,000 dollar per ether
          // now clearly the price of ETH is below above specified price so lowersvg should be implemented
          const txResponse = await dynamicSvgNft.mintNft(highValue);
          await txResponse.wait(1);
          const tokenURI = await dynamicSvgNft.tokenURI(0);
          assert(tokenURI.includes("data:application/json;base64,"));
        });
      });
    });
