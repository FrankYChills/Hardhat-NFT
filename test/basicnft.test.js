const { assert } = require("chai");
const { network, ethers, deployments } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
var toRun = false;
!developmentChains.includes(network.name) || !toRun
  ? describe.skip
  : describe("Basic NFT Unit tests", function () {
      let basicNft, deployer, accounts;
      beforeEach(async () => {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        console.log("deploying NFT contract");
        await deployments.fixture(["basic"]);
        console.log("Contract Deployed");
        basicNft = await ethers.getContract("NFTContract");
      });
      // Test - 01
      describe("Constructor", () => {
        it("Initializes the NFT Correctly", async () => {
          const name = await basicNft.name();
          const symbol = await basicNft.symbol();
          const tokenCounter = await basicNft.getTokenCounter();
          assert.equal(name, "Tyson");
          assert.equal(symbol, "DOG");
          assert.equal(tokenCounter.toString(), "0");
        });
      });
      describe("Mint NFT", () => {
        beforeEach(async () => {
          const txResponse = await basicNft.mintNft();
          await txResponse.wait(1);
        });
        it("allows users to mint an NFT, and updates appropriately", async () => {
          const tokenURI = await basicNft.tokenURI(0);
          const tokenCounter = await basicNft.getTokenCounter();
          assert.equal(tokenCounter.toString(), "1");
          assert.equal(tokenURI, await basicNft.TOKEN_URI());
        });

        it("shows the correct balance and owner of NFT", async () => {
          const deployerAddress = deployer.address;

          const depoyerBalance = await basicNft.balanceOf(deployerAddress);
          const owner = await basicNft.ownerOf(0);
          assert.equal(depoyerBalance.toString(), "1");
          assert.equal(owner, deployerAddress);
        });
      });
    });
