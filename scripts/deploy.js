// Script de deploy do contrato Turing (baseado no hardhat-boilerplate).
// Uso: npx hardhat run scripts/deploy.js --network localhost

const path = require("path");

async function main() {
  if (network.name === "hardhat") {
    console.warn(
      "Você está fazendo deploy na rede Hardhat efêmera (some ao fim do script)." +
        " Use '--network localhost' com 'npx hardhat node' rodando."
    );
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploy com a conta (owner):", await deployer.getAddress());

  const Turing = await ethers.getContractFactory("Turing");
  const turing = await Turing.deploy();
  await turing.waitForDeployment();

  console.log("Turing address:", await turing.getAddress());

  saveFrontendFiles(turing);
}

function saveFrontendFiles(turing) {
  const fs = require("fs");
  const contractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ Turing: turing.target }, undefined, 2)
  );

  const TuringArtifact = artifacts.readArtifactSync("Turing");

  fs.writeFileSync(
    path.join(contractsDir, "Turing.json"),
    JSON.stringify(TuringArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
