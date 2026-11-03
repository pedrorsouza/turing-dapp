const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const PROF = "0x502542668aF09fa7aea52174b9965A7799343Df7";
const T = (n) => ethers.parseEther(String(n));

describe("Turing", function () {
  let turing, owner, n1, n2, n3, n4, n5, outsider;

  beforeEach(async () => {
    [owner, n1, n2, n3, n4, n5, outsider] = await ethers.getSigners();
    turing = await (await ethers.getContractFactory("Turing")).deploy();
  });

  it("não emite tokens no deploy e inicializa a tabela", async () => {
    expect(await turing.totalSupply()).to.equal(0);
    expect(await turing.users("nome1")).to.equal(n1.address);
    expect(await turing.users("roberta")).to.equal(PROF);
    expect(await turing.voting()).to.equal(true);
    expect((await turing.getCodinomes()).length).to.equal(6);
  });

  it("issueToken só pelo owner/professora", async () => {
    await turing.issueToken("nome2", T(5));
    expect(await turing.balanceOf(n2.address)).to.equal(T(5));
    await expect(turing.connect(n1).issueToken("nome2", T(1))).to.be.revertedWith("Apenas owner ou professora");
  });

  it("professora também é superusuária", async () => {
    await network.provider.request({ method: "hardhat_impersonateAccount", params: [PROF] });
    await owner.sendTransaction({ to: PROF, value: T(1) });
    const prof = await ethers.getSigner(PROF);
    await turing.connect(prof).votingOff();
    expect(await turing.voting()).to.equal(false);
  });

  it("updateUser valida codinome e atualiza mapas", async () => {
    await expect(turing.updateUser("", outsider.address)).to.be.revertedWith("Codinome vazio");
    await turing.updateUser("nome6", outsider.address);
    expect(await turing.codinomeOf(outsider.address)).to.equal("nome6");
    await turing.connect(outsider).vote("nome1", T(1));
  });

  it("regras do vote", async () => {
    await expect(turing.connect(outsider).vote("nome1", T(1))).to.be.revertedWith("Usuario nao autorizado");
    await expect(turing.connect(n1).vote("nome1", T(1))).to.be.revertedWith("Nao pode votar em si mesmo");
    await expect(turing.connect(n1).vote("nome2", 0)).to.be.revertedWith("Qtde deve ser > 0 e <= 2 Turings");
    await expect(turing.connect(n1).vote("nome2", T(2) + 1n)).to.be.revertedWith("Qtde deve ser > 0 e <= 2 Turings");
    await turing.connect(n1).vote("nome2", T(2));
    expect(await turing.balanceOf(n2.address)).to.equal(T(2));
    await expect(turing.connect(n1).vote("nome2", T(1))).to.be.revertedWith("Ja votou neste codinome");
    await turing.votingOff();
    await expect(turing.connect(n1).vote("nome3", T(1))).to.be.revertedWith("Votacao pausada");
    await turing.votingOn();
    await turing.connect(n1).vote("nome3", T(1));
  });

  it("a cada 10 votos o votante ganha 1 Turing", async () => {
    for (let i = 6; i <= 15; i++) {
      await turing.updateUser("aluno" + i, ethers.Wallet.createRandom().address);
    }
    const alvos = ["nome2", "nome3", "nome4", "nome5", "aluno6", "aluno7", "aluno8", "aluno9", "aluno10"];
    for (const a of alvos) await turing.connect(n1).vote(a, T(1));
    expect(await turing.balanceOf(n1.address)).to.equal(0);
    await expect(turing.connect(n1).vote("aluno11", T(1))).to.emit(turing, "VoterRewarded");
    expect(await turing.balanceOf(n1.address)).to.equal(T(1));
  });
});
