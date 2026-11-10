"use strict";

const API = "api/tarefas";
const TAMANHO_PAGINA = 6;
const CHAVE_LOCAL = "vant.tasks.v1";

const ROTULOS = {
  status: { PENDENTE: "Pendente", EM_ANDAMENTO: "Em andamento", CONCLUIDA: "Concluída" },
  prioridade: { BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta" },
};

const estado = {
  modo: "local",
  pagina: 0,
  paginas: 1,
  status: "",
  prioridade: "",
  total: 0,
  itens: [],
  edicao: null,
  confirmandoExclusao: null,
};

const el = {
  selo: document.getElementById("selo-modo"),
  subtitulo: document.getElementById("subtitulo"),
  numAbertas: document.getElementById("num-abertas"),
  numAndamento: document.getElementById("num-andamento"),
  numConcluidas: document.getElementById("num-concluidas"),
  form: document.getElementById("form-tarefa"),
  formTitulo: document.getElementById("form-titulo"),
  titulo: document.getElementById("campo-titulo"),
  descricao: document.getElementById("campo-descricao"),
  prioridade: document.getElementById("campo-prioridade"),
  prazo: document.getElementById("campo-prazo"),
  erroForm: document.getElementById("erro-form"),
  botaoSalvar: document.getElementById("botao-salvar"),
  botaoCancelar: document.getElementById("botao-cancelar"),
  filtroStatus: document.getElementById("filtro-status"),
  filtroPrioridade: document.getElementById("filtro-prioridade"),
  botaoLimpar: document.getElementById("botao-limpar"),
  lista: document.getElementById("lista"),
  vazio: document.getElementById("vazio"),
  contador: document.getElementById("contador"),
  botaoAnterior: document.getElementById("botao-anterior"),
  botaoProxima: document.getElementById("botao-proxima"),
  paginaAtual: document.getElementById("pagina-atual"),
  aviso: document.getElementById("aviso"),
};

class ErroApi extends Error {
  constructor(mensagem, campos) {
    super(mensagem);
    this.campos = campos;
  }
}

function criar(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function formatarData(valor) {
  if (!valor) return "";
  const somenteData = /^\d{4}-\d{2}-\d{2}$/.test(valor);
  const data = new Date(somenteData ? `${valor}T12:00:00` : valor);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dataDeHoje() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

async function requisitar(metodo, url, corpo) {
  const opcoes = { method: metodo, headers: { Accept: "application/json" } };
  if (corpo !== undefined) {
    opcoes.headers["Content-Type"] = "application/json";
    opcoes.body = JSON.stringify(corpo);
  }

  let resposta;
  try {
    resposta = await fetch(url, opcoes);
  } catch {
    throw new ErroApi("Sem conexão com a API.");
  }

  if (resposta.status === 204) return null;

  const texto = await resposta.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = null;
  }

  if (!resposta.ok) {
    throw new ErroApi(dados && dados.erro ? dados.erro : "Não foi possível concluir a operação.", dados && dados.campos);
  }
  return dados;
}

const servicoApi = {
  async listar() {
    const parametros = new URLSearchParams({
      page: String(estado.pagina),
      size: String(TAMANHO_PAGINA),
      sort: "id,desc",
    });
    if (estado.status) parametros.set("status", estado.status);
    if (estado.prioridade) parametros.set("prioridade", estado.prioridade);

    const pagina = await requisitar("GET", `${API}?${parametros}`);
    return {
      itens: pagina.content,
      total: pagina.totalElements,
      paginas: Math.max(pagina.totalPages, 1),
    };
  },
  async contar(status) {
    const pagina = await requisitar("GET", `${API}?size=1&status=${status}`);
    return pagina.totalElements;
  },
  criar: (pedido) => requisitar("POST", API, pedido),
  atualizar: (id, pedido) => requisitar("PUT", `${API}/${id}`, pedido),
  iniciar: (id) => requisitar("PATCH", `${API}/${id}/iniciar`),
  concluir: (id) => requisitar("PATCH", `${API}/${id}/concluir`),
  excluir: (id) => requisitar("DELETE", `${API}/${id}`),
};

function lerLocal() {
  try {
    const conteudo = JSON.parse(localStorage.getItem(CHAVE_LOCAL));
    if (Array.isArray(conteudo)) return conteudo;
  } catch {
    /* conteúdo inválido no navegador: recomeça com os exemplos */
  }
  const iniciais = semear();
  gravarLocal(iniciais);
  return iniciais;
}

function gravarLocal(lista) {
  localStorage.setItem(CHAVE_LOCAL, JSON.stringify(lista));
}

function semear() {
  const daqui = (dias) => {
    const data = new Date();
    data.setDate(data.getDate() + dias);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
  };
  const agora = new Date().toISOString();
  return [
    {
      id: 1,
      titulo: "Estudar Spring Boot",
      descricao: "Controllers, services e repositories.",
      prioridade: "ALTA",
      status: "PENDENTE",
      prazo: daqui(7),
      criadaEm: agora,
      concluidaEm: null,
    },
    {
      id: 2,
      titulo: "Revisar JPA",
      descricao: "Relacionamentos e consultas com Specification.",
      prioridade: "MEDIA",
      status: "EM_ANDAMENTO",
      prazo: daqui(10),
      criadaEm: agora,
      concluidaEm: null,
    },
    {
      id: 3,
      titulo: "Publicar o portfólio",
      descricao: "Site no GitHub Pages com identidade vant.",
      prioridade: "MEDIA",
      status: "CONCLUIDA",
      prazo: null,
      criadaEm: agora,
      concluidaEm: agora,
    },
  ];
}

function proximoId(lista) {
  return lista.reduce((maior, tarefa) => Math.max(maior, tarefa.id), 0) + 1;
}

function encontrarLocal(lista, id) {
  const tarefa = lista.find((item) => item.id === id);
  if (!tarefa) throw new ErroApi("Tarefa não encontrada.");
  return tarefa;
}

const servicoLocal = {
  listar() {
    const lista = lerLocal()
      .filter((tarefa) => !estado.status || tarefa.status === estado.status)
      .filter((tarefa) => !estado.prioridade || tarefa.prioridade === estado.prioridade)
      .sort((a, b) => b.id - a.id);

    const inicio = estado.pagina * TAMANHO_PAGINA;
    return {
      itens: lista.slice(inicio, inicio + TAMANHO_PAGINA),
      total: lista.length,
      paginas: Math.max(Math.ceil(lista.length / TAMANHO_PAGINA), 1),
    };
  },
  contar(status) {
    return lerLocal().filter((tarefa) => tarefa.status === status).length;
  },
  criar(pedido) {
    const lista = lerLocal();
    const tarefa = {
      id: proximoId(lista),
      titulo: pedido.titulo,
      descricao: pedido.descricao,
      prioridade: pedido.prioridade || "MEDIA",
      status: "PENDENTE",
      prazo: pedido.prazo,
      criadaEm: new Date().toISOString(),
      concluidaEm: null,
    };
    lista.push(tarefa);
    gravarLocal(lista);
    return tarefa;
  },
  atualizar(id, pedido) {
    const lista = lerLocal();
    const tarefa = encontrarLocal(lista, id);
    if (tarefa.status === "CONCLUIDA") {
      throw new ErroApi("Uma tarefa concluída não pode ser editada.");
    }
    tarefa.titulo = pedido.titulo;
    tarefa.descricao = pedido.descricao;
    tarefa.prioridade = pedido.prioridade || "MEDIA";
    tarefa.prazo = pedido.prazo;
    gravarLocal(lista);
    return tarefa;
  },
  iniciar(id) {
    const lista = lerLocal();
    const tarefa = encontrarLocal(lista, id);
    if (tarefa.status === "CONCLUIDA") {
      throw new ErroApi("Uma tarefa concluída não pode ser reiniciada.");
    }
    tarefa.status = "EM_ANDAMENTO";
    gravarLocal(lista);
    return tarefa;
  },
  concluir(id) {
    const lista = lerLocal();
    const tarefa = encontrarLocal(lista, id);
    if (tarefa.status !== "CONCLUIDA") {
      tarefa.status = "CONCLUIDA";
      tarefa.concluidaEm = new Date().toISOString();
      gravarLocal(lista);
    }
    return tarefa;
  },
  excluir(id) {
    const lista = lerLocal();
    encontrarLocal(lista, id);
    gravarLocal(lista.filter((tarefa) => tarefa.id !== id));
  },
};

function servico() {
  return estado.modo === "api" ? servicoApi : servicoLocal;
}

async function detectarModo() {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 2500);
  try {
    const resposta = await fetch(`${API}?size=1`, {
      signal: controle.signal,
      headers: { Accept: "application/json" },
    });
    const tipo = resposta.headers.get("content-type") || "";
    if (resposta.ok && tipo.includes("application/json")) return "api";
  } catch {
    /* sem API: cai no modo local */
  } finally {
    clearTimeout(limite);
  }
  return "local";
}

function atualizarSelo() {
  if (estado.modo === "api") {
    el.selo.textContent = "API conectada";
    el.selo.title = "Dados salvos no banco H2 pelo Spring Boot.";
    el.selo.classList.add("conectado");
  } else {
    el.selo.textContent = "Modo demonstração";
    el.selo.title = "Sem a API disponível: os dados ficam salvos neste navegador.";
    el.selo.classList.remove("conectado");
    el.subtitulo.textContent =
      "Demonstração sem servidor: as tarefas ficam salvas apenas neste navegador. " +
      "A API completa em Spring Boot está no repositório.";
  }
}

function etiqueta(texto, classe) {
  return criar("span", `etiqueta ${classe}`, texto);
}

function botaoAcao(texto, acao, id, perigo) {
  const botao = criar("button", perigo ? "perigo" : "", texto);
  botao.type = "button";
  botao.dataset.acao = acao;
  botao.dataset.id = String(id);
  return botao;
}

function metaItem(rotulo, valor) {
  const item = criar("span");
  item.append(criar("strong", "", rotulo), document.createTextNode(` ${valor}`));
  return item;
}

function renderizarLista(itens) {
  el.lista.replaceChildren();
  el.vazio.hidden = itens.length > 0;
  el.lista.hidden = itens.length === 0;

  itens.forEach((tarefa) => {
    const item = criar("li", `tarefa prioridade-${tarefa.prioridade}`);
    if (tarefa.status === "CONCLUIDA") item.classList.add("concluida");
    if (estado.edicao === tarefa.id) item.classList.add("em-edicao");

    const topo = criar("div", "tarefa-topo");
    topo.append(
      etiqueta(ROTULOS.prioridade[tarefa.prioridade] || tarefa.prioridade, `prioridade-${tarefa.prioridade}`),
      etiqueta(ROTULOS.status[tarefa.status] || tarefa.status, `status-${tarefa.status}`)
    );

    item.append(topo);
    item.append(criar("h3", "", tarefa.titulo));
    if (tarefa.descricao) item.append(criar("p", "", tarefa.descricao));

    const meta = criar("p", "meta");
    if (tarefa.prazo) meta.append(metaItem("Prazo:", formatarData(tarefa.prazo)));
    meta.append(metaItem("Criada em", formatarData(tarefa.criadaEm)));
    if (tarefa.concluidaEm) meta.append(metaItem("Concluída em", formatarData(tarefa.concluidaEm)));
    item.append(meta);

    const acoes = criar("div", "tarefa-acoes");
    if (tarefa.status === "PENDENTE") acoes.append(botaoAcao("Iniciar", "iniciar", tarefa.id));
    if (tarefa.status !== "CONCLUIDA") {
      acoes.append(botaoAcao("Concluir", "concluir", tarefa.id));
      acoes.append(botaoAcao("Editar", "editar", tarefa.id));
    }
    if (estado.confirmandoExclusao === tarefa.id) {
      acoes.append(botaoAcao("Confirmar exclusão", "excluir", tarefa.id, true));
    } else {
      acoes.append(botaoAcao("Excluir", "excluir", tarefa.id));
    }
    item.append(acoes);

    el.lista.append(item);
  });
}

function renderizarPaginacao(total) {
  el.contador.textContent = `${total} ${total === 1 ? "tarefa" : "tarefas"}`;
  el.paginaAtual.textContent = `Página ${estado.pagina + 1} de ${estado.paginas}`;
  el.botaoAnterior.disabled = estado.pagina === 0;
  el.botaoProxima.disabled = estado.pagina >= estado.paginas - 1;
}

async function atualizarResumo() {
  const atual = servico();
  const [pendentes, andamento, concluidas] = await Promise.all([
    atual.contar("PENDENTE"),
    atual.contar("EM_ANDAMENTO"),
    atual.contar("CONCLUIDA"),
  ]);
  el.numAbertas.textContent = pendentes + andamento;
  el.numAndamento.textContent = andamento;
  el.numConcluidas.textContent = concluidas;
}

let tempoAviso = null;
function avisar(texto, erro) {
  el.aviso.textContent = texto;
  el.aviso.classList.toggle("erro-texto", Boolean(erro));
  clearTimeout(tempoAviso);
  tempoAviso = setTimeout(() => {
    el.aviso.textContent = "";
    el.aviso.classList.remove("erro-texto");
  }, 4500);
}

function mensagemErro(erro) {
  if (erro instanceof ErroApi) {
    if (erro.campos) return Object.values(erro.campos).join(" ");
    return erro.message;
  }
  return "Algo deu errado. Tente novamente.";
}

async function recarregar() {
  const resultado = await servico().listar();
  estado.paginas = resultado.paginas;
  if (estado.pagina > estado.paginas - 1) {
    estado.pagina = estado.paginas - 1;
    return recarregar();
  }
  estado.itens = resultado.itens;
  estado.total = resultado.total;
  renderizarLista(resultado.itens);
  renderizarPaginacao(resultado.total);
  await atualizarResumo();
}

function lerFormulario() {
  const titulo = el.titulo.value.trim();
  if (!titulo) {
    el.erroForm.textContent = "O título é obrigatório.";
    el.erroForm.hidden = false;
    el.titulo.focus();
    return null;
  }

  const prazo = el.prazo.value || null;
  if (prazo && prazo < dataDeHoje()) {
    el.erroForm.textContent = "O prazo não pode estar no passado.";
    el.erroForm.hidden = false;
    el.prazo.focus();
    return null;
  }

  el.erroForm.hidden = true;
  return {
    titulo,
    descricao: el.descricao.value.trim() || null,
    prioridade: el.prioridade.value,
    prazo,
  };
}

function limparFormulario() {
  estado.edicao = null;
  el.form.reset();
  el.prioridade.value = "MEDIA";
  el.formTitulo.textContent = "Nova tarefa";
  el.botaoSalvar.textContent = "Adicionar tarefa";
  el.botaoCancelar.hidden = true;
  el.erroForm.hidden = true;
}

function entrarEdicao(id) {
  const tarefa = estado.itens.find((item) => item.id === id);
  if (!tarefa) return;

  estado.edicao = id;
  el.titulo.value = tarefa.titulo;
  el.descricao.value = tarefa.descricao || "";
  el.prioridade.value = tarefa.prioridade;
  el.prazo.value = tarefa.prazo || "";
  el.formTitulo.textContent = "Editar tarefa";
  el.botaoSalvar.textContent = "Salvar alterações";
  el.botaoCancelar.hidden = false;
  el.erroForm.hidden = true;
  renderizarLista(estado.itens);
  el.form.scrollIntoView({ behavior: "smooth", block: "start" });
  el.titulo.focus();
}

let tempoConfirmacao = null;

async function excluir(id) {
  if (estado.confirmandoExclusao !== id) {
    estado.confirmandoExclusao = id;
    renderizarLista(estado.itens);
    clearTimeout(tempoConfirmacao);
    tempoConfirmacao = setTimeout(() => {
      if (estado.confirmandoExclusao === id) {
        estado.confirmandoExclusao = null;
        renderizarLista(estado.itens);
      }
    }, 5000);
    return;
  }

  clearTimeout(tempoConfirmacao);
  await servico().excluir(id);
  estado.confirmandoExclusao = null;
  if (estado.edicao === id) limparFormulario();
  avisar("Tarefa excluída.");
  await recarregar();
}

function ligarEventos() {
  el.form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const pedido = lerFormulario();
    if (!pedido) return;

    el.botaoSalvar.disabled = true;
    try {
      if (estado.edicao !== null) {
        await servico().atualizar(estado.edicao, pedido);
        avisar("Tarefa atualizada.");
      } else {
        await servico().criar(pedido);
        estado.pagina = 0;
        avisar("Tarefa criada.");
      }
      limparFormulario();
      await recarregar();
    } catch (erro) {
      el.erroForm.textContent = mensagemErro(erro);
      el.erroForm.hidden = false;
    } finally {
      el.botaoSalvar.disabled = false;
    }
  });

  el.botaoCancelar.addEventListener("click", () => {
    limparFormulario();
    renderizarLista(estado.itens);
  });

  el.lista.addEventListener("click", async (evento) => {
    const alvo = evento.target.closest("button[data-acao]");
    if (!alvo) return;

    const id = Number(alvo.dataset.id);
    const acao = alvo.dataset.acao;

    try {
      if (acao === "editar") {
        entrarEdicao(id);
        return;
      }
      if (acao === "excluir") {
        await excluir(id);
        return;
      }

      if (acao === "iniciar") {
        await servico().iniciar(id);
        avisar("Tarefa iniciada.");
      }
      if (acao === "concluir") {
        await servico().concluir(id);
        avisar("Tarefa concluída.");
      }
      estado.confirmandoExclusao = null;
      await recarregar();
    } catch (erro) {
      avisar(mensagemErro(erro), true);
    }
  });

  el.filtroStatus.addEventListener("change", () => {
    estado.status = el.filtroStatus.value;
    estado.pagina = 0;
    recarregar().catch((erro) => avisar(mensagemErro(erro), true));
  });

  el.filtroPrioridade.addEventListener("change", () => {
    estado.prioridade = el.filtroPrioridade.value;
    estado.pagina = 0;
    recarregar().catch((erro) => avisar(mensagemErro(erro), true));
  });

  el.botaoLimpar.addEventListener("click", () => {
    estado.status = "";
    estado.prioridade = "";
    estado.pagina = 0;
    el.filtroStatus.value = "";
    el.filtroPrioridade.value = "";
    recarregar().catch((erro) => avisar(mensagemErro(erro), true));
  });

  el.botaoAnterior.addEventListener("click", () => {
    if (estado.pagina === 0) return;
    estado.pagina -= 1;
    recarregar().catch((erro) => avisar(mensagemErro(erro), true));
  });

  el.botaoProxima.addEventListener("click", () => {
    if (estado.pagina >= estado.paginas - 1) return;
    estado.pagina += 1;
    recarregar().catch((erro) => avisar(mensagemErro(erro), true));
  });
}

async function iniciar() {
  el.prazo.min = dataDeHoje();
  estado.modo = await detectarModo();
  atualizarSelo();
  ligarEventos();

  try {
    await recarregar();
  } catch (erro) {
    avisar(mensagemErro(erro), true);
  }
}

iniciar();
