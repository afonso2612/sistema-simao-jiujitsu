import "./App.css";
import logo from "./assets/logo.webp";
import { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import capa from "./assets/capa.webp";
import jsPDF from "jspdf";
import { supabase, supabaseConfigurado } from "./lib/supabaseClient";
import { atualizarSenhaUsuarioAtual, entrarComEmailSenha, obterPerfilSupabase, sairDoSupabase } from "./services/supabaseAuth";
import {
  atualizarPerfilAlunoOnline,
  atualizarEmailAlunoAuthOnline,
  atualizarPagamentoOnlinePorId,
  buscarUsuarioSistemaOnline,
  confirmarPagamentoOnline,
  criarAlunoAuthOnline,
  enviarArquivoOnline,
  enviarDataUrlOnline,
  limparAvisosOnline,
  listarAvisosOnline,
  listarAlunosOnline,
  listarPagamentosOnline,
  listarPresencasOnline,
  migrarAlunosOnline,
  obterAlunoDoUsuarioOnline,
  obterAlunoOnline,
  obterFotoAlunoOnline,
  registrarPresencaOnline,
  removerAlunoOnline,
  removerUsuarioSistemaOnlinePorAluno,
  resetarSenhaAlunoAuthOnline,
  salvarAvisoOnline,
  salvarAlunoOnline,
  salvarPagamentoOnline,
  salvarUsuarioSistemaOnline,
} from "./services/supabaseStore";

const APP_NAME = "Simão Tavares Top Team";

const STORAGE_KEYS = {
  alunos: "alunos_simao_tavares_top_team",
  presencas: "presencas_simao_tavares_top_team",
  avisos: "avisos_simao_tavares_top_team",
  usuarios: "usuarios_simao_tavares_top_team",
  usuarioLogado: "usuario_logado_simao_tavares_top_team",
};

const CHAVES_ALUNOS_LOCAIS = [
  STORAGE_KEYS.alunos,
  "alunos_Simão Tvarares Top Team",
  "alunos_SimÃ£o Tvarares Top Team",
  "alunos_SimÃƒÂ£o Tvarares Top Team",
  "alunos_Simao Tvarares Top Team",
];

const CHAVES_PRESENCAS_LOCAIS = [
  STORAGE_KEYS.presencas,
  "presencas_Simão Tvarares Top Team",
  "presencas_SimÃ£o Tvarares Top Team",
  "presencas_SimÃƒÂ£o Tvarares Top Team",
  "presencas_Simao Tvarares Top Team",
  "presencas_ariramba",
];

const CHAVES_USUARIOS_LOCAIS = [
  STORAGE_KEYS.usuarios,
  "usuarios_Simão Tvarares Top Team",
  "usuarios_SimÃ£o Tvarares Top Team",
  "usuarios_SimÃƒÂ£o Tvarares Top Team",
  "usuarios_Simao Tvarares Top Team",
  "usuarios_ariramba",
];

function recuperarDadosSalvos(chaves, valorPadrao) {
  for (const chave of chaves) {
    const dados = localStorage.getItem(chave);

    if (dados) {
      try {
        return JSON.parse(dados);
      } catch (error) {
        console.warn(`Dados inválidos em ${chave}. Tentando próxima chave.`, error);
      }
    }
  }

  return valorPadrao;
}

function recuperarListasSalvas(chaves) {
  const itens = [];

  chaves.forEach((chave) => {
    const dados = localStorage.getItem(chave);

    if (!dados) return;

    try {
      const lista = JSON.parse(dados);

      if (Array.isArray(lista)) {
        itens.push(...lista);
      }
    } catch (error) {
      console.warn(`Dados inválidos em ${chave}. Ignorando esta lista.`, error);
    }
  });

  return itens;
}

function salvarDados(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch (error) {
    console.error(`Não foi possível salvar ${chave}.`, error);
    return false;
  }
}

function lerArquivoComoDataURL(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onloadend = () => resolve(leitor.result);
    leitor.onerror = () => reject(leitor.error || new Error("Erro ao ler arquivo."));
    leitor.readAsDataURL(arquivo);
  });
}

async function selecionarFotoDoArquivo(evento, setFoto, setFotoOriginal = null) {
  const arquivo = evento.target.files?.[0];

  if (!arquivo) return;

  try {
    const fotoSelecionada = await lerArquivoComoDataURL(arquivo);
    setFoto(fotoSelecionada);
    setFotoOriginal?.(fotoSelecionada);
  } catch (error) {
    console.error("Erro ao carregar foto.", error);
    alert("Nao foi possivel carregar a foto selecionada.");
  } finally {
    evento.target.value = "";
  }
}

function FotoAlunoInputs({ foto, setFoto, setFotoOriginal = null, idBase = "foto-aluno" }) {
  function removerFoto() {
    setFoto("");
    setFotoOriginal?.("");
  }

  return (
    <div className="opcoesFotoAluno">
      <label className="botaoArquivoFoto" htmlFor={`${idBase}-camera`}>
        Tirar foto
      </label>
      <input
        id={`${idBase}-camera`}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(evento) => selecionarFotoDoArquivo(evento, setFoto, setFotoOriginal)}
      />

      <label className="botaoArquivoFoto" htmlFor={`${idBase}-galeria`}>
        Escolher da galeria
      </label>
      <input
        id={`${idBase}-galeria`}
        type="file"
        accept="image/*"
        onChange={(evento) => selecionarFotoDoArquivo(evento, setFoto, setFotoOriginal)}
      />

      {foto && (
        <button
          type="button"
          className="botaoRemoverFoto"
          onClick={removerFoto}
        >
          Remover foto
        </button>
      )}
    </div>
  );
}

const TAMANHO_PREVIEW_FOTO = 180;
const TAMANHO_FINAL_FOTO = 320;

function calcularLimitesFoto(imagemNatural, zoom) {
  if (!imagemNatural.width || !imagemNatural.height) {
    return { limiteX: 0, limiteY: 0, largura: 0, altura: 0 };
  }

  const escalaBase = Math.max(
    TAMANHO_PREVIEW_FOTO / imagemNatural.width,
    TAMANHO_PREVIEW_FOTO / imagemNatural.height
  );
  const largura = imagemNatural.width * escalaBase * zoom;
  const altura = imagemNatural.height * escalaBase * zoom;

  return {
    limiteX: Math.max(0, (largura - TAMANHO_PREVIEW_FOTO) / 2),
    limiteY: Math.max(0, (altura - TAMANHO_PREVIEW_FOTO) / 2),
    largura,
    altura,
  };
}

function FotoAlunoEditor({ fotoOriginal, setFoto }) {
  const imagemRef = useRef(null);
  const arrasteRef = useRef({
    ativo: false,
    pointerId: null,
    inicioX: 0,
    inicioY: 0,
    xInicial: 0,
    yInicial: 0,
  });
  const [imagemNatural, setImagemNatural] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [posicao, setPosicao] = useState({ x: 0, y: 0 });

  function limitarPosicao(proximaPosicao, proximoZoom = zoom) {
    const { limiteX, limiteY } = calcularLimitesFoto(imagemNatural, proximoZoom);

    return {
      x: Math.min(limiteX, Math.max(-limiteX, proximaPosicao.x)),
      y: Math.min(limiteY, Math.max(-limiteY, proximaPosicao.y)),
    };
  }

  useEffect(() => {
    if (!fotoOriginal || !imagemNatural.width || !imagemNatural.height) return undefined;

    const temporizador = setTimeout(() => {
      const imagem = imagemRef.current;
      if (!imagem) return;

      const canvas = document.createElement("canvas");
      const contexto = canvas.getContext("2d");
      const { largura, altura } = calcularLimitesFoto(imagemNatural, zoom);
      const x = (TAMANHO_PREVIEW_FOTO - largura) / 2 + posicao.x;
      const y = (TAMANHO_PREVIEW_FOTO - altura) / 2 + posicao.y;
      const fator = TAMANHO_FINAL_FOTO / TAMANHO_PREVIEW_FOTO;

      canvas.width = TAMANHO_FINAL_FOTO;
      canvas.height = TAMANHO_FINAL_FOTO;
      contexto.fillStyle = "#111827";
      contexto.fillRect(0, 0, TAMANHO_FINAL_FOTO, TAMANHO_FINAL_FOTO);

      try {
        contexto.drawImage(
          imagem,
          x * fator,
          y * fator,
          largura * fator,
          altura * fator
        );
        setFoto(canvas.toDataURL("image/jpeg", 0.9));
      } catch (error) {
        console.error("Erro ao salvar enquadramento da foto.", error);
      }
    }, 120);

    return () => clearTimeout(temporizador);
  }, [fotoOriginal, imagemNatural, posicao, zoom, setFoto]);

  function iniciarArraste(evento) {
    arrasteRef.current = {
      ativo: true,
      pointerId: evento.pointerId,
      inicioX: evento.clientX,
      inicioY: evento.clientY,
      xInicial: posicao.x,
      yInicial: posicao.y,
    };
    evento.currentTarget.setPointerCapture?.(evento.pointerId);
  }

  function moverFoto(evento) {
    const arraste = arrasteRef.current;
    if (!arraste.ativo || arraste.pointerId !== evento.pointerId) return;

    setPosicao(
      limitarPosicao({
        x: arraste.xInicial + evento.clientX - arraste.inicioX,
        y: arraste.yInicial + evento.clientY - arraste.inicioY,
      })
    );
  }

  function finalizarArraste(evento) {
    if (arrasteRef.current.pointerId === evento.pointerId) {
      arrasteRef.current.ativo = false;
    }
  }

  function alterarZoom(evento) {
    const proximoZoom = Number(evento.target.value);
    setZoom(proximoZoom);
    setPosicao((posicaoAtual) => limitarPosicao(posicaoAtual, proximoZoom));
  }

  const dimensoesImagem = calcularLimitesFoto(imagemNatural, zoom);

  return (
    <div className="editorFotoAluno">
      <div
        className="quadroEditorFoto"
        onPointerDown={iniciarArraste}
        onPointerMove={moverFoto}
        onPointerUp={finalizarArraste}
        onPointerCancel={finalizarArraste}
      >
        <img
          ref={imagemRef}
          src={fotoOriginal}
          alt="Preview"
          className="imagemEditorFoto"
          crossOrigin="anonymous"
          draggable="false"
          onLoad={(evento) =>
            setImagemNatural({
              width: evento.currentTarget.naturalWidth,
              height: evento.currentTarget.naturalHeight,
            })
          }
          style={{
            width: `${dimensoesImagem.largura}px`,
            height: `${dimensoesImagem.altura}px`,
            transform: `translate(-50%, -50%) translate(${posicao.x}px, ${posicao.y}px)`,
          }}
        />
      </div>

      <label className="controleZoomFoto">
        Zoom
        <input
          type="range"
          min="1"
          max="2.5"
          step="0.01"
          value={zoom}
          onChange={alterarZoom}
        />
      </label>
    </div>
  );
}

function normalizarTextoChave(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizarAluno(aluno) {
  const fotoAluno = aluno.foto || aluno.fotoUrl || aluno.foto_url || "";

  return {
    ...aluno,
    foto: fotoAluno,
    fotoUrl: fotoAluno,
    presencas: Array.isArray(aluno.presencas) ? aluno.presencas : [],
    historicoPagamentos: Array.isArray(aluno.historicoPagamentos)
      ? aluno.historicoPagamentos
      : [],
    statusPagamento: aluno.statusPagamento || "Pendente",
    mensalidade: Number(aluno.mensalidade || 0),
    vencimento: Number(aluno.vencimento || 0),
  };
}

function obterFotoAluno(aluno) {
  return aluno?.foto || aluno?.fotoUrl || aluno?.foto_url || "";
}

function obterIniciaisAluno(nome) {
  return String(nome || "Aluno")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("") || "A";
}

function aplicarPresencasNosAlunos(alunos, presencas) {
  return alunos.map((aluno) => ({
    ...aluno,
    presencas: presencas
      .filter((presenca) => presenca.alunoId === aluno.id)
      .map((presenca) => ({
        data: presenca.data,
        hora: presenca.hora,
      })),
  }));
}

function completarPresencasComAlunos(presencas, alunos) {
  const alunosPorId = new Map(
    alunos.map((aluno) => [String(aluno.id), aluno])
  );

  return presencas.map((presenca) => {
    const aluno = alunosPorId.get(String(presenca.alunoId));

    return {
      ...presenca,
      nome: presenca.nome || aluno?.nome || "",
      foto: presenca.foto || aluno?.foto || "",
    };
  });
}

function dataISOParaBrasil(data) {
  if (!data) return "";
  if (data.includes("/")) return data;

  const partes = data.split("-");
  if (partes.length !== 3) return data;

  return partes.reverse().join("/");
}

function dataPagamentoParaTempo(pagamento) {
  return new Date(pagamento.criado_em || pagamento.data_pagamento || 0).getTime();
}

function obterUltimoPagamentoDoAluno(pagamentos, idAluno) {
  return pagamentos
    .filter((pagamento) => String(pagamento.aluno_id) === String(idAluno))
    .sort((a, b) => dataPagamentoParaTempo(b) - dataPagamentoParaTempo(a))[0];
}

function comprovanteEhImagem(comprovante) {
  return typeof comprovante === "string" && comprovante.startsWith("data:image/");
}

function abrirArquivoComprovante(comprovante) {
  if (!comprovante) return;

  if (!comprovante.startsWith("data:")) {
    window.open(comprovante, "_blank", "noopener,noreferrer");
    return;
  }

  const [cabecalho, base64] = comprovante.split(",");
  const tipoArquivo =
    cabecalho.match(/^data:(.*?);base64$/)?.[1] || "application/octet-stream";

  try {
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);

    for (let i = 0; i < binario.length; i += 1) {
      bytes[i] = binario.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: tipoArquivo });
    const url = URL.createObjectURL(blob);
    const janela = window.open(url, "_blank", "noopener,noreferrer");

    if (!janela) {
      const link = document.createElement("a");
      link.href = url;
      link.download = tipoArquivo.includes("pdf")
        ? "comprovante.pdf"
        : "comprovante";
      link.click();
    }

    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    console.error("Erro ao abrir comprovante.", error);
    alert("Não foi possível abrir o comprovante. Tente baixar ou reenviar o arquivo.");
  }
}

function carregarImagem(src) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.crossOrigin = "anonymous";
    imagem.onload = () => resolve(imagem);
    imagem.onerror = reject;
    imagem.src = src;
  });
}

async function prepararFotoCarteirinha(src) {
  const imagem = await carregarImagem(src);
  const tamanho = 320;
  const fotoDeitada = imagem.width > imagem.height;
  const larguraOrigem = fotoDeitada ? imagem.height : imagem.width;
  const alturaOrigem = fotoDeitada ? imagem.width : imagem.height;
  const canvas = document.createElement("canvas");
  const contexto = canvas.getContext("2d");
  canvas.width = tamanho;
  canvas.height = tamanho;

  const escala = Math.max(tamanho / larguraOrigem, tamanho / alturaOrigem);
  const largura = larguraOrigem * escala;
  const altura = alturaOrigem * escala;
  const x = (tamanho - largura) / 2;
  const y = (tamanho - altura) / 2;

  contexto.fillStyle = "#111827";
  contexto.fillRect(0, 0, tamanho, tamanho);

  if (fotoDeitada) {
    contexto.save();
    contexto.translate(tamanho / 2, tamanho / 2);
    contexto.rotate(Math.PI / 2);
    contexto.drawImage(imagem, -altura / 2, -largura / 2, altura, largura);
    contexto.restore();
  } else {
    contexto.drawImage(imagem, x, y, largura, altura);
  }

  return canvas.toDataURL("image/jpeg", 0.9);
}

async function prepararLogoMarcaDagua(src) {
  const imagem = await carregarImagem(src);
  const largura = 900;
  const altura = Math.max(1, Math.round((imagem.height / imagem.width) * largura));
  const canvas = document.createElement("canvas");
  const contexto = canvas.getContext("2d");

  canvas.width = largura;
  canvas.height = altura;
  contexto.clearRect(0, 0, largura, altura);
  contexto.globalAlpha = 0.08;
  contexto.drawImage(imagem, 0, 0, largura, altura);

  return {
    imagem: canvas.toDataURL("image/png"),
    proporcao: altura / largura,
  };
}

function aplicarPagamentosNosAlunos(alunos, pagamentos) {
  return alunos.map((aluno) => {
    const pagamentosDoAluno = pagamentos.filter(
      (pagamento) => String(pagamento.aluno_id) === String(aluno.id)
    );
    const pagos = pagamentosDoAluno
      .filter((pagamento) => pagamento.status === "Pago")
      .sort((a, b) => dataPagamentoParaTempo(b) - dataPagamentoParaTempo(a));
    const ultimoPagamento = obterUltimoPagamentoDoAluno(pagamentos, aluno.id);
    const aguardando =
      ultimoPagamento?.status === "Aguardando" ? ultimoPagamento : null;
    const comprovanteAtual = ultimoPagamento?.comprovante_url
      ? ultimoPagamento
      : null;
    const ultimoPago = pagos[0];

    return {
      ...aluno,
      statusPagamento: ultimoPagamento?.status || aluno.statusPagamento,
      comprovantePagamento:
        aguardando?.comprovante_url ||
        comprovanteAtual?.comprovante_url ||
        aluno.comprovantePagamento,
      comprovantePagamentoPath:
        aguardando?.comprovante_path ||
        comprovanteAtual?.comprovante_path ||
        aluno.comprovantePagamentoPath,
      dataEnvioComprovante:
        dataISOParaBrasil(aguardando?.data_pagamento) ||
        dataISOParaBrasil(comprovanteAtual?.data_pagamento) ||
        aluno.dataEnvioComprovante,
      ultimoPagamento: dataISOParaBrasil(ultimoPago?.data_pagamento) || aluno.ultimoPagamento,
      historicoPagamentos: pagos.map((pagamento) => ({
        data: dataISOParaBrasil(pagamento.data_pagamento),
        valor: Number(pagamento.valor || 0),
      })),
    };
  });
}

function mesclarAlunosPreservandoLocais(alunosAtuais, alunosRecebidos) {
  const alunosPorId = new Map(
    alunosAtuais.map((aluno) => [String(aluno.id), normalizarAluno(aluno)])
  );

  alunosRecebidos.forEach((alunoRecebido) => {
    const alunoNormalizado = normalizarAluno(alunoRecebido);
    const alunoAtual = alunosPorId.get(String(alunoNormalizado.id));

    alunosPorId.set(String(alunoNormalizado.id), {
      ...alunoAtual,
      ...alunoNormalizado,
      foto: alunoNormalizado.foto || alunoAtual?.foto || alunoNormalizado.fotoUrl || "",
      fotoUrl: alunoNormalizado.fotoUrl || alunoAtual?.fotoUrl || "",
      comprovantePagamento:
        alunoNormalizado.comprovantePagamento ||
        alunoAtual?.comprovantePagamento ||
        "",
      comprovantePagamentoPath:
        alunoNormalizado.comprovantePagamentoPath ||
        alunoAtual?.comprovantePagamentoPath ||
        "",
      dataEnvioComprovante:
        alunoNormalizado.dataEnvioComprovante ||
        alunoAtual?.dataEnvioComprovante ||
        "",
    });
  });

  return Array.from(alunosPorId.values()).sort((a, b) =>
    String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
      sensitivity: "base",
    })
  );
}

function criarUsuarioAluno(nome, usuarios) {
  const base =
    nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "") || "aluno";
  let usuario = base;
  let contador = 1;

  while (
    usuarios.some(
      (usuarioCadastrado) =>
        usuarioCadastrado.usuario.toLowerCase() === usuario.toLowerCase()
    )
  ) {
    contador += 1;
    usuario = `${base}${contador}`;
  }

  return usuario;
}

function criarIdAluno() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `local-${Date.now()}`;
}

function idAlunoOnlineValido(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(id || "")
  );
}

function textoSeguroArquivo(valor, fallback = "arquivo") {
  return String(valor || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || fallback;
}

function extensaoArquivoOnline(arquivoOuDataUrl, fallback = "bin") {
  const nomeArquivo = arquivoOuDataUrl?.name || "";
  const extensaoNome = nomeArquivo.includes(".")
    ? nomeArquivo.split(".").pop()
    : "";

  if (extensaoNome) return textoSeguroArquivo(extensaoNome, fallback);

  const tipo =
    arquivoOuDataUrl?.type ||
    String(arquivoOuDataUrl || "").match(/^data:(.*?);base64/)?.[1] ||
    "";

  if (tipo.includes("jpeg") || tipo.includes("jpg")) return "jpg";
  if (tipo.includes("png")) return "png";
  if (tipo.includes("pdf")) return "pdf";
  if (tipo.includes("webp")) return "webp";

  return fallback;
}

function ehDataUrl(valor) {
  return typeof valor === "string" && valor.startsWith("data:");
}

function ehArquivo(valor) {
  return typeof File !== "undefined" && valor instanceof File;
}

function limitarTempo(promise, tempoMs, mensagem) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(mensagem)), tempoMs)
    ),
  ]);
}

function emailValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor || "").trim());
}

function App() {
  const [tela, setTela] = useState("inicio");

  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState("");
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  const [avisos, setAvisos] = useState(() => {
    if (supabaseConfigurado) return [];

    return recuperarDadosSalvos([STORAGE_KEYS.avisos, "avisos_ariramba"], []);
  });
  async function adicionarAviso(mensagem) {
    const novoAviso = {
      id: Date.now(),
      mensagem,
      data: new Date().toLocaleString(),
    };

    setAvisos((prev) => [novoAviso, ...prev]);

    if (usuarioOnlineLogado) {
      try {
        const avisoOnline = await salvarAvisoOnline(mensagem);
        setAvisos((prev) => [
          avisoOnline,
          ...prev.filter((aviso) => aviso.id !== novoAviso.id),
        ]);
      } catch (error) {
        console.error("Erro ao salvar aviso online.", error);
      }
    }
  }

  function criarAcessoAluno({ id = Date.now(), usuario, senha, nome, alunoId, academiaId }) {
    return {
      id,
      usuario,
      senha,
      cargo: "aluno",
      nome,
      alunoId,
      academiaId,
    };
  }

  const [usuarios, setUsuarios] = useState(() => {
    if (supabaseConfigurado) return [];

    return recuperarDadosSalvos(
      [STORAGE_KEYS.usuarios, "usuarios_ariramba"],
      [
        {
          id: 1,
          usuario: "admin",
          senha: "1234",
          cargo: "diretor",
          nome: "Mestre",
        },

        {
          id: 2,
          usuario: "professor",
          senha: "1234",
          cargo: "professor",
          nome: "Professor",
        },

        {
          id: 3,
          usuario: "aluno",
          senha: "1234",
          cargo: "aluno",
          nome: "Aluno Teste",
          alunoId: 1779419714987,
        },
      ]
    );
  });
  const [nome, setNome] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [usuarioAluno, setUsuarioAluno] = useState("");
  const [senhaAluno, setSenhaAluno] = useState("");
  const [telefone, setTelefone] = useState("");
  const [faixa, setFaixa] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [peso, setPeso] = useState("");
  const [grau, setGrau] = useState("");
  const [mensalidade, setMensalidade] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [tipoSanguineo, setTipoSanguineo] = useState("");
  const [saude, setSaude] = useState("");
  const [medicamentos, setMedicamentos] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [observacaoFinanceira, setObservacaoFinanceira] = useState("");
  const [foto, setFoto] = useState("");
  const [fotoOriginal, setFotoOriginal] = useState("");
  const [alunoCarteirinha, setAlunoCarteirinha] = useState(null);
  const [mostrarPix, setMostrarPix] = useState(false);
  const [imagemComprovante, setImagemComprovante] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [mostrarCarteirinhaAluno, setMostrarCarteirinhaAluno] = useState(false);
  const [mostrarHistoricoAluno, setMostrarHistoricoAluno] = useState(false);
  const [mostrarDadosPortalAluno, setMostrarDadosPortalAluno] = useState(false);
  const [modoEditarPerfil, setModoEditarPerfil] = useState(false);
  const [erroArmazenamento, setErroArmazenamento] = useState("");
  const [especialidadeProfessor, setEspecialidadeProfessor] = useState("");
  const [graduacaoProfessor, setGraduacaoProfessor] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [busca, setBusca] = useState("");
  const [alunoDadosAberto, setAlunoDadosAberto] = useState(null);
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [sincronizacaoOnline, setSincronizacaoOnline] = useState("");
  const [loginEmAndamento, setLoginEmAndamento] = useState(false);
  const [salvandoAluno, setSalvandoAluno] = useState(false);
  const [horaAtual, setHoraAtual] = useState(
    new Date().toLocaleTimeString()
  );
  const diretorOnlineLogado =
    supabaseConfigurado &&
    tipoUsuario === "diretor" &&
    (usuarioLogado?.origem === "supabase" ||
      usuarioLogado?.origem === "usuarios_sistema");
  const usuarioOnlineLogado =
    supabaseConfigurado &&
    (usuarioLogado?.origem === "supabase" ||
      usuarioLogado?.origem === "usuarios_sistema");
  const equipeOnlineLogada =
    usuarioOnlineLogado &&
    (tipoUsuario === "diretor" || tipoUsuario === "professor");
  const modoLocalAtivo = !supabaseConfigurado;

  useEffect(() => {
    if (menuAberto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [menuAberto]);

  const [alunos, setAlunos] = useState(() => {
    if (supabaseConfigurado) return [];

    const alunosSalvos = recuperarDadosSalvos(CHAVES_ALUNOS_LOCAIS, []);

    return alunosSalvos.map(normalizarAluno);
  });

  const [presencas, setPresencas] = useState(() => {
    if (supabaseConfigurado) return [];

    return recuperarDadosSalvos(CHAVES_PRESENCAS_LOCAIS, []);
  });
  const [pagamentos, setPagamentos] = useState([]);

  async function carregarDadosOnlineNoEstado() {
    const [alunosOnline, presencasOnline, pagamentosOnline, avisosOnline] = await Promise.all([
      listarAlunosOnline(),
      listarPresencasOnline(),
      listarPagamentosOnline(),
      listarAvisosOnline().catch((error) => {
        console.error("Erro ao carregar avisos online.", error);
        return [];
      }),
    ]);

    const alunosNormalizados = alunosOnline.map(normalizarAluno);
    const presencasComAlunos = completarPresencasComAlunos(
      presencasOnline,
      alunosNormalizados
    );

    setPresencas(presencasComAlunos);
    setPagamentos(pagamentosOnline);
    setAvisos(avisosOnline);

    const alunosOnlineComDados = aplicarPagamentosNosAlunos(
      aplicarPresencasNosAlunos(alunosNormalizados, presencasComAlunos),
      pagamentosOnline
    );

    setAlunos(alunosOnlineComDados);
    return alunosOnlineComDados;
  }

  async function prepararFotoAlunoOnline(aluno) {
    if (!supabaseConfigurado || !ehDataUrl(aluno.foto)) return aluno;

    if (!idAlunoOnlineValido(aluno.id)) {
      throw new Error("Aluno sem ID online valido para salvar a foto no Storage.");
    }

    const academiaId = aluno.academiaId || usuarioLogado?.academiaId || "sem-academia";
    const extensao = extensaoArquivoOnline(aluno.foto, "jpg");
    const caminho = `${academiaId}/alunos/${aluno.id}/foto-${Date.now()}.${extensao}`;

    await enviarDataUrlOnline("fotos-alunos", caminho, aluno.foto);

    return {
      ...aluno,
      foto: caminho,
      fotoUrl: caminho,
    };
  }

  async function prepararComprovanteOnline(idAluno, comprovante) {
    if (!comprovante) return "";

    if (!idAlunoOnlineValido(idAluno)) {
      throw new Error("Aluno sem ID online valido para salvar o comprovante no Storage.");
    }

    const aluno = alunos.find((item) => String(item.id) === String(idAluno));
    const academiaId = aluno?.academiaId || usuarioLogado?.academiaId || "sem-academia";
    const nomeBase = ehArquivo(comprovante)
      ? textoSeguroArquivo(comprovante.name, "comprovante")
      : `comprovante.${extensaoArquivoOnline(comprovante, "jpg")}`;
    const caminho = `${academiaId}/alunos/${idAluno}/comprovantes/${Date.now()}-${nomeBase}`;

    if (ehArquivo(comprovante)) {
      await enviarArquivoOnline("comprovantes", caminho, comprovante);
      return caminho;
    }

    if (ehDataUrl(comprovante)) {
      await enviarDataUrlOnline("comprovantes", caminho, comprovante);
      return caminho;
    }

    return comprovante;
  }

  async function limparAvisos() {
    setAvisos([]);

    if (usuarioOnlineLogado) {
      try {
        await limparAvisosOnline();
      } catch (error) {
        console.error("Erro ao limpar avisos online.", error);
        alert(`Nao foi possivel limpar as notificacoes no banco online.\n\nErro: ${error.message || "erro desconhecido"}`);
        await carregarDadosOnlineNoEstado().catch(() => {});
      }
    }
  }

  function ContadorAnimado({ valor }) {
    return <>{Number(valor) || 0}</>;
  }

  useEffect(() => {
    if (!modoLocalAtivo) return;

    if (salvarDados(STORAGE_KEYS.alunos, alunos)) {
      setErroArmazenamento("");
    } else {
      setErroArmazenamento("Não foi possível salvar os alunos. Faça um backup e reduza fotos muito pesadas.");
    }
  }, [alunos, modoLocalAtivo]);

  useEffect(() => {
    if (!modoLocalAtivo) return;

    if (!salvarDados(STORAGE_KEYS.presencas, presencas)) {
      setErroArmazenamento("Não foi possível salvar o histórico de presenças.");
    }
  }, [presencas, modoLocalAtivo]);

  useEffect(() => {
    if (!modoLocalAtivo) return;

    salvarDados(STORAGE_KEYS.avisos, avisos);
  }, [avisos, modoLocalAtivo]);

  useEffect(() => {
    if (!modoLocalAtivo) return;

    if (!salvarDados(STORAGE_KEYS.usuarios, usuarios)) {
      setErroArmazenamento("Não foi possível salvar os usuários de acesso.");
    }
  }, [usuarios, modoLocalAtivo]);

  useEffect(() => {
    if (usuarioLogado) {
      salvarDados(STORAGE_KEYS.usuarioLogado, usuarioLogado);
    }
  }, [usuarioLogado]);

  useEffect(() => {
    if (
      (tela === "mensalidades" ||
        tela === "pagamentos" ||
        tela === "relatorios") &&
      tipoUsuario !== "diretor"
    ) {
      setTela("dashboard");
    }
  }, [tela, tipoUsuario]);

  useEffect(() => {
    let ativo = true;

    function aplicarUsuarioLogado(usuarioRecuperado) {
      if (!ativo) return;

      setUsuarioLogado(usuarioRecuperado);
      setTipoUsuario(usuarioRecuperado.cargo);

      if (usuarioRecuperado.cargo === "aluno") {
        setTela("portalAluno");
      } else if (usuarioRecuperado.cargo === "professor") {
        setTela("portalProfessor");
      } else {
        setTela("dashboard");
      }
    }

    async function restaurarSessaoInicial() {
      if (supabaseConfigurado) {
        try {
          const perfil = await obterPerfilSupabase();

          if (perfil?.cargo && perfil?.academia_id) {
            aplicarUsuarioLogado({
              id: perfil.id,
              usuario: perfil.email || perfil.id,
              cargo: perfil.cargo,
              nome: perfil.nome || perfil.id,
              alunoId: perfil.aluno_id,
              academiaId: perfil.academia_id,
              origem: "supabase",
            });
            return;
          }
        } catch (error) {
          console.error("Erro ao recuperar sessao do Supabase.", error);
        }
      }

    const usuarioSalvo =
      localStorage.getItem(STORAGE_KEYS.usuarioLogado) ||
      localStorage.getItem("usuario_logado_ariramba");

    if (usuarioSalvo) {
      let usuarioRecuperado;

      try {
        usuarioRecuperado = JSON.parse(usuarioSalvo);
      } catch (error) {
        console.warn("Sessão salva inválida. Login será solicitado novamente.", error);
        localStorage.removeItem(STORAGE_KEYS.usuarioLogado);
        localStorage.removeItem("usuario_logado_ariramba");
        return;
      }

      aplicarUsuarioLogado(usuarioRecuperado);
    }
    }

    restaurarSessaoInicial();

    return () => {
      ativo = false;
    };
  }, []);


  useEffect(() => {
    if (tela !== "scanner") return;

    const scanner = new Html5Qrcode("reader");
    let leituraEmAndamento = false;
    let scannerAtivo = true;

    const liberarScanner = () => {
      setTimeout(() => {
        leituraEmAndamento = false;
      }, 1800);
    };

    const processarQrCode = async (resultado) => {
      if (leituraEmAndamento) return;
      leituraEmAndamento = true;

      const codigoLido = String(resultado || "").trim();
      let presencasParaBusca = presencas;
      let alunoEncontrado = alunos.find(
        (aluno) => `aluno-${aluno.id}` === codigoLido
      );

      if (!alunoEncontrado && supabaseConfigurado) {
        try {
          const [alunosOnline, presencasOnline, pagamentosOnline] = await Promise.all([
            listarAlunosOnline(),
            listarPresencasOnline(),
            listarPagamentosOnline(),
          ]);
          const alunosNormalizados = alunosOnline.map(normalizarAluno);
          const presencasComAlunos = completarPresencasComAlunos(
            presencasOnline,
            alunosNormalizados
          );
          const alunosOnlineComDados = aplicarPagamentosNosAlunos(
            aplicarPresencasNosAlunos(alunosNormalizados, presencasComAlunos),
            pagamentosOnline
          );

          presencasParaBusca = presencasComAlunos;
          if (scannerAtivo) {
            setAlunos(alunosOnlineComDados);
            setPresencas(presencasComAlunos);
            setPagamentos(pagamentosOnline);
          }

          alunoEncontrado = alunosOnlineComDados.find(
            (aluno) => `aluno-${aluno.id}` === codigoLido
          );
        } catch (error) {
          console.error("Erro ao buscar aluno do QR online.", error);
        }
      }

      if (!alunoEncontrado) {
        alert("QR Code lido, mas aluno nao encontrado. Confira se esta usando a carteirinha gerada por este sistema.");
        liberarScanner();
        return;
      }

      const diaVencimento = Number(alunoEncontrado.vencimento || 0);

      if (
        alunoEncontrado.statusPagamento !== "Pago" &&
        diaVencimento > 0 &&
        new Date().getDate() > diaVencimento
      ) {
        const multa = 10;
        const jurosPorDia = 1;
        const diasAtraso = new Date().getDate() - diaVencimento;
        const valorAtualizado =
          Number(alunoEncontrado.mensalidade || 0) + multa + diasAtraso * jurosPorDia;
        const valorAtualizadoFormatado = Number(valorAtualizado || 0).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });

        alert(
          `Presenca bloqueada.\n\n${alunoEncontrado.nome} esta com mensalidade vencida.\nValor atualizado: ${valorAtualizadoFormatado}`
        );
        liberarScanner();
        return;
      }

      const hoje = new Date().toLocaleDateString();

      const jaRegistrou = presencasParaBusca.some(
        (presenca) =>
          (String(presenca.alunoId) === String(alunoEncontrado.id) ||
            presenca.nome === alunoEncontrado.nome) &&
          presenca.data === hoje
      );

      if (jaRegistrou) {
        alert("Aluno ja registrou presenca hoje.");
        liberarScanner();
        return;
      }

      const novaPresenca = {
        alunoId: alunoEncontrado.id,
        nome: alunoEncontrado.nome,
        foto: alunoEncontrado.foto,
        data: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
      };

      if (equipeOnlineLogada) {
        try {
          await registrarPresencaOnline(novaPresenca);
          await carregarDadosOnlineNoEstado();
        } catch (error) {
          console.error("Erro ao registrar presenca online.", error);
          alert(`Nao foi possivel enviar a presenca ao banco online.\n\nErro: ${error.message}`);
          liberarScanner();
          return;
        }
      } else {
        setAlunos((prev) =>
          prev.map((aluno) =>
            String(aluno.id) === String(alunoEncontrado.id)
              ? {
                ...aluno,
                presencas: [...(aluno.presencas || []), {
                  data: novaPresenca.data,
                  hora: novaPresenca.hora,
                }],
              }
              : aluno
          )
        );

        setPresencas((prev) => [...prev, novaPresenca]);
      }

      alert("Presenca registrada para " + alunoEncontrado.nome);
      liberarScanner();
    };

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        processarQrCode,
        () => {}
      )
      .catch((error) => {
        console.error("Erro ao iniciar camera do scanner.", error);
        alert("Nao foi possivel abrir a camera. Permita o acesso a camera e tente novamente.");
      });

    return () => {
      scannerAtivo = false;
      scanner
        .stop()
        .catch(() => {})
        .finally(() => {
          scanner.clear();
          document.getElementById("reader")?.replaceChildren();
        });
    };
  }, [tela, alunos, presencas, equipeOnlineLogada]);

  useEffect(() => {
    const relogio = setInterval(() => {
      setHoraAtual(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(relogio);
  }, []);

  useEffect(() => {
    const telasComDadosOnline = [
      "dashboard",
      "lista",
      "pagamentos",
      "historico",
      "portalAluno",
      "portalProfessor",
    ];

    if (!usuarioOnlineLogado || !telasComDadosOnline.includes(tela)) {
      return;
    }

    let componenteAtivo = true;

    async function sincronizarPainel() {
      try {
        if (!componenteAtivo) return;
        await carregarDadosOnlineNoEstado();
      } catch (error) {
        console.error("Erro ao sincronizar painel online.", error);
        if (componenteAtivo) {
          setErroArmazenamento(
            `Não foi possível carregar os dados online: ${error.message || "erro desconhecido"}`
          );
        }
      }
    }

    sincronizarPainel();
    const intervalo = setInterval(sincronizarPainel, 15000);

    return () => {
      componenteAtivo = false;
      clearInterval(intervalo);
    };
  }, [tela, usuarioOnlineLogado, usuarioLogado?.id, usuarioLogado?.academiaId]);

  useEffect(() => {
    if (!usuarioOnlineLogado || !supabase) return;

    const canal = supabase
      .channel("alunos-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alunos" },
        () => {
          carregarDadosOnlineNoEstado().catch((error) => {
            console.error("Erro ao recarregar alunos apos evento realtime.", error);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "presencas" },
        () => {
          carregarDadosOnlineNoEstado().catch((error) => {
            console.error("Erro ao recarregar presencas apos evento realtime.", error);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pagamentos" },
        () => {
          carregarDadosOnlineNoEstado().catch((error) => {
            console.error("Erro ao recarregar pagamentos apos evento realtime.", error);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "avisos" },
        () => {
          carregarDadosOnlineNoEstado().catch((error) => {
            console.error("Erro ao recarregar avisos apos evento realtime.", error);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuarioOnlineLogado]);

  function limparFormulario() {
    setNome("");
    setDataInicio("");
    setUsuarioAluno("");
    setSenhaAluno("");
    setTelefone("");
    setFaixa("");
    setResponsavel("");
    setDataNascimento("");
    setPeso("");
    setGrau("");
    setTipoSanguineo("");
    setSaude("");
    setMedicamentos("");
    setObservacoes("");
    setObservacaoFinanceira("");
    setFoto("");
    setFotoOriginal("");
    setAlunoEditando(null);
    setMensalidade("");
    setVencimento("");
    setNovaSenha("");
    setConfirmarSenha("");
  }

  function removerAlunoDosCachesLocais(alunoRemovido) {
    if (!alunoRemovido) return;

    const idRemovido = String(alunoRemovido.id || "");
    const nomeRemovido = normalizarTextoChave(alunoRemovido.nome);

    CHAVES_ALUNOS_LOCAIS.forEach((chave) => {
      const dados = localStorage.getItem(chave);
      if (!dados) return;

      try {
        const lista = JSON.parse(dados);
        if (!Array.isArray(lista)) return;

        const filtrada = lista.filter((aluno) => {
          const mesmoId = idRemovido && String(aluno?.id || "") === idRemovido;
          const mesmoNome =
            nomeRemovido && normalizarTextoChave(aluno?.nome) === nomeRemovido;

          return !mesmoId && !mesmoNome;
        });

        salvarDados(chave, filtrada);
      } catch (error) {
        console.warn(`Nao foi possivel limpar o cache de ${chave}.`, error);
      }
    });

    CHAVES_USUARIOS_LOCAIS.forEach((chave) => {
      const dados = localStorage.getItem(chave);
      if (!dados) return;

      try {
        const lista = JSON.parse(dados);
        if (!Array.isArray(lista)) return;

        const filtrada = lista.filter((usuario) => {
          const mesmoAluno = idRemovido && String(usuario?.alunoId || "") === idRemovido;
          const mesmoNome =
            nomeRemovido && normalizarTextoChave(usuario?.nome) === nomeRemovido;

          return !mesmoAluno && !mesmoNome;
        });

        salvarDados(chave, filtrada);
      } catch (error) {
        console.warn(`Nao foi possivel limpar o cache de ${chave}.`, error);
      }
    });
  }

  function voltarResumoPortalAluno() {
    setMostrarPix(false);
    setMostrarCarteirinhaAluno(false);
    setMostrarHistoricoAluno(false);
    setMostrarDadosPortalAluno(false);
    setModoEditarPerfil(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarAluno() {
    if (salvandoAluno) return;

    if (nome.trim() === "") {
      alert("Digite o nome do aluno.");
      return;
    }

    if (supabaseConfigurado && !diretorOnlineLogado) {
      alert("Entre com o e-mail do diretor cadastrado no Supabase antes de cadastrar ou alterar alunos.");
      return;
    }

    const usuarioInformado = usuarioAluno.trim();
    const senhaInformada = senhaAluno.trim();
    const usuarioAtualDoAluno = alunoEditando
      ? usuarios.find((usuario) => usuario.alunoId === alunoEditando.id)
      : null;
    const usuarioNormalizado =
      usuarioInformado || usuarioAtualDoAluno?.usuario || criarUsuarioAluno(nome, usuarios);
    const senhaNormalizada =
      senhaInformada || (!alunoEditando || !usuarioAtualDoAluno ? "1234" : "");

    if (diretorOnlineLogado && !alunoEditando) {
      if (!usuarioInformado) {
        alert("Informe o e-mail do aluno para criar o acesso online.");
        return;
      }

      if (!emailValido(usuarioInformado)) {
        alert("Informe um e-mail válido para criar o acesso online do aluno.");
        return;
      }

      if (!senhaInformada || senhaInformada.length < 6) {
        alert("Informe uma senha inicial com pelo menos 6 caracteres para criar o acesso online do aluno.");
        return;
      }
    }

    if (
      usuarioNormalizado !== "" &&
      usuarios.some(
        (usuario) =>
          usuario.usuario.toLowerCase() === usuarioNormalizado.toLowerCase() &&
          usuario.alunoId !== alunoEditando?.id
      )
    ) {
      alert("Este usuário já existe. Escolha outro usuário para o aluno.");
      return;
    }

    setSalvandoAluno(true);

    if (alunoEditando) {
      let alunoAtualizado = null;
      const alunosAtualizados = alunos.map((aluno) => {
        if (aluno.id === alunoEditando.id) {
          alunoAtualizado = {
            ...aluno,
            nome,
            telefone,
            faixa,
            responsavel,
            dataNascimento,
            peso,
            grau,
            tipoSanguineo,
            saude,
            medicamentos,
            observacoes,
            observacaoFinanceira,
            foto,
            mensalidade: Number(mensalidade),
            vencimento: Number(vencimento),
            academiaId: aluno.academiaId || usuarioLogado?.academiaId || "",
          };

          return alunoAtualizado;
        }

        return aluno;
      });

      if (diretorOnlineLogado && alunoAtualizado) {
        try {
          const alunoComFotoOnline = await prepararFotoAlunoOnline(alunoAtualizado);
          const alunoOnline = await salvarAlunoOnline(alunoComFotoOnline);
          alunoAtualizado = normalizarAluno(alunoOnline);
          await carregarDadosOnlineNoEstado();
        } catch (error) {
          console.error("Erro ao atualizar aluno online.", error);
          alert(`Nao foi possivel atualizar o aluno no banco online.\n\nErro: ${error.message || "erro desconhecido"}`);
          setSalvandoAluno(false);
          return;
        }
      } else {
        setAlunos(alunosAtualizados);
      }

      const alunoIdParaAcesso = alunoAtualizado?.id || alunoEditando.id;

      setUsuarios((usuariosAtuais) => {
        if (usuarioAtualDoAluno) {
          return usuariosAtuais.map((usuario) => {
            if (usuario.alunoId === alunoEditando.id) {
              return {
                ...usuario,
                usuario: usuarioNormalizado,
                senha: senhaNormalizada || usuario.senha,
                nome,
                alunoId: alunoIdParaAcesso,
                academiaId: usuario.academiaId || usuarioLogado?.academiaId || alunoAtualizado?.academiaId || "",
              };
            }

            return usuario;
          });
        }

        return [
          ...usuariosAtuais,
          {
            id: Date.now(),
            usuario: usuarioNormalizado,
            senha: senhaNormalizada,
            cargo: "aluno",
            nome,
            alunoId: alunoIdParaAcesso,
            academiaId: usuarioLogado?.academiaId || alunoAtualizado?.academiaId || "",
          },
        ];
      });

      if (diretorOnlineLogado) {
        try {
          if (!idAlunoOnlineValido(alunoIdParaAcesso)) {
            throw new Error("Aluno ainda nao possui ID online valido.");
          }

          await salvarUsuarioSistemaOnline(
            criarAcessoAluno({
              id: usuarioAtualDoAluno?.id || Date.now(),
              usuario: usuarioNormalizado,
              senha: senhaNormalizada || usuarioAtualDoAluno?.senha || "1234",
              nome,
              alunoId: alunoIdParaAcesso,
              academiaId: usuarioLogado?.academiaId || alunoAtualizado?.academiaId || "",
            })
          );
      } catch (error) {
        console.error("Erro ao salvar usuário do aluno online.", error);
        alert(`Aluno atualizado, mas o acesso online não foi salvo.\n\nErro: ${error.message || "erro desconhecido"}`);
      }
      }

      setAlunoEditando(null);

      limparFormulario();

      alert("Aluno atualizado com sucesso ✅");

      setTela("lista");

      setSalvandoAluno(false);
      return;
    }

    const novoAluno = {
      id: criarIdAluno(),

      nome,
      peso,
      dataNascimento,
      faixa,
      dataInicio,

      usuario: usuarioNormalizado,
      senha: senhaNormalizada,

      telefone,
      responsavel,

      tipoSanguineo,
      saude,
      medicamentos,
      observacoes,

      foto,

      grau,

      presencas: [],

      mensalidade: Number(mensalidade),

      vencimento: Number(vencimento),

      statusPagamento: "Pendente",
      ultimoPagamento: "",
      historicoPagamentos: [],
      academiaId: usuarioLogado?.academiaId || "",
    };
    let alunoParaSalvar = novoAluno;

    if (diretorOnlineLogado) {
      try {
        const alunoComFotoOnline = await prepararFotoAlunoOnline(novoAluno);
        alunoParaSalvar = normalizarAluno(await salvarAlunoOnline(alunoComFotoOnline));
        await criarAlunoAuthOnline(alunoParaSalvar.id, usuarioNormalizado, senhaNormalizada);
        await carregarDadosOnlineNoEstado();
      } catch (error) {
        console.error("Erro ao salvar aluno online.", error);
        alert(`Nao foi possivel concluir o cadastro online do aluno.\n\nErro: ${error.message || "erro desconhecido"}`);
        setSalvandoAluno(false);
        return;
      }
    }

    const acessoAluno = criarAcessoAluno({
      usuario: usuarioNormalizado,
      senha: senhaNormalizada,
      nome,
      alunoId: alunoParaSalvar.id,
      academiaId: usuarioLogado?.academiaId || alunoParaSalvar.academiaId || "",
    });

    setAlunos((alunosAtuais) =>
      mesclarAlunosPreservandoLocais(alunosAtuais, [alunoParaSalvar])
    );
    setUsuarios((usuariosAtuais) => [...usuariosAtuais, acessoAluno]);

    if (diretorOnlineLogado && idAlunoOnlineValido(alunoParaSalvar.id)) {
      try {
        await salvarUsuarioSistemaOnline(acessoAluno);
      } catch (error) {
        console.error("Erro ao salvar usuário do aluno online.", error);
        alert(`Aluno cadastrado, mas o acesso online não foi salvo.\n\nErro: ${error.message || "erro desconhecido"}`);
      }
    } else if (diretorOnlineLogado) {
      console.warn("Acesso online nao foi salvo porque o aluno nao possui ID online valido.");
    }

    adicionarAviso(`Novo aluno cadastrado: ${nome}`);

    alert(`Aluno ${nome} cadastrado com sucesso!\n\nAcesso do portal:\nUsuario: ${usuarioNormalizado}\nSenha: ${senhaNormalizada}`);

    limparFormulario();
    setSalvandoAluno(false);
    setTela("dashboard");
  }

  async function marcarComoPago(idAluno) {
    const dataPagamento = new Date().toLocaleDateString();
    const novosAlunos = alunos.map((aluno) => {
      if (aluno.id === idAluno) {
        return {
          ...aluno,
          statusPagamento: "Pago",
          ultimoPagamento: dataPagamento,
          historicoPagamentos: [
            ...aluno.historicoPagamentos,
            {
              data: dataPagamento,
              valor: calcularValorComJuros(aluno),
            },
          ],
          comprovantePagamento: null,
          dataEnvioComprovante: "",
        };
      }

      return aluno;
    });

    const alunoPago = alunos.find((aluno) => aluno.id === idAluno);
    const alunoAtualizado = novosAlunos.find((aluno) => aluno.id === idAluno);

    if (!alunoPago || !alunoAtualizado) return;

    if (diretorOnlineLogado) {
      try {
        await Promise.all([
          salvarAlunoOnline(alunoAtualizado),
          confirmarPagamentoOnline({
            aluno_id: idAluno,
            valor: calcularValorComJuros(alunoPago),
            status: "Pago",
            data_pagamento: new Date().toISOString().slice(0, 10),
            comprovante_path: alunoPago.comprovantePagamentoPath || alunoPago.comprovantePagamento || null,
          }),
        ]);
        await carregarDadosOnlineNoEstado();
      } catch (error) {
        console.error("Erro ao salvar pagamento online.", error);
        alert(`Nao foi possivel confirmar o pagamento no banco online.\n\nErro: ${error.message || "erro desconhecido"}`);
        return;
      }
    } else {
      setAlunos(novosAlunos);
    }

    adicionarAviso(`Pagamento confirmado: ${alunoPago.nome}`);
    alert("Pagamento marcado como Pago.");
  }

  async function marcarComoPendente(idAluno) {
    const novosAlunos = alunos.map((aluno) => {
      if (aluno.id === idAluno) {
        return {
          ...aluno,
          statusPagamento: "Pendente",
        };
      }

      return aluno;
    });

    const alunoAtualizado = novosAlunos.find((aluno) => aluno.id === idAluno);

    if (!alunoAtualizado) return;

    if (diretorOnlineLogado) {
      const pagamentoPagoMaisRecente = pagamentos
        .filter(
          (pagamento) =>
            String(pagamento.aluno_id) === String(idAluno) &&
            pagamento.status === "Pago"
        )
        .sort((a, b) => dataPagamentoParaTempo(b) - dataPagamentoParaTempo(a))[0];

      if (!pagamentoPagoMaisRecente?.id) {
        alert("Nao foi encontrado pagamento Pago para cancelar.");
        return;
      }

      try {
        await atualizarPagamentoOnlinePorId(pagamentoPagoMaisRecente.id, {
          status: "Pendente",
          data_pagamento: null,
        });
        await carregarDadosOnlineNoEstado();
      } catch (error) {
        console.error("Erro ao salvar pendencia online.", error);
        alert(`Nao foi possivel marcar o pagamento como pendente no banco online.\n\nErro: ${error.message || "erro desconhecido"}`);
        return;
      }
    } else {
      setAlunos(novosAlunos);
    }

    alert("Pagamento marcado como Pendente.");
  }

  async function atualizarPerfilAluno() {
    const alunoPerfil = alunoDoPortal;

    if (!alunoPerfil) {
      alert("Aluno não encontrado.");
      return;
    }

    if (novaSenha && novaSenha !== confirmarSenha) {
      alert("As senhas não coincidem ❌");
      return;
    }

    if (novaSenha && novaSenha.length < 6) {
      alert("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    const alunosAtualizados = alunos.map((aluno) => {
      if (String(aluno.id) === String(alunoPerfil.id)) {
        return {
          ...aluno,
          telefone,
          responsavel,
          tipoSanguineo,
          saude,
          medicamentos,
          observacoes,
          foto,
        };
      }

      return aluno;
    });

    const alunoAtualizado = alunosAtualizados.find(
      (aluno) => String(aluno.id) === String(alunoPerfil.id)
    );

    if (supabaseConfigurado) {
      if (!idAlunoOnlineValido(alunoPerfil.id)) {
        alert("Este aluno ainda nao possui um ID online valido. Peça ao mestre para recarregar o aluno pelo Supabase.");
        return;
      }

      try {
        const alunoComFotoOnline = await prepararFotoAlunoOnline(alunoAtualizado);
        await atualizarPerfilAlunoOnline(alunoPerfil.id, {
          telefone,
          responsavel,
          tipo_sanguineo: tipoSanguineo,
          saude,
          medicamentos,
          observacoes,
          foto_url: alunoComFotoOnline.fotoUrl || alunoComFotoOnline.foto || null,
        });

        if (novaSenha && usuarioLogado?.origem === "supabase") {
          await atualizarSenhaUsuarioAtual(novaSenha);
        }

        await carregarDadosOnlineNoEstado();
      } catch (error) {
        console.error("Erro ao atualizar cadastro do aluno online.", error);
        alert(`Nao foi possivel salvar seu cadastro no banco online.\n\nErro: ${error.message || "erro desconhecido"}`);
        return;
      }
    } else {
      setAlunos(alunosAtualizados);
    }

    const usuariosAtualizados = usuarios.map((usuario) => {

      if (
        String(usuario.alunoId) === String(alunoPerfil.id) ||
        String(usuario.id) === String(usuarioLogado?.id) ||
        usuario.usuario?.trim().toLowerCase() === usuarioLogado?.usuario?.trim().toLowerCase()
      ) {

        return {
          ...usuario,
          senha: novaSenha || usuario.senha,
          alunoId: alunoPerfil.id,
        };

      }

      return usuario;

    });

    setUsuarios(usuariosAtualizados);

    const usuarioLogadoAtualizado = usuariosAtualizados.find(
      (usuario) =>
        String(usuario.id) === String(usuarioLogado?.id) ||
        usuario.usuario?.trim().toLowerCase() === usuarioLogado?.usuario?.trim().toLowerCase()
    );

    if (usuarioLogadoAtualizado) {
      setUsuarioLogado(usuarioLogadoAtualizado);
    }

    if (usuarioOnlineLogado) {
      const usuarioAtualizado = usuariosAtualizados.find(
        (usuario) =>
          String(usuario.alunoId) === String(alunoPerfil.id) ||
          usuario.usuario?.trim().toLowerCase() === usuarioLogado?.usuario?.trim().toLowerCase()
      );

      try {
        if (usuarioAtualizado && usuarioLogado?.origem === "usuarios_sistema") {
          await salvarUsuarioSistemaOnline(usuarioAtualizado);
        }
      } catch (error) {
        console.error("Erro ao atualizar acesso do aluno online.", error);
        alert(`Cadastro salvo, mas nao foi possivel atualizar o acesso online.\n\nErro: ${error.message || "erro desconhecido"}`);
      }
    }

    setModoEditarPerfil(false);

    alert("Perfil atualizado com sucesso ✅");
    setNovaSenha("");
    setConfirmarSenha("");
  }

  function atualizarPerfilProfessor() {
    if (novaSenha !== confirmarSenha) {
      alert("As senhas não coincidem ❌");
      return;
    }
    const usuariosAtualizados = usuarios.map((usuario) => {
      if (usuario.id === usuarioLogado.id) {
        return {
          ...usuario,
          senha: novaSenha || usuario.senha,
          telefone,
          especialidadeProfessor,
          graduacaoProfessor,
          observacoes,
          foto,
        };
      }

      return usuario;
    });

    setUsuarios(usuariosAtualizados);

    const usuarioAtualizado = usuariosAtualizados.find(
      (usuario) => usuario.id === usuarioLogado.id
    );

    setUsuarioLogado(usuarioAtualizado);

    setModoEditarPerfil(false);

    alert("Cadastro do professor atualizado 😎🥋");
  }

  async function informarPagamento(idAluno, comprovante = null) {
    let comprovanteParaSalvar = comprovante;

    if (supabaseConfigurado && comprovante) {
      try {
        comprovanteParaSalvar = await prepararComprovanteOnline(idAluno, comprovante);
      } catch (error) {
        console.error("Erro ao enviar comprovante para o Storage.", error);
        alert(`Nao foi possivel salvar o comprovante no Storage.\n\nErro: ${error.message || "erro desconhecido"}`);
        return;
      }
    }

    const novosAlunos = alunos.map((aluno) => {
      if (aluno.id === idAluno) {
        return {
          ...aluno,
          statusPagamento: "Aguardando",
          comprovantePagamento: comprovanteParaSalvar,
          dataEnvioComprovante: new Date().toLocaleDateString(),
        };
      }

      return aluno;
    });

    const alunoAtualizado = novosAlunos.find((aluno) => aluno.id === idAluno);

    if (!alunoAtualizado) return;

    if (idAlunoOnlineValido(idAluno)) {
      try {
        await salvarPagamentoOnline({
          aluno_id: idAluno,
          valor: Number(alunoAtualizado.mensalidade || 0),
          status: "Aguardando",
          data_pagamento: new Date().toISOString().slice(0, 10),
          comprovante_url: comprovanteParaSalvar,
        });
        await carregarDadosOnlineNoEstado();
      } catch (error) {
        console.error("Erro ao enviar pagamento online.", error);
        alert(`Nao foi possivel enviar o pagamento ao banco online.\n\nErro: ${error.message || "erro desconhecido"}`);
        return;
      }
    } else if (supabaseConfigurado) {
      alert("Este aluno ainda nao possui ID online valido. Recarregue os dados do Supabase antes de enviar pagamento.");
      return;
    } else {
      setAlunos(novosAlunos);
    }

    alert("Pagamento enviado para analise.");
  }

  async function rejeitarPagamento(idAluno) {
    const novosAlunos = alunos.map((aluno) => {
      if (aluno.id === idAluno) {
        return {
          ...aluno,
          statusPagamento: "Pendente",
          comprovantePagamento: null,
          dataEnvioComprovante: "",
        };
      }

      return aluno;
    });

    const alunoAtualizado = novosAlunos.find((aluno) => aluno.id === idAluno);

    if (!alunoAtualizado) return;

    if (diretorOnlineLogado) {
      const pagamentoAguardandoMaisRecente = pagamentos
        .filter(
          (pagamento) =>
            String(pagamento.aluno_id) === String(idAluno) &&
            pagamento.status === "Aguardando"
        )
        .sort((a, b) => dataPagamentoParaTempo(b) - dataPagamentoParaTempo(a))[0];

      if (!pagamentoAguardandoMaisRecente?.id) {
        alert("Nao foi encontrado comprovante aguardando confirmacao para rejeitar.");
        return;
      }

      try {
        await atualizarPagamentoOnlinePorId(pagamentoAguardandoMaisRecente.id, {
          status: "Rejeitado",
        });
        await carregarDadosOnlineNoEstado();
      } catch (error) {
        console.error("Erro ao rejeitar pagamento online.", error);
        alert(`Nao foi possivel rejeitar o pagamento no banco online.\n\nErro: ${error.message || "erro desconhecido"}`);
        return;
      }
    } else {
      setAlunos(novosAlunos);
    }

    alert("Comprovante rejeitado.");
  }

  async function gerarReciboPDF(aluno) {
    const doc = new jsPDF();

    const dataAtual = new Date().toLocaleDateString();
    const dataHistoricoParaTempo = (data) => {
      if (!data) return 0;

      const partes = String(data).split("/");
      if (partes.length === 3) {
        const [dia, mes, ano] = partes.map(Number);
        return new Date(ano, mes - 1, dia).getTime();
      }

      return new Date(data).getTime() || 0;
    };
    const ultimoPagamentoRegistrado = Array.isArray(aluno.historicoPagamentos)
      ? aluno.historicoPagamentos.reduce((maisRecente, pagamento) => {
        if (!maisRecente) return pagamento;

        return dataHistoricoParaTempo(pagamento.data) > dataHistoricoParaTempo(maisRecente.data)
          ? pagamento
          : maisRecente;
      }, null)
      : null;
    const valorPago = ultimoPagamentoRegistrado
      ? Number(ultimoPagamentoRegistrado.valor || 0)
      : calcularValorComJuros(aluno);
    const dataPagamentoRecibo = ultimoPagamentoRegistrado?.data || dataAtual;

    try {
      const marcaDagua = await prepararLogoMarcaDagua(logo);
      const larguraPagina = doc.internal.pageSize.getWidth();
      const alturaPagina = doc.internal.pageSize.getHeight();
      const larguraMarca = 150;
      const alturaMarca = larguraMarca * marcaDagua.proporcao;

      doc.addImage(
        marcaDagua.imagem,
        "PNG",
        (larguraPagina - larguraMarca) / 2,
        (alturaPagina - alturaMarca) / 2,
        larguraMarca,
        alturaMarca
      );
    } catch (error) {
      console.error("Erro ao adicionar marca-d'agua no recibo.", error);
    }

    doc.setFontSize(18);
    doc.text("RECIBO DE PAGAMENTO", 20, 20);

    doc.setFontSize(12);
    doc.text("Simão Tavares Top Team", 20, 35);
    doc.text(`Aluno: ${aluno.nome}`, 20, 50);
    doc.text(`Data do pagamento: ${dataPagamentoRecibo}`, 20, 60);
    doc.text(`Valor pago: ${formatarMoeda(valorPago)}`, 20, 70);
    doc.text("Status: Pago", 20, 80);

    doc.text(
      "Declaramos que o pagamento da mensalidade foi recebido com sucesso.",
      20,
      100
    );

    doc.text("Assinatura: _______________________________", 20, 130);

    doc.save(`recibo-${aluno.nome}.pdf`);
  }

  function gerarRelatorioFinanceiroPDF() {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("RELATÓRIO FINANCEIRO", 20, 20);

    doc.setFontSize(12);
    doc.text("Simão Tavares Top Team", 20, 32);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 20, 42);
    doc.text(
      `Emitido em: ${new Date().toLocaleString()}`,
      20,
      52
    );

    doc.text(
      `Total de alunos: ${alunos.length}`,
      20,
      62
    );

    doc.text(
      `Presenças hoje: ${presencasHoje}`,
      20,
      72
    );
    doc.text(`Total arrecadado: ${formatarMoeda(totalArrecadado)}`, 20, 90);
    doc.text(`Total a receber: ${formatarMoeda(totalPendenteReceber)}`, 20, 100);
    doc.text(`Previsão do mês: ${formatarMoeda(valorEsperadoMes)}`, 20, 110);

    doc.text(`Pagos: ${totalPagos}`, 20, 125);
    doc.text(`Pendentes: ${totalPendentes}`, 20, 135);
    doc.text(`Vencidos: ${totalVencidos}`, 20, 145);
    doc.text(`Aguardando confirmação: ${pagamentosAguardando.length}`, 20, 155);

    let y = 175;

    doc.text("ALUNOS:", 20, y);
    y += 10;

    alunos.forEach((aluno) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }

      doc.text(
        `${aluno.nome} - ${verificarVencimento(aluno)} - ${formatarMoeda(calcularValorComJuros(aluno))}`,
        20,
        y
      );

      y += 10;
    });

    doc.save("relatorio-financeiro-simao-team.pdf");
  }

  async function baixarCarteirinhaPDF(aluno) {
    if (!aluno) {
      alert("Aluno nao encontrado.");
      return;
    }

    let alunoParaPDF = aluno;

    if (supabaseConfigurado && idAlunoOnlineValido(alunoParaPDF.id)) {
      try {
        alunoParaPDF = {
          ...alunoParaPDF,
          ...normalizarAluno(await obterAlunoOnline(alunoParaPDF.id)),
        };
      } catch (error) {
        console.error("Erro ao carregar dados completos do aluno para PDF.", error);
      }
    }

    if (!alunoParaPDF.foto && supabaseConfigurado && idAlunoOnlineValido(alunoParaPDF.id)) {
      try {
        const fotoOnline = await obterFotoAlunoOnline(alunoParaPDF.id);
        alunoParaPDF = {
          ...alunoParaPDF,
          foto: fotoOnline,
          fotoUrl: fotoOnline,
        };
      } catch (error) {
        console.error("Erro ao carregar foto do aluno para PDF.", error);
      }
    }

    const qrCanvas = document.querySelector("#qrCarteirinhaAluno canvas");
    const qrImagem = qrCanvas?.toDataURL("image/png");
    const status = verificarVencimento(alunoParaPDF) === "Pago"
      ? "Ativo"
      : verificarVencimento(alunoParaPDF) === "Vencido"
        ? "Vencido"
        : "Pendente";

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [86, 54],
    });

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 86, 54, "F");
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.8);
    doc.roundedRect(3, 3, 80, 48, 3, 3, "S");

    doc.setTextColor(245, 158, 11);
    doc.setFontSize(9);
    doc.text("SIMAO TAVARES TOP TEAM", 43, 8.5, { align: "center" });

    if (alunoParaPDF.foto) {
      try {
        const fotoCarteirinha = await prepararFotoCarteirinha(alunoParaPDF.foto);
        doc.addImage(fotoCarteirinha, "JPEG", 7, 16, 21, 21);
      } catch (error) {
        console.error("Erro ao adicionar foto na carteirinha.", error);
        doc.setDrawColor(148, 163, 184);
        doc.roundedRect(7, 16, 21, 21, 2, 2, "S");
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(5);
        doc.text("Foto", 17.5, 27, { align: "center" });
      }
    } else {
      doc.setDrawColor(148, 163, 184);
      doc.roundedRect(7, 16, 21, 21, 2, 2, "S");
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(5);
      doc.text("Sem foto", 17.5, 27, { align: "center" });
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.6);
    doc.text(`Aluno: ${alunoParaPDF.nome || usuarioLogado?.nome || ""}`, 31, 17);
    doc.text(`Faixa: ${alunoParaPDF.faixa || "Nao informado"}`, 31, 23.5);
    doc.text(`Grau: ${alunoParaPDF.grau || "Nao informado"}`, 31, 30);
    doc.text(`Status: ${status}`, 31, 36.5);
    doc.text(`Vencimento: dia ${alunoParaPDF.vencimento || "--"}`, 31, 43);

    if (qrImagem) {
      doc.addImage(qrImagem, "PNG", 64, 18, 16, 16);
      doc.setFontSize(6);
      doc.text("QR de presenca", 72, 38, { align: "center" });
    }

    const nomeArquivo = String(alunoParaPDF.nome || "aluno")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    doc.save(`carteirinha-${nomeArquivo || "aluno"}.pdf`);
  }

  async function abrirCarteirinha(aluno) {
    if (!aluno) return;

    setAlunoCarteirinha(aluno);

    if (!supabaseConfigurado || aluno.foto || !idAlunoOnlineValido(aluno.id)) {
      return;
    }

    try {
      const fotoOnline = await obterFotoAlunoOnline(aluno.id);

      if (!fotoOnline) return;

      const alunoComFoto = {
        ...aluno,
        foto: fotoOnline,
        fotoUrl: fotoOnline,
      };

      setAlunoCarteirinha(alunoComFoto);
      setAlunos((alunosAtuais) =>
        alunosAtuais.map((alunoAtual) =>
          String(alunoAtual.id) === String(aluno.id)
            ? { ...alunoAtual, foto: fotoOnline, fotoUrl: fotoOnline }
            : alunoAtual
        )
      );
    } catch (error) {
      console.error("Erro ao carregar foto do aluno para a carteirinha.", error);
    }
  }

  async function registrarPresenca(idAluno) {
    const alunoEncontrado = alunos.find(
      (aluno) => aluno.id === idAluno
    );

    if (alunoEncontrado) {
      if (bloquearPresencaSeMensalidadeVencida(alunoEncontrado)) {
        return;
      }

      const hoje = new Date().toLocaleDateString();
      const jaRegistrou = (alunoEncontrado.presencas || []).some(
        (presenca) => presenca.data === hoje
      );

      if (jaRegistrou) {
        alert("Aluno já registrou presença hoje ⚠️");
        return;
      }

      const novaPresenca = {
        alunoId: alunoEncontrado.id,
        nome: alunoEncontrado.nome,
        foto: alunoEncontrado.foto,
        data: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
      };

      const novosAlunos = alunos.map((aluno) => {
        if (aluno.id === idAluno) {
          return {
            ...aluno,
            presencas: [
              ...(aluno.presencas || []),
              {
                data: novaPresenca.data,
                hora: novaPresenca.hora,
              },
            ],
          };
        }

        return aluno;
      });

      if (equipeOnlineLogada) {
        try {
          await registrarPresencaOnline(novaPresenca);
          await carregarDadosOnlineNoEstado();
        } catch (error) {
          console.error("Erro ao registrar presença online.", error);
          alert(`Não foi possível enviar a presença ao banco online.\n\nErro: ${error.message}`);
          return;
        }
      }

      if (!equipeOnlineLogada) {
        setAlunos(novosAlunos);
        setPresencas((prev) => [...prev, novaPresenca]);
      }

      adicionarAviso(`${alunoEncontrado.nome} registrou presença`);
      alert("Presença registrada 😎🥋");
    }

  }

  async function removerAluno(idAluno) {
    const confirmar = confirm("Deseja remover este aluno?");

    if (!confirmar) return;

    const alunoRemovido = alunos.find((aluno) => aluno.id === idAluno);

    if (diretorOnlineLogado) {
      if (!idAlunoOnlineValido(idAluno)) {
        alert("Este aluno nao possui ID online valido para exclusao no banco.");
        return;
      }

      try {
        await removerUsuarioSistemaOnlinePorAluno(idAluno);
        await removerAlunoOnline(idAluno);
      } catch (error) {
        console.error("Erro ao remover aluno online.", error);
        alert(`Nao foi possivel remover o aluno do banco online.\n\nErro: ${error.message || "erro desconhecido"}`);
        return;
      }

      try {
        removerAlunoDosCachesLocais(alunoRemovido);
        await carregarDadosOnlineNoEstado();
      } catch (error) {
        console.error("Erro ao recarregar dados apos exclusao online.", error);
      }

      setUsuarios((prev) => prev.filter((usuario) => usuario.alunoId !== idAluno));
      alert("Aluno removido com sucesso.");
      return;
    }

    const novosAlunos = alunos.filter((aluno) => aluno.id !== idAluno);
    removerAlunoDosCachesLocais(alunoRemovido);
    setAlunos(novosAlunos);
    setUsuarios((prev) => prev.filter((usuario) => usuario.alunoId !== idAluno));
    setPresencas((prev) =>
      prev.filter(
        (presenca) =>
          presenca.alunoId !== idAluno &&
          (!alunoRemovido || presenca.nome !== alunoRemovido.nome)
      )
    );

    alert("Aluno removido com sucesso.");
  }

  async function resetarSenhaAluno(aluno) {
    if (diretorOnlineLogado) {
      try {
        await resetarSenhaAlunoAuthOnline(aluno.id, "123456");
        alert("Senha resetada para 123456.");
      } catch (error) {
        console.error("Erro ao resetar senha no Supabase Auth.", error);
        alert(`Nao foi possivel resetar a senha no Supabase Auth.\n\nErro: ${error.message || "erro desconhecido"}`);
      }

      return;
    }

    const usuarioDoAluno = usuarios.find(
      (usuarioAtual) => String(usuarioAtual.alunoId) === String(aluno.id)
    );

    if (!usuarioDoAluno) {
      alert("Nenhum usuario de acesso foi encontrado para este aluno.");
      return;
    }

    const usuarioAtualizado = {
      ...usuarioDoAluno,
      senha: "123456",
    };

    setUsuarios((usuariosAtuais) =>
      usuariosAtuais.map((usuarioAtual) =>
        String(usuarioAtual.alunoId) === String(aluno.id)
          ? usuarioAtualizado
          : usuarioAtual
      )
    );

    alert("Senha resetada para 123456.");
  }

  async function ativarAcessoPortalAluno(aluno) {
    if (!diretorOnlineLogado) return;

    if (aluno.authUserId || aluno.auth_user_id) {
      alert("Este aluno ja possui acesso Supabase Auth vinculado.");
      return;
    }

    const email = window.prompt(
      `Informe o e-mail que sera usado no Portal do Aluno para ${aluno.nome}:`,
      ""
    )?.trim().toLowerCase();

    if (!email) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Informe um e-mail valido para ativar o acesso.");
      return;
    }

    try {
      await criarAlunoAuthOnline(aluno.id, email, "123456");
      await carregarDadosOnlineNoEstado();
      alert(`Acesso ao Portal ativado.\n\nE-mail: ${email}\nSenha inicial: 123456`);
    } catch (error) {
      console.error("Erro ao ativar acesso do aluno no Supabase Auth.", error);
      alert(`Nao foi possivel ativar o acesso ao Portal.\n\nErro: ${error.message || "erro desconhecido"}`);
    }
  }

  async function corrigirEmailPortalAluno(aluno) {
    if (!diretorOnlineLogado) return;

    if (!aluno.authUserId && !aluno.auth_user_id) {
      alert("Este aluno ainda nao possui acesso Supabase Auth vinculado.");
      return;
    }

    const email = window.prompt(
      `Informe o novo e-mail de acesso ao Portal do Aluno para ${aluno.nome}:`,
      ""
    )?.trim().toLowerCase();

    if (!email) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Informe um e-mail valido para corrigir o acesso.");
      return;
    }

    const confirmado = window.confirm(
      `Confirmar alteracao do e-mail de acesso ao Portal?\n\nAluno: ${aluno.nome}\nNovo e-mail: ${email}`
    );

    if (!confirmado) return;

    try {
      await atualizarEmailAlunoAuthOnline(aluno.id, email);
      await carregarDadosOnlineNoEstado();
      alert(`E-mail do Portal atualizado com sucesso.\n\nNovo e-mail: ${email}`);
    } catch (error) {
      console.error("Erro ao corrigir e-mail do aluno no Supabase Auth.", error);
      alert(`Nao foi possivel corrigir o e-mail do Portal.\n\nErro: ${error.message || "erro desconhecido"}`);
    }
  }

  function exportarBackup() {
    const backup = {
      app: APP_NAME,
      versao: 1,
      geradoEm: new Date().toISOString(),
      alunos,
      presencas,
      avisos,
      usuarios,
    };

    const arquivo = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");

    link.href = url;
    link.download = `backup-simao-team-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function importarBackup(evento) {
    const arquivo = evento.target.files?.[0];

    if (!arquivo) return;

    const confirmar = confirm(
      "Restaurar este backup vai substituir os dados atuais deste navegador. Deseja continuar?"
    );

    if (!confirmar) {
      evento.target.value = "";
      return;
    }

    const leitor = new FileReader();

    leitor.onload = () => {
      try {
        const backup = JSON.parse(leitor.result);

        if (!Array.isArray(backup.alunos) || !Array.isArray(backup.usuarios)) {
          alert("Arquivo de backup inválido.");
          return;
        }

        setAlunos(backup.alunos.map(normalizarAluno));
        setPresencas(Array.isArray(backup.presencas) ? backup.presencas : []);
        setAvisos(Array.isArray(backup.avisos) ? backup.avisos : []);
        setUsuarios(backup.usuarios);
        setErroArmazenamento("");

        alert("Backup restaurado com sucesso ✅");
      } catch (error) {
        console.error("Erro ao importar backup.", error);
        alert("Não foi possível ler este arquivo de backup.");
      } finally {
        evento.target.value = "";
      }
    };

    leitor.readAsText(arquivo);
  }

  function entrarUsuarioLocal(usuarioEncontrado) {
    setUsuarioLogado(usuarioEncontrado);
    setTipoUsuario(usuarioEncontrado.cargo);

    if (usuarioEncontrado.cargo === "aluno") {
      setTela("portalAluno");
    } else if (usuarioEncontrado.cargo === "professor") {
      setTela("portalProfessor");
    } else {
      setTela("dashboard");
    }
  }

  function promoverSessaoOnlineSistema(usuarioDigitado, senhaDigitada) {
    if (!supabaseConfigurado) return;

    limitarTempo(
      buscarUsuarioSistemaOnline(usuarioDigitado),
      2500,
      "Consulta online demorou demais."
    )
      .then((usuarioOnlineSistema) => {
        if (usuarioOnlineSistema?.senha?.trim() !== senhaDigitada) return;

        setUsuarios((usuariosAtuais) => {
          const jaExiste = usuariosAtuais.some(
            (usuarioAtual) =>
              usuarioAtual.usuario.trim().toLowerCase() ===
              usuarioOnlineSistema.usuario.trim().toLowerCase()
          );

          return jaExiste ? usuariosAtuais : [...usuariosAtuais, usuarioOnlineSistema];
        });

        setUsuarioLogado(usuarioOnlineSistema);
        setTipoUsuario(usuarioOnlineSistema.cargo);
        setErroArmazenamento("");
      })
      .catch((error) => {
        console.error("Erro ao confirmar usuário online.", error);
        setErroArmazenamento(
          "Entrou rápido no modo local. A confirmação online ainda não respondeu; tente enviar ao banco novamente em alguns segundos."
        );
      });
  }

  async function fazerLogin() {
    if (loginEmAndamento) return;

    const usuarioDigitado = usuario.trim();
    const senhaDigitada = senha.trim();

    if (!usuarioDigitado || !senhaDigitada) {
      alert("Digite usuário e senha.");
      return;
    }

    setLoginEmAndamento(true);

    const usuarioLocal = usuarios.find(
      (u) =>
        String(u.usuario || "").trim().toLowerCase() === usuarioDigitado.toLowerCase() &&
        String(u.senha || "").trim() === senhaDigitada
    );

    if (usuarioLocal && !supabaseConfigurado) {
      entrarUsuarioLocal(usuarioLocal);
      promoverSessaoOnlineSistema(usuarioDigitado, senhaDigitada);
      setLoginEmAndamento(false);
      return;
    }

    if (supabaseConfigurado && !usuarioDigitado.includes("@")) {
      try {
        const usuarioOnlineSistema = await limitarTempo(
          buscarUsuarioSistemaOnline(usuarioDigitado),
          1500,
          "Consulta online demorou demais."
        );

        if (usuarioOnlineSistema?.senha?.trim() === senhaDigitada) {
          setUsuarios((usuariosAtuais) => {
            const jaExiste = usuariosAtuais.some(
              (usuarioAtual) =>
                usuarioAtual.usuario.trim().toLowerCase() ===
                usuarioOnlineSistema.usuario.trim().toLowerCase()
            );

            return jaExiste ? usuariosAtuais : [...usuariosAtuais, usuarioOnlineSistema];
          });

          entrarUsuarioLocal(usuarioOnlineSistema);
          setLoginEmAndamento(false);
          return;
        }
      } catch (error) {
        console.error("Erro ao consultar usuário online.", error);
      }
    }

    if (supabaseConfigurado && usuarioDigitado.includes("@")) {
      try {
        const loginOnline = await limitarTempo(
          entrarComEmailSenha(usuarioDigitado, senhaDigitada),
          15000,
          "Login online demorou demais."
        );

        const perfil = await limitarTempo(
          obterPerfilSupabase(),
          15000,
          "Perfil online demorou demais."
        );

        if (!perfil?.cargo || !perfil?.academia_id) {
          await sairDoSupabase().catch((error) => {
            console.error("Erro ao encerrar sessao sem perfil online.", error);
          });
          alert("Login autenticado, mas este usuario ainda nao possui perfil autorizado no banco online.");
          setLoginEmAndamento(false);
          return;
        }

        const usuarioOnline = {
          id: perfil.id || loginOnline?.user?.id || usuarioDigitado,
          usuario: usuarioDigitado,
          cargo: perfil.cargo,
          nome: perfil.nome || usuarioDigitado,
          alunoId: perfil.aluno_id,
          academiaId: perfil.academia_id,
          origem: "supabase",
        };

        setUsuarios((usuariosAtuais) => {
          const jaExiste = usuariosAtuais.some(
            (usuarioAtual) =>
              usuarioAtual.usuario.trim().toLowerCase() === usuarioDigitado.toLowerCase()
          );

          return jaExiste ? usuariosAtuais : [...usuariosAtuais, usuarioOnline];
        });
        setUsuarioLogado(usuarioOnline);
        setTipoUsuario(perfil.cargo);

        if (perfil.cargo === "aluno") {
          setTela("portalAluno");
        } else if (perfil.cargo === "professor") {
          setTela("portalProfessor");
        } else {
          setTela("dashboard");
        }

        setLoginEmAndamento(false);
        return;
      } catch (error) {
        console.error("Erro no login online.", error);
        await sairDoSupabase().catch(() => {});
        alert(
          `Não foi possível entrar pelo Supabase.\n\nDetalhe: ${
            error.message || "erro desconhecido"
          }`
        );
        setLoginEmAndamento(false);
        return;
      }
    }

    alert("Usuário ou senha inválidos!");
    setLoginEmAndamento(false);
  }

  async function sairDoSistema() {
    if (supabaseConfigurado) {
      await sairDoSupabase().catch((error) => {
        console.error("Erro ao sair do Supabase.", error);
      });
    }

    setTela("inicio");
    setUsuario("");
    setSenha("");
    setTipoUsuario("");
    setUsuarioLogado(null);
    setModoEditarPerfil(false);
    setMostrarPix(false);
    setMostrarCarteirinhaAluno(false);
    setMostrarHistoricoAluno(false);
    setMostrarDadosPortalAluno(false);
    setMenuAberto(false);
    localStorage.removeItem(STORAGE_KEYS.usuarioLogado);
    localStorage.removeItem("usuario_logado_ariramba");
  }

  async function enviarAlunosParaBancoOnline() {
    if (!supabaseConfigurado) {
      setErroArmazenamento("Supabase ainda não está configurado.");
      return;
    }

    if (!diretorOnlineLogado) {
      setErroArmazenamento(
        "Para enviar alunos ao Supabase, saia e entre com o e-mail do diretor cadastrado no Supabase. O login local admin/1234 salva apenas neste navegador."
      );
      return;
    }

    const alunosLocaisSalvos = recuperarListasSalvas(CHAVES_ALUNOS_LOCAIS)
      .map(normalizarAluno);
    const usuariosLocaisSalvos = recuperarListasSalvas(CHAVES_USUARIOS_LOCAIS);
    const alunosParaEnviar = mesclarAlunosPreservandoLocais(alunos, alunosLocaisSalvos);

    if (alunosParaEnviar.length === 0) {
      setErroArmazenamento("Não há alunos locais para enviar.");
      return;
    }

    try {
      setSincronizacaoOnline("enviando");
      setErroArmazenamento(
        `Enviando ${alunosParaEnviar.length} aluno(s) encontrados neste aparelho para o banco online...`
      );
      const alunosOnline = await migrarAlunosOnline(alunosParaEnviar);
      const alunosOnlineNormalizados = alunosOnline.map(normalizarAluno);
      const alunoOnlinePorIdOriginal = new Map();
      const alunoOnlinePorNome = new Map();
      const acessosMigrados = [];
      const falhasAcesso = [];

      alunosParaEnviar.forEach((alunoOriginal, indice) => {
        const alunoOnline = alunosOnlineNormalizados[indice];

        if (alunoOriginal?.id && alunoOnline?.id) {
          alunoOnlinePorIdOriginal.set(String(alunoOriginal.id), alunoOnline);
        }

        if (alunoOnline?.nome) {
          alunoOnlinePorNome.set(normalizarTextoChave(alunoOnline.nome), alunoOnline);
        }
      });

      for (const usuarioLocal of usuariosLocaisSalvos) {
        if (usuarioLocal?.cargo !== "aluno" || !usuarioLocal.usuario) continue;

        const alunoOnline =
          alunoOnlinePorIdOriginal.get(String(usuarioLocal.alunoId || "")) ||
          alunoOnlinePorNome.get(normalizarTextoChave(usuarioLocal.nome));

        if (!alunoOnline?.id) {
          falhasAcesso.push(usuarioLocal.usuario);
          continue;
        }

        const acessoAluno = criarAcessoAluno({
          id: usuarioLocal.id,
          usuario: usuarioLocal.usuario,
          senha: usuarioLocal.senha ?? "",
          nome: usuarioLocal.nome || alunoOnline.nome,
          alunoId: alunoOnline.id,
          academiaId:
            usuarioLocal.academiaId ||
            alunoOnline.academiaId ||
            usuarioLogado?.academiaId ||
            "",
        });

        try {
          await salvarUsuarioSistemaOnline(acessoAluno);
          acessosMigrados.push(acessoAluno);
        } catch (error) {
          console.error("Erro ao migrar acesso do aluno para o Supabase.", {
            usuario: usuarioLocal.usuario,
            alunoId: alunoOnline.id,
            error,
          });
          falhasAcesso.push(usuarioLocal.usuario);
        }
      }

      setAlunos(alunosOnlineNormalizados);
      setUsuarios((usuariosAtuais) => {
        const usuariosPorLogin = new Map(
          usuariosAtuais.map((usuarioAtual) => [
            normalizarTextoChave(usuarioAtual.usuario),
            usuarioAtual,
          ])
        );

        acessosMigrados.forEach((acessoAluno) => {
          usuariosPorLogin.set(normalizarTextoChave(acessoAluno.usuario), acessoAluno);
        });

        return Array.from(usuariosPorLogin.values());
      });

      if (falhasAcesso.length > 0) {
        setErroArmazenamento(
          `${falhasAcesso.length} acesso(s) de aluno não foram vinculados automaticamente. Confira os nomes/usuários: ${falhasAcesso.join(", ")}`
        );
      } else {
        setErroArmazenamento("");
      }
      alert(
        `${alunosOnline.length} aluno(s) enviados para o banco online.\n${acessosMigrados.length} acesso(s) do portal de aluno sincronizado(s).`
      );
    } catch (error) {
      console.error("Erro ao enviar alunos para o Supabase.", error);
      setErroArmazenamento(
        `Não foi possível enviar os alunos para o banco online: ${error.message || "erro desconhecido"}`
      );
    } finally {
      setSincronizacaoOnline("");
    }
  }

  async function carregarAlunosDoBancoOnline() {
    if (!supabaseConfigurado) {
      setErroArmazenamento("Supabase ainda não está configurado.");
      return;
    }

    if (!diretorOnlineLogado) {
      setErroArmazenamento(
        "Para carregar alunos do Supabase, saia e entre com o e-mail do diretor cadastrado no Supabase."
      );
      return;
    }

    try {
      setSincronizacaoOnline("carregando");
      setErroArmazenamento("Carregando alunos do banco online...");
      const alunosOnlineComDados = await carregarDadosOnlineNoEstado();
      setErroArmazenamento("");
      alert(`${alunosOnlineComDados.length} aluno(s) carregados do banco online.`);
    } catch (error) {
      console.error("Erro ao carregar alunos do Supabase.", error);
      setErroArmazenamento(
        `Não foi possível carregar os alunos do banco online: ${error.message || "erro desconhecido"}`
      );
    } finally {
      setSincronizacaoOnline("");
    }
  }

  function editarAluno(aluno) {
    setAlunoEditando(aluno);
    const usuarioDoAluno = usuarios.find((usuario) => usuario.alunoId === aluno.id);

    setNome(aluno.nome);
    setDataInicio(aluno.dataInicio || "");
    setUsuarioAluno(usuarioDoAluno?.usuario || aluno.usuario || "");
    setSenhaAluno("");
    setTelefone(aluno.telefone);
    setFaixa(aluno.faixa);
    setResponsavel(aluno.responsavel);
    setDataNascimento(aluno.dataNascimento);
    setPeso(aluno.peso);
    setGrau(aluno.grau);
    setTipoSanguineo(aluno.tipoSanguineo);
    setSaude(aluno.saude);
    setMedicamentos(aluno.medicamentos);
    setObservacoes(aluno.observacoes);
    setObservacaoFinanceira(aluno.observacaoFinanceira || "");
    setFoto(aluno.foto);
    setFotoOriginal(aluno.foto);
    setMensalidade(aluno.mensalidade);
    setVencimento(aluno.vencimento);

    setTela("cadastro");
  }

  const alunosFiltrados = alunos.filter((aluno) =>
    aluno.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const alunoDoPortal = alunos.find((aluno) => {
    if (!usuarioLogado) return false;

    const mesmoId =
      usuarioLogado.alunoId &&
      String(aluno.id) === String(usuarioLogado.alunoId);
    const mesmoAuthUser =
      usuarioLogado.origem === "supabase" &&
      usuarioLogado.id &&
      aluno.authUserId &&
      String(aluno.authUserId) === String(usuarioLogado.id);
    const mesmoUsuario =
      !usuarioOnlineLogado &&
      aluno.usuario &&
      usuarioLogado.usuario &&
      aluno.usuario.trim().toLowerCase() === usuarioLogado.usuario.trim().toLowerCase();
    const mesmoNome =
      !usuarioOnlineLogado &&
      aluno.nome &&
      usuarioLogado.nome &&
      aluno.nome.trim().toLowerCase() === usuarioLogado.nome.trim().toLowerCase();

    return mesmoId || mesmoAuthUser || mesmoUsuario || mesmoNome;
  });

  useEffect(() => {
    if (tela === "portalAluno" && alunoDoPortal) {
      setTelefone(alunoDoPortal.telefone || "");
      setResponsavel(alunoDoPortal.responsavel || "");
      setTipoSanguineo(alunoDoPortal.tipoSanguineo || "");
      setSaude(alunoDoPortal.saude || "");
      setMedicamentos(alunoDoPortal.medicamentos || "");
      setObservacoes(alunoDoPortal.observacoes || "");
      setFoto(alunoDoPortal.foto || "");
      setFotoOriginal(alunoDoPortal.foto || "");
    }
  }, [tela, alunoDoPortal]);

  useEffect(() => {
    if (tela !== "portalProfessor" || !usuarioLogado) return;

    const professorAtual = usuarios.find(
      (usuario) =>
        String(usuario.id) === String(usuarioLogado.id) ||
        usuario.usuario?.trim().toLowerCase() === usuarioLogado.usuario?.trim().toLowerCase()
    );

    setTelefone(professorAtual?.telefone || usuarioLogado.telefone || "");
    setEspecialidadeProfessor(
      professorAtual?.especialidadeProfessor || usuarioLogado.especialidadeProfessor || ""
    );
    setGraduacaoProfessor(
      professorAtual?.graduacaoProfessor || usuarioLogado.graduacaoProfessor || ""
    );
    setObservacoes(professorAtual?.observacoes || usuarioLogado.observacoes || "");
    setFoto(professorAtual?.foto || usuarioLogado.foto || "");
  }, [tela, usuarioLogado, usuarios]);

  useEffect(() => {
    if (
      tela !== "portalAluno" ||
      !supabaseConfigurado ||
      !usuarioLogado ||
      (
        (!usuarioLogado?.alunoId || !idAlunoOnlineValido(usuarioLogado.alunoId)) &&
        usuarioLogado?.origem !== "supabase" &&
        !usuarioLogado?.usuario
      )
    ) {
      return;
    }

    let ativo = true;

    async function carregarAlunoCompletoDoPortal() {
      try {
        let usuarioAtual = usuarioLogado;

        if (
          usuarioAtual?.origem === "usuarios_sistema" &&
          (!usuarioAtual.alunoId || !idAlunoOnlineValido(usuarioAtual.alunoId)) &&
          usuarioAtual.usuario
        ) {
          const usuarioOnlineSistema = await buscarUsuarioSistemaOnline(usuarioAtual.usuario);

          if (usuarioOnlineSistema) {
            usuarioAtual = usuarioOnlineSistema;

            if (ativo) {
              setUsuarioLogado(usuarioOnlineSistema);
              setTipoUsuario(usuarioOnlineSistema.cargo);
              setUsuarios((usuariosAtuais) => {
                const usuariosSemDuplicar = usuariosAtuais.filter(
                  (usuarioExistente) =>
                    normalizarTextoChave(usuarioExistente.usuario) !==
                    normalizarTextoChave(usuarioOnlineSistema.usuario)
                );

                return [...usuariosSemDuplicar, usuarioOnlineSistema];
              });
            }
          }
        }

        const alunoOnline = usuarioAtual?.alunoId && idAlunoOnlineValido(usuarioAtual.alunoId)
          ? await obterAlunoOnline(usuarioAtual.alunoId)
          : usuarioAtual?.origem === "supabase" && usuarioAtual.id
            ? await obterAlunoDoUsuarioOnline(usuarioAtual.id)
            : null;

        if (!ativo || !alunoOnline) return;

        const alunoNormalizado = normalizarAluno(alunoOnline);
        setAlunos((alunosAtuais) => {
          const jaExiste = alunosAtuais.some(
            (alunoAtual) => String(alunoAtual.id) === String(alunoNormalizado.id)
          );

          return jaExiste
            ? alunosAtuais.map((alunoAtual) =>
                String(alunoAtual.id) === String(alunoNormalizado.id)
                  ? alunoNormalizado
                  : alunoAtual
              )
            : [...alunosAtuais, alunoNormalizado];
        });
      } catch (error) {
        console.error("Erro ao recuperar aluno do portal online.", error);
      }
    }

    carregarAlunoCompletoDoPortal();

    return () => {
      ativo = false;
    };
  }, [
    tela,
    usuarioLogado,
    usuarioLogado?.id,
    usuarioLogado?.alunoId,
    usuarioLogado?.usuario,
    usuarioLogado?.origem,
  ]);

  function corDaFaixa(faixa) {
    const faixaFormatada = faixa.toLowerCase();

    if (faixaFormatada === "branca") return "#ffffff";
    if (faixaFormatada === "cinza") return "#9ca3af";
    if (faixaFormatada === "amarela") return "#facc15";
    if (faixaFormatada === "laranja") return "#fb923c";
    if (faixaFormatada === "verde") return "#22c55e";
    if (faixaFormatada === "azul") return "#2563eb";
    if (faixaFormatada === "roxa") return "#9333ea";
    if (faixaFormatada === "marrom") return "#78350f";
    if (faixaFormatada === "preta") return "#111827";

    return "#111827";
  }

  function formatarData(data) {
    if (!data) return "Não informado";
    if (data.includes("/")) return data;
    return data.split("-").reverse().join("/");
  }

  function formatarCampoData(valor) {
    const numeros = valor.replace(/\D/g, "").slice(0, 8);

    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 4) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;

    return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
  }

  const hoje = new Date().toLocaleDateString();

  const presencasHoje = alunos.reduce((total, aluno) => {
    const presencasDoAlunoHoje = aluno.presencas.filter(
      (presenca) => presenca.data === hoje
    );

    return total + presencasDoAlunoHoje.length;
  }, 0);

  const totalPagos = alunos.filter(
    (aluno) => verificarVencimento(aluno) === "Pago"
  ).length;

  const totalPendentes = alunos.filter(
    (aluno) => verificarVencimento(aluno) === "Pendente"
  ).length;

  const totalVencidos = alunos.filter(
    (aluno) => verificarVencimento(aluno) === "Vencido"
  ).length;

  const alunosVencidos = alunos.filter(
    (aluno) => verificarVencimento(aluno) === "Vencido"
  );

  const pagamentosAguardando = alunos.filter(
    (aluno) => {
      if (aluno.statusPagamento === "Pago") {
        return false;
      }

      const ultimoPagamento = obterUltimoPagamentoDoAluno(pagamentos, aluno.id);

      if (ultimoPagamento) {
        return ultimoPagamento.status === "Aguardando";
      }

      return aluno.statusPagamento === "Aguardando";
    }
  );

  const avisosPagamentoAguardando = pagamentosAguardando.map((aluno) => ({
    id: `pagamento-${aluno.id}`,
    mensagem: `Pagamento aguardando confirmação: ${aluno.nome}`,
    data: aluno.dataEnvioComprovante || "Agora",
  }));

  const avisosDoPainel = [...avisosPagamentoAguardando, ...avisos];

  const totalArrecadado = alunos.reduce((total, aluno) => {
    return total + aluno.historicoPagamentos.reduce((soma, pagamento) => {
      return soma + pagamento.valor;
    }, 0);
  }, 0);

  const totalPendenteReceber = alunos
    .filter((aluno) => verificarVencimento(aluno) !== "Pago")
    .reduce((total, aluno) => {
      return total + calcularValorComJuros(aluno);
    }, 0);

  const valorEsperadoMes = alunos.reduce((total, aluno) => {
    return total + aluno.mensalidade;
  }, 0);

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function verificarVencimento(aluno) {
    if (!aluno) {
      return "Pendente";
    }

    if (aluno.statusPagamento === "Pago") {
      return "Pago";
    }

    const hoje = new Date().getDate();

    if (hoje > aluno.vencimento) {
      return "Vencido";
    }

    return "Pendente";
  }

  function calcularDiasAtraso(aluno) {
    if (verificarVencimento(aluno) !== "Vencido") {
      return 0;
    }

    const hoje = new Date().getDate();

    return hoje - aluno.vencimento;
  }

  function calcularValorComJuros(aluno) {
    if (verificarVencimento(aluno) !== "Vencido") {
      return aluno.mensalidade;
    }

    const multa = 10;
    const jurosPorDia = 1;

    return aluno.mensalidade + multa + calcularDiasAtraso(aluno) * jurosPorDia;
  }

  function bloquearPresencaSeMensalidadeVencida(aluno) {
    if (verificarVencimento(aluno) !== "Vencido") {
      return false;
    }

    alert(
      `Presenca bloqueada.\n\n${aluno.nome} esta com mensalidade vencida.\nValor atualizado: ${formatarMoeda(calcularValorComJuros(aluno))}`
    );
    return true;
  }

  // if (
  //   (tela === "mensalidades" || tela === "pagamentos" || tela === "relatorios") &&
  //   tipoUsuario !== "diretor"
  //) {
  //   setTela("dashboard");
  // }

  if (tela === "inicio") {
    return (
      <div
        className="telaInicial"
        style={{
          backgroundImage: `
          linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.9)),
          url(${capa})
        `,
        }}
      >
        <div className="conteudoInicial">
          <h1>SIMÃO TAVARES TOP TEAM</h1>

          <h3>DISCIPLINA • RESPEITO • EVOLUÇÃO</h3>

          <p>Sistema de gestão para sua academia</p>

          <button onClick={() => setTela("login")}>
            ENTRAR NO SISTEMA
          </button>
        </div>
      </div>
    );
  }
  if (tela === "login") {
    return (
      <div className="telaLogin">
        <div className="caixaLogin">
          <img src={logo} alt={`Logo ${APP_NAME}`} />
          <h1>Acesso ao Sistema</h1>

          <input
            type="text"
            placeholder="Usuário"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          <button
            onClick={fazerLogin}
            disabled={loginEmAndamento}
          >
            {loginEmAndamento ? "Entrando..." : "Entrar no Sistema"}
          </button>
        </div>
      </div>
    );
  }

  if (tela === "cadastroProfessor") {
    return (
      <div className="layoutSistema">
        {menuAberto && (
          <Menu
            setTela={setTela}
            tipoUsuario={tipoUsuario}
            setMenuAberto={setMenuAberto}
          />
        )}

        <main className="conteudoSistema">
          <h1>Cadastrar Professor</h1>

          <div className="formulario">

            <input
              type="text"
              placeholder="Nome do professor"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <input
              type="text"
              placeholder="Usuário"
              value={usuarioAluno}
              onChange={(e) => setUsuarioAluno(e.target.value)}
            />

            <input
              type="password"
              placeholder="Senha"
              value={senhaAluno}
              onChange={(e) => setSenhaAluno(e.target.value)}
            />

            <button
              onClick={() => {
                const novoProfessor = {
                  id: Date.now(),
                  usuario: usuarioAluno,
                  senha: senhaAluno,
                  cargo: "professor",
                  nome: nome,
                };

                setUsuarios([...usuarios, novoProfessor]);

                alert("Professor cadastrado com sucesso 😎🥋");

                limparFormulario();

                setTela("dashboard");
              }}
            >
              Salvar Professor
            </button>

            <button
              className="botaoVoltar"
              onClick={() => setTela("dashboard")}
            >
              Voltar
            </button>

          </div>
        </main>
      </div>
    );
  }

  if (tela === "cadastro") {
    return (
      <div className="layoutSistema">
        {menuAberto && (
          <Menu
            setTela={setTela}
            tipoUsuario={tipoUsuario}
            setMenuAberto={setMenuAberto}
          />
        )}

        <main className="conteudoSistema">
          <h1>Cadastrar Aluno</h1>

          <div className="formulario">

            <input
              type="text"
              placeholder="Nome do aluno"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <input
              type="text"
              placeholder="Peso"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
            />

            <input
              type="text"
              inputMode="numeric"
              placeholder="Nascimento (dd/mm/aaaa)"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(formatarCampoData(e.target.value))}
            />

            <input
              type="text"
              placeholder="Faixa"
              value={faixa}
              onChange={(e) => setFaixa(e.target.value)}
            />

            <input
              type="text"
              placeholder="Grau"
              value={grau}
              onChange={(e) => setGrau(e.target.value)}
            />

            <input
              type="text"
              inputMode="numeric"
              placeholder="Inicio (dd/mm/aaaa)"
              value={dataInicio}
              onChange={(e) => setDataInicio(formatarCampoData(e.target.value))}
            />

            <input
              type="email"
              placeholder="E-mail do aluno"
              value={usuarioAluno}
              autoComplete="off"
              onChange={(e) => setUsuarioAluno(e.target.value)}
            />

            <input
              type="password"
              placeholder="Senha inicial"
              value={senhaAluno}
              autoComplete="new-password"
              onChange={(e) => setSenhaAluno(e.target.value)}
            />

            <input
              type="text"
              placeholder="Telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />

            <input
              type="text"
              placeholder="Responsável"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />

            <input
              type="text"
              placeholder="Tipo sanguíneo"
              value={tipoSanguineo}
              onChange={(e) => setTipoSanguineo(e.target.value)}
            />

            <textarea
              placeholder="Problemas de saúde"
              value={saude}
              onChange={(e) => setSaude(e.target.value)}
            />

            <textarea
              placeholder="Medicamentos"
              value={medicamentos}
              onChange={(e) => setMedicamentos(e.target.value)}
            />

            <textarea
              placeholder="Observações"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />

            <input
              type="number"
              placeholder="Mensalidade"
              value={mensalidade}
              onChange={(e) => setMensalidade(e.target.value)}
            />

            <input
              type="number"
              placeholder="Dia do vencimento"
              value={vencimento}
              onChange={(e) => setVencimento(e.target.value)}
            />

            <FotoAlunoInputs
              foto={foto}
              setFoto={setFoto}
              setFotoOriginal={setFotoOriginal}
              idBase="foto-cadastro-aluno"
            />

            {fotoOriginal && (
              <div className="areaPreviewFoto">
                <FotoAlunoEditor
                  key={fotoOriginal}
                  fotoOriginal={fotoOriginal}
                  setFoto={setFoto}
                />
              </div>
            )}

            <button onClick={salvarAluno} disabled={salvandoAluno}>
              {salvandoAluno ? "Salvando..." : alunoEditando ? "Atualizar Aluno" : "Salvar Aluno"}
            </button>

            <button
              className="botaoVoltar"
              onClick={() => {
                limparFormulario();
                setTela("dashboard");
              }}
            >
              Voltar
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (tela === "lista") {
    return (
      <div className="layoutSistema">
        {menuAberto && (
          <Menu
            setTela={setTela}
            tipoUsuario={tipoUsuario}
            setMenuAberto={setMenuAberto}
          />
        )}

        <main className="conteudoSistema">
          <h1>Lista de Alunos</h1>

          <input
            type="text"
            placeholder="Buscar aluno..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="inputBusca"
          />

          <div className="lista">
            {alunosFiltrados.length === 0 ? (
              <p>Nenhum aluno encontrado.</p>
            ) : (
              alunosFiltrados.map((aluno) => (
                <CardAluno key={aluno.id}>

                  <div
                    className="fotoAlunoCard"
                    data-iniciais={obterIniciaisAluno(aluno.nome)}
                  >
                    {obterFotoAluno(aluno) ? (
                      <img
                        src={obterFotoAluno(aluno)}
                        alt={aluno.nome}
                        className="fotoAlunoLista"
                        onError={(evento) => {
                          evento.currentTarget.style.display = "none";
                          evento.currentTarget
                            .closest(".fotoAlunoCard")
                            ?.classList.add("semFoto");
                        }}
                      />
                    ) : (
                      <span>{obterIniciaisAluno(aluno.nome)}</span>
                    )}
                  </div>

                  <h2>{aluno.nome}</h2>
                  <p>Telefone: {aluno.telefone}</p>
                  <p>Faixa: {aluno.faixa}</p>

                  <button
                    type="button"
                    className="botaoDadosCompletos"
                    onClick={() =>
                      setAlunoDadosAberto((idAtual) =>
                        String(idAtual) === String(aluno.id) ? null : aluno.id
                      )
                    }
                  >
                    {String(alunoDadosAberto) === String(aluno.id)
                      ? "Ocultar dados completos"
                      : "Ver dados completos"}
                  </button>

                  {String(alunoDadosAberto) === String(aluno.id) && (
                    <div className="dadosCompletosAluno">
                      <p>Nascimento: {formatarData(aluno.dataNascimento) || "Nao informado"}</p>
                      <p>Peso: {aluno.peso || "Nao informado"}</p>
                      <p>Grau: {aluno.grau || "Nao informado"}</p>
                      <p>Inicio: {formatarData(aluno.dataInicio) || "Nao informado"}</p>
                      <p>Responsavel: {aluno.responsavel || "Nao informado"}</p>
                      <p>Tipo sanguineo: {aluno.tipoSanguineo || "Nao informado"}</p>
                      <p>Saude: {aluno.saude || "Nao informado"}</p>
                      <p>Medicamentos: {aluno.medicamentos || "Nao informado"}</p>
                      <p>Observacoes: {aluno.observacoes || "Nao informado"}</p>
                      {tipoUsuario === "diretor" && (
                        <>
                          <p>Vencimento: dia {aluno.vencimento || "--"}</p>
                          <p>Status do pagamento: {verificarVencimento(aluno)}</p>
                          <p>Presencas registradas: {aluno.presencas?.length || 0}</p>
                        </>
                      )}
                    </div>
                  )}

                  <p>Mensalidade: {formatarMoeda(aluno.mensalidade)}</p>
                  <p>
                    Último pagamento:{" "}
                    {aluno.ultimoPagamento || "Nenhum pagamento registrado"}
                  </p>

                  <p
                    style={{
                      color:
                        verificarVencimento(aluno) === "Pago"
                          ? "#22c55e"
                          : verificarVencimento(aluno) === "Vencido"
                            ? "#f97316"
                            : "#ef4444",
                      fontWeight: "bold",
                    }}
                  >
                    {verificarVencimento(aluno) === "Pago"
                      ? "✅ Pago"
                      : "❌ Pendente"}
                  </p>
                  {verificarVencimento(aluno) !== "Pago" ? (
                    <Botao
                      tipo="success"
                      onClick={() => marcarComoPago(aluno.id)}
                    >
                      Confirmar Pagamento
                    </Botao>
                  ) : (
                    <button onClick={() => marcarComoPendente(aluno.id)}>
                      Cancelar Confirmação
                    </button>
                  )}
                  <button onClick={() => abrirCarteirinha(aluno)}>
                    Gerar Carteirinha
                  </button>

                  <button onClick={() => editarAluno(aluno)}>
                    Editar Aluno
                  </button>

                  {tipoUsuario === "diretor" && (
                    <button
                      onClick={() => resetarSenhaAluno(aluno)}
                    >
                      Resetar Senha
                    </button>
                  )}

                  {diretorOnlineLogado && !aluno.authUserId && !aluno.auth_user_id && (
                    <button onClick={() => ativarAcessoPortalAluno(aluno)}>
                      Ativar acesso ao Portal
                    </button>
                  )}

                  {diretorOnlineLogado && (aluno.authUserId || aluno.auth_user_id) && (
                    <button onClick={() => corrigirEmailPortalAluno(aluno)}>
                      Corrigir e-mail do Portal
                    </button>
                  )}

                  <Botao
                    tipo="danger"
                    onClick={() => removerAluno(aluno.id)}
                  >
                    Remover Aluno
                  </Botao>

                  <Botao
                    tipo="success"
                    onClick={() => registrarPresenca(aluno.id)}
                  >
                    Registrar Presença
                  </Botao>
                </CardAluno>
              ))
            )}

            {alunoCarteirinha && (
              <div className="areaCarteirinha">
                <div className="carteirinha">
                  <div className="ladoFoto">
                    <img src={logo} alt="Logo" className="logoCarteirinha" />

                    {alunoCarteirinha.foto && (
                      <img
                        src={alunoCarteirinha.foto}
                        alt={alunoCarteirinha.nome}
                        className="fotoCarteirinha"
                      />
                    )}

                    <p style={{ color: "white" }}>TESTE QR</p>

                    <div className="faixaMini">
                      <div
                        style={{
                          width: "70%",
                          background: corDaFaixa(alunoCarteirinha.faixa),
                        }}
                      />

                      <div
                        style={{
                          width: "30%",
                          background:
                            alunoCarteirinha.faixa.toLowerCase() === "preta"
                              ? "#dc2626"
                              : "#111827",

                          display: "flex",
                          justifyContent: "space-evenly",
                          alignItems: "center",
                        }}
                      >
                        {alunoCarteirinha.grau && (
                          <>
                            <div
                              style={{
                                width: "4px",
                                height: "100%",
                                background: "white",
                              }}
                            />

                            <div
                              style={{
                                width: "4px",
                                height: "100%",
                                background: "white",
                              }}
                            />

                            <div
                              style={{
                                width: "4px",
                                height: "100%",
                                background: "white",
                              }}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="infoCarteirinha">
                    <h2>{alunoCarteirinha.nome}</h2>
                    <p>Faixa: {alunoCarteirinha.faixa}</p>
                    {alunoCarteirinha.grau && (
                      <p>Grau: {alunoCarteirinha.grau}</p>
                    )}

                    <p>Nascimento: {formatarData(alunoCarteirinha.dataNascimento)}</p>
                    <p>Carteira emitida: {new Date().getFullYear()}</p>
                    <p>Renovação: Próxima troca de faixa</p>
                    <p>ID: {alunoCarteirinha.id}</p>
                  </div>

                  <div className="qrcodeFake">
                    <QRCodeCanvas
                      value={`aluno-${alunoCarteirinha.id}`}
                      size={80}
                    />
                  </div>
                </div>

                <button onClick={() => setAlunoCarteirinha(null)}>Fechar</button>
              </div>
            )}
          </div>
          <button
            className="botaoVoltar"
            onClick={() => {
              setTela("dashboard");
              setMenuAberto(false);
            }}
          >
            Voltar
          </button>

        </main>
      </div>
    );
  }

  if (tela === "mensalidades") {
    return (
      <div className="layoutSistema">
        {menuAberto && (
          <Menu
            setTela={setTela}
            tipoUsuario={tipoUsuario}
            setMenuAberto={setMenuAberto}
          />
        )}

        <main className="conteudoSistema">
          <h1>Controle de Mensalidades</h1>

          <div className="estatisticas">
            <div className="cardEstatistica pagos">
              <h3>Pagos</h3>
              <h2>{totalPagos}</h2>
            </div>

            <div className="cardEstatistica pendentes">
              <h3>Pendentes</h3>
              <h2>{totalPendentes}</h2>
            </div>

            <div className="cardEstatistica vencidas">
              <h3>Mensalidades Vencidas</h3>
              <h2>{totalVencidos}</h2>
            </div>

            <div className="cardEstatistica">
              <h3>Total Arrecadado</h3>
              <h2>{formatarMoeda(totalArrecadado)}</h2>
            </div>

            <div className="cardEstatistica">
              <h3>Total a Receber</h3>
              <h2>{formatarMoeda(totalPendenteReceber)}</h2>
            </div>

            <div className="cardEstatistica">
              <h3>Previsão do Mês</h3>
              <h2>{formatarMoeda(valorEsperadoMes)}</h2>
            </div>

          </div>

          <h2>Alunos Inadimplentes</h2>

          <div className="lista">
            {alunosVencidos.length === 0 ? (
              <p>Nenhum aluno vencido no momento ✅</p>
            ) : (
              alunosVencidos.map((aluno) => (
                <div className="cardAluno" key={aluno.id}>
                  <h2>{aluno.nome}</h2>
                  <p>Vencimento: dia {aluno.vencimento}</p>
                  <p style={{ color: "#f97316", fontWeight: "bold" }}>
                    Dias em atraso: {calcularDiasAtraso(aluno)}
                  </p>
                  <p>Mensalidade: {formatarMoeda(aluno.mensalidade)}</p>
                  <p style={{ color: "#f97316", fontWeight: "bold" }}>
                    Valor atualizado: {formatarMoeda(calcularValorComJuros(aluno))}
                  </p>

                  <button onClick={() => marcarComoPago(aluno.id)}>
                    Confirmar Pagamento
                  </button>
                </div>
              ))
            )}
          </div>

          <button
            className="botaoVoltar"
            onClick={() => {
              setTela("dashboard");
              setMenuAberto(false);
            }}
          >
            Voltar
          </button>
        </main>
      </div>
    );
  }

  if (tela === "pagamentos") {
    return (
      <div className="layoutSistema">

        {menuAberto && (
          <>
            <div
              className="fundoMenuMobile"
              onClick={() => {
                setMenuAberto(false);
                document.body.style.overflow = "auto";
              }}
            ></div>

            <Menu
              setTela={setTela}
              tipoUsuario={tipoUsuario}
              setMenuAberto={setMenuAberto}
            />
          </>
        )}

        <main className="conteudoSistema">
          <button
            className="botaoMenuMobile"
            onClick={() => setMenuAberto(!menuAberto)}
          >
            ☰
          </button>
          <TituloTela titulo="Controle de Pagamentos" />
          <div className="cardEstatistica">
            <h3>⏳ Aguardando Confirmação</h3>

            <h2>{pagamentosAguardando.length}</h2>
          </div>

          <div className="lista">
            {alunos.map((aluno) => (
              <CardAluno key={aluno.id}>
                <h2>{aluno.nome}</h2>

                <p>Mensalidade: {formatarMoeda(aluno.mensalidade)}</p>
                <p>Vencimento: dia {aluno.vencimento || "não informado"}</p>

                {verificarVencimento(aluno) === "Vencido" && (
                  <p style={{ color: "#f97316", fontWeight: "bold" }}>
                    Valor com multa e juros: {formatarMoeda(calcularValorComJuros(aluno))}
                  </p>
                )}

                <p>
                  Último pagamento:{" "}
                  {aluno.ultimoPagamento || "Nenhum pagamento"}
                </p>

                {(aluno.comprovantePagamento || aluno.statusPagamento === "Aguardando") && (
                  <div className="cardAluno">
                    <div className="comprovantePreview">
                      <p>📎 Comprovante enviado:</p>

                      {aluno.comprovantePagamento ? (
                        comprovanteEhImagem(aluno.comprovantePagamento) ? (
                          <img
                            src={aluno.comprovantePagamento}
                            alt="Comprovante"
                            className="imagemComprovante"
                            onClick={() =>
                              setImagemComprovante(aluno.comprovantePagamento)
                            }
                          />
                        ) : (
                          <button
                            type="button"
                            className="arquivoComprovante"
                            onClick={() =>
                              abrirArquivoComprovante(aluno.comprovantePagamento)
                            }
                          >
                            Abrir comprovante
                          </button>
                        )
                      ) : (
                        <p className="avisoSemComprovante">
                          Pagamento informado, mas nenhum comprovante foi anexado.
                        </p>
                      )}
                    </div>

                    <p>
                      Data do envio: {aluno.dataEnvioComprovante}
                    </p>
                  </div>
                )}

                <div className="historicoPagamentos">
                  <h4>Histórico de Pagamentos</h4>

                  {aluno.historicoPagamentos && aluno.historicoPagamentos.length > 0 ? (
                    aluno.historicoPagamentos.map((pagamento, index) => (
                      <p key={index}>
                        📅 {pagamento.data} - {formatarMoeda(pagamento.valor)}
                      </p>
                    ))
                  ) : (
                    <p>Nenhum pagamento no histórico</p>
                  )}
                </div>

                <p
                  style={{
                    color:
                      verificarVencimento(aluno) !== "Pago" &&
                      aluno.statusPagamento === "Aguardando"
                        ? "#facc15"

                        : verificarVencimento(aluno) === "Pago"
                          ? "#22c55e"

                          : verificarVencimento(aluno) === "Vencido"
                            ? "#f97316"

                            : "#ef4444",

                    fontWeight: "bold",
                    fontSize: "18px",
                  }}
                >
                  {verificarVencimento(aluno) !== "Pago" &&
                    aluno.statusPagamento === "Aguardando" &&
                    "⏳ Aguardando confirmação"}

                  {verificarVencimento(aluno) === "Pago" &&
                    "✅ Pago"}

                  {verificarVencimento(aluno) === "Pendente" &&
                    aluno.statusPagamento !== "Aguardando" &&
                    "❌ Pendente"}

                  {verificarVencimento(aluno) === "Vencido" &&
                    "⚠️ Vencido"}
                </p>

                {verificarVencimento(aluno) !== "Pago" ? (
                  <button onClick={() => marcarComoPago(aluno.id)}>
                    Confirmar Pagamento
                  </button>
                ) : (
                  <button onClick={() => marcarComoPendente(aluno.id)}>
                    Cancelar Confirmação
                  </button>
                )}

                <button onClick={() => gerarReciboPDF(aluno)}>
                  Gerar Recibo PDF
                </button>

                <button onClick={() => rejeitarPagamento(aluno.id)}>
                  Rejeitar Comprovante
                </button>

              </CardAluno>
            ))}
          </div>

          <button onClick={() => setTela("dashboard")}>
            Voltar
          </button>
        </main>
      </div>
    );
  }

  if (tela === "relatorios") {
    return (
      <div className="layoutSistema">
        {menuAberto && (
          <>
            <div
              className="fundoMenuMobile"
              onClick={() => {
                setMenuAberto(false);
                document.body.style.overflow = "auto";
              }}
            ></div>

            <Menu
              setTela={setTela}
              tipoUsuario={tipoUsuario}
              setMenuAberto={setMenuAberto}
            />
          </>
        )}


        <main className="conteudoSistema">
          <h1>Relatório Geral</h1>

          <div className="estatisticas">
            <div className="cardEstatistica">
              <span className="iconeCard">🥋</span>

              <h3>Total de Alunos</h3>

              <h2>{alunos.length}</h2>
            </div>

            <div className="cardEstatistica">
              <h3>Presenças Hoje</h3>
              <h2>{presencasHoje}</h2>
            </div>

            <div className="cardEstatistica">
              <h3>Pagos</h3>
              <h2>{totalPagos}</h2>
            </div>

            <div className="cardEstatistica">
              <h3>Pendentes</h3>
              <h2>{totalPendentes}</h2>
            </div>
          </div>

          <div className="lista">
            {alunos.map((aluno) => (
              <CardAluno key={aluno.id}>
                <h2>{aluno.nome}</h2>

                <p>Faixa: {aluno.faixa}</p>

                <p>
                  Status:
                  {" "}
                  {verificarVencimento(aluno) === "Pago"
                    ? "✅ Pago"
                    : "❌ Pendente"}
                </p>

                <p>
                  Último pagamento:
                  {" "}
                  {aluno.ultimoPagamento || "Nenhum"}
                </p>

                <p>
                  Presenças:
                  {" "}
                  {aluno.presencas.length}
                </p>
              </CardAluno>
            ))}
          </div>

          <button onClick={gerarRelatorioFinanceiroPDF}>
            Gerar Relatório Financeiro PDF
          </button>

          <button onClick={() => setTela("dashboard")}>
            Voltar
          </button>
        </main>
      </div>
    );
  }

  if (tela === "historico") {
    return (
      <div className="layoutSistema">
        {menuAberto && (
          <Menu
            setTela={setTela}
            tipoUsuario={tipoUsuario}
            setMenuAberto={setMenuAberto}
          />
        )}

        <main className="conteudoSistema">
          <h1>Histórico de Presenças</h1>

          {presencas.length === 0 ? (
            <p>Nenhuma presença registrada.</p>
          ) : (
            <div className="lista">
              {[...presencas]
                .reverse()
                .map((presenca, index) => (
                  <div className="cardAluno" key={index}>
                    {presenca.foto && (
                      <img
                        src={presenca.foto}
                        alt={presenca.nome}
                        className="fotoAlunoLista"
                      />
                    )}
                    <h2>{presenca.nome}</h2>
                    <p>Data: {presenca.data}</p>
                    <p>Hora: {presenca.hora}</p>
                  </div>
                ))}
            </div>
          )}

          <button
            onClick={() => {
              const confirmar = confirm(
                "Deseja apagar todo o histórico de presenças?"
              );

              if (!confirmar) return;

              if (supabaseConfigurado) {
                alert("O historico online nao pode ser apagado apenas neste dispositivo.");
                return;
              }

              setPresencas([]);
              setAlunos((prev) =>
                prev.map((aluno) => ({
                  ...aluno,
                  presencas: [],
                }))
              );
              localStorage.removeItem(STORAGE_KEYS.presencas);

              alert("Histórico apagado com sucesso 🗑️");
            }}
          >
            Limpar Histórico
          </button>

          <button onClick={() => setTela("dashboard")}>
            Voltar
          </button>
        </main>
      </div>
    );
  }

  if (tela === "portalProfessor") {
    return (
      <div className="layoutSistema">

        {menuAberto && (
          <>
            <div
              className="fundoMenuMobile"
              onClick={() => {
                setMenuAberto(false);
                document.body.style.overflow = "auto";
              }}
            ></div>

            <Menu
              setTela={setTela}
              tipoUsuario={tipoUsuario}
              setMenuAberto={setMenuAberto}
            />
          </>
        )}

        <main className="conteudoSistema">

          <h1>Portal do Professor</h1>

          <div className="cardAluno">

            <h2>{usuarioLogado?.nome}</h2>

            {foto && (
              <img
                src={foto}
                alt="Professor"
                className="fotoAlunoLista"
              />
            )}

            <p>🥋 Graduação: {graduacaoProfessor || "Não informado"}</p>

            <p>🎯 Especialidade: {especialidadeProfessor || "Não informado"}</p>

            <p>Área do professor 🥋</p>

            <div className="estatisticas">
              <CardEstatistica
                titulo="Total de Alunos"
                valor={alunos.length}
              />

              <CardEstatistica
                titulo="Presenças Hoje"
                valor={presencasHoje}
              />

              <CardEstatistica
                titulo="Pendentes"
                valor={totalPendentes}
              />
            </div>

            <button onClick={() => setTela("lista")}>
              Ver Alunos
            </button>

            <button onClick={() => setTela("scanner")}>
              Registrar Presença por QR Code
            </button>

            <button onClick={() => setModoEditarPerfil(!modoEditarPerfil)}>
              {modoEditarPerfil
                ? "Cancelar edição"
                : "Completar meu cadastro"}
            </button>

            <button
              onClick={sairDoSistema}
            >
              Sair
            </button>

            {modoEditarPerfil && (
              <div className="formulario">

                <input
                  type="text"
                  placeholder="Telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />

                <input
                  type="text"
                  placeholder="Especialidade"
                  value={especialidadeProfessor}
                  onChange={(e) =>
                    setEspecialidadeProfessor(e.target.value)
                  }
                />

                <input
                  type="text"
                  placeholder="Graduação"
                  value={graduacaoProfessor}
                  onChange={(e) =>
                    setGraduacaoProfessor(e.target.value)
                  }
                />

                <input
                  type="password"
                  placeholder="Nova senha"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                />

                <input
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />

                <textarea
                  placeholder="Observações"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const arquivo = e.target.files[0];

                    if (arquivo) {
                      const leitor = new FileReader();

                      leitor.onloadend = () => {
                        setFoto(leitor.result);
                      };

                      leitor.readAsDataURL(arquivo);
                    }
                  }}
                />

                {foto && (
                  <img
                    src={foto}
                    alt="Professor"
                    className="previewFoto"
                  />
                )}

                <button onClick={atualizarPerfilProfessor}>
                  Salvar Cadastro
                </button>

              </div>
            )}

          </div>

        </main>

      </div>
    );
  }

  if (tela === "portalAluno") {

    return (
      <div className="layoutSistema">

        {menuAberto && (
          <>
            <div
              className="fundoMenuMobile"
              onClick={() => {
                setMenuAberto(false);
                document.body.style.overflow = "auto";
              }}
            ></div>

            <Menu
              setTela={setTela}
              tipoUsuario={tipoUsuario}
              setMenuAberto={setMenuAberto}
            />
          </>
        )}

        <main className="conteudoSistema">

          <h1>Portal do Aluno</h1>

          <div className="cardAluno">

            {alunoDoPortal?.foto && (
              <img
                src={alunoDoPortal.foto}
                alt={alunoDoPortal.nome}
                className="fotoAlunoLista"
              />
            )}

            <h2>{usuarioLogado?.nome}</h2>

            <p>Resumo financeiro e dados de acesso do aluno.</p>

            <button
              type="button"
              className="botaoDadosCompletos"
              onClick={() => setMostrarDadosPortalAluno((mostrar) => !mostrar)}
            >
              {mostrarDadosPortalAluno ? "Ocultar meus dados" : "Ver meus dados"}
            </button>

            {mostrarDadosPortalAluno && (
              <div className="dadosCompletosAluno">
                <p>Nome: {alunoDoPortal?.nome || usuarioLogado?.nome || "Nao informado"}</p>
                <p>Nascimento: {formatarData(alunoDoPortal?.dataNascimento) || "Nao informado"}</p>
                <p>Telefone: {alunoDoPortal?.telefone || "Nao informado"}</p>
                <p>Peso: {alunoDoPortal?.peso || "Nao informado"}</p>
                <p>Faixa: {alunoDoPortal?.faixa || "Nao informado"}</p>
                <p>Grau: {alunoDoPortal?.grau || "Nao informado"}</p>
                <p>Inicio: {formatarData(alunoDoPortal?.dataInicio) || "Nao informado"}</p>
                <p>Responsavel: {alunoDoPortal?.responsavel || "Nao informado"}</p>
                <p>Tipo sanguineo: {alunoDoPortal?.tipoSanguineo || "Nao informado"}</p>
                <p>Saude: {alunoDoPortal?.saude || "Nao informado"}</p>
                <p>Medicamentos: {alunoDoPortal?.medicamentos || "Nao informado"}</p>
                <p>Observacoes: {alunoDoPortal?.observacoes || "Nao informado"}</p>
              </div>
            )}

            <p
              style={{
                color:
                  verificarVencimento(alunoDoPortal) !== "Pago" &&
                  alunoDoPortal?.statusPagamento === "Aguardando"
                    ? "#facc15"

                    : verificarVencimento(alunoDoPortal) === "Pago"
                      ? "#22c55e"

                      : verificarVencimento(alunoDoPortal) === "Vencido"
                        ? "#f97316"

                        : "#ef4444",

                fontWeight: "bold",
                fontSize: "18px",
              }}
            >
              Status da mensalidade:{" "}

              {verificarVencimento(alunoDoPortal) !== "Pago" &&
              alunoDoPortal?.statusPagamento === "Aguardando"
                ? "⏳ Aguardando confirmação"

                : verificarVencimento(alunoDoPortal) === "Pago"
                  ? "✅ Pago"

                  : verificarVencimento(alunoDoPortal) === "Vencido"
                    ? "⚠️ Vencido"

                    : "❌ Pendente"}
            </p>

            <p>
              Vencimento: dia {alunoDoPortal?.vencimento || "--"}
            </p>

            <p>
              Valor: {formatarMoeda(alunoDoPortal?.mensalidade)}
            </p>

            {verificarVencimento(alunoDoPortal) === "Vencido" && (
              <div className="cardAluno">
                <h3>Mensalidade vencida</h3>
                <p>
                  Valor atualizado:{" "}
                  {formatarMoeda(calcularValorComJuros(alunoDoPortal))}
                </p>
                <p>
                  Dias em atraso: {calcularDiasAtraso(alunoDoPortal)}
                </p>
              </div>
            )}

            {verificarVencimento(alunoDoPortal) !== "Pago" &&
              alunoDoPortal?.statusPagamento === "Aguardando" && (
              <div className="cardAluno">
                <h3>⏳ Pagamento enviado</h3>

                <p>Seu comprovante foi enviado para análise.</p>

                <p>Aguarde a confirmação da secretaria.</p>
              </div>
            )}

            <p hidden>Em breve:
              PIX, mensalidades, histórico e carteirinha.
            </p>

            <button onClick={() => setModoEditarPerfil(!modoEditarPerfil)}>
              {modoEditarPerfil
                ? "Cancelar edição"
                : "Completar meu cadastro"}
            </button>

            {modoEditarPerfil && (
              <div className="formulario">

                <input
                  type="text"
                  placeholder="Telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />

                <input
                  type="text"
                  placeholder="Responsável"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                />

                <input
                  type="text"
                  placeholder="Tipo sanguíneo"
                  value={tipoSanguineo}
                  onChange={(e) => setTipoSanguineo(e.target.value)}
                />

                <textarea
                  placeholder="Problemas de saúde"
                  value={saude}
                  onChange={(e) => setSaude(e.target.value)}
                />

                <textarea
                  placeholder="Medicamentos"
                  value={medicamentos}
                  onChange={(e) => setMedicamentos(e.target.value)}
                />

                <textarea
                  placeholder="Observações"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />

                <input
                  type="password"
                  placeholder="Nova senha"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                />

                <input
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />

                <FotoAlunoInputs
                  foto={foto}
                  setFoto={setFoto}
                  setFotoOriginal={setFotoOriginal}
                  idBase="foto-portal-aluno"
                />

                {fotoOriginal && (
                  <FotoAlunoEditor
                    key={fotoOriginal}
                    fotoOriginal={fotoOriginal}
                    setFoto={setFoto}
                  />
                )}

                <button onClick={atualizarPerfilAluno}>
                  Salvar meu cadastro
                </button>

              </div>
            )}

            <button onClick={() => setMostrarPix(!mostrarPix)}>
              {mostrarPix ? "Ocultar PIX" : "Ver PIX"}
            </button>

            {mostrarPix && (
              <div className="cardAluno">
                <h3>Pagamento via PIX</h3>

                <QRCodeCanvas
                  value={`PIX - ${usuarioLogado?.nome} - ${formatarMoeda(alunoDoPortal?.mensalidade)}`}
                />

                <p>Chave PIX: 92985631757</p>
                <p>
                  Valor: {formatarMoeda(alunoDoPortal?.mensalidade)}
                </p>
                <p>Beneficiário: Simão Tavares Top Team</p>
              </div>
            )}

            {alunoDoPortal?.statusPagamento !== "Aguardando" && (
              <div className="cardAluno areaComprovanteAluno">
                <h3>Enviar comprovante</h3>
                <p>
                  Anexe a foto ou PDF do pagamento. O diretor vai conferir a
                  data do comprovante antes de confirmar.
                </p>

                <label className="botaoArquivoComprovante">
                  Selecionar comprovante
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={(e) => {
                      const arquivo = e.target.files[0];

                      if (arquivo) {
                        if (supabaseConfigurado) {
                          informarPagamento(alunoDoPortal.id, arquivo);
                          e.target.value = "";
                          return;
                        }

                        const leitor = new FileReader();

                        leitor.onloadend = () => {
                          informarPagamento(
                            alunoDoPortal.id,
                            leitor.result
                          );
                        };

                        leitor.readAsDataURL(arquivo);
                      }
                    }}
                  />
                </label>

              </div>
            )}

            <button onClick={() => setMostrarCarteirinhaAluno(!mostrarCarteirinhaAluno)}>
              {mostrarCarteirinhaAluno
                ? "Ocultar Carteirinha"
                : "Minha Carteirinha"}
            </button>

            {mostrarCarteirinhaAluno && (
              <div className="cardAluno">

                <h3>Carteirinha Digital</h3>
                {alunoDoPortal?.foto && (
                  <img
                    src={alunoDoPortal.foto}
                    alt={alunoDoPortal.nome}
                    className="fotoAlunoLista"
                  />
                )}

                <h2>{usuarioLogado?.nome}</h2>

                <p>Aluno Simão Tavares Top Team</p>
                <p>Faixa: {alunoDoPortal?.faixa}</p>
                <p
                  style={{
                    color:
                      verificarVencimento(alunoDoPortal) === "Pago"
                        ? "#22c55e"
                        : verificarVencimento(alunoDoPortal) === "Vencido"
                          ? "#f97316"
                          : "#ef4444",

                    fontWeight: "bold",
                  }}
                >
                  Status:
                  {" "}
                  {verificarVencimento(alunoDoPortal) === "Pago"
                    ? "✅ Ativo"
                    : verificarVencimento(alunoDoPortal) === "Vencido"
                      ? "⚠️ Vencido"
                      : "❌ Pendente"}
                </p>

                <p>Grau: {alunoDoPortal?.grau || "Não informado"}</p>
                <p>
                  Validade:
                  {" "}
                  {new Date().getFullYear() + 1}
                </p>

                <p>
                  Vencimento: dia {alunoDoPortal?.vencimento || "--"}
                </p>

                <div id="qrCarteirinhaAluno">
                  <QRCodeCanvas
                    value={`aluno-${alunoDoPortal?.id}`}
                    size={120}
                  />
                </div>

                <button onClick={() => baixarCarteirinhaPDF(alunoDoPortal)}>
                  Baixar Carteirinha PDF
                </button>

              </div>
            )}

            <button onClick={() => setMostrarHistoricoAluno(!mostrarHistoricoAluno)}>
              {mostrarHistoricoAluno ? "Ocultar Histórico" : "Histórico Financeiro"}
            </button>

            {mostrarHistoricoAluno && (
              <div className="cardAluno">

                <h3>Histórico Financeiro</h3>

                {alunoDoPortal?.historicoPagamentos?.length > 0 ? (
                  alunoDoPortal.historicoPagamentos.map((pagamento, index) => (
                    <p key={index}>
                      📅 {pagamento.data} - {formatarMoeda(pagamento.valor)}
                    </p>
                  ))
                ) : (
                  <p>Nenhum pagamento registrado</p>
                )}

              </div>
            )}

            <button
              type="button"
              className="botaoVoltar"
              onClick={voltarResumoPortalAluno}
            >
              Voltar
            </button>

            <button
              onClick={sairDoSistema}
            >
              Sair
            </button>

          </div>

        </main>

      </div>
    );
  }

  if (tela === "scanner") {
    return (
      <div className="layoutSistema">
        {menuAberto && (
          <Menu
            setTela={setTela}
            tipoUsuario={tipoUsuario}
            setMenuAberto={setMenuAberto}
          />
        )}

        <main className="conteudoSistema">
          <h1>Scanner QR Code</h1>

          <div id="reader"></div>

          <button onClick={() => setTela("dashboard")}>
            Voltar
          </button>
        </main>
      </div>
    );
  }

  if (imagemComprovante) {
    return (
      <div className="modalComprovante">
        <img src={imagemComprovante} alt="Comprovante ampliado" />

        <button onClick={() => setImagemComprovante(null)}>
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div className="layoutSistema">
      <div className="menuDesktop">
        <Menu
          setTela={setTela}
          tipoUsuario={tipoUsuario}
          setMenuAberto={setMenuAberto}
        />
      </div>

      {menuAberto && (
        <>
          <div
            className="fundoMenuMobile"
            onClick={() => {
              setMenuAberto(false);
              document.body.style.overflow = "auto";
            }}
          ></div>

          <Menu
            setTela={setTela}
            tipoUsuario={tipoUsuario}
            setMenuAberto={setMenuAberto}
          />
        </>
      )}

      <main className="conteudoSistema">
        <button
          className="botaoMenuMobile"
          onClick={() => setMenuAberto(!menuAberto)}
        >
          ☰
        </button>
        <div className="topoPainel">

          <h1 className="tituloPainel">
            <span className="statusOnline"></span>

            Painel Inicial
          </h1>

          <SubtituloTela>
            Bem-vindo, {usuarioLogado?.nome}
          </SubtituloTela>

          <div className="relogioPainel">
            🕒 {horaAtual}
          </div>

          <button
            className="botaoLogout"
            onClick={sairDoSistema}
          >
            Sair do Sistema
          </button>

        </div>

        <section className="heroPainel">
          <h3>Bem-vindo ao painel</h3>
          <h2>SIMÃO TAVARES TOP TEAM</h2>
          <p>Gerencie alunos, presenças, pagamentos e relatórios.</p>
        </section>

        <div className="cardAluno">
          <h2>🔔 Notificações do Sistema</h2>

          {avisosDoPainel.length === 0 ? (
            <p>Nenhuma notificação no momento.</p>
          ) : (
            avisosDoPainel.slice(0, 5).map((aviso) => (
              <p key={aviso.id}>
                {aviso.mensagem} - {aviso.data}
              </p>
            ))
          )}

          <button onClick={limparAvisos}>
            Limpar notificações
          </button>

        </div>

        {tipoUsuario === "diretor" && (
          <div className="cardAluno armazenamentoLocal">
            <h2>💾 Armazenamento</h2>

            <p
              className={
                supabaseConfigurado
                  ? "statusBancoOnline"
                  : "statusBancoLocal"
              }
            >
              {!supabaseConfigurado
                ? "Modo local até configurar o Supabase"
                : diretorOnlineLogado
                  ? "Banco online conectado como diretor"
                  : "Banco online configurado, login atual é local"}
            </p>

            <p>
              {!supabaseConfigurado
                ? "Alunos, usuários, pagamentos e presenças estão salvos neste navegador."
                : diretorOnlineLogado
                  ? "Alunos, pagamentos e presenças sincronizam no banco online."
                  : "Entre com o e-mail do diretor do Supabase para enviar ou carregar alunos online."}
            </p>

            {erroArmazenamento && (
              <p className="alertaArmazenamento">
                {erroArmazenamento}
              </p>
            )}

            <button onClick={exportarBackup}>
              Baixar Backup
            </button>

            {supabaseConfigurado && (
              <>
                <button
                  onClick={enviarAlunosParaBancoOnline}
                  disabled={sincronizacaoOnline !== "" || !diretorOnlineLogado}
                >
                  {sincronizacaoOnline === "enviando"
                    ? "Enviando..."
                    : "Enviar Alunos e Acessos para Banco Online"}
                </button>

                <button
                  onClick={carregarAlunosDoBancoOnline}
                  disabled={sincronizacaoOnline !== "" || !diretorOnlineLogado}
                >
                  {sincronizacaoOnline === "carregando"
                    ? "Carregando..."
                    : "Carregar Alunos do Banco Online"}
                </button>
              </>
            )}

            <label className="botaoImportarBackup" htmlFor="importarBackupSistema">
              Restaurar Backup
            </label>

            <input
              id="importarBackupSistema"
              type="file"
              accept="application/json,.json"
              onChange={importarBackup}
            />
          </div>
        )}

        <div className="estatisticas">
          <CardEstatistica
            titulo="Total de Alunos"
            valor={alunos.length}
          />

          <CardEstatistica
            titulo="Presenças Hoje"
            valor={presencasHoje}
          />

          <CardEstatistica
            titulo="Mensalidades Pagas"
            valor={totalPagos}
          />

          <CardEstatistica
            titulo="Mensalidades Pendentes"
            valor={totalPendentes}
          />

          <CardEstatistica
            titulo="Mensalidades Vencidas"
            valor={totalVencidos}
          />

          <CardEstatistica
            titulo="Aguardando Confirmação"
            valor={pagamentosAguardando.length}
          />

        </div>

        <div className="cardAluno graficoDashboard">
          <h2>📈 Visão Geral da Academia</h2>

          <div className="barraGrafico">
            <span>Alunos</span>
            <div>
              <p
                className="barra alunosBarra"
                style={{ width: `${alunos.length * 10}px` }}
              ></p>
            </div>
            <strong>{alunos.length}</strong>
          </div>

          <div className="barraGrafico">
            <span>Pagos</span>
            <div>
              <p
                className="barra pagosBarra"
                style={{ width: `${totalPagos * 10}px` }}
              ></p>
            </div>
            <strong>{totalPagos}</strong>
          </div>

          <div className="barraGrafico">
            <span>Pendentes</span>
            <div>
              <p
                className="barra pendentesBarra"
                style={{ width: `${totalPendentes * 10}px` }}
              ></p>
            </div>
            <strong>{totalPendentes}</strong>
          </div>

          <div>
            <p
              className="barra vencidosBarra"
              style={{ width: `${totalVencidos * 10}px` }}
            ></p>
          </div>
        </div>

        <div className="cardsDashboard">
          {tipoUsuario === "diretor" && (
            <button
              onClick={() => {
                limparFormulario();
                setTela("cadastro");
              }}
            >
              Cadastrar Aluno
            </button>
          )}
          <button onClick={() => setTela("lista")}>Lista de Alunos</button>
          <button onClick={() => setTela("scanner")}>
            Escanear QR Code
          </button>
          <button onClick={() => setTela("historico")}>
            Presenças
          </button>

          {tipoUsuario === "diretor" && (
            <>
              <button onClick={() => setTela("mensalidades")}>
                Mensalidades
              </button>

              <button onClick={() => setTela("pagamentos")}>
                Pagamentos
              </button>

              <button onClick={() => setTela("relatorios")}>
                Relatórios
              </button>
            </>
          )}

          <button
            onClick={sairDoSistema}
          >
            Sair
          </button>
        </div>
      </main>
    </div>
  );

  function CardEstatistica({ titulo, valor }) {

    function escolherIcone(titulo) {

      if (titulo.includes("Alunos")) return "🥋";

      if (titulo.includes("Presenças")) return "✅";

      if (titulo.includes("Pagas")) return "💰";

      if (titulo.includes("Pendentes")) return "⚠️";

      if (titulo.includes("Vencidas")) return "🚨";

      if (titulo.includes("Aguardando")) return "⏳";

      return "📊";
    }

    return (
      <div className={`cardEstatistica ${titulo.toLowerCase()}`}>

        <span className="iconeCard">
          {escolherIcone(titulo)}
        </span>

        <h3>{titulo}</h3>

        <h2>
          <ContadorAnimado valor={valor} />
        </h2>

      </div>
    );
  }

  function Botao({
    children,
    onClick,
    className = "",
    tipo = "padrao",
  }) {
    return (
      <button
        type="button"
        className={`botao ${tipo} ${className}`}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }

  function CardAluno({ children }) {
    return (
      <div className="cardAluno">
        {children}
      </div>
    );
  }

  function TituloTela({ titulo }) {
    return <h1>{titulo}</h1>;
  }

  function SubtituloTela({ children }) {
    return <h3>{children}</h3>;
  }

  function Menu({ setTela, tipoUsuario, setMenuAberto }) {

    function navegar(telaDestino) {
      setTela(telaDestino);
      setMenuAberto(false);
    }

    return (
      <aside className="menuLateral">

        <img src={logo} alt={`Logo ${APP_NAME}`} />

        <h2>SIMÃO TEAM</h2>

        <p>JIU-JITSU</p>

        {tipoUsuario !== "aluno" && (
          <button onClick={() => navegar("dashboard")}>
            Painel Inicial
          </button>
        )}

        {tipoUsuario === "diretor" && (
          <button
            onClick={() => {
              limparFormulario();
              navegar("cadastro");
            }}
          >
            Cadastrar Aluno
          </button>
        )}

        {tipoUsuario === "diretor" && (
          <button onClick={() => navegar("cadastroProfessor")}>
            Cadastrar Professor
          </button>
        )}

        {tipoUsuario !== "aluno" && (
          <button onClick={() => navegar("lista")}>
            Lista de Alunos
          </button>
        )}

        {tipoUsuario !== "aluno" && (
          <button onClick={() => navegar("scanner")}>
            Escanear QR Code
          </button>
        )}

        {tipoUsuario !== "aluno" && (
          <button onClick={() => navegar("historico")}>
            Histórico de Presenças
          </button>
        )}

        {tipoUsuario === "diretor" && (
          <>
            <button onClick={() => navegar("mensalidades")}>
              Mensalidades
            </button>

            <button onClick={() => navegar("pagamentos")}>
              Pagamentos
            </button>

            <button onClick={() => navegar("relatorios")}>
              Relatórios
            </button>
          </>
        )}

        <button onClick={sairDoSistema}>
          Sair
        </button>

      </aside>
    );
  }

}

export default App;
