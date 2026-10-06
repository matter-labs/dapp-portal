import fs from "fs";
import AdmZip from "adm-zip";
import fetch from "node-fetch";

const metamaskVersion = process.env.METAMASK_VERSION;
const metamaskZipSource =
  "https://github.com/MetaMask/metamask-extension/releases/download/v" +
  metamaskVersion +
  "/metamask-chrome-" +
  metamaskVersion +
  ".zip";
const targetDirectory = "src/support/extension/metamask-chrome-" + metamaskVersion + "/";
const fileName = "extension.zip";
const metamaskZipTarget = targetDirectory + fileName;

async function downloadExtension() {
  // check and create directory
  if (!fs.existsSync(targetDirectory)) {
    fs.mkdirSync(targetDirectory, { recursive: true });
  }

  if (!metamaskZipSource) return Promise.reject(new Error("Incorrect source url " + metamaskZipSource));
  if (!targetDirectory) return Promise.reject(new Error("Incorrect target directory " + targetDirectory));

  return new Promise(function (resolve, reject) {
    // download file
    fetch(metamaskZipSource).then(function (res) {
      const fileStream = fs.createWriteStream(metamaskZipTarget);
      res.body.on("error", reject);
      fileStream.on("finish", resolve);
      res.body.pipe(fileStream);
    });
  });
}

async function extractExtension(filepath) {
  try {
    const zip = new AdmZip(filepath);
    const outputDir = targetDirectory;
    await zip.extractAllTo(outputDir);
    console.log(`Extracted to "${outputDir}" successfully`);
    await fs.unlink(metamaskZipTarget, () => {
      console.log(`Successfully deleted ${fileName} with downloaded Metamask extension`);
    });
  } catch (e) {
    console.log(`Something went wrong. ${e}`);
  }
}

await downloadExtension();
await extractExtension(metamaskZipTarget);
