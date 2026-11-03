// Envia 10 ETH (de teste) para um endereço — útil para a professora
// pagar gas na rede local.  Uso:
//   npx hardhat --network localhost faucet 0xEndereco
const { task } = require("hardhat/config");

task("faucet", "Envia ETH de teste para um endereço")
  .addPositionalParam("receiver", "Endereço que receberá ETH")
  .setAction(async ({ receiver }, { ethers }) => {
    const [sender] = await ethers.getSigners();
    const tx = await sender.sendTransaction({
      to: receiver,
      value: ethers.parseEther("10"),
    });
    await tx.wait();
    console.log(`10 ETH enviados para ${receiver}`);
  });
