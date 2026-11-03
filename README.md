# Turing dApp — Atividade 13

Criptomoeda **Turing (TUR)**, implementada como **ERC-20** (OpenZeppelin), com
*Uncapped Lazy Supply* (nenhum mint no construtor) e uma dApp para votar nos
projetos finais.

## Estrutura

```
contracts/Turing.sol     contrato (ERC-20 + regras de votação)
scripts/deploy.js        deploy + cópia do ABI/endereço para o frontend
test/Turing.js           testes (npx hardhat test)
tasks/faucet.js          envia ETH de teste a um endereço (ex.: professora)
frontend/                React + Vite + ethers v6
```

## Como rodar

```bash
# 1) backend
npm install
npx hardhat test                 # 6 testes
npx hardhat node                 # terminal 1 (deixe rodando)
npx hardhat run scripts/deploy.js --network localhost   # terminal 2

# (opcional) dar ETH para a professora pagar gas na rede local
npx hardhat --network localhost faucet 0x502542668aF09fa7aea52174b9965A7799343Df7

# 2) frontend
cd frontend
npm install
npm start                        # http://localhost:3000
```

Na MetaMask: adicione a rede `http://127.0.0.1:8545`, chainId `31337`, e importe
as chaves privadas das contas que o `npx hardhat node` imprime:

| Conta Hardhat | Papel |
|---|---|
| #0 `0xf39F…2266` | owner (deployer) → superusuário |
| #1 a #5 | nome1 … nome5 |
| `0x5025…3Df7` | roberta (professora) → superusuária |

> Se reiniciar o `hardhat node`, use *Configurações → Avançado → Limpar dados de
> atividade* na MetaMask para zerar os nonces.

## Contrato — resumo das regras

| Função | Quem | Regras |
|---|---|---|
| `updateUser(codinome, addr)` | owner/professora (modifier `onlySuperUser`) | codinome não vazio |
| `votingOn()` / `votingOff()` | owner/professora | liga/pausa `voting` (inicia `true`) |
| `issueToken(codinome, qtde)` | owner/professora | mint para o codinome |
| `vote(codinome, qtde)` | usuários da tabela | votação ativa; não vota em si; `0 < qtde ≤ 2 TUR`; 1 voto por codinome (`hasVote[voter][votado]`); a cada 10 votos o votante ganha 1 TUR |

Quantidades são em unidades de 18 casas decimais (o frontend converte com
`parseEther`, então dá para votar 0,5 TUR, por exemplo).

## Frontend

* Usuário comum: formulário **Votar**.
* Superusuário: **Votar**, **issueToken**, **votingOn/votingOff**.
* Seletores de codinome excluem a professora.
* Ranking ordenado por saldo, atualizado por **eventos** (`Transfer`,
  `VotingStatusChanged`, `UserUpdated`).
