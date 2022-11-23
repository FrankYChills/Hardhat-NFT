const fs = require("fs");
const pinataSDK = require("@pinata/sdk");
const path = require("path");
require("dotenv").config();

const pinataApiKey = process.env.PINATA_API_KEY;
const pinataApiSecret = process.env.PINATA_API_SECRET;
const pinata = new pinataSDK(pinataApiKey, pinataApiSecret);

//
async function storeImages(imagesFilePath) {
  console.log("WORKING WITH PINATA ...");
  const fullImagesPath = path.resolve(imagesFilePath);
  const files = fs.readdirSync(fullImagesPath);
  let responses = [];
  console.log("Uploading to PINATA");
  for (let fileIndex in files) {
    console.log(`Working on ${fileIndex}`);
    const readableStreamForFile = fs.createReadStream(
      `${fullImagesPath}/${files[fileIndex]}`
    );
    const options = {
      pinataMetadata: {
        name: files[fileIndex],
      },
    };
    try {
      // response will be the hash of the file uploaded
      const response = await pinata.pinFileToIPFS(
        readableStreamForFile,
        options
      );
      responses.push(response);
    } catch (e) {
      console.log(e);
    }
  }
  console.log("Images uploaded to Pinata");
  for (let image in responses) {
    console.log(`Image : ${responses[image].ipfsHash}`);
  }
  return { responses, files };
}

async function storeTokenUriMetadata(metadata) {
  const options = {
    pinataMetadata: {
      name: metadata.name,
    },
  };
  try {
    const response = await pinata.pinJSONToIPFS(metadata, options);
    return response;
  } catch (error) {
    console.log(error);
  }
  return null;
}
module.exports = { storeImages, storeTokenUriMetadata };
