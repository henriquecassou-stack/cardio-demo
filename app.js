// Painel do consultório — demonstração que roda inteira no navegador.
import { db } from './data.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const D = () => db.dados;
const view = $('#view');

/* ------------------------------------------------------------------ utilidades */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brl = (n) => fmtBRL.format(Number(n) || 0);
const dia = 86400000;
const diasDesde = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / dia));
const hojeISO = () => new Date().toISOString().slice(0, 10);
const dataCurta = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const dataLonga = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function tempoAtras(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `há ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}
function inicioDoDia(offset = 0) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offset); return d; }
const atrasada = (iso) => new Date(iso) < new Date();
function quandoVence(iso) {
  const d = new Date(iso);
  const h = hora(iso);
  if (d >= inicioDoDia(0) && d < inicioDoDia(1)) return `Hoje, ${h}`;
  if (d >= inicioDoDia(1) && d < inicioDoDia(2)) return `Amanhã, ${h}`;
  if (d >= inicioDoDia(-1) && d < inicioDoDia(0)) return `Ontem, ${h}`;
  return `${dataCurta(iso)}, ${h}`;
}
function idade(nasc) {
  if (!nasc) return null;
  const n = new Date(nasc + 'T12:00:00'); const h = new Date();
  let i = h.getFullYear() - n.getFullYear();
  if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) i--;
  return i;
}
const iniciais = (nome) => nome.split(/\s+/).filter((p) => p.length > 2 || /^[A-Z]/.test(p)).filter((p) => !['de', 'da', 'do', 'dos', 'das'].includes(p)).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
function paFora(pa) { const m = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec(pa || ''); return m ? Number(m[1]) >= 140 || Number(m[2]) >= 90 : false; }
const soDigitos = (t) => (t || '').replace(/\D/g, '');

const ETAPAS = [
  { id: 'novo', nome: 'Novo contato' },
  { id: 'consulta', nome: 'Consulta marcada' },
  { id: 'exames', nome: 'Exames' },
  { id: 'retorno', nome: 'Retorno' },
];
const ETAPA_NOME = { novo: 'Novo contato', consulta: 'Consulta marcada', exames: 'Exames', retorno: 'Retorno', acompanhamento: 'Em acompanhamento', perdido: 'Não seguiu' };
const ABERTAS = ['novo', 'consulta', 'exames', 'retorno'];
const STATUS_SERV = { disponivel: 'Disponível', 'agenda-cheia': 'Agenda cheia', pausado: 'Pausado', arquivado: 'Arquivado' };
const ORIGENS = ['WhatsApp', 'Indicação médica', 'Indicação de paciente', 'Convênio', 'Google', 'Instagram', 'Doctoralia', 'Telefone'];
const CONVENIOS = ['Particular', 'Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil'];
const RISCOS = ['Hipertensão', 'Diabetes', 'Dislipidemia', 'Tabagismo', 'Obesidade', 'Histórico familiar', 'Doença coronariana', 'Fibrilação atrial', 'Insuficiência cardíaca'];
const FORMAS = ['A definir', 'Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Convênio'];
const MOTIVOS = ['Não atende o convênio dele', 'Achou caro', 'Não respondeu mais', 'Marcou em outro lugar', 'Mudou de cidade'];
const TIPOS_REG = { ligacao: 'Ligação', whatsapp: 'WhatsApp', consulta: 'Consulta', nota: 'Anotação', sistema: 'Sistema' };

const paciente = (id) => D().pacientes.find((p) => p.id === id);
const servico = (id) => D().servicos.find((s) => s.id === id);
const jornada = (id) => D().jornadas.find((j) => j.id === id);
const salvar = () => { db.salvar(); atualizarContagens(); };
function saldo(o) { return o ? Math.max(0, (Number(o.valor) || 0) - (Number(o.cobertura) || 0) - (Number(o.desconto) || 0)) : 0; }

/* -------------------------------------------------------------- traçado de ECG */
// Um batimento (P, QRS, T) com 34 px de largura, centrado no pico R.
const BATIDA = [[0, 0], [4, 0], [7, -2.5], [10, 0], [13, 0], [14.5, 2], [17, -10], [19.5, 4], [21, 0], [26, 0], [30, -3.5], [34, 0]];
function batida(x0, base, esc = 1) { return BATIDA.map(([x, y]) => `L${(x0 + x * esc).toFixed(1)},${(base + y * esc).toFixed(1)}`).join(' '); }
function tiraECG(largura, base, intervalo, escala = 1, inicio = 10) {
  let d = `M0,${base}`;
  for (let x = inicio; x + 34 * escala < largura; x += intervalo) d += ` L${x},${base} ${batida(x, base, escala)}`;
  return `${d} L${largura},${base}`;
}
const svgECG = (w, h, base, intervalo, escala, cls = '') => `<svg class="${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${tiraECG(w, base, intervalo, escala)}"/></svg>`;

/* ----------------------------------------------------------------- avisos (toast) */
function toast(texto, { desfazer, erro } = {}) {
  const el = document.createElement('div');
  el.className = `toast${erro ? ' erro' : ''}`;
  el.innerHTML = `<span>${esc(texto)}</span>`;
  if (desfazer) {
    const b = document.createElement('button');
    b.textContent = 'Desfazer';
    b.onclick = () => { desfazer(); el.remove(); };
    el.append(b);
  }
  $('#toasts').append(el);
  setTimeout(() => el.remove(), desfazer ? 6000 : 3200);
}

/* ------------------------------------------------------------------- camadas */
function abrirCamada(html, { aoAbrir, classe = 'modal' } = {}) {
  const veu = document.createElement('div');
  veu.className = 'veu';
  veu.innerHTML = `<div class="${classe}" role="dialog" aria-modal="true">${html}</div>`;
  const fechar = () => { veu.remove(); document.removeEventListener('keydown', tecla); };
  const tecla = (e) => { if (e.key === 'Escape') fechar(); };
  veu.addEventListener('mousedown', (e) => { if (e.target === veu) fechar(); });
  document.addEventListener('keydown', tecla);
  $('#camada').append(veu);
  aoAbrir?.(veu.firstElementChild, fechar);
  return fechar;
}

/* ---------------------------------------------------------------- cabeçalho */
function atualizarContagens() {
  const n = D().jornadas.filter((j) => j.etapa === 'novo').length;
  $('#cont-novos').textContent = n ? n : '';
  $('#nome-consultorio').textContent = D().settings.nome;
}
function moverTraco() {
  const nav = $('#abas');
  const ativa = $('a[aria-current="page"]', nav);
  const traco = $('#traco');
  const w = nav.scrollWidth;
  traco.style.width = `${w}px`;
  $('svg', traco).setAttribute('viewBox', `0 0 ${w} 14`);
  $('svg', traco).setAttribute('width', w);
  if (!ativa) { $('#traco-path').setAttribute('d', `M0,13 L${w},13`); return; }
  const cx = ativa.offsetLeft + ativa.offsetWidth / 2;
  const x0 = cx - 17 * 0.9;
  $('#traco-path').setAttribute('d', `M${ativa.offsetLeft},13 L${x0},13 ${batida(x0, 13, 0.9)} L${ativa.offsetLeft + ativa.offsetWidth},13`);
}
window.addEventListener('resize', moverTraco);

$('#abrir-menu').addEventListener('click', (e) => {
  const m = $('#menu'); m.hidden = !m.hidden; e.currentTarget.setAttribute('aria-expanded', String(!m.hidden));
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('#menu') && !e.target.closest('#abrir-menu')) $('#menu').hidden = true;
  const acao = e.target.closest('[data-acao]')?.dataset.acao;
  if (acao === 'recomecar') {
    if (!confirm('Recomeçar a demonstração? Tudo o que você fez aqui será apagado e os dados de exemplo voltam ao início.')) return;
    db.recomecar(); location.hash = '#/'; render(); toast('Demonstração recomeçada com os dados de exemplo');
  }
  if (acao === 'sair') { try { sessionStorage.removeItem('ritmo-entrou'); } catch { /* */ } location.hash = '#/'; telaEntrada(); }
  if (acao) $('#menu').hidden = true;
});

/* ---------------------------------------------------------------- entrada */
function entrou() { try { return sessionStorage.getItem('ritmo-entrou') === '1'; } catch { return window.__entrou; } }
function telaEntrada() {
  $('#topo').hidden = true; view.innerHTML = '';
  const tela = document.createElement('div');
  tela.className = 'tela-entrada';
  tela.setAttribute('role', 'dialog');
  tela.setAttribute('aria-label', 'Entrar no painel');
  tela.innerHTML = `
    ${svgECG(1600, 120, 70, 220, 2.2, 'ecg-fundo')}
    <form>
      <div class="marca">
        <span class="marca-sinal" style="width:38px;height:38px"><svg viewBox="0 0 32 32" width="24" height="24"><path d="M3 17h6l2-4 3 9 3-14 2.5 9H29" fill="none" stroke="white" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span>
        <div><b>${esc(D().settings.nome)}</b><div class="small muted">Painel do consultório · demonstração</div></div>
      </div>
      <p>Pacientes, jornada do primeiro contato ao retorno, exames, orçamentos e divulgação, num lugar só. Entre com o acesso de demonstração:</p>
      <label class="campo">E-mail<input type="email" name="email" value="recepcao@ritmocardio.demo" autocomplete="off"></label>
      <label class="campo">Senha<input type="password" name="senha" value="demonstracao" autocomplete="off"></label>
      <button class="btn acento">Entrar no painel</button>
      <p class="small">Os dados são fictícios e ficam só neste navegador: nada é enviado para lugar nenhum. Use qualquer senha.</p>
    </form>`;
  document.body.append(tela);
  $('form', tela).addEventListener('submit', (e) => {
    e.preventDefault();
    try { sessionStorage.setItem('ritmo-entrou', '1'); } catch { window.__entrou = true; }
    tela.remove(); render();
  });
  $('button', tela).focus();
}

/* ---------------------------------------------------------------- roteador */
const rotas = [
  [/^$/, telaHoje],
  [/^jornada$/, telaJornada],
  [/^jornada\/(.+)$/, telaJornadaDetalhe],
  [/^pacientes$/, telaPacientes],
  [/^pacientes\/(.+)$/, telaPaciente],
  [/^servicos$/, telaServicos],
  [/^servicos\/(.+)$/, telaServico],
  [/^divulgacao$/, telaDivulgacao],
  [/^consultorio$/, telaConsultorio],
  [/^orcamento\/(.+)$/, telaOrcamento],
];
let saindoComAlteracoes = null;
function render() {
  if (!entrou()) return telaEntrada();
  $('#topo').hidden = false;
  const caminho = location.hash.replace(/^#\/?/, '').split('?')[0].replace(/\/$/, '');
  const aba = caminho.split('/')[0];
  $$('#abas a').forEach((a) => a.toggleAttribute('aria-current', a.dataset.aba === (aba === 'orcamento' ? 'jornada' : aba)));
  $$('#abas a[aria-current]').forEach((a) => a.setAttribute('aria-current', 'page'));
  atualizarContagens();
  requestAnimationFrame(moverTraco);
  saindoComAlteracoes = null;
  for (const [re, fn] of rotas) {
    const m = re.exec(caminho);
    if (m) {
      view.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'entrada';
      view.append(wrap);
      fn(wrap, ...m.slice(1));
      document.title = `${$('h1', wrap)?.textContent?.trim() || 'Painel'} · ${D().settings.nome}`;
      return;
    }
  }
  view.innerHTML = `<div class="vazio">Página não encontrada. <a href="#/" class="btn">Voltar para Hoje</a></div>`;
}
let hashAnterior = location.hash;
window.addEventListener('hashchange', () => {
  if (saindoComAlteracoes && !confirm('Há alterações não salvas. Sair mesmo assim?')) {
    history.replaceState(null, '', hashAnterior); return;
  }
  hashAnterior = location.hash;
  window.scrollTo(0, 0);
  render();
});
window.addEventListener('beforeunload', (e) => { if (saindoComAlteracoes) { e.preventDefault(); e.returnValue = ''; } });

/* ----------------------------------------------------------- pendências (Hoje) */
function pendencias() {
  const out = [];
  const d = D();
  for (const j of d.jornadas) {
    if (!ABERTAS.includes(j.etapa)) continue;
    const p = paciente(j.pacienteId); if (!p) continue;
    const dias = diasDesde(j.etapaDesde);
    const link = `#/jornada/${j.id}`;
    if (j.etapa === 'novo' && dias >= 1) out.push({ cod: 'SEM RESP', titulo: p.nome, texto: `${j.pedido} sem resposta ${dias === 1 ? 'desde ontem' : `há ${dias} dias`}.`, peso: 3, link });
    if (j.etapa === 'exames' && dias >= 21) out.push({ cod: servico(j.servicoId)?.sigla || 'EXAME', titulo: p.nome, texto: `${dias} dias em Exames. Já fez o exame? Vale ligar.`, peso: 2, link });
    if (j.orcamento?.validade && j.orcamento.validade < hojeISO()) out.push({ cod: 'ORÇ', titulo: p.nome, texto: `Orçamento venceu em ${dataCurta(j.orcamento.validade + 'T12:00')}. Renove antes de cobrar.`, peso: 1, link });
  }
  for (const p of d.pacientes) {
    const link = `#/pacientes/${p.id}`;
    if (!soDigitos(p.telefone)) out.push({ cod: 'S/ TEL', titulo: p.nome, texto: 'Sem telefone. Sem ele não dá para confirmar consulta.', peso: 3, link });
    if (p.medida && paFora(p.medida.pa) && diasDesde(p.medida.em) >= 30) out.push({ cod: 'PA', titulo: p.nome, texto: `PA ${p.medida.pa} na última medida, há ${diasDesde(p.medida.em)} dias. Antecipar o retorno?`, peso: 2, link });
    if (p.alerta && p.medida && diasDesde(p.medida.em) >= 180) out.push({ cod: 'ALERTA', titulo: p.nome, texto: `${p.alerta}, sem consulta há ${diasDesde(p.medida.em)} dias.`, peso: 3, link, alerta: true });
  }
  for (const s of d.servicos) {
    if (s.status === 'arquivado') continue;
    const link = `#/servicos/${s.id}`;
    if (s.status === 'agenda-cheia' && s.statusDesde && diasDesde(s.statusDesde) >= 7) out.push({ cod: s.sigla, titulo: s.nome, texto: `Agenda cheia há ${diasDesde(s.statusDesde)} dias. Abrir horários extras?`, peso: 2, link });
    if (!s.preparo?.trim()) out.push({ cod: s.sigla, titulo: s.nome, texto: 'Sem orientação de preparo. A confirmação pelo WhatsApp vai sem ela.', peso: 1, link });
  }
  return out.sort((a, b) => b.peso - a.peso);
}

/* ---------------------------------------------------------------- tela: Hoje */
function telaHoje(el) {
  const d = D();
  const abertas = d.jornadas.filter((j) => ABERTAS.includes(j.etapa));
  const novos = d.jornadas.filter((j) => j.etapa === 'novo').sort((a, b) => b.criado.localeCompare(a.criado));
  const concluidasMes = d.jornadas.filter((j) => j.etapa === 'acompanhamento' && diasDesde(j.etapaDesde) <= 30).length;
  const emAberto = abertas.reduce((t, j) => t + saldo(j.orcamento), 0);
  const media = abertas.length ? Math.round(abertas.reduce((t, j) => t + diasDesde(j.criado), 0) / abertas.length) : 0;
  const limite = inicioDoDia(2);
  const tarefas = d.tarefas.filter((t) => !t.feita && new Date(t.venceEm) < limite).sort((a, b) => a.venceEm.localeCompare(b.venceEm));
  const lista = pendencias();
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const atrasadas = tarefas.filter((t) => atrasada(t.venceEm)).length;
  const pct = Math.min(100, (d.espaco.usado / d.espaco.limite) * 100);

  el.innerHTML = `
    <div class="cab">
      <div>
        <h1>Hoje</h1>
        <div class="meta">${esc(hoje)} · ${plural(novos.length, 'pedido novo', 'pedidos novos')} · ${plural(atrasadas, 'tarefa atrasada', 'tarefas atrasadas')}</div>
      </div>
      <div class="acoes"><button class="btn" data-nova-jornada>+ Nova jornada</button></div>
    </div>
    <dl class="numeros">
      <a href="#/jornada"><dt>Novos contatos</dt><dd>${novos.length}</dd></a>
      <a href="#/jornada"><dt>Em jornada</dt><dd>${abertas.length}</dd></a>
      <a href="#/jornada?ver=fechadas"><dt>Concluídas em 30 dias</dt><dd>${concluidasMes}</dd></a>
      <a href="#/jornada"><dt>Orçamentos em aberto</dt><dd>${brl(emAberto)}</dd></a>
      <a href="#/jornada"><dt>Média na jornada</dt><dd>${media}<small>${media === 1 ? 'dia' : 'dias'}</small></dd></a>
    </dl>
    <div class="grade-home">
      <section aria-labelledby="h-atencao">
        <h2 class="secao" id="h-atencao">Precisa de atenção <span class="num">${lista.length}</span></h2>
        ${lista.length === 0 ? '<p class="vazio">Tudo em ordem com pacientes e exames.</p>' : `
        <ul class="lista">
          ${lista.slice(0, 9).map((p) => `
            <li class="peso-${p.peso}"><a class="linha" href="${p.link}">
              <span class="sigla${p.alerta ? ' alerta' : ''}">${esc(p.cod)}</span>
              <span class="corpo"><span class="titulo">${esc(p.titulo)}</span><span class="sub">${esc(p.texto)}</span></span>
              <span class="seta" aria-hidden="true">→</span>
            </a></li>`).join('')}
        </ul>${lista.length > 9 ? `<p class="small muted" style="margin-top:8px">Mais ${lista.length - 9} itens com prioridade menor.</p>` : ''}`}
      </section>
      <div class="coluna">
        <section aria-labelledby="h-tarefas">
          <h2 class="secao" id="h-tarefas">Tarefas até amanhã <span class="num">${tarefas.length}</span><a class="link" href="#/jornada">Jornada</a></h2>
          ${tarefas.length === 0 ? '<p class="vazio">Nada marcado para hoje ou amanhã.</p>' : `
          <ul class="lista" id="lista-tarefas">
            ${tarefas.slice(0, 7).map((t) => linhaTarefa(t, true)).join('')}
          </ul>`}
        </section>
        <section aria-labelledby="h-novos">
          <h2 class="secao" id="h-novos">Novos contatos <span class="num">${novos.length}</span>${novos.length ? '<span class="ponto-vivo" aria-hidden="true"></span>' : ''}<a class="link" href="#/jornada">Ver todos</a></h2>
          ${novos.length === 0 ? '<p class="vazio">Nenhum paciente esperando resposta.</p>' : `
          <ul class="lista">
            ${novos.slice(0, 5).map((j) => { const p = paciente(j.pacienteId); const s = servico(j.servicoId); return `
              <li><a class="linha" href="#/jornada/${j.id}">
                <span class="corpo"><span class="titulo">${esc(p?.nome)}</span><span class="sub">${esc(j.pedido)}${s ? ` · ${esc(s.nome)}` : ''}</span></span>
                <span class="small faint">${tempoAtras(j.criado)}</span>
              </a></li>`; }).join('')}
          </ul>`}
        </section>
        <section aria-labelledby="h-espaco">
          <h2 class="secao" id="h-espaco">Espaço dos laudos e pedidos</h2>
          <div class="barra" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100" aria-labelledby="h-espaco"><div style="width:${pct.toFixed(1)}%"></div></div>
          <p class="small muted" style="margin:8px 0 0"><span class="num" style="color:var(--text-strong)">${(d.espaco.usado / 1048576).toFixed(0)} MB</span> de <span class="num">1 GB</span> · PDFs de laudo e fotos de pedido médico</p>
        </section>
      </div>
    </div>`;
  ligarTarefas(el);
  $('[data-nova-jornada]', el).onclick = () => modalNovaJornada();
}

function linhaTarefa(t, comRef) {
  const j = t.jornadaId ? jornada(t.jornadaId) : null;
  const p = j ? paciente(j.pacienteId) : t.pacienteId ? paciente(t.pacienteId) : null;
  const link = j ? `#/jornada/${j.id}` : p ? `#/pacientes/${p.id}` : '#/';
  const atr = atrasada(t.venceEm);
  return `<li class="tarefa" data-tarefa="${t.id}">
    <input type="checkbox" class="check" ${t.feita ? 'checked' : ''} aria-label="Concluir: ${esc(t.titulo)}">
    <a href="${link}" class="corpo" style="min-width:0;flex:1">
      <span class="titulo" style="display:block;font-size:13px;font-weight:600;color:var(--text-strong)${t.feita ? ';text-decoration:line-through;color:var(--text-faint)' : ''}">${esc(t.titulo)}</span>
      <span class="sub" style="display:block;font-size:12px;color:var(--text-muted)"><span class="${atr && !t.feita ? 'atrasada' : ''}">${atr && !t.feita ? 'Atrasada · ' : ''}${quandoVence(t.venceEm)}</span>${comRef && p ? ` · ${esc(p.nome)}` : ''}</span>
    </a>
  </li>`;
}
function ligarTarefas(el, aoMudar) {
  $$('[data-tarefa] .check', el).forEach((c) => {
    c.onchange = () => {
      const li = c.closest('[data-tarefa]');
      const t = D().tarefas.find((x) => x.id === li.dataset.tarefa);
      t.feita = c.checked; salvar();
      if (c.checked) {
        li.style.transition = 'opacity 180ms'; li.style.opacity = '.35';
        toast('Tarefa concluída', { desfazer: () => { t.feita = false; salvar(); render(); } });
        setTimeout(() => (aoMudar ? aoMudar() : render()), 380);
      } else (aoMudar ? aoMudar() : render());
    };
  });
}

/* ---------------------------------------------------------- tela: Jornada */
function telaJornada(el) {
  const ver = new URLSearchParams(location.hash.split('?')[1] || '').get('ver') === 'fechadas' ? 'fechadas' : 'abertas';
  const d = D();
  const abertas = d.jornadas.filter((j) => ABERTAS.includes(j.etapa));
  const fechadas = d.jornadas.filter((j) => !ABERTAS.includes(j.etapa) && diasDesde(j.etapaDesde) <= 90).sort((a, b) => b.etapaDesde.localeCompare(a.etapaDesde));

  el.innerHTML = `
    <div class="cab">
      <div><h1>Jornada do paciente</h1><div class="meta">Do primeiro contato ao acompanhamento. Arraste o cartão para a próxima etapa.</div></div>
      <div class="acoes">
        <div class="segmentos" role="group" aria-label="Mostrar">
          <button type="button" data-ver="abertas" aria-pressed="${ver === 'abertas'}">Em andamento<span class="num">${abertas.length}</span></button>
          <button type="button" data-ver="fechadas" aria-pressed="${ver === 'fechadas'}">Concluídas e perdidas<span class="num">${fechadas.length}</span></button>
        </div>
        <button class="btn acento" data-nova-jornada>+ Nova jornada</button>
      </div>
    </div>
    <div id="conteudo-jornada"></div>`;
  $$('[data-ver]', el).forEach((b) => (b.onclick = () => { location.hash = b.dataset.ver === 'fechadas' ? '#/jornada?ver=fechadas' : '#/jornada'; }));
  $('[data-nova-jornada]', el).onclick = () => modalNovaJornada();
  const alvo = $('#conteudo-jornada', el);

  if (ver === 'fechadas') {
    alvo.innerHTML = fechadas.length === 0 ? '<p class="vazio">Nenhuma jornada fechada nos últimos 90 dias.</p>' : `
      <div class="tabela-wrap"><table>
        <thead><tr><th>Paciente</th><th class="esconde-cel">Exame ou consulta</th><th>Resultado</th><th class="esconde-cel">Motivo / valor</th><th class="direita">Quando</th></tr></thead>
        <tbody>${fechadas.map((j) => { const p = paciente(j.pacienteId); const s = servico(j.servicoId); return `
          <tr class="clicavel" data-ir="#/jornada/${j.id}">
            <td><div class="titulo">${esc(p?.nome)}</div></td>
            <td class="esconde-cel">${esc(s?.nome || '—')}</td>
            <td><span class="status st-${j.etapa}">${ETAPA_NOME[j.etapa]}</span></td>
            <td class="esconde-cel">${j.etapa === 'perdido' ? esc(j.motivoPerda || '—') : `<span class="num">${brl(j.valorFinal)}</span>`}</td>
            <td class="direita num">${dataCurta(j.etapaDesde)}</td>
          </tr>`; }).join('')}</tbody>
      </table></div>`;
    $$('[data-ir]', alvo).forEach((tr) => (tr.onclick = () => { location.hash = tr.dataset.ir; }));
    return;
  }

  alvo.innerHTML = `<div class="quadro">${ETAPAS.map((e, i) => {
    const cards = abertas.filter((j) => j.etapa === e.id).sort((a, b) => a.etapaDesde.localeCompare(b.etapaDesde));
    const soma = cards.reduce((t, j) => t + saldo(j.orcamento), 0);
    return `<section class="etapa" data-etapa="${e.id}" aria-label="${e.nome}">
      <div class="etapa-cab"><span class="passo">${String(i + 1).padStart(2, '0')}</span><b>${e.nome}</b><span class="num">${cards.length}</span>${soma ? `<span class="valor num">${brl(soma)}</span>` : ''}</div>
      ${cards.map(cartaoJornada).join('') || `<div class="solto">${e.id === 'novo' ? 'Pedidos da Doctoralia aparecem aqui sozinhos. Os de WhatsApp e telefone entram por Nova jornada.' : 'Arraste um cartão para cá.'}</div>`}
    </section>`;
  }).join('')}</div>`;

  // Arrastar entre etapas
  let arrastado = null;
  $$('.cartao', alvo).forEach((c) => {
    c.addEventListener('dragstart', (e) => { arrastado = c.dataset.id; c.classList.add('arrastando'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', arrastado); });
    c.addEventListener('dragend', () => { c.classList.remove('arrastando'); $$('.etapa', alvo).forEach((x) => x.classList.remove('alvo')); });
    c.addEventListener('click', () => { location.hash = `#/jornada/${c.dataset.id}`; });
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter') location.hash = `#/jornada/${c.dataset.id}`; });
  });
  $$('.etapa', alvo).forEach((col) => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('alvo'); });
    col.addEventListener('dragleave', (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('alvo'); });
    col.addEventListener('drop', (e) => {
      e.preventDefault(); col.classList.remove('alvo');
      const id = e.dataTransfer.getData('text/plain') || arrastado;
      moverEtapa(id, col.dataset.etapa);
    });
  });
}
function cartaoJornada(j) {
  const p = paciente(j.pacienteId); const s = servico(j.servicoId);
  const prox = D().tarefas.filter((t) => t.jornadaId === j.id && !t.feita).sort((a, b) => a.venceEm.localeCompare(b.venceEm))[0];
  const dias = diasDesde(j.etapaDesde);
  const regua = Array.from({ length: 7 }, (_, i) => `<i class="${i < Math.min(7, Math.ceil(dias / 3)) ? 'on' : ''}"></i>`).join('');
  return `<article class="cartao" draggable="true" tabindex="0" data-id="${j.id}" aria-label="${esc(p?.nome)}, ${ETAPA_NOME[j.etapa]}">
    <div style="display:flex;gap:8px;align-items:flex-start;justify-content:space-between">
      <span class="nome">${esc(p?.nome)}</span>
      ${j.orcamento ? `<span class="num small" style="color:var(--text-strong)">${saldo(j.orcamento) ? brl(saldo(j.orcamento)) : 'Convênio'}</span>` : ''}
    </div>
    ${p?.alerta ? `<span class="alerta-clinico" style="justify-self:start;font-size:11px">${esc(p.alerta)}</span>` : ''}
    <span class="servico">${s ? `<span class="mono">${esc(s.sigla)}</span> ${esc(s.nome)}` : 'Ainda sem exame definido'}</span>
    <div class="rodape">
      <span title="Dias nesta etapa" style="display:flex;gap:6px;align-items:center"><span class="dias-regua${dias > 14 ? ' longo' : ''}" aria-hidden="true">${regua}</span><span class="num">${dias}d</span></span>
      <span class="${prox && atrasada(prox.venceEm) ? 'atrasada' : ''}" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${prox ? `${atrasada(prox.venceEm) ? 'Atrasada: ' : ''}${esc(prox.titulo)}` : 'Sem próxima tarefa'}</span>
    </div>
  </article>`;
}
function moverEtapa(id, etapa) {
  const j = jornada(id);
  if (!j || j.etapa === etapa) return;
  const antes = { etapa: j.etapa, etapaDesde: j.etapaDesde, hist: j.historico.length };
  j.etapa = etapa; j.etapaDesde = new Date().toISOString();
  j.historico.push({ id: db.novoId('h'), tipo: 'sistema', texto: `Movido para ${ETAPA_NOME[etapa]}.`, em: j.etapaDesde });
  salvar(); render();
  toast(`${paciente(j.pacienteId)?.nome.split(' ')[0]} foi para ${ETAPA_NOME[etapa]}`, {
    desfazer: () => { j.etapa = antes.etapa; j.etapaDesde = antes.etapaDesde; j.historico.length = antes.hist; salvar(); render(); },
  });
}

/* -------------------------------------------------------- modal: nova jornada */
function modalNovaJornada(pacienteId) {
  const d = D();
  const pre = pacienteId ? paciente(pacienteId) : null;
  abrirCamada(`
    <h2>Nova jornada</h2>
    <form id="f-nj" style="display:grid;gap:12px" novalidate>
      <label class="campo">Paciente <span class="ajuda">Nome de um paciente novo ou já cadastrado.</span>
        <input type="text" name="nome" value="${esc(pre?.nome)}" autocomplete="off" required></label>
      <div class="sugestoes" id="sug" hidden></div>
      <label class="campo">Telefone (WhatsApp)<input type="tel" name="telefone" value="${esc(pre?.telefone)}" placeholder="(41) 99999-0000"></label>
      <label class="campo">Exame ou consulta de interesse
        <select name="servico"><option value="">Ainda não definiu</option>${d.servicos.filter((s) => s.status !== 'arquivado').map((s) => `<option value="${s.id}">${esc(s.sigla)} · ${esc(s.nome)}</option>`).join('')}</select></label>
      <div class="form-grade">
        <label class="campo">Pedido<select name="pedido">${['Agendar consulta', 'Pedido de exame', 'Mensagem no WhatsApp', 'Segunda opinião'].map((o) => `<option>${o}</option>`).join('')}</select></label>
        <label class="campo">Como chegou<select name="origem">${ORIGENS.map((o) => `<option ${pre?.origem === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
      </div>
      <label class="campo">Anotação<textarea name="nota" rows="2" placeholder="Ex.: trouxe pedido de Holter do clínico geral"></textarea></label>
      <p class="aviso erro" id="nj-erro" hidden></p>
      <div class="acoes"><button type="button" class="btn fantasma" data-fechar>Cancelar</button><button class="btn acento">Criar jornada</button></div>
    </form>`, {
    aoAbrir: (m, fechar) => {
      const f = $('#f-nj', m); let escolhido = pre;
      $('[data-fechar]', m).onclick = fechar;
      f.nome.focus();
      f.nome.oninput = () => {
        escolhido = null;
        const q = f.nome.value.trim().toLowerCase();
        const achados = q.length < 2 ? [] : d.pacientes.filter((p) => p.nome.toLowerCase().includes(q) || soDigitos(p.telefone).includes(soDigitos(q) || '§')).slice(0, 5);
        const sug = $('#sug', m);
        sug.hidden = !achados.length;
        sug.innerHTML = achados.map((p) => `<button type="button" data-p="${p.id}">${esc(p.nome)} <span class="muted small">${esc(p.telefone || 'sem telefone')}</span></button>`).join('');
        $$('[data-p]', sug).forEach((b) => (b.onclick = () => { escolhido = paciente(b.dataset.p); f.nome.value = escolhido.nome; f.telefone.value = escolhido.telefone; f.origem.value = escolhido.origem; sug.hidden = true; }));
      };
      f.onsubmit = (e) => {
        e.preventDefault();
        const erro = $('#nj-erro', m);
        if (!f.nome.value.trim()) { erro.textContent = 'Informe o nome do paciente.'; erro.hidden = false; f.nome.classList.add('invalido'); return; }
        if (soDigitos(f.telefone.value).length < 10 && !escolhido) { erro.textContent = 'Informe o telefone com DDD. É por ele que a recepção confirma a consulta.'; erro.hidden = false; f.telefone.classList.add('invalido'); return; }
        let p = escolhido;
        const agora = new Date().toISOString();
        if (!p) {
          p = { id: db.novoId('p'), nome: f.nome.value.trim(), telefone: f.telefone.value.trim(), email: '', nascimento: '', convenio: 'Particular', origem: f.origem.value, riscos: [], medicacoes: '', alergias: '', alerta: '', medida: null, obs: '', criado: agora };
          d.pacientes.push(p);
        } else if (f.telefone.value.trim()) p.telefone = f.telefone.value.trim();
        const j = { id: db.novoId('j'), pacienteId: p.id, servicoId: f.servico.value || null, etapa: 'novo', pedido: f.pedido.value, criado: agora, etapaDesde: agora,
          historico: [{ id: db.novoId('h'), tipo: 'sistema', texto: `Jornada criada na recepção (${f.origem.value}).`, em: agora }], orcamento: null, motivoPerda: '', valorFinal: null };
        if (f.nota.value.trim()) j.historico.push({ id: db.novoId('h'), tipo: 'nota', texto: f.nota.value.trim(), em: agora });
        d.jornadas.push(j); salvar(); fechar();
        toast('Jornada criada');
        location.hash = `#/jornada/${j.id}`;
      };
    },
  });
}

/* --------------------------------------------------- tela: detalhe da jornada */
function telaJornadaDetalhe(el, id) {
  const d = D();
  const j = jornada(id);
  if (!j) { el.innerHTML = `<p class="vazio">Jornada não encontrada. <a class="btn" href="#/jornada">Voltar à jornada</a></p>`; return; }
  const p = paciente(j.pacienteId);
  const s = servico(j.servicoId);
  const aberta = ABERTAS.includes(j.etapa);
  const o = j.orcamento || { valor: s?.preco || 0, cobertura: 0, desconto: 0, forma: p?.convenio && p.convenio !== 'Particular' && s?.convenio ? 'Convênio' : 'A definir', parcelas: 1, validade: new Date(Date.now() + 15 * dia).toISOString().slice(0, 10), obs: '' };
  const tarefas = d.tarefas.filter((t) => t.jornadaId === j.id).sort((a, b) => Number(a.feita) - Number(b.feita) || a.venceEm.localeCompare(b.venceEm));
  const wa = soDigitos(p?.telefone);
  const placeholders = { ligacao: 'Como foi a ligação?', whatsapp: 'O que foi combinado no WhatsApp?', consulta: 'Resumo da consulta: queixa, conduta, exames pedidos', nota: 'O que aconteceu?' };

  el.innerHTML = `
    <a class="voltar" href="#/jornada">← Jornada</a>
    <div class="cab">
      <div>
        <h1>${esc(p?.nome)}</h1>
        <div class="meta">${esc(j.pedido)} · chegou por ${esc(p?.origem)} · ${tempoAtras(j.criado)} · <a href="#/pacientes/${p?.id}" style="text-decoration:underline">ficha do paciente</a></div>
      </div>
      <div class="acoes">
        ${wa.length >= 10 ? `<a class="btn" data-wa href="https://wa.me/55${wa}?text=${encodeURIComponent(`Olá, ${p.nome.split(' ')[0]}! Aqui é da ${d.settings.nome}.`)}" target="_blank" rel="noopener">Conversar no WhatsApp</a>` : '<button class="btn" disabled title="Paciente sem telefone">Sem telefone</button>'}
        ${aberta ? `
          <select id="mudar-etapa" aria-label="Etapa" style="width:auto">${ETAPAS.map((e) => `<option value="${e.id}" ${e.id === j.etapa ? 'selected' : ''}>${e.nome}</option>`).join('')}</select>
          <button class="btn escuro" id="concluir">Concluir</button>
          <button class="btn fantasma" id="perder">Não seguiu</button>` : `
          <span class="status st-${j.etapa}">${ETAPA_NOME[j.etapa]}${j.etapa === 'perdido' && j.motivoPerda ? ` · ${esc(j.motivoPerda)}` : ''}</span>
          <button class="btn" id="reabrir">Reabrir</button>`}
      </div>
    </div>
    <div class="detalhe">
      <div>
        <form class="registrar" id="f-reg">
          <div class="linha-acoes" role="group" aria-label="Tipo de registro">
            ${['ligacao', 'whatsapp', 'consulta', 'nota'].map((t, i) => `<button type="button" class="chip" data-tipo="${t}" aria-pressed="${i === 0}">${TIPOS_REG[t]}</button>`).join('')}
          </div>
          <textarea name="texto" rows="2" placeholder="${placeholders.ligacao}" aria-label="Registro"></textarea>
          <div class="linha-acoes"><span class="small faint">Fica no histórico do paciente, com data e hora.</span><button class="btn sm escuro" style="margin-left:auto">Registrar</button></div>
        </form>
        <h2 class="secao">Histórico</h2>
        ${j.historico.length ? `<ol class="historico">${[...j.historico].reverse().map((h) => `
          <li><span class="marco ${h.tipo}"></span>
            <span class="tipo">${TIPOS_REG[h.tipo] || 'Registro'}</span> <span class="quando">· ${dataCurta(h.em)} às ${hora(h.em)}</span>
            <p>${esc(h.texto)}</p></li>`).join('')}</ol>` : '<p class="vazio">Nada registrado ainda.</p>'}
      </div>
      <div>
        ${p?.alerta || p?.medida ? `<div class="painel">
          <h3>Antes de falar com o paciente</h3>
          ${p.alerta ? `<p style="margin:0 0 10px"><span class="alerta-clinico">${esc(p.alerta)}</span></p>` : ''}
          ${p.alergias ? `<div class="par"><span>Alergias</span><span>${esc(p.alergias)}</span></div>` : ''}
          ${p.medida ? `<div class="par"><span>Última PA · FC</span><b class="${paFora(p.medida.pa) ? 'atrasada' : ''}">${esc(p.medida.pa)} · ${esc(p.medida.fc)} bpm</b></div>` : ''}
          ${p.convenio ? `<div class="par"><span>Convênio</span><span>${esc(p.convenio)}</span></div>` : ''}
        </div>` : ''}
        <div class="painel">
          <h3>Exame ou consulta de interesse</h3>
          <select id="trocar-servico" aria-label="Trocar exame ou consulta"><option value="">Ainda não definiu</option>${d.servicos.filter((x) => x.status !== 'arquivado' || x.id === j.servicoId).map((x) => `<option value="${x.id}" ${x.id === j.servicoId ? 'selected' : ''}>${esc(x.sigla)} · ${esc(x.nome)} · ${brl(x.preco)}</option>`).join('')}</select>
          ${s ? `<p class="small muted" style="margin:10px 0 0"><b style="color:var(--text)">Preparo:</b> ${esc(s.preparo || 'sem orientação cadastrada.')}</p>` : ''}
        </div>
        <form class="painel" id="f-orc">
          <h3>Orçamento ${j.orcamento ? `<a class="small" style="margin-left:auto;font-weight:400;text-decoration:underline" href="#/orcamento/${j.id}">Imprimir</a>` : ''}</h3>
          <div class="form-grade">
            <label class="campo">Valor particular<input type="number" min="0" step="10" name="valor" value="${o.valor}"></label>
            <label class="campo">Coberto pelo convênio<input type="number" min="0" step="10" name="cobertura" value="${o.cobertura}"></label>
            <label class="campo">Desconto<input type="number" min="0" step="5" name="desconto" value="${o.desconto}"></label>
            <label class="campo">Forma de pagamento<select name="forma">${FORMAS.map((f) => `<option ${f === o.forma ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
            <label class="campo">Parcelas<input type="number" min="1" max="6" name="parcelas" value="${o.parcelas}"></label>
            <label class="campo">Válido até<input type="date" name="validade" value="${o.validade}"></label>
            <label class="campo inteiro">Observações no orçamento<input type="text" name="obs" value="${esc(o.obs)}" placeholder="Ex.: guia do convênio já autorizada"></label>
          </div>
          <div style="margin-top:12px">
            <div class="par"><span>Parcela</span><b id="o-parcela"></b></div>
            <div class="par total"><span>Saldo a pagar</span><b id="o-saldo"></b></div>
          </div>
          <button class="btn acento" style="width:100%;margin-top:12px">Salvar orçamento</button>
        </form>
        <div class="painel">
          <h3>Próximos passos</h3>
          ${tarefas.length ? `<ul class="lista" style="border:0">${tarefas.map((t) => linhaTarefa(t, false)).join('')}</ul>` : '<p class="small muted" style="margin:0 0 8px">Nenhum próximo passo marcado.</p>'}
          <form id="f-tarefa" style="display:grid;gap:8px;margin-top:10px">
            <input type="text" name="titulo" placeholder="Nova tarefa, ex.: confirmar consulta" aria-label="Nova tarefa">
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
              ${[['0', 'Hoje'], ['1', 'Amanhã'], ['7', 'Em 7 dias']].map(([v, l], i) => `<button type="button" class="chip" data-prazo="${v}" aria-pressed="${i === 1}">${l}</button>`).join('')}
              <button class="btn sm" style="margin-left:auto">Adicionar</button>
            </div>
          </form>
        </div>
        <button class="btn fantasma perigo" id="excluir" style="margin-top:16px">Excluir jornada</button>
      </div>
    </div>`;

  // Registro no histórico
  let tipo = 'ligacao';
  const fReg = $('#f-reg', el);
  $$('[data-tipo]', fReg).forEach((b) => (b.onclick = () => { tipo = b.dataset.tipo; $$('[data-tipo]', fReg).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); fReg.texto.placeholder = placeholders[tipo]; fReg.texto.focus(); }));
  fReg.onsubmit = (e) => {
    e.preventDefault();
    const texto = fReg.texto.value.trim();
    if (!texto) { fReg.texto.focus(); return; }
    j.historico.push({ id: db.novoId('h'), tipo, texto, em: new Date().toISOString() }); salvar(); render(); toast('Registrado no histórico');
  };
  $('[data-wa]', el)?.addEventListener('click', () => { j.historico.push({ id: db.novoId('h'), tipo: 'whatsapp', texto: 'Conversa aberta no WhatsApp.', em: new Date().toISOString() }); salvar(); setTimeout(render, 300); });

  // Etapa
  $('#mudar-etapa', el)?.addEventListener('change', (e) => moverEtapa(j.id, e.target.value));
  $('#trocar-servico', el).onchange = (e) => {
    j.servicoId = e.target.value || null;
    const novo = servico(j.servicoId);
    j.historico.push({ id: db.novoId('h'), tipo: 'sistema', texto: novo ? `Interesse: ${novo.nome}.` : 'Exame de interesse retirado.', em: new Date().toISOString() });
    if (novo && j.orcamento) j.orcamento.valor = novo.preco;
    salvar(); render(); toast('Exame de interesse atualizado');
  };

  // Orçamento
  const fo = $('#f-orc', el);
  const recalc = () => {
    const o2 = { valor: fo.valor.value, cobertura: fo.cobertura.value, desconto: fo.desconto.value };
    const sl = saldo(o2); const n = Math.max(1, Number(fo.parcelas.value) || 1);
    $('#o-saldo', el).textContent = brl(sl);
    $('#o-parcela', el).textContent = sl ? `${n}x de ${brl(sl / n)}` : '—';
  };
  fo.oninput = recalc; recalc();
  fo.onsubmit = (e) => {
    e.preventDefault();
    if ((Number(fo.cobertura.value) || 0) + (Number(fo.desconto.value) || 0) > (Number(fo.valor.value) || 0)) { toast('Cobertura e desconto passam do valor. Confira os números.', { erro: true }); return; }
    j.orcamento = { valor: Number(fo.valor.value) || 0, cobertura: Number(fo.cobertura.value) || 0, desconto: Number(fo.desconto.value) || 0, forma: fo.forma.value, parcelas: Math.max(1, Number(fo.parcelas.value) || 1), validade: fo.validade.value, obs: fo.obs.value.trim() };
    j.historico.push({ id: db.novoId('h'), tipo: 'sistema', texto: `Orçamento salvo: saldo ${brl(saldo(j.orcamento))} (${j.orcamento.forma}).`, em: new Date().toISOString() });
    salvar(); render(); toast('Orçamento salvo');
  };

  // Tarefas
  ligarTarefas(el, render);
  const ft = $('#f-tarefa', el); let prazo = 1;
  $$('[data-prazo]', ft).forEach((b) => (b.onclick = () => { prazo = Number(b.dataset.prazo); $$('[data-prazo]', ft).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
  ft.onsubmit = (e) => {
    e.preventDefault();
    if (!ft.titulo.value.trim()) { ft.titulo.focus(); return; }
    const v = new Date(); v.setDate(v.getDate() + prazo); v.setHours(prazo === 0 ? Math.min(18, v.getHours() + 2) : 10, 0, 0, 0);
    d.tarefas.push({ id: db.novoId('t'), jornadaId: j.id, titulo: ft.titulo.value.trim(), venceEm: v.toISOString(), feita: false });
    salvar(); render(); toast('Tarefa criada');
  };

  // Fechar / reabrir / excluir
  $('#concluir', el)?.addEventListener('click', () => abrirCamada(`
    <h2>Concluir jornada</h2>
    <p class="muted" style="margin:0">O paciente passa para <b>Em acompanhamento</b>. O retorno seguinte vira uma nova jornada.</p>
    <form id="f-c" style="display:grid;gap:12px">
      <label class="campo">Valor recebido<input type="number" name="valor" min="0" step="10" value="${saldo(j.orcamento) || s?.preco || 0}"></label>
      <label class="opcao"><input type="checkbox" name="retorno" checked><span>Criar tarefa de retorno em 90 dias<span class="muted">Aparece em Hoje quando chegar a data.</span></span></label>
      <div class="acoes"><button type="button" class="btn fantasma" data-fechar>Cancelar</button><button class="btn escuro">Concluir</button></div>
    </form>`, { aoAbrir: (m, fechar) => {
    $('[data-fechar]', m).onclick = fechar;
    $('#f-c', m).onsubmit = (e) => {
      e.preventDefault();
      const f = e.target; const agora = new Date().toISOString();
      j.etapa = 'acompanhamento'; j.etapaDesde = agora; j.valorFinal = Number(f.valor.value) || 0;
      j.historico.push({ id: db.novoId('h'), tipo: 'sistema', texto: `Concluída: em acompanhamento. Recebido ${brl(j.valorFinal)}.`, em: agora });
      if (f.retorno.checked) { const v = new Date(Date.now() + 90 * dia); v.setHours(10, 0, 0, 0); d.tarefas.push({ id: db.novoId('t'), pacienteId: p.id, titulo: `Retorno de 90 dias: ${p.nome.split(' ')[0]}`, venceEm: v.toISOString(), feita: false }); }
      d.tarefas.filter((t) => t.jornadaId === j.id).forEach((t) => (t.feita = true));
      salvar(); fechar(); render(); toast('Jornada concluída');
    };
  } }));
  $('#perder', el)?.addEventListener('click', () => abrirCamada(`
    <h2>Paciente não seguiu</h2>
    <p class="muted" style="margin:0">Escolha o motivo. Ele mostra onde o consultório perde pacientes.</p>
    <form id="f-p" style="display:grid;gap:8px">
      ${MOTIVOS.map((mo, i) => `<label class="opcao"><input type="radio" name="motivo" value="${esc(mo)}" ${i === 0 ? 'checked' : ''}><span>${esc(mo)}</span></label>`).join('')}
      <label class="opcao"><input type="radio" name="motivo" value="outro"><span>Outro motivo</span></label>
      <input type="text" name="outro" placeholder="Qual foi o motivo?" hidden>
      <div class="acoes"><button type="button" class="btn fantasma" data-fechar>Cancelar</button><button class="btn escuro">Marcar como não seguiu</button></div>
    </form>`, { aoAbrir: (m, fechar) => {
    const f = $('#f-p', m);
    $('[data-fechar]', m).onclick = fechar;
    f.onchange = () => { f.outro.hidden = f.motivo.value !== 'outro'; if (!f.outro.hidden) f.outro.focus(); };
    f.onsubmit = (e) => {
      e.preventDefault();
      const motivo = f.motivo.value === 'outro' ? f.outro.value.trim() || 'Outro' : f.motivo.value;
      const agora = new Date().toISOString();
      j.etapa = 'perdido'; j.etapaDesde = agora; j.motivoPerda = motivo;
      j.historico.push({ id: db.novoId('h'), tipo: 'sistema', texto: `Não seguiu: ${motivo}.`, em: agora });
      d.tarefas.filter((t) => t.jornadaId === j.id).forEach((t) => (t.feita = true));
      salvar(); fechar(); render(); toast('Jornada marcada como não seguiu');
    };
  } }));
  $('#reabrir', el)?.addEventListener('click', () => { moverEtapa(j.id, 'retorno'); });
  $('#excluir', el).onclick = () => {
    if (!confirm(`Excluir a jornada de ${p?.nome}? O histórico dela será apagado. A ficha do paciente continua.`)) return;
    d.jornadas = d.jornadas.filter((x) => x.id !== j.id);
    d.tarefas = d.tarefas.filter((t) => t.jornadaId !== j.id);
    salvar(); location.hash = '#/jornada'; toast('Jornada excluída');
  };
}

/* ------------------------------------------------------- tela: orçamento impresso */
function telaOrcamento(el, id) {
  const d = D(); const j = jornada(id);
  if (!j?.orcamento) { el.innerHTML = '<p class="vazio">Esta jornada ainda não tem orçamento salvo.</p>'; return; }
  const p = paciente(j.pacienteId); const s = servico(j.servicoId); const o = j.orcamento; const st = d.settings;
  const sl = saldo(o);
  el.innerHTML = `
    <div class="nao-imprimir" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;max-width:760px;margin-inline:auto">
      <a class="voltar" style="margin:0" href="#/jornada/${j.id}">← Voltar à jornada</a>
      <button class="btn acento" onclick="window.print()">Imprimir ou salvar PDF</button>
    </div>
    <article class="folha">
      <header>
        <div><h1>${esc(st.nome)}</h1><div class="small muted">${esc(st.medico)} · ${esc(st.registro)}</div></div>
        <div class="small muted" style="text-align:right">${esc(st.endereco)}<br>${esc(st.cidade)} · ${esc(st.whatsapp)}</div>
      </header>
      ${svgECG(680, 26, 16, 170, 0.9, 'ecg-folha')}
      <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div><div class="small muted">Orçamento para</div><b style="font-size:18px">${esc(p?.nome)}</b><div class="small muted">${esc(p?.convenio || '')}</div></div>
        <div class="small muted" style="text-align:right">Emitido em ${dataLonga(new Date().toISOString())}<br>Válido até <b class="num" style="color:var(--text)">${o.validade ? dataCurta(o.validade + 'T12:00') : '—'}</b></div>
      </div>
      <table style="margin-top:22px">
        <tbody>
          <tr><td><b>${esc(s?.nome || 'Atendimento cardiológico')}</b>${s ? `<div class="small muted">${esc(s.preparo)}</div>` : ''}</td><td class="direita num">${brl(o.valor)}</td></tr>
          ${o.cobertura ? `<tr><td>Coberto pelo convênio</td><td class="direita num">− ${brl(o.cobertura)}</td></tr>` : ''}
          ${o.desconto ? `<tr><td>Desconto</td><td class="direita num">− ${brl(o.desconto)}</td></tr>` : ''}
          <tr><td><b>Saldo a pagar</b><div class="small muted">${esc(o.forma)}${o.parcelas > 1 && sl ? ` · ${o.parcelas}x de ${brl(sl / o.parcelas)}` : ''}</div></td><td class="direita num" style="font-size:20px;font-weight:600">${brl(sl)}</td></tr>
        </tbody>
      </table>
      ${o.obs ? `<p style="margin-top:18px"><b>Observações:</b> ${esc(o.obs)}</p>` : ''}
      <footer>Valores válidos até a data indicada. Cobertura do convênio sujeita à autorização da operadora. Dúvidas pelo WhatsApp ${esc(st.whatsapp)}.</footer>
    </article>`;
}

/* -------------------------------------------------------------- tela: Pacientes */
function telaPacientes(el) {
  const d = D();
  el.innerHTML = `
    <div class="cab">
      <div><h1>Pacientes</h1><div class="meta">${plural(d.pacientes.length, 'paciente', 'pacientes')} · ${d.pacientes.filter((p) => p.alerta).length} com alerta clínico</div></div>
      <div class="acoes"><a class="btn acento" href="#/pacientes/novo">+ Novo paciente</a></div>
    </div>
    <div class="barra-filtros">
      <label class="campo-busca"><span class="sr">Buscar paciente</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="search" id="q" placeholder="Buscar por nome, telefone ou convênio"></label>
      <div class="segmentos" role="group" aria-label="Filtro">
        <button type="button" data-f="todos" aria-pressed="true">Todos</button>
        <button type="button" data-f="alerta" aria-pressed="false">Com alerta</button>
        <button type="button" data-f="pa" aria-pressed="false">PA fora da meta</button>
      </div>
    </div>
    <div class="tabela-wrap"><table>
      <thead><tr><th>Paciente</th><th>Telefone</th><th class="esconde-cel">Convênio</th><th class="esconde-cel">Chegou por</th><th class="esconde-cel">Última PA</th><th class="direita esconde-cel">Jornadas</th></tr></thead>
      <tbody id="tb"></tbody>
    </table></div>`;
  let filtro = 'todos';
  const desenhar = () => {
    const q = $('#q', el).value.trim().toLowerCase();
    const qd = soDigitos(q);
    const lista = d.pacientes
      .filter((p) => !q || p.nome.toLowerCase().includes(q) || p.convenio.toLowerCase().includes(q) || (qd && soDigitos(p.telefone).includes(qd)))
      .filter((p) => filtro === 'todos' || (filtro === 'alerta' ? p.alerta : p.medida && paFora(p.medida.pa)))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    $('#tb', el).innerHTML = lista.length ? lista.map((p) => {
      const n = d.jornadas.filter((j) => j.pacienteId === p.id).length;
      return `<tr class="clicavel" data-ir="#/pacientes/${p.id}">
        <td><div class="titulo">${esc(p.nome)}</div>${p.alerta ? `<span class="alerta-clinico" style="margin-top:3px;font-size:11px">${esc(p.alerta)}</span>` : `<div class="sub">${idade(p.nascimento) !== null ? `${idade(p.nascimento)} anos` : 'Idade não informada'}</div>`}</td>
        <td class="num">${p.telefone ? esc(p.telefone) : '<span class="atrasada">sem telefone</span>'}</td>
        <td class="esconde-cel">${esc(p.convenio)}</td>
        <td class="esconde-cel">${esc(p.origem)}</td>
        <td class="esconde-cel num">${p.medida ? `<span class="${paFora(p.medida.pa) ? 'atrasada' : ''}">${esc(p.medida.pa)}</span> <span class="faint small">${dataCurta(p.medida.em)}</span>` : '<span class="faint">—</span>'}</td>
        <td class="direita esconde-cel num">${n}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="6"><div class="vazio" style="border:0">Nenhum paciente com essa busca. <a href="#/pacientes/novo" style="text-decoration:underline">Cadastrar novo paciente</a></div></td></tr>`;
    $$('[data-ir]', el).forEach((tr) => (tr.onclick = () => { location.hash = tr.dataset.ir; }));
  };
  $('#q', el).oninput = desenhar;
  $$('[data-f]', el).forEach((b) => (b.onclick = () => { filtro = b.dataset.f; $$('[data-f]', el).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); desenhar(); }));
  desenhar();
  $('#q', el).focus();
}

/* ---------------------------------------------------------- tela: ficha do paciente */
function telaPaciente(el, id) {
  const d = D();
  const novo = id === 'novo';
  const p = novo ? { id: db.novoId('p'), nome: '', telefone: '', email: '', nascimento: '', convenio: 'Particular', origem: 'Telefone', riscos: [], medicacoes: '', alergias: '', alerta: '', medida: null, obs: '', criado: new Date().toISOString() } : paciente(id);
  if (!p) { el.innerHTML = `<p class="vazio">Paciente não encontrado. <a class="btn" href="#/pacientes">Voltar aos pacientes</a></p>`; return; }
  const jornadas = d.jornadas.filter((j) => j.pacienteId === p.id).sort((a, b) => b.criado.localeCompare(a.criado));
  const tarefas = d.tarefas.filter((t) => !t.feita && (t.pacienteId === p.id || jornadas.some((j) => j.id === t.jornadaId)));
  const id_ = idade(p.nascimento);
  const imc = null;

  el.innerHTML = `
    <a class="voltar" href="#/pacientes">← Pacientes</a>
    ${novo ? '<div class="cab"><div><h1>Novo paciente</h1><div class="meta">Nome e telefone bastam para começar. O resto pode ser preenchido na consulta.</div></div></div>' : `
    <div class="cab-paciente">
      <div class="iniciais" aria-hidden="true">${esc(iniciais(p.nome))}</div>
      <div style="flex:1;min-width:220px">
        <h1>${esc(p.nome)}</h1>
        <div class="meta">${id_ !== null ? `${id_} anos · ` : ''}${esc(p.convenio)} · chegou por ${esc(p.origem)} · paciente desde ${dataCurta(p.criado)}/${new Date(p.criado).getFullYear()}</div>
        ${p.alerta ? `<div style="margin-top:8px"><span class="alerta-clinico">${esc(p.alerta)}</span></div>` : ''}
      </div>
      <div class="acoes" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" id="nova-j">+ Nova jornada</button>
      </div>
    </div>
    <div class="sinais" style="margin-bottom:24px">
      <div><span>PA</span><b class="${p.medida && paFora(p.medida.pa) ? 'fora' : ''}">${p.medida ? esc(p.medida.pa) : '—'}</b><em>mmHg</em></div>
      <div><span>FC</span><b>${p.medida ? esc(p.medida.fc) : '—'}</b><em>bpm</em></div>
      <div><span>Medida em</span><b style="font-size:16px">${p.medida ? dataCurta(p.medida.em) : '—'}</b><em>${p.medida ? tempoAtras(p.medida.em) : 'sem registro'}</em></div>
      <div><span>Riscos</span><b>${p.riscos.length}</b><em>${p.riscos.length ? esc(p.riscos.slice(0, 2).join(', ')) + (p.riscos.length > 2 ? '…' : '') : 'nenhum marcado'}</em></div>
      <div class="ecg">${svgECG(400, 34, 22, Math.max(70, Math.round(60000 / (p.medida?.fc || 75) / 8)), 0.9)}</div>
    </div>`}
    <div class="detalhe">
      <form id="f-pac" novalidate>
        <div class="bloco">
          <h3>Dados do paciente</h3><p class="muted">Usados para confirmar consultas e mandar orientações de preparo.</p>
          <div class="form-grade">
            <label class="campo inteiro">Nome completo<input type="text" name="nome" value="${esc(p.nome)}" required></label>
            <label class="campo">Telefone (WhatsApp)<input type="tel" name="telefone" value="${esc(p.telefone)}" placeholder="(41) 99999-0000"></label>
            <label class="campo">E-mail<input type="email" name="email" value="${esc(p.email)}"></label>
            <label class="campo">Nascimento<input type="date" name="nascimento" value="${esc(p.nascimento)}"></label>
            <label class="campo">Convênio<select name="convenio">${CONVENIOS.map((c) => `<option ${c === p.convenio ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
            <label class="campo">Como chegou<select name="origem">${ORIGENS.map((o) => `<option ${o === p.origem ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
          </div>
        </div>
        <div class="bloco">
          <h3>Coração em resumo</h3><p class="muted">Para a recepção saber o essencial antes de ligar ou remarcar. O prontuário completo fica com a médica.</p>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px" role="group" aria-label="Fatores de risco">
            ${RISCOS.map((r) => `<button type="button" class="chip" data-risco="${esc(r)}" aria-pressed="${p.riscos.includes(r)}">${esc(r)}</button>`).join('')}
          </div>
          <div class="form-grade">
            <label class="campo inteiro">Alerta clínico <span class="ajuda">Aparece em vermelho em todas as telas. Ex.: anticoagulado, marca-passo, stent recente.</span><input type="text" name="alerta" value="${esc(p.alerta)}"></label>
            <label class="campo">Última PA (mmHg)<input type="text" name="pa" inputmode="numeric" value="${esc(p.medida?.pa)}" placeholder="120/80"></label>
            <label class="campo">Última FC (bpm)<input type="number" name="fc" min="20" max="250" value="${esc(p.medida?.fc)}"></label>
            <label class="campo inteiro">Remédios em uso<textarea name="medicacoes" rows="2">${esc(p.medicacoes)}</textarea></label>
            <label class="campo">Alergias<input type="text" name="alergias" value="${esc(p.alergias)}"></label>
            <label class="campo">Observações da recepção<input type="text" name="obs" value="${esc(p.obs)}" placeholder="Ex.: prefere ligação à tarde"></label>
          </div>
        </div>
        ${novo ? '<button class="btn acento">Cadastrar paciente</button>' : `
        <div class="bloco"><h3>Dados pessoais (LGPD)</h3><p class="muted">O paciente pode pedir a exclusão dos dados. Apaga a ficha, as jornadas e as tarefas dele.</p>
          <button type="button" class="btn perigo" id="excluir-p">Excluir paciente e dados</button></div>`}
        <div class="barra-salvar" id="barra-salvar" hidden><span>Alterações não salvas</span><button type="button" class="btn fantasma" id="descartar">Descartar</button><button class="btn acento">Salvar ficha</button></div>
      </form>
      ${novo ? '<div></div>' : `
      <div>
        <div class="painel">
          <h3>Jornadas <span class="num faint" style="font-weight:400">${jornadas.length}</span></h3>
          ${jornadas.length ? `<ul class="lista" style="border-bottom:0">${jornadas.map((j) => { const s = servico(j.servicoId); return `
            <li><a class="linha" href="#/jornada/${j.id}">
              <span class="sigla">${esc(s?.sigla || '—')}</span>
              <span class="corpo"><span class="titulo">${esc(s?.nome || j.pedido)}</span><span class="sub">${dataCurta(j.criado)} · ${ETAPA_NOME[j.etapa]}</span></span>
              <span class="seta">→</span></a></li>`; }).join('')}</ul>` : '<p class="small muted" style="margin:0">Nenhuma jornada ainda.</p>'}
        </div>
        <div class="painel">
          <h3>Tarefas abertas <span class="num faint" style="font-weight:400">${tarefas.length}</span></h3>
          ${tarefas.length ? `<ul class="lista" style="border:0">${tarefas.map((t) => linhaTarefa(t, false)).join('')}</ul>` : '<p class="small muted" style="margin:0">Nada pendente com este paciente.</p>'}
        </div>
      </div>`}
    </div>`;

  const f = $('#f-pac', el);
  let riscos = [...p.riscos];
  const sujo = () => { if (!novo) { $('#barra-salvar', el).hidden = false; saindoComAlteracoes = true; } };
  f.addEventListener('input', sujo);
  $$('[data-risco]', f).forEach((b) => (b.onclick = () => {
    const r = b.dataset.risco; riscos = riscos.includes(r) ? riscos.filter((x) => x !== r) : [...riscos, r];
    b.setAttribute('aria-pressed', String(riscos.includes(r))); sujo();
  }));
  $('#descartar', el)?.addEventListener('click', () => { saindoComAlteracoes = null; render(); });
  f.onsubmit = (e) => {
    e.preventDefault();
    if (!f.nome.value.trim()) { f.nome.classList.add('invalido'); f.nome.focus(); toast('Informe o nome do paciente.', { erro: true }); return; }
    if (f.pa.value.trim() && !/^\d{2,3}\s*\/\s*\d{2,3}$/.test(f.pa.value.trim())) { f.pa.classList.add('invalido'); f.pa.focus(); toast('Escreva a PA como 120/80.', { erro: true }); return; }
    const antesPA = p.medida?.pa; const antesFC = String(p.medida?.fc ?? '');
    Object.assign(p, { nome: f.nome.value.trim(), telefone: f.telefone.value.trim(), email: f.email.value.trim(), nascimento: f.nascimento.value, convenio: f.convenio.value, origem: f.origem.value,
      alerta: f.alerta.value.trim(), medicacoes: f.medicacoes.value.trim(), alergias: f.alergias.value.trim(), obs: f.obs.value.trim(), riscos });
    const pa = f.pa.value.replace(/\s/g, '');
    if (pa && (pa !== antesPA || f.fc.value !== antesFC)) p.medida = { pa, fc: Number(f.fc.value) || null, em: new Date().toISOString() };
    if (novo) d.pacientes.push(p);
    saindoComAlteracoes = null; salvar();
    toast(novo ? 'Paciente cadastrado' : 'Ficha salva');
    if (novo) location.hash = `#/pacientes/${p.id}`; else render();
  };
  $('#nova-j', el)?.addEventListener('click', () => modalNovaJornada(p.id));
  $('#excluir-p', el)?.addEventListener('click', () => {
    if (!confirm(`Excluir ${p.nome} e todos os dados dele (ficha, jornadas e tarefas)? Não dá para desfazer.`)) return;
    const js = d.jornadas.filter((j) => j.pacienteId === p.id).map((j) => j.id);
    d.pacientes = d.pacientes.filter((x) => x.id !== p.id);
    d.jornadas = d.jornadas.filter((j) => j.pacienteId !== p.id);
    d.tarefas = d.tarefas.filter((t) => t.pacienteId !== p.id && !js.includes(t.jornadaId));
    saindoComAlteracoes = null; salvar(); location.hash = '#/pacientes'; toast('Paciente e dados excluídos');
  });
  ligarTarefas(el, render);
  if (novo) f.nome.focus();
  void imc;
}

/* ------------------------------------------------------- tela: Exames e consultas */
function telaServicos(el) {
  const d = D();
  const contar = (st) => d.servicos.filter((s) => s.status === st).length;
  let filtro = new URLSearchParams(location.hash.split('?')[1] || '').get('status') || 'ativos';
  el.innerHTML = `
    <div class="cab">
      <div><h1>Exames e consultas</h1><div class="meta">O que o consultório oferece. Preço e preparo vão nos orçamentos e nas confirmações pelo WhatsApp.</div></div>
      <div class="acoes"><a class="btn acento" href="#/servicos/novo">+ Novo exame ou consulta</a></div>
    </div>
    <div class="barra-filtros">
      <div class="segmentos" role="group" aria-label="Status">
        <button type="button" data-st="ativos">Ativos<span class="num">${d.servicos.filter((s) => s.status !== 'arquivado').length}</span></button>
        <button type="button" data-st="disponivel">Disponíveis<span class="num">${contar('disponivel')}</span></button>
        <button type="button" data-st="agenda-cheia">Agenda cheia<span class="num">${contar('agenda-cheia')}</span></button>
        <button type="button" data-st="pausado">Pausados<span class="num">${contar('pausado')}</span></button>
        <button type="button" data-st="arquivado">Arquivados<span class="num">${contar('arquivado')}</span></button>
      </div>
      <label class="campo-busca"><span class="sr">Filtrar</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="search" id="q" placeholder="Filtrar por nome ou sigla"></label>
    </div>
    <div class="tabela-wrap"><table>
      <thead><tr><th>Sigla</th><th>Exame ou consulta</th><th class="direita">Particular</th><th class="esconde-cel direita">Duração</th><th class="esconde-cel">Convênio</th><th class="esconde-cel direita">No mês</th><th>Status</th></tr></thead>
      <tbody id="tb"></tbody>
    </table></div>`;
  const desenhar = () => {
    $$('[data-st]', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.st === filtro)));
    const q = $('#q', el).value.trim().toLowerCase();
    const lista = d.servicos.filter((s) => (filtro === 'ativos' ? s.status !== 'arquivado' : s.status === filtro)).filter((s) => !q || s.nome.toLowerCase().includes(q) || s.sigla.toLowerCase().includes(q));
    $('#tb', el).innerHTML = lista.length ? lista.map((s) => `
      <tr class="clicavel" data-ir="#/servicos/${s.id}">
        <td><span class="sigla" style="min-width:70px">${esc(s.sigla)}</span></td>
        <td><div class="titulo">${esc(s.nome)}</div><div class="sub">${esc(s.categoria)}</div></td>
        <td class="direita num">${brl(s.preco)}</td>
        <td class="esconde-cel direita num">${s.duracao} min</td>
        <td class="esconde-cel">${s.convenio ? 'Aceita' : '<span class="faint">Só particular</span>'}</td>
        <td class="esconde-cel direita num">${s.realizadosMes}</td>
        <td data-parar><select data-status="${s.id}" aria-label="Status de ${esc(s.nome)}" style="height:30px;width:auto;font-size:13px">${Object.entries(STATUS_SERV).map(([k, v]) => `<option value="${k}" ${k === s.status ? 'selected' : ''}>${v}</option>`).join('')}</select></td></tr>`).join('') : `<tr><td colspan="7"><div class="vazio" style="border:0">Nada neste filtro. Mude o filtro ou a busca.</div></td></tr>`;
    $$('[data-ir]', el).forEach((tr) => (tr.onclick = (e) => { if (!e.target.closest('[data-parar]')) location.hash = tr.dataset.ir; }));
    $$('[data-status]', el).forEach((sel) => (sel.onchange = () => {
      const s = servico(sel.dataset.status); const antes = s.status;
      s.status = sel.value; s.statusDesde = new Date().toISOString(); salvar();
      toast(`${s.sigla}: ${STATUS_SERV[s.status]}`, { desfazer: () => { s.status = antes; salvar(); render(); } });
    }));
  };
  $$('[data-st]', el).forEach((b) => (b.onclick = () => { filtro = b.dataset.st; desenhar(); }));
  $('#q', el).oninput = desenhar;
  desenhar();
}

function telaServico(el, id) {
  const d = D();
  const novo = id === 'novo';
  const s = novo ? { id: db.novoId('s'), sigla: '', nome: '', categoria: 'Exame', preco: 0, duracao: 30, convenio: true, status: 'disponivel', preparo: '', realizadosMes: 0, criado: new Date().toISOString() } : servico(id);
  if (!s) { el.innerHTML = `<p class="vazio">Não encontrado. <a class="btn" href="#/servicos">Voltar</a></p>`; return; }
  const procura = d.jornadas.filter((j) => j.servicoId === s.id && ABERTAS.includes(j.etapa)).length;
  el.innerHTML = `
    <a class="voltar" href="#/servicos">← Exames e consultas</a>
    <div class="cab">
      <div><h1>${novo ? 'Novo exame ou consulta' : esc(s.nome)}</h1>
      <div class="meta">${novo ? 'Comece pelo nome e pelo preço particular.' : `<span class="mono">${esc(s.sigla)}</span> · ${STATUS_SERV[s.status]} · ${plural(procura, 'paciente em jornada', 'pacientes em jornada')}`}</div></div>
    </div>
    <div class="detalhe">
      <form id="f-s" novalidate>
        <div class="bloco"><h3>Cadastro</h3><p class="muted">A sigla aparece nos cartões da jornada e nas pendências.</p>
          <div class="form-grade">
            <label class="campo inteiro">Nome<input type="text" name="nome" value="${esc(s.nome)}" placeholder="Ex.: Holter 24 horas" required></label>
            <label class="campo">Sigla<input type="text" name="sigla" value="${esc(s.sigla)}" maxlength="10" style="text-transform:uppercase;font-family:var(--font-mono)" placeholder="HOLTER"></label>
            <label class="campo">Tipo<select name="categoria">${['Consulta', 'Exame', 'Check-up'].map((c) => `<option ${c === s.categoria ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
            <label class="campo">Preço particular (R$)<input type="number" name="preco" min="0" step="10" value="${s.preco}"></label>
            <label class="campo">Duração (min)<input type="number" name="duracao" min="5" step="5" value="${s.duracao}"></label>
            <label class="campo">Status<select name="status">${Object.entries(STATUS_SERV).map(([k, v]) => `<option value="${k}" ${k === s.status ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
            <div style="display:grid;gap:8px;align-content:end">
              <label class="opcao"><input type="checkbox" name="convenio" ${s.convenio ? 'checked' : ''}><span>Aceita convênio</span></label>
            </div>
          </div>
        </div>
        <div class="bloco"><h3>Textos para o paciente</h3><p class="muted">O preparo vai junto na confirmação pelo WhatsApp. Escreva como você falaria no telefone.</p>
          <div class="form-grade">
            <label class="campo inteiro">Preparo<textarea name="preparo" rows="3" placeholder="Ex.: Sem jejum. Vir com roupa de duas peças.">${esc(s.preparo)}</textarea></label>
          </div>
        </div>
        ${novo ? '<button class="btn acento">Cadastrar</button>' : `<div class="bloco"><button type="button" class="btn perigo" id="arquivar">${s.status === 'arquivado' ? 'Excluir de vez' : 'Arquivar'}</button></div>`}
        <div class="barra-salvar" id="barra-salvar" hidden><span>Alterações não salvas</span><button type="button" class="btn fantasma" id="descartar">Descartar</button><button class="btn acento">Salvar</button></div>
      </form>
      <div>
        <div class="painel" id="previa">
          <h3>Como aparece na confirmação</h3>
          <div id="msg" style="background:#eef6ea;border-radius:8px 8px 8px 2px;padding:10px 12px;font-size:13px;line-height:1.5;white-space:pre-line"></div>
        </div>
        ${novo ? '' : `<div class="painel"><h3>Neste mês</h3>
          <div class="par"><span>Realizados</span><b>${s.realizadosMes}</b></div>
          <div class="par"><span>Em jornada agora</span><b>${procura}</b></div>
          <div class="par"><span>Faturamento particular estimado</span><b>${brl(s.realizadosMes * s.preco)}</b></div></div>`}
      </div>
    </div>`;
  const f = $('#f-s', el);
  const previa = () => {
    $('#msg', el).textContent = `Olá, Maria! Sua ${f.categoria.value === 'Consulta' ? 'consulta' : 'marcação'} de ${f.nome.value || '…'} está confirmada para quinta, 14h, na ${d.settings.nome}.\n\nPreparo: ${f.preparo.value.trim() || '(sem orientação cadastrada)'}\n\nEndereço: ${d.settings.endereco}.`;
  };
  previa();
  f.addEventListener('input', () => { previa(); if (!novo) { $('#barra-salvar', el).hidden = false; saindoComAlteracoes = true; } });
  $('#descartar', el)?.addEventListener('click', () => { saindoComAlteracoes = null; render(); });
  f.onsubmit = (e) => {
    e.preventDefault();
    if (!f.nome.value.trim()) { f.nome.classList.add('invalido'); f.nome.focus(); toast('Informe o nome.', { erro: true }); return; }
    const antes = s.status;
    Object.assign(s, { nome: f.nome.value.trim(), sigla: (f.sigla.value.trim() || f.nome.value.trim().split(' ')[0].slice(0, 6)).toUpperCase(), categoria: f.categoria.value, preco: Number(f.preco.value) || 0,
      duracao: Number(f.duracao.value) || 30, status: f.status.value, convenio: f.convenio.checked, preparo: f.preparo.value.trim() });
    if (antes !== s.status) s.statusDesde = new Date().toISOString();
    if (novo) d.servicos.push(s);
    saindoComAlteracoes = null; salvar(); toast(novo ? 'Cadastrado' : 'Salvo');
    if (novo) location.hash = `#/servicos/${s.id}`; else render();
  };
  $('#arquivar', el)?.addEventListener('click', () => {
    if (s.status === 'arquivado') {
      if (!confirm(`Excluir ${s.nome} de vez? Jornadas que citam este exame ficam sem exame definido.`)) return;
      d.servicos = d.servicos.filter((x) => x.id !== s.id);
      d.jornadas.forEach((j) => { if (j.servicoId === s.id) j.servicoId = null; });
      saindoComAlteracoes = null; salvar(); location.hash = '#/servicos'; toast('Excluído');
      return;
    }
    const antes = s.status; s.status = 'arquivado'; salvar();
    saindoComAlteracoes = null; location.hash = '#/servicos';
    toast(`${s.nome} arquivado`, { desfazer: () => { s.status = antes; salvar(); render(); } });
  });
}

/* ---------------------------------------------------------- tela: Divulgação */
function telaDivulgacao(el) {
  const d = D(); const dv = d.divulgacao;
  const ST = { publicado: 'Publicado', analise: 'Em análise', nao: 'Não publicado' };
  const link = `https://wa.me/55${soDigitos(d.settings.whatsapp)}?text=${encodeURIComponent(`Olá! Vi o perfil da ${d.settings.nome} no Google e quero marcar uma consulta.`)}`;
  const ativos = d.servicos.filter((s) => !['arquivado', 'pausado'].includes(s.status));
  el.innerHTML = `
    <div class="cab"><div><h1>Divulgação</h1><div class="meta">Leve os exames e consultas para a Doctoralia e para o perfil no Google.</div></div></div>
    <p class="aviso info" style="margin:0 0 24px">Publicidade médica segue a Resolução CFM nº 2.336/2023: sem promessa de resultado, sem antes e depois e sempre com CRM e RQE da responsável (<b>${esc(d.settings.medico)} · ${esc(d.settings.registro)}</b>).</p>
    <div class="bloco">
      <h3 style="display:flex;align-items:center;gap:10px">Doctoralia ${dv.doctoralia ? '<span class="status st-acompanhamento">Conectada</span>' : '<span class="status st-nao">Não conectada</span>'}</h3>
      <p class="muted">Publique os exames com preço e preparo no perfil da médica. Os pedidos de lá entram sozinhos na Jornada.</p>
      ${dv.doctoralia ? `
        <div class="tabela-wrap"><table><thead><tr><th>Exame ou consulta</th><th class="direita esconde-cel">Preço</th><th>Na Doctoralia</th><th class="direita"></th></tr></thead><tbody>
        ${ativos.map((s) => { const st = dv.perfis[s.id] || 'nao'; return `<tr>
          <td><div class="titulo">${esc(s.nome)}</div><div class="sub mono">${esc(s.sigla)}</div></td>
          <td class="direita num esconde-cel">${brl(s.preco)}</td>
          <td><span class="status st-${st}">${ST[st]}</span></td>
          <td class="direita">${!s.preparo ? '<span class="small faint">Falta o preparo</span>' : `<button class="btn sm" data-pub="${s.id}">${st === 'nao' ? 'Publicar' : 'Atualizar'}</button>`}</td></tr>`; }).join('')}
        </tbody></table></div>
        <button class="btn fantasma sm" id="desconectar" style="margin-top:10px">Desconectar</button>` : '<button class="btn escuro" id="conectar">Conectar conta da Doctoralia</button>'}
    </div>
    <div class="bloco">
      <h3>Perfil da Empresa no Google</h3>
      <p class="muted">Cole este link no botão "Agendar" do perfil no Google Maps. Quem clica abre o WhatsApp do consultório com a mensagem pronta. Ao criar a jornada, marque "Google" em Como chegou.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;max-width:560px"><input type="text" readonly value="${esc(link)}" id="link-ag" class="mono" style="flex:1;min-width:220px;font-size:13px" aria-label="Link do WhatsApp para o Google"><button class="btn" id="copiar">Copiar link</button></div>
    </div>`;
  $('#conectar', el)?.addEventListener('click', (e) => {
    e.target.disabled = true; e.target.textContent = 'Conectando…';
    setTimeout(() => { dv.doctoralia = true; salvar(); render(); toast('Doctoralia conectada'); }, 900);
  });
  $('#desconectar', el)?.addEventListener('click', () => { if (confirm('Desconectar a Doctoralia? Os exames publicados continuam lá até você tirar pelo site deles.')) { dv.doctoralia = false; salvar(); render(); } });
  $$('[data-pub]', el).forEach((b) => (b.onclick = () => {
    const id = b.dataset.pub; const era = dv.perfis[id];
    b.disabled = true; b.textContent = 'Enviando…';
    setTimeout(() => { dv.perfis[id] = era === 'publicado' ? 'publicado' : 'analise'; salvar(); render(); toast(era ? 'Atualizado na Doctoralia' : 'Enviado. A Doctoralia revisa em até 1 dia útil.'); }, 700);
  }));
  $('#copiar', el).onclick = async () => { try { await navigator.clipboard.writeText($('#link-ag', el).value); toast('Link copiado'); } catch { $('#link-ag', el).select(); toast('Selecionado. Use Ctrl+C para copiar.'); } };
}

/* ---------------------------------------------------------- tela: Consultório */
function telaConsultorio(el) {
  const d = D(); const st = d.settings;
  const campo = (nome, rotulo, ajuda = '', tipo = 'text', cls = '') => `<label class="campo ${cls}">${rotulo}${ajuda ? ` <span class="ajuda">${ajuda}</span>` : ''}<input type="${tipo}" name="${nome}" value="${esc(st[nome])}"></label>`;
  el.innerHTML = `
    <div class="cab"><div><h1>Consultório</h1><div class="meta">Dados que aparecem nos orçamentos e nas mensagens. Salvou, mudou na hora.</div></div></div>
    <form id="f-cfg" novalidate>
      <div class="bloco"><h3>Contato</h3><p class="muted">Usado nos orçamentos impressos e nas mensagens de WhatsApp.</p>
        <div class="form-grade">
          ${campo('nome', 'Nome do consultório')}
          ${campo('whatsapp', 'WhatsApp', '', 'tel')}
          ${campo('telefone', 'Telefone fixo', '', 'tel')}
          ${campo('instagram', 'Instagram')}
          ${campo('endereco', 'Endereço', '', 'text', 'inteiro')}
          ${campo('cidade', 'Cidade / UF')}
          ${campo('horario', 'Horário')}
        </div></div>
      <div class="bloco"><h3>Responsável técnica</h3><p class="muted">Obrigatório em toda peça de divulgação médica.</p>
        <div class="form-grade">${campo('medico', 'Médica responsável')}${campo('registro', 'CRM e RQE')}</div></div>
      <div class="barra-salvar" id="barra-salvar" hidden><span>Alterações não salvas</span><button type="button" class="btn fantasma" id="descartar">Descartar</button><button class="btn acento">Salvar</button></div>
    </form>
    <form class="bloco" id="f-senha" novalidate style="max-width:560px">
      <h3>Senha de acesso</h3><p class="muted">Na demonstração a senha não é guardada; o formulário mostra como funciona.</p>
      <div style="display:grid;gap:12px">
        <label class="campo">Senha atual<input type="password" name="atual" autocomplete="off"></label>
        <label class="campo">Nova senha <span class="ajuda">Mínimo de 10 caracteres.</span><input type="password" name="nova" autocomplete="off"></label>
        <label class="campo">Repita a nova senha<input type="password" name="repete" autocomplete="off"></label>
        <p class="aviso erro" id="senha-erro" hidden></p>
        <button class="btn" style="justify-self:start">Trocar senha</button>
      </div>
    </form>`;
  const f = $('#f-cfg', el);
  f.addEventListener('input', () => { $('#barra-salvar', el).hidden = false; saindoComAlteracoes = true; });
  $('#descartar', el).onclick = () => { saindoComAlteracoes = null; render(); };
  f.onsubmit = (e) => {
    e.preventDefault();
    for (const k of ['nome', 'whatsapp', 'telefone', 'instagram', 'endereco', 'cidade', 'horario', 'medico', 'registro']) st[k] = f[k].value.trim();
    saindoComAlteracoes = null; salvar(); render(); toast('Dados do consultório salvos');
  };
  const fs = $('#f-senha', el);
  fs.onsubmit = (e) => {
    e.preventDefault(); const erro = $('#senha-erro', el);
    const msg = !fs.atual.value ? 'Informe a senha atual.' : fs.nova.value.length < 10 ? 'A nova senha precisa ter pelo menos 10 caracteres.' : fs.nova.value !== fs.repete.value ? 'As duas senhas novas não são iguais.' : '';
    erro.textContent = msg; erro.hidden = !msg;
    if (!msg) { fs.reset(); toast('Senha trocada. Os outros aparelhos foram desconectados.'); }
  };
}

/* ------------------------------------------------------- busca rápida (Ctrl+K) */
function abrirBusca() {
  if ($('.paleta')) return;
  const acoes = [
    ['Abrir a jornada do paciente', '#/jornada'], ['Nova jornada', () => modalNovaJornada()], ['Cadastrar paciente', '#/pacientes/novo'],
    ['Cadastrar exame ou consulta', '#/servicos/novo'], ['Divulgação (Doctoralia e Google)', '#/divulgacao'], ['Dados do consultório', '#/consultorio'],
  ];
  abrirCamada(`
    <input type="search" placeholder="Buscar paciente, telefone, exame ou ação…" aria-label="Busca rápida" autocomplete="off">
    <ul role="listbox"></ul>
    <div class="rodape"><span><kbd>↑</kbd> <kbd>↓</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> fechar</span></div>`, {
    classe: 'paleta',
    aoAbrir: (m, fechar) => {
      const inp = $('input', m); const ul = $('ul', m);
      let itens = []; let sel = 0;
      const desenhar = () => {
        const q = inp.value.trim().toLowerCase(); const qd = soDigitos(q);
        const pac = D().pacientes.filter((p) => q && (p.nome.toLowerCase().includes(q) || (qd.length >= 3 && soDigitos(p.telefone).includes(qd)))).slice(0, 6)
          .map((p) => ({ grupo: 'Pacientes', txt: p.nome, tipo: p.alerta ? p.alerta : p.telefone, ir: `#/pacientes/${p.id}` }));
        const srv = D().servicos.filter((s) => q && (s.nome.toLowerCase().includes(q) || s.sigla.toLowerCase().includes(q))).slice(0, 4)
          .map((s) => ({ grupo: 'Exames e consultas', txt: s.nome, tipo: s.sigla, ir: `#/servicos/${s.id}` }));
        const ac = acoes.filter(([t]) => !q || t.toLowerCase().includes(q)).map(([t, ir]) => ({ grupo: 'Ações', txt: t, tipo: '', ir }));
        itens = [...pac, ...srv, ...ac]; sel = Math.min(sel, Math.max(0, itens.length - 1));
        let grupo = '';
        ul.innerHTML = itens.length ? itens.map((it, i) => { const g = it.grupo !== grupo ? `<li class="grupo" role="presentation">${(grupo = it.grupo)}</li>` : ''; return `${g}<li role="option" data-i="${i}" aria-selected="${i === sel}">${esc(it.txt)}<span class="tipo">${esc(it.tipo)}</span></li>`; }).join('') : '<li class="grupo" style="text-transform:none;letter-spacing:0">Nada encontrado.</li>';
        $$('[data-i]', ul).forEach((li) => { li.onclick = () => ir(Number(li.dataset.i)); li.onmousemove = () => { if (sel !== Number(li.dataset.i)) { sel = Number(li.dataset.i); marcar(); } }; });
      };
      const marcar = () => $$('[data-i]', ul).forEach((li) => li.setAttribute('aria-selected', String(Number(li.dataset.i) === sel)));
      const ir = (i) => { const it = itens[i]; if (!it) return; fechar(); typeof it.ir === 'function' ? it.ir() : (location.hash = it.ir); };
      inp.oninput = () => { sel = 0; desenhar(); };
      inp.onkeydown = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(itens.length - 1, sel + 1); marcar(); $(`[data-i="${sel}"]`, ul)?.scrollIntoView({ block: 'nearest' }); }
        if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); marcar(); $(`[data-i="${sel}"]`, ul)?.scrollIntoView({ block: 'nearest' }); }
        if (e.key === 'Enter') { e.preventDefault(); ir(sel); }
      };
      desenhar(); inp.focus();
    },
  });
}
$('#abrir-busca').onclick = abrirBusca;
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && entrou()) { e.preventDefault(); const p = $('.paleta'); if (p) p.parentElement.remove(); else abrirBusca(); }
});

render();
