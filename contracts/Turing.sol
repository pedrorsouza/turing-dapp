// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * Turing (TUR) — ERC-20 com "Uncapped Lazy Supply":
 * nenhum token é emitido no construtor; tudo é criado sob demanda (mint),
 * sem limite máximo de supply.
 *
 * Quantidades são passadas na menor unidade (18 casas decimais), como em
 * qualquer ERC-20. Ex.: 1 Turing = 1e18; 0.5 Turing = 5e17.
 */
contract Turing is ERC20 {
    // ---------------------------------------------------------------- estado
    address public owner;
    address public constant professora = 0x502542668aF09fa7aea52174b9965A7799343Df7;

    bool public voting = true; // votação começa ativa

    // codinome => endereço autorizado
    mapping(string => address) public users;
    // endereço => codinome (mapa reverso, para identificar quem está votando)
    mapping(address => string) public codinomeOf;
    // lista de codinomes (para o frontend montar ranking/seletores)
    string[] private codinomes;
    mapping(string => bool) private codinomeExiste;

    // votante => (votado => já votou?)
    mapping(string => mapping(string => bool)) public hasVote;
    // número de votos dados por cada codinome (para a recompensa a cada 10)
    mapping(string => uint256) public votesCast;

    uint256 public constant MAX_VOTE = 2 * 10 ** 18; // 2 Turings
    uint256 public constant VOTER_REWARD = 1 * 10 ** 18; // 1 Turing
    uint256 public constant VOTES_PER_REWARD = 10;

    // ---------------------------------------------------------------- eventos
    event UserUpdated(string codinome, address indexed userAddr);
    event VotingStatusChanged(bool voting);
    event TokenIssued(string codinome, address indexed to, uint256 amount);
    event Voted(string voter, string votado, uint256 amount);
    event VoterRewarded(string voter, uint256 amount);

    // ---------------------------------------------------------------- modifiers
    modifier onlySuperUser() {
        require(
            msg.sender == owner || msg.sender == professora,
            "Apenas owner ou professora"
        );
        _;
    }

    modifier onlyAuthorized() {
        require(bytes(codinomeOf[msg.sender]).length > 0, "Usuario nao autorizado");
        _;
    }

    // ---------------------------------------------------------------- construtor
    constructor() ERC20("Turing", "TUR") {
        owner = msg.sender;

        // Tabela exemplo (sem minting!)
        _setUser("roberta", 0x502542668aF09fa7aea52174b9965A7799343Df7);
        _setUser("nome1", 0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        _setUser("nome2", 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);
        _setUser("nome3", 0x90F79bf6EB2c4f870365E785982E1f101E93b906);
        _setUser("nome4", 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65);
        _setUser("nome5", 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc);
    }

    // ---------------------------------------------------------------- métodos públicos
    function updateUser(string memory codinome, address user_addr) public onlySuperUser {
        require(bytes(codinome).length > 0, "Codinome vazio");
        _setUser(codinome, user_addr);
    }

    function votingOn() public onlySuperUser {
        voting = true;
        emit VotingStatusChanged(true);
    }

    function votingOff() public onlySuperUser {
        voting = false;
        emit VotingStatusChanged(false);
    }

    function issueToken(string memory codinome, uint256 qtde_de_Turings) public onlySuperUser {
        address to = users[codinome];
        require(to != address(0), "Codinome inexistente");
        _mint(to, qtde_de_Turings);
        emit TokenIssued(codinome, to, qtde_de_Turings);
    }

    function vote(string memory codinome, uint256 qtde_de_Turings) public onlyAuthorized {
        require(voting, "Votacao pausada");

        string memory voter = codinomeOf[msg.sender];
        address votado = users[codinome];

        require(votado != address(0), "Codinome inexistente");
        require(keccak256(bytes(voter)) != keccak256(bytes(codinome)), "Nao pode votar em si mesmo");
        require(qtde_de_Turings > 0 && qtde_de_Turings <= MAX_VOTE, "Qtde deve ser > 0 e <= 2 Turings");
        require(!hasVote[voter][codinome], "Ja votou neste codinome");

        hasVote[voter][codinome] = true;
        _mint(votado, qtde_de_Turings);
        emit Voted(voter, codinome, qtde_de_Turings);

        // a cada 10 votos, o votante ganha 1 Turing
        votesCast[voter] += 1;
        if (votesCast[voter] % VOTES_PER_REWARD == 0) {
            _mint(msg.sender, VOTER_REWARD);
            emit VoterRewarded(voter, VOTER_REWARD);
        }
    }

    // ---------------------------------------------------------------- auxiliares (views)
    function getCodinomes() public view returns (string[] memory) {
        return codinomes;
    }

    function isSuperUser(address a) public view returns (bool) {
        return a == owner || a == professora;
    }

    // ---------------------------------------------------------------- interno
    function _setUser(string memory codinome, address user_addr) internal {
        // limpa o vínculo antigo do codinome (se houver)
        address antigo = users[codinome];
        if (antigo != address(0)) {
            delete codinomeOf[antigo];
        }
        // se o novo endereço já tinha outro codinome, desfaz esse vínculo
        string memory outro = codinomeOf[user_addr];
        if (bytes(outro).length > 0) {
            delete users[outro];
        }

        users[codinome] = user_addr;
        if (user_addr != address(0)) {
            codinomeOf[user_addr] = codinome;
        }
        if (!codinomeExiste[codinome]) {
            codinomeExiste[codinome] = true;
            codinomes.push(codinome);
        }
        emit UserUpdated(codinome, user_addr);
    }
}
