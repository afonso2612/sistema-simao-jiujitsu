import {cobrancaAcumuladaAtiva, mensalidadesEmAberto} from "../services/financeiro.js";

export default function ResumoMensalidades({aluno}) {
  if (!cobrancaAcumuladaAtiva(aluno)) return null;
  const linhas = mensalidadesEmAberto(aluno);
  const moeda = (valor) => Number(valor).toLocaleString("pt-BR", {style: "currency", currency: "BRL"});
  return <div className="cardAluno">
    <h3>Mensalidades em aberto ({linhas.length})</h3>
    {linhas.length === 0 ? <p>Nenhuma mensalidade em aberto até este mês.</p> : <ul>
      {linhas.map((linha) => <li key={linha.competencia}>
        <strong>{linha.competencia.slice(5)}/{linha.competencia.slice(0, 4)}: {moeda(linha.total)}</strong>
        <p>Mensalidade {moeda(linha.mensalidade)} · Multa {moeda(linha.multa)} · Juros {moeda(linha.juros)} ({linha.dias_atraso} dias)</p>
      </li>)}
    </ul>}
  </div>;
}

export function MesesQuitados({pagamento}) {
  const meses = pagamento?.competencias_quitadas;
  if (!Array.isArray(meses) || !meses.length) return null;
  return <span style={{display: "block"}}>Meses quitados: {meses.map((mes) => `${mes.slice(5)}/${mes.slice(0, 4)}`).join(", ")}</span>;
}
