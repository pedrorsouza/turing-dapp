import { useCallback, useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import TuringArtifact from "./contracts/Turing.json";
import contractAddress from "./contracts/contract-address.json";

const HARDHAT_CHAIN_ID = 31337n;
const PROFESSORA = "roberta";

export default function Dapp() {
  const [account, setAccount] = useState(null);
  const [codinome, setCodinome] = useState("");
  const [isSuper, setIsSuper] = useState(false);
  const [voting, setVoting] = useState(true);
  const [codinomes, setCodinomes] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const contractRef = useRef(null);

  // ---------------------------------------------------------------- leitura
  const refresh = useCallback(async () => {
    const c = contractRef.current;
    if (!c) return;
    const nomes = await c.getCodinomes();
    const linhas = await Promise.all(
      nomes.filter((n) => n !== PROFESSORA).map(async (n) => {
        const addr = await c.users(n);
        const bal = addr === ethers.ZeroAddress ? 0n : await c.balanceOf(addr);
        return { codinome: n, addr, bal };
      })
    );
    linhas.sort((a, b) => (b.bal > a.bal ? 1 : b.bal < a.bal ? -1 : 0));
    setCodinomes(nomes);
    setRanking(linhas);
    setVoting(await c.voting());
  }, []);

  // ---------------------------------------------------------------- conexão
  const connect = async () => {
    if (!window.ethereum) {
      setMsg({ type: "err", text: "MetaMask não encontrada." });
      return;
    }
    const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
    await init(addr);
  };

  const init = async (addr) => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const { chainId } = await provider.getNetwork();
    if (chainId !== HARDHAT_CHAIN_ID) {
      setMsg({ type: "err", text: "Conecte a MetaMask na rede Hardhat local (localhost:8545, chainId 31337)." });
      return;
    }
    const signer = await provider.getSigner(addr);
    const c = new ethers.Contract(contractAddress.Turing, TuringArtifact.abi, signer);

    if (contractRef.current) contractRef.current.removeAllListeners();
    contractRef.current = c;

    setAccount(addr);
    setCodinome(await c.codinomeOf(addr));
    setIsSuper(await c.isSuperUser(addr));
    setMsg(null);
    await refresh();

    // Eventos: sempre que houver Transfer (mint via vote/issueToken) ou mudança
    // de status/usuários, o ranking é atualizado.
    c.on("Transfer", refresh);
    c.on("VotingStatusChanged", refresh);
    c.on("UserUpdated", refresh);
  };

  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = ([addr]) => (addr ? init(addr) : setAccount(null));
    const onChain = () => window.location.reload();
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccounts);
      window.ethereum.removeListener("chainChanged", onChain);
      contractRef.current?.removeAllListeners();
    };
  }, []);

  // ---------------------------------------------------------------- escrita
  const send = async (fn, ok) => {
    setBusy(true);
    setMsg(null);
    try {
      const tx = await fn();
      setMsg({ type: "info", text: `Transação enviada: ${tx.hash}` });
      await tx.wait();
      setMsg({ type: "ok", text: ok });
      await refresh();
    } catch (e) {
      setMsg({ type: "err", text: e.reason || e.shortMessage || e.message });
    } finally {
      setBusy(false);
    }
  };

  const c = contractRef.current;
  const alunos = codinomes.filter((n) => n !== PROFESSORA);

  // ---------------------------------------------------------------- UI
  if (!account) {
    return (
      <main>
        <h1>Turing dApp</h1>
        <p>Votação dos projetos finais com a criptomoeda Turing (TUR).</p>
        <button onClick={connect}>Conectar carteira</button>
        {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
      </main>
    );
  }

  return (
    <main>
      <h1>Turing dApp</h1>
      <p className="who">
        {codinome ? <b>{codinome}</b> : <b>não registrado</b>}
        {isSuper && <span className="tag">superusuário</span>} · <code>{account}</code>
      </p>
      <p>
        Votação:{" "}
        <span className={voting ? "on" : "off"}>{voting ? "ATIVA" : "PAUSADA"}</span>
      </p>

      {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}

      {!codinome && !isSuper && <p>Esta conta não está autorizada a usar o contrato.</p>}

      {codinome && (
        <TokenForm
          title="Votar"
          hint="Até 2 Turings por codinome; um voto por codinome; não vale votar em si mesmo."
          options={alunos.filter((n) => n !== codinome)}
          max="2"
          busy={busy}
          label="Votar"
          onSubmit={(n, q) => send(() => c.vote(n, ethers.parseEther(q)), `Voto em ${n} registrado!`)}
        />
      )}

      {isSuper && (
        <>
          <TokenForm
            title="Emitir Turings (issueToken)"
            options={alunos}
            busy={busy}
            label="Emitir"
            onSubmit={(n, q) => send(() => c.issueToken(n, ethers.parseEther(q)), `${q} TUR emitidos para ${n}.`)}
          />
          <section>
            <h2>Controle da votação</h2>
            <button disabled={busy || voting} onClick={() => send(() => c.votingOn(), "Votação ativada.")}>
              votingOn
            </button>{" "}
            <button disabled={busy || !voting} onClick={() => send(() => c.votingOff(), "Votação pausada.")}>
              votingOff
            </button>
          </section>
        </>
      )}

      <section>
        <h2>Ranking</h2>
        <table>
          <thead>
            <tr><th>#</th><th>Codinome</th><th>Turings</th></tr>
          </thead>
          <tbody>
            {ranking.map((r, i) => (
              <tr key={r.codinome} className={r.codinome === codinome ? "me" : ""}>
                <td>{i + 1}</td>
                <td>{r.codinome}</td>
                <td>{Number(ethers.formatEther(r.bal)).toLocaleString("pt-BR", { maximumFractionDigits: 4 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function TokenForm({ title, hint, options, max, busy, label, onSubmit }) {
  const [nome, setNome] = useState("");
  const [qtde, setQtde] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!nome || !qtde) return;
    onSubmit(nome, qtde);
  };
  return (
    <section>
      <h2>{title}</h2>
      {hint && <p className="hint">{hint}</p>}
      <form onSubmit={submit}>
        <select value={nome} onChange={(e) => setNome(e.target.value)} required>
          <option value="">Codinome…</option>
          {options.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <input
          type="number" min="0" step="any" max={max} placeholder="Qtde de Turings"
          value={qtde} onChange={(e) => setQtde(e.target.value)} required
        />
        <button disabled={busy}>{label}</button>
      </form>
    </section>
  );
}
