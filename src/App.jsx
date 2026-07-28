import "./App.css";
import logo from "./assets/logo.webp";
import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";
import capa from "./assets/capa.webp";
import jsPDF from "jspdf";

function App() {
  const [tela, setTela] = useState("inicio");

  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState("");
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  const [avisos, setAvisos] = useState(() => {
    const avisosSalvos = localStorage.getItem("avisos_ariramba");

    return avisosSalvos ? JSON.parse(avisosSalvos) : [];
  });
  function adicionarAviso(mensagem) {
    const novoAviso = {
      id: Date.now(),
      mensagem,
      data: new Date().toLocaleString(),
    };

    setAvisos((prev) => [novoAviso, ...prev]);
  }

  const [usuarios, setUsuarios] = useState(() => {
    const usuariosSalvos = localStorage.getItem("usuarios_ariramba");

    return usuariosSalvos
      ? JSON.parse(usuariosSalvos)
      : [
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
      ];
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
  const [alunoCarteirinha, setAlunoCarteirinha] = useState(null);
  const [mostrarPix, setMostrarPix] = useState(false);
  const [imagemComprovante, setImagemComprovante] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [mostrarCarteirinhaAluno, setMostrarCarteirinhaAluno] = useState(false);
  const [mostrarHistoricoAluno, setMostrarHistoricoAluno] = useState(false);
  const [modoEditarPerfil, setModoEditarPerfil] = useState(false);
  const [especialidadeProfessor, setEspecialidadeProfessor] = useState("");
  const [graduacaoProfessor, setGraduacaoProfessor] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [busca, setBusca] = useState("");
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [horaAtual, setHoraAtual] = useState(
    new Date().toLocaleTimeString()
  );

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
    const dadosSalvos = localStorage.getItem("alunos_Simão Tvarares Top Team");
    return dadosSalvos ? JSON.parse(dadosSalvos) : [];
  });

  const [presencas, setPresencas] = useState(() => {
    const presencasSalvas = localStorage.getItem("presencas_Simão Tvarares Top Team");
    return presencasSalvas ? JSON.parse(presencasSalvas) : [];
  });

  function ContadorAnimado({ valor }) {
    const [numero, setNumero] = useState(0);

    useEffect(() => {
      let inicio = 0;
      const fim = Number(valor) || 0;
      const duracao = 800;
      const incremento = Math.max(1, Math.ceil(fim / 30));

      const intervalo = setInterval(() => {
        inicio += incremento;

        if (inicio >= fim) {
          setNumero(fim);
          clearInterval(intervalo);
        } else {
          setNumero(inicio);
        }
      }, duracao / 30);

      return () => clearInterval(intervalo);
    }, [valor]);

    return <>{numero}</>;
  }

  useEffect(() => {
    localStorage.setItem("alunos_Simão Tvarares Top Team", JSON.stringify(alunos));
  }, [alunos]);

  useEffect(() => {
    localStorage.setItem("presencas_ariramba", JSON.stringify(presencas));
  }, [presencas]);

  useEffect(() => {
    localStorage.setItem("avisos_ariramba", JSON.stringify(avisos));
  }, [avisos]);

  useEffect(() => {
    localStorage.setItem(
      "usuarios_ariramba",
      JSON.stringify(usuarios)
    );
  }, [usuarios]);

  useEffect(() => {
    if (usuarioLogado) {
      localStorage.setItem(
        "usuario_logado_ariramba",
        JSON.stringify(usuarioLogado)
      );
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
    const usuarioSalvo = localStorage.getItem("usuario_logado_ariramba");

    if (usuarioSalvo) {
      const usuarioRecuperado = JSON.parse(usuarioSalvo);

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
  }, []);


  useEffect(() => {
    if (tela !== "scanner") return;

    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [],
        videoConstraints: {
          facingMode: "environment",
        },
      },
      false
    );
    scanner.render(
      (resultado) => {
        const alunoEncontrado = alunos.find(
          (a) => `aluno-${a.id}` === resultado
        );

        if (alunoEncontrado) {
          const hoje = new Date().toLocaleDateString();

          const jaRegistrou = presencas.some(
            (presenca) =>
              presenca.nome === alunoEncontrado.nome &&
              presenca.data === hoje
          );

          if (jaRegistrou) {
            alert("Aluno já registrou presença hoje ⚠️");
            return;
          }
          const novaPresenca = {
            nome: alunoEncontrado.nome,
            foto: alunoEncontrado.foto,
            data: new Date().toLocaleDateString(),
            hora: new Date().toLocaleTimeString(),
          };

          setPresencas((prev) => [...prev, novaPresenca]);

          alert("Presença registrada para " + alunoEncontrado.nome);
        }
      },
      (erro) => {
        console.log(erro);
      }
    );

    return () => {
      scanner.clear().catch(() => { });
    };
  }, [tela]);

  //useEffect(() => {
  // const relogio = setInterval(() => {
  //   setHoraAtual(new Date().toLocaleTimeString());
  // }, 1000);

  // return () => clearInterval(relogio);
  // }, []);

  function limparFormulario() {
    setNome("");
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
    setFoto("");
    setAlunoEditando(null);
    setMensalidade("");
  }

  function salvarAluno() {
    if (nome.trim() === "") {
      alert("Digite o nome do aluno.");
      return;
    }

    if (alunoEditando) {
      const alunosAtualizados = alunos.map((aluno) => {
        if (aluno.id === alunoEditando.id) {
          return {
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
          };
        }

        return aluno;
      });

      setAlunos(alunosAtualizados);

      setAlunoEditando(null);

      limparFormulario();

      alert("Aluno atualizado com sucesso ✏️🔥");

      setTela("lista");

      return;
    }

    const novoAluno = {
      id: Date.now(),

      nome,
      peso,
      dataNascimento,
      faixa,
      dataInicio,

      usuario: usuarioAluno,
      senha: senhaAluno,

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
    };
    setAlunos([...alunos, novoAluno]);
    setUsuarios([
      ...usuarios,
      {
        id: Date.now(),
        usuario: usuarioAluno,
        senha: senhaAluno,
        cargo: "aluno",
        nome: nome,
        alunoId: novoAluno.id,
      },
    ]);

    adicionarAviso(`Novo aluno cadastrado: ${nome}`);

    alert(`Aluno ${nome} cadastrado com sucesso!`);

    limparFormulario();
    setTela("dashboard");
  }

  function marcarComoPago(idAluno) {
    const novosAlunos = alunos.map((aluno) => {
      if (aluno.id === idAluno) {
        return {
          ...aluno,
          statusPagamento: "Pago",
          ultimoPagamento: new Date().toLocaleDateString(),
          historicoPagamentos: [
            ...aluno.historicoPagamentos,
            {
              data: new Date().toLocaleDateString(),
              valor: calcularValorComJuros(aluno),
            },
          ],
        };
      }

      return aluno;
    });

    setAlunos(novosAlunos);

    const alunoPago = alunos.find((aluno) => aluno.id === idAluno);

    if (alunoPago) {
      adicionarAviso(`Pagamento confirmado: ${alunoPago.nome}`);
    }

    alert("Pagamento marcado como Pago ✅");
  }

  function marcarComoPendente(idAluno) {
    const novosAlunos = alunos.map((aluno) => {
      if (aluno.id === idAluno) {
        return {
          ...aluno,
          statusPagamento: "Pendente",
        };
      }

      return aluno;
    });

    setAlunos(novosAlunos);

    alert("Pagamento marcado como Pendente ❌");
  }

  function atualizarPerfilAluno() {
    if (!alunoDoPortal) {
      alert("Aluno não encontrado.");
      return;
    }

    if (novaSenha && novaSenha !== confirmarSenha) {
      alert("As senhas não coincidem ❌");
      return;
    }

    const alunosAtualizados = alunos.map((aluno) => {
      if (aluno.id === alunoDoPortal.id) {
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

    setAlunos(alunosAtualizados);

    const usuariosAtualizados = usuarios.map((usuario) => {

      if (usuario.alunoId === alunoDoPortal.id) {

        return {
          ...usuario,
          senha: novaSenha || usuario.senha,
        };

      }

      return usuario;

    });

    setUsuarios(usuariosAtualizados);

    setModoEditarPerfil(false);

    alert("Perfil atualizado com sucesso ✅");
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

    alert("Cadastro do professor atualizado 😎🔥");
  }

  function informarPagamento(idAluno, comprovante = null) {

    const novosAlunos = alunos.map((aluno) => {

      if (aluno.id === idAluno) {

        return {
          ...aluno,
          statusPagamento: "Aguardando",
          comprovantePagamento: comprovante,
          dataEnvioComprovante: new Date().toLocaleDateString(),
        };

      }

      return aluno;
    });

    setAlunos(novosAlunos);

    alert("Pagamento enviado para análise ⏳");
  }

  function rejeitarPagamento(idAluno) {

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

    setAlunos(novosAlunos);

    alert("Comprovante rejeitado ❌");
  }

  function gerarReciboPDF(aluno) {
    const doc = new jsPDF();

    const dataAtual = new Date().toLocaleDateString();
    const valorPago = calcularValorComJuros(aluno);

    doc.setFontSize(18);
    doc.text("RECIBO DE PAGAMENTO", 20, 20);

    doc.setFontSize(12);
    doc.text("Simão Tavares Top Team", 20, 35);
    doc.text(`Aluno: ${aluno.nome}`, 20, 50);
    doc.text(`Data do pagamento: ${dataAtual}`, 20, 60);
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

    doc.save("relatorio-financeiro-ariramba.pdf");
  }

  function registrarPresenca(idAluno) {
    const novosAlunos = alunos.map((aluno) => {
      if (aluno.id === idAluno) {
        const hoje = new Date().toLocaleDateString();

        const jaRegistrou = aluno.presencas.some(
          (presenca) => presenca.data === hoje
        );

        if (jaRegistrou) {
          alert("Aluno já registrou presença hoje ⚠️");
          return aluno;
        }
        return {
          ...aluno,
          presencas: [
            ...aluno.presencas,
            {
              data: new Date().toLocaleDateString(),
              hora: new Date().toLocaleTimeString(),
            },
          ],
        };
      }

      return aluno;
    });

    setAlunos(novosAlunos);

    const alunoEncontrado = alunos.find(
      (aluno) => aluno.id === idAluno
    );

    if (alunoEncontrado) {
      const novaPresenca = {
        nome: alunoEncontrado.nome,
        foto: alunoEncontrado.foto,
        data: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
      };

      setPresencas((prev) => [...prev, novaPresenca]);

      adicionarAviso(`${alunoEncontrado.nome} registrou presença`);

    }

    alert("Presença registrada 😎🔥");

  }

  function removerAluno(idAluno) {
    const confirmar = confirm("Deseja remover este aluno?");

    if (!confirmar) return;

    const novosAlunos = alunos.filter(
      (aluno) => aluno.id !== idAluno
    );

    setAlunos(novosAlunos);

    alert("Aluno removido com sucesso 🗑️");
  }

  function editarAluno(aluno) {
    setAlunoEditando(aluno);

    setNome(aluno.nome);
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
    setMensalidade(aluno.mensalidade);
    setVencimento(aluno.vencimento);

    setTela("cadastro");
  }

  const alunosFiltrados = alunos.filter((aluno) =>
    aluno.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const alunoDoPortal = alunos.find(
    (aluno) => aluno.id === usuarioLogado?.alunoId
  );

  useEffect(() => {
    if (tela === "portalAluno" && alunoDoPortal) {
      setTelefone(alunoDoPortal.telefone || "");
      setResponsavel(alunoDoPortal.responsavel || "");
      setTipoSanguineo(alunoDoPortal.tipoSanguineo || "");
      setSaude(alunoDoPortal.saude || "");
      setMedicamentos(alunoDoPortal.medicamentos || "");
      setObservacoes(alunoDoPortal.observacoes || "");
      setFoto(alunoDoPortal.foto || "");
    }
  }, [tela, alunoDoPortal]);

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
    return data.split("-").reverse().join("/");
  }

  const hoje = new Date().toLocaleDateString();

  const presencasHoje = alunos.reduce((total, aluno) => {
    const presencasDoAlunoHoje = aluno.presencas.filter(
      (presenca) => presenca.data === hoje
    );

    return total + presencasDoAlunoHoje.length;
  }, 0);

  const totalPagos = alunos.filter(
    (aluno) => aluno.statusPagamento === "Pago"
  ).length;

  const totalPendentes = alunos.filter(
    (aluno) => aluno.statusPagamento === "Pendente"
  ).length;

  const totalVencidos = alunos.filter(
    (aluno) => verificarVencimento(aluno) === "Vencido"
  ).length;

  const alunosVencidos = alunos.filter(
    (aluno) => verificarVencimento(aluno) === "Vencido"
  );

  const pagamentosAguardando = alunos.filter(
    (aluno) => aluno.statusPagamento === "Aguardando"
  );

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
          <img src={logo} alt="Logo Ariramba" />
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
            onClick={() => {
              const usuarioEncontrado = usuarios.find(
                (u) => u.usuario === usuario && u.senha === senha
              );

              if (usuarioEncontrado) {

                setUsuarioLogado(usuarioEncontrado);

                setTipoUsuario(usuarioEncontrado.cargo);
                if (usuarioEncontrado.cargo === "aluno") {

                  setTela("portalAluno");

                  if (usuarioEncontrado.senha === "1234") {
                    setModoEditarPerfil(true);

                    alert(
                      "Primeiro acesso detectado. Troque sua senha para continuar 🔐"
                    );
                  }

                } else if (usuarioEncontrado.cargo === "professor") {

                  setTela("portalProfessor");

                  if (usuarioEncontrado.senha === "1234") {
                    setModoEditarPerfil(true);

                    alert(
                      "Primeiro acesso detectado. Troque sua senha para continuar 🔐"
                    );
                  }

                } else {

                  setTela("dashboard");

                }

              } else {

                alert("Usuário ou senha inválidos!");

              }
            }}
          >
            Entrar no Sistema
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

                alert("Professor cadastrado com sucesso 😎🔥");

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
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
            />

            <input
              type="text"
              placeholder="Faixa"
              value={faixa}
              onChange={(e) => setFaixa(e.target.value)}
            />

            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />

            <input
              type="text"
              placeholder="Usuário do aluno"
              value={usuarioAluno}
              onChange={(e) => setUsuarioAluno(e.target.value)}
            />

            <input
              type="password"
              placeholder="Senha inicial"
              value={senhaAluno}
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
              placeholder="Grau"
              value={grau}
              onChange={(e) => setGrau(e.target.value)}
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

            <input
              type="file"
              accept="image/*"
              capture
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
                alt="Preview"
                className="previewFoto"
              />
            )}

            <button onClick={salvarAluno}>
              {alunoEditando ? "Atualizar Aluno" : "Salvar Aluno"}
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
            placeholder="🔍 Buscar aluno..."
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

                  {aluno.foto && (
                    <img
                      src={aluno.foto}
                      alt={aluno.nome}
                      className="fotoAlunoLista"
                    />
                  )}

                  <h2>{aluno.nome}</h2>
                  <p>Telefone: {aluno.telefone}</p>
                  <p>Faixa: {aluno.faixa}</p>
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
                    {aluno.statusPagamento === "Pago"
                      ? "✅ Pago"
                      : "❌ Pendente"}
                  </p>
                  {aluno.statusPagamento === "Pendente" ? (
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

                  {aluno.grau && <p>Grau: {aluno.grau}</p>}

                  <button onClick={() => setAlunoCarteirinha(aluno)}>
                    Gerar Carteirinha
                  </button>

                  <button onClick={() => editarAluno(aluno)}>
                    Editar Aluno
                  </button>

                  {tipoUsuario === "diretor" && (
                    <button
                      onClick={() => {
                        const usuariosAtualizados = usuarios.map((usuario) => {
                          if (usuario.alunoId === aluno.id) {
                            return {
                              ...usuario,
                              senha: "1234",
                            };
                          }

                          return usuario;
                        });

                        setUsuarios(usuariosAtualizados);

                        alert("Senha resetada para 1234 🔐");
                      }}
                    >
                      Resetar Senha
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

                {aluno.comprovantePagamento && (
                  <div className="cardAluno">
                    <div className="comprovantePreview">
                      <p>📎 Comprovante enviado:</p>

                      <img
                        src={aluno.comprovantePagamento}
                        alt="Comprovante"
                        className="fotoAlunoLista"
                        onClick={() =>
                          setImagemComprovante(aluno.comprovantePagamento)
                        }
                      />
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
                  {aluno.statusPagamento === "Aguardando" &&
                    "⏳ Aguardando confirmação"}

                  {verificarVencimento(aluno) === "Pago" &&
                    "✅ Pago"}

                  {verificarVencimento(aluno) === "Pendente" &&
                    aluno.statusPagamento !== "Aguardando" &&
                    "❌ Pendente"}

                  {verificarVencimento(aluno) === "Vencido" &&
                    "⚠️ Vencido"}
                </p>

                {aluno.statusPagamento === "Pendente" ? (
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
                  {aluno.statusPagamento === "Pago"
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

              setPresencas([]);
              localStorage.removeItem("presencas_ariramba");

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
              onClick={() => {
                setTela("inicio");
                setUsuario("");
                setSenha("");
                setTipoUsuario("");
                setUsuarioLogado(null);
                setModoEditarPerfil(false);
                localStorage.removeItem("usuario_logado_ariramba");
              }}
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
                  capture
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

            <h2>{usuarioLogado?.nome}</h2>

            <p>Área do aluno em desenvolvimento 🥋</p>

            <p
              style={{
                color:
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

              {alunoDoPortal?.statusPagamento === "Aguardando"
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
                <h3>⚠️ Mensalidade vencida</h3>
                <p>
                  Valor atualizado:{" "}
                  {formatarMoeda(calcularValorComJuros(alunoDoPortal))}
                </p>
                <p>
                  Dias em atraso: {calcularDiasAtraso(alunoDoPortal)}
                </p>
              </div>
            )}

            {alunoDoPortal?.statusPagamento === "Aguardando" && (
              <div className="cardAluno">
                <h3>⏳ Pagamento enviado</h3>

                <p>Seu comprovante foi enviado para análise.</p>

                <p>Aguarde a confirmação da secretaria.</p>
              </div>
            )}

            <p>Em breve:
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

                <input
                  type="file"
                  accept="image/*"
                  capture
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
                    alt="Foto do aluno"
                    className="previewFoto"
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

                <p>Chave PIX: 002.450.712-10</p>
                <p>
                  Valor: {formatarMoeda(alunoDoPortal?.mensalidade)}
                </p>
                <p>Beneficiário: Simão Tavares Top Team</p>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              capture
              onChange={(e) => {

                const arquivo = e.target.files[0];

                if (arquivo) {

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

            <button
              onClick={() => informarPagamento(alunoDoPortal.id)}
            >
              Informar Pagamento
            </button>

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

                <QRCodeCanvas
                  value={`aluno-${alunoDoPortal?.id}`}
                  size={120}
                />

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
              onClick={() => {
                setTela("inicio");
                setUsuario("");
                setSenha("");
                setTipoUsuario("");
                setUsuarioLogado(null);
                setModoEditarPerfil(false);
                localStorage.removeItem("usuario_logado_ariramba");
              }}
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
            onClick={() => {
              setTela("inicio");
              setUsuario("");
              setSenha("");
              setTipoUsuario("");
              setUsuarioLogado(null);
              setModoEditarPerfil(false);
              localStorage.removeItem("usuario_logado_ariramba");
            }}
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

          {avisos.length === 0 ? (
            <p>Nenhuma notificação no momento.</p>
          ) : (
            avisos.slice(0, 5).map((aviso) => (
              <p key={aviso.id}>
                {aviso.mensagem} - {aviso.data}
              </p>
            ))
          )}

          <button onClick={() => setAvisos([])}>
            Limpar notificações
          </button>

        </div>

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
            <button onClick={() => setTela("cadastro")}>
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
            onClick={() => {
              setTela("inicio");
              setUsuario("");
              setSenha("");
              setTipoUsuario("");
              setUsuarioLogado(null);
              setModoEditarPerfil(false);
              localStorage.removeItem("usuario_logado_ariramba");
            }}
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

        <img src={logo} alt="Logo Ariramba" />

        <h2>ARIRAMBA</h2>

        <p>JIU-JITSU SCHOOL</p>

        {tipoUsuario !== "aluno" && (
          <button onClick={() => navegar("dashboard")}>
            Painel Inicial
          </button>
        )}

        {tipoUsuario === "diretor" && (
          <button onClick={() => navegar("cadastro")}>
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

        <button onClick={() => navegar("inicio")}>
          Sair
        </button>

      </aside>
    );
  }

}

export default App;