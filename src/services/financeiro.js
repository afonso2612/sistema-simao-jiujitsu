// Cada competência é um mês. Taxas já existentes: R$ 10 + R$ 1/dia.
// Calendário da academia em Barreirinha-AM; igual ao usado pela confirmação SQL.
export function dataAtualFinanceira(instante = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", {timeZone: "America/Manaus", year: "numeric", month: "2-digit", day: "2-digit"}).formatToParts(instante);
  const valor = (tipo) => Number(partes.find((parte) => parte.type === tipo).value);
  return new Date(valor("year"), valor("month") - 1, valor("day"));
}
export function dataLocalISO(referencia = dataAtualFinanceira()) {
  return [referencia.getFullYear(), String(referencia.getMonth() + 1).padStart(2, "0"), String(referencia.getDate()).padStart(2, "0")].join("-");
}

function lerData(valor) {
  const texto = String(valor || "");
  let partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (!partes) {
    const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!br) return null;
    partes = [br[0], br[3], br[2], br[1]];
  }
  const [ano, mes, dia] = partes.slice(1).map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia ? data : null;
}

export function dataDoPagamento(pagamento) {
  const valor = pagamento?.data_pagamento || pagamento?.data || pagamento?.criado_em;
  const instante = String(valor || "").includes("T") ? new Date(valor) : null;
  const data = instante ? (!Number.isNaN(instante.getTime()) ? dataAtualFinanceira(instante) : null) : lerData(valor);
  return data && !Number.isNaN(data.getTime()) ? data : null;
}

export function pagamentoPertenceAoMes(pagamento, referencia = dataAtualFinanceira()) {
  const data = dataDoPagamento(pagamento);
  return Boolean(data && data.getFullYear() === referencia.getFullYear() && data.getMonth() === referencia.getMonth());
}

export function competenciaValida(valor) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(valor || "")) && Number(String(valor).slice(0, 4)) >= 1900;
}

export function competenciasDoPagamento(pagamento) {
  if (Array.isArray(pagamento?.competencias_quitadas)) {
    return [...new Set(pagamento.competencias_quitadas.filter(competenciaValida))];
  }
  // Compatibilidade com registros antigos: um pagamento correspondia ao mês da data.
  const data = dataDoPagamento(pagamento);
  return data ? [dataLocalISO(data).slice(0, 7)] : [];
}

export function dataVencimentoDoMes(aluno, referencia = dataAtualFinanceira()) {
  const dia = Number(aluno?.vencimento);
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) return null;
  const ultimoDia = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0).getDate();
  return new Date(referencia.getFullYear(), referencia.getMonth(), Math.min(dia, ultimoDia));
}

export function cobrancaAcumuladaAtiva(aluno) {
  const inicio = String(aluno?.inicioFinanceiro || aluno?.inicio_financeiro || "");
  return /^\d{4}-(0[1-9]|1[0-2])-01$/.test(inicio) && competenciaValida(inicio.slice(0, 7));
}

export function mensalidadesEmAberto(aluno, referencia = dataAtualFinanceira()) {
  if (!aluno) return [];
  const acumulada = cobrancaAcumuladaAtiva(aluno);
  const inicio = acumulada ? lerData(aluno.inicioFinanceiro || aluno.inicio_financeiro) : new Date(referencia.getFullYear(), referencia.getMonth(), 1);
  const atual = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
  const pagos = new Set();
  if (acumulada) {
    const pagamentos = Array.isArray(aluno.pagamentosFinanceiros)
      ? aluno.pagamentosFinanceiros.filter((p) => p.status === "Pago")
      : (aluno.historicoPagamentos || []).filter((p) => !p.status || p.status === "Pago");
    for (const pagamento of pagamentos) {
      for (const competencia of competenciasDoPagamento(pagamento)) pagos.add(competencia);
    }
  } else if (aluno.statusPagamento === "Pago" && pagamentoPertenceAoMes({data_pagamento: aluno.ultimoPagamento}, referencia)) {
    pagos.add(dataLocalISO(atual).slice(0, 7));
  }
  const mensalidade = Number(aluno.mensalidade || 0);
  const centavos = Number.isFinite(mensalidade) && mensalidade >= 0 ? Math.round(mensalidade * 100) : 0;
  const ordinal = (data) => Date.UTC(data.getFullYear(), data.getMonth(), data.getDate());
  const linhas = [];
  for (const mes = new Date(inicio); mes <= atual; mes.setMonth(mes.getMonth() + 1)) {
    const competencia = dataLocalISO(mes).slice(0, 7);
    if (pagos.has(competencia)) continue;
    const vencimento = dataVencimentoDoMes(aluno, mes);
    const dias = vencimento ? Math.max(0, (ordinal(referencia) - ordinal(vencimento)) / 86400000) : 0;
    const multa = dias > 0 ? 10 : 0;
    linhas.push({competencia, vencimento: vencimento ? dataLocalISO(vencimento) : null,
      mensalidade: centavos / 100, dias_atraso: dias, multa, juros: dias,
      total: (centavos + multa * 100 + dias * 100) / 100});
  }
  return linhas;
}

export function statusFinanceiro(aluno, referencia = dataAtualFinanceira()) {
  if (!aluno) return "Pendente";
  const linhas = mensalidadesEmAberto(aluno, referencia);
  if (!linhas.length) {
    const inicio = aluno?.inicioFinanceiro || aluno?.inicio_financeiro;
    return inicio && inicio.slice(0, 7) > dataLocalISO(referencia).slice(0, 7) ? "Pendente" : "Pago";
  }
  return linhas.some((linha) => linha.dias_atraso > 0) ? "Vencido" : "Pendente";
}

export function diasAtraso(aluno, referencia = dataAtualFinanceira()) {
  return mensalidadesEmAberto(aluno, referencia).reduce((maior, linha) => Math.max(maior, linha.dias_atraso), 0);
}

export function valorComJuros(aluno, referencia = dataAtualFinanceira()) {
  const linhas = mensalidadesEmAberto(aluno, referencia);
  if (!cobrancaAcumuladaAtiva(aluno) && !linhas.length) return Number(aluno?.mensalidade || 0);
  return linhas.reduce((centavos, linha) => centavos + Math.round(linha.total * 100), 0) / 100;
}
