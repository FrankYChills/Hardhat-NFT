const { assert, expect } = require("chai");
const { ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Random IPFS Unit Tests", function () {
      let randomIpfsNft, deployer, vrfCoordinatorV2Mock;
      beforeEach(async () => {
        let accounts = await ethers.getSigners();
        deployer = accounts[0];
        // deploy contracts
        await deployments.fixture(["mocks", "randomipfs"]);
        randomIpfsNft = await ethers.getContract("IPFSContract");
        vrfCoordinatorV2Mock = await ethers.getContract("VRFContract");
      });
      describe("constructor", function () {
        it("sets starting values correctly", async () => {
          const dogTokenUriZero = await randomIpfsNft.getDogTokenUris(0);
          const isInitialized = await randomIpfsNft.getInitialized();
          assert(dogTokenUriZero.includes("ipfs://"));
          assert(isInitialized, true);
        });
      });
      describe("request-Nft", function () {
        it("fails if payment isn't send to request/Mint an NFT", async () => {
          await expect(randomIpfsNft.requestNft()).to.be.revertedWith(
            "RandomIpfsNft__NeedMoreETH"
          );
        });
        it("reverts if user paid less than required amount", async () => {
          await expect(
            randomIpfsNft.requestNft({ value: "1000000000000000" })
          ).to.be.revertedWith("RandomIpfsNft__NeedMoreETH");
        });
        it("when correct amount is paid, should emit an event", async () => {
          await expect(
            randomIpfsNft.requestNft({ value: "10000000000000000" })
          ).to.emit(randomIpfsNft, "NftRequested");
        });
      });
      describe("fulfill Random Words", function () {
        it("mints an nft after a random number is generated", async () => {
          await new Promise(async (resolve, reject) => {
            randomIpfsNft.once("NftMinted", async () => {
              try {
                const tokenUri = await randomIpfsNft.tokenURI("0");
                // get the dog uri via token id(0 here cause its the first nft to be generated) (it only gets set after nft is minted)
                const tokenCounter = await randomIpfsNft.getTokenCounter();
                assert.equal(tokenUri.toString().includes("ipfs://"), true);
                assert.equal(tokenCounter.toString(), "1");
                resolve();
              } catch (e) {
                console.log(e);
                reject(e);
              }
            });
            try {
              const fee = await randomIpfsNft.getMintFee();
              const reqNftRes = await randomIpfsNft.requestNft({
                value: fee.toString(),
              });
              const reqNftResReceipt = await reqNftRes.wait(1);
              // we have to manually call fulfill random word with any random number(here address)
              await vrfCoordinatorV2Mock.fulfillRandomWords(
                reqNftResReceipt.events[1].args.requestId,
                randomIpfsNft.address
              );
              // after random number is generated dog breed is decided and nft is minted.Event NftMinted gets triggered then.
            } catch (e) {
              console.log(e);
              reject(e);
            }
          });
        });
      });
      describe("getBreedFromModdedRng", function () {
        it("should return pug if moddedrng < 10", async () => {
          const expectedValue = await randomIpfsNft.getBreedFromModdedRng(7);
          // in enum type -> 0-pug
          assert.equal(expectedValue, 0);
        });
        it("should return shiba-inu if moddedRng is between 10 - 39", async function () {
          const expectedValue = await randomIpfsNft.getBreedFromModdedRng(21);
          assert.equal(1, expectedValue);
        });
        it("should return st. bernard if moddedRng is between 40 - 99", async function () {
          const expectedValue = await randomIpfsNft.getBreedFromModdedRng(99);
          assert.equal(2, expectedValue);
        });
        it("should revert if moddedRng > 99", async function () {
          await expect(
            randomIpfsNft.getBreedFromModdedRng(100)
          ).to.be.revertedWith("RandomIpfsNft__RangeOutOfBounds");
        });
      });
    });
