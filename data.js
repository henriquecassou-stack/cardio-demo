// Dados de exemplo da demonstração. Tudo fica só neste navegador (localStorage).
// As datas são relativas a hoje, para a demonstração parecer sempre "do dia".

const CHAVE = 'ritmo-cardio-demo-v1';

function quando(dias, h = 9, m = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

let seq = 1000;
const uid = (p) => `${p}${++seq}`;

function semente() {
  seq = 1000;
  const servicos = [
    { id: 's1', sigla: 'CONS', nome: 'Consulta cardiológica', categoria: 'Consulta', preco: 420, duracao: 40, convenio: true, status: 'disponivel', destaque: true,
      preparo: 'Trazer exames anteriores e a lista de remédios em uso, com as doses.', descricao: 'Avaliação clínica completa com ECG de repouso no mesmo dia, quando indicado.', realizadosMes: 61, criado: quando(-400) },
    { id: 's2', sigla: 'ECG', nome: 'Eletrocardiograma de repouso', categoria: 'Exame', preco: 120, duracao: 15, convenio: true, status: 'disponivel', destaque: false,
      preparo: 'Sem preparo. Evite cremes no peito no dia do exame.', descricao: 'Registro de 12 derivações com laudo no mesmo dia.', realizadosMes: 88, criado: quando(-400) },
    { id: 's3', sigla: 'ECO-TT', nome: 'Ecocardiograma transtorácico', categoria: 'Exame', preco: 480, duracao: 30, convenio: true, status: 'agenda-cheia', destaque: true,
      preparo: 'Sem jejum. Vir com roupa de duas peças.', descricao: 'Ecocardiograma com Doppler colorido, laudo em até 2 dias úteis.', realizadosMes: 47, criado: quando(-380), statusDesde: quando(-9) },
    { id: 's4', sigla: 'HOLTER', nome: 'Holter 24 horas', categoria: 'Exame', preco: 390, duracao: 20, convenio: true, status: 'disponivel', destaque: true,
      preparo: 'Tomar banho antes da instalação: o aparelho não pode molhar por 24 h. Anotar sintomas no diário.', descricao: 'Monitorização contínua do ritmo cardíaco por 24 horas.', realizadosMes: 22, criado: quando(-350) },
    { id: 's5', sigla: 'MAPA', nome: 'MAPA 24 horas', categoria: 'Exame', preco: 340, duracao: 20, convenio: true, status: 'disponivel', destaque: false,
      preparo: 'Usar camisa de manga larga. Manter a rotina normal e os remédios, salvo orientação médica.', descricao: 'Monitorização ambulatorial da pressão arterial por 24 horas.', realizadosMes: 18, criado: quando(-350) },
    { id: 's6', sigla: 'TE', nome: 'Teste ergométrico', categoria: 'Exame', preco: 360, duracao: 45, convenio: true, status: 'disponivel', destaque: true,
      preparo: 'Refeição leve 2 h antes. Tênis e roupa de academia. Pergunte ao médico sobre suspender betabloqueador.', descricao: 'Teste de esforço em esteira com monitorização contínua.', realizadosMes: 29, criado: quando(-330) },
    { id: 's7', sigla: 'RISCO', nome: 'Avaliação de risco cirúrgico', categoria: 'Consulta', preco: 520, duracao: 40, convenio: true, status: 'disponivel', destaque: false,
      preparo: 'Trazer o pedido do cirurgião e exames de sangue recentes.', descricao: 'Liberação cardiológica para cirurgia com relatório para a equipe cirúrgica.', realizadosMes: 14, criado: quando(-300) },
    { id: 's8', sigla: 'CHECK', nome: 'Check-up cardiológico completo', categoria: 'Check-up', preco: 1690, duracao: 180, convenio: false, status: 'disponivel', destaque: true,
      preparo: 'Jejum de 8 h para os exames de sangue. Reserve a manhã.', descricao: 'Consulta, ECG, ecocardiograma, teste ergométrico e exames laboratoriais em uma manhã.', realizadosMes: 6, criado: quando(-120) },
    { id: 's9', sigla: 'ESPORTE', nome: 'Avaliação pré-participação esportiva', categoria: 'Consulta', preco: 650, duracao: 60, convenio: false, status: 'disponivel', destaque: false,
      preparo: '', descricao: '', realizadosMes: 3, criado: quando(-75) },
    { id: 's10', sigla: 'ECO-ESF', nome: 'Ecocardiograma sob estresse', categoria: 'Exame', preco: 980, duracao: 60, convenio: true, status: 'pausado', destaque: false,
      preparo: 'Jejum de 4 h. Suspender betabloqueador 48 h antes, só com orientação médica.', descricao: 'Ecocardiograma com estresse farmacológico. Pausado até a troca do aparelho.', realizadosMes: 0, criado: quando(-260), statusDesde: quando(-21) },
  ];

  const P = (id, nome, telefone, extra) => ({ id, nome, telefone, email: '', nascimento: '', convenio: 'Particular', origem: 'Site', riscos: [], medicacoes: '', alergias: '', alerta: '', medida: null, obs: '', criado: quando(-30), ...extra });
  const pacientes = [
    P('p1', 'Maria Aparecida Lopes', '(41) 99734-2210', { nascimento: '1956-03-14', convenio: 'Unimed', origem: 'Indicação médica', riscos: ['Hipertensão', 'Diabetes'], medicacoes: 'Losartana 50 mg 2x/dia, Metformina 850 mg', medida: { pa: '152/94', fc: 78, em: quando(-34) }, criado: quando(-210), email: 'cida.lopes@gmail.com' }),
    P('p2', 'José Roberto Fagundes', '(41) 98812-0457', { nascimento: '1949-11-02', convenio: 'Bradesco Saúde', origem: 'Convênio', riscos: ['Fibrilação atrial', 'Hipertensão'], medicacoes: 'Varfarina 5 mg, Bisoprolol 5 mg', alerta: 'Anticoagulado (varfarina)', alergias: 'Dipirona', medida: { pa: '128/80', fc: 64, em: quando(-12) }, criado: quando(-500) }),
    P('p3', 'Ana Beatriz Kowalski', '(41) 99641-3388', { nascimento: '1988-07-21', origem: 'Instagram', medida: { pa: '118/74', fc: 92, em: quando(-3) }, obs: 'Palpitações à noite há 2 meses.', criado: quando(-6), email: 'anabk@outlook.com' }),
    P('p4', 'Carlos Eduardo Menezes Bittencourt Filho', '(41) 99102-7745', { nascimento: '1971-01-30', convenio: 'SulAmérica', origem: 'Google', riscos: ['Dislipidemia', 'Tabagismo', 'Histórico familiar'], medicacoes: 'Rosuvastatina 10 mg', medida: { pa: '138/88', fc: 71, em: quando(-20) }, criado: quando(-25) }),
    P('p5', 'Rosângela Teixeira', '(41) 98455-9012', { nascimento: '1962-05-08', convenio: 'Unimed', origem: 'Indicação médica', riscos: ['Hipertensão'], medicacoes: 'Anlodipino 5 mg', alerta: 'Marca-passo (DDD, 2021)', medida: { pa: '146/90', fc: 60, em: quando(-95) }, criado: quando(-700) }),
    P('p6', 'Thiago Nascimento', '(41) 99877-1290', { nascimento: '1994-09-12', origem: 'Site', obs: 'Vai começar triatlo, quer avaliação.', criado: quando(-1), email: 'thiago.nasc@gmail.com' }),
    P('p7', 'Luiz Fernando Pacheco', '(41) 99230-5561', { nascimento: '1958-12-19', convenio: 'Amil', origem: 'Convênio', riscos: ['Diabetes', 'Dislipidemia'], medicacoes: 'Insulina NPH, Atorvastatina 40 mg, AAS 100 mg', alergias: 'Iodo (contraste)', medida: { pa: '134/82', fc: 74, em: quando(-41) }, criado: quando(-90) }),
    P('p8', 'Helena Duarte Sobczak', '(41) 99512-8034', { nascimento: '1979-04-03', convenio: 'Bradesco Saúde', origem: 'Indicação médica', obs: 'Cirurgia de joelho marcada para 02/12.', criado: quando(-4) }),
    P('p9', 'Antônio Carlos Ribas', '(41) 98701-6623', { nascimento: '1945-06-27', convenio: 'Unimed', origem: 'Indicação médica', riscos: ['Insuficiência cardíaca', 'Hipertensão'], medicacoes: 'Sacubitril/valsartana, Espironolactona 25 mg, Furosemida 40 mg', alerta: 'Insuficiência cardíaca FE 32%', medida: { pa: '108/68', fc: 66, em: quando(-15) }, criado: quando(-820) }),
    P('p10', 'Patrícia Gomes Araújo', '(41) 99345-7781', { nascimento: '1983-02-17', origem: 'Doctoralia', criado: quando(-2) }),
    P('p11', 'Marcos Vinícius Zanetti', '(41) 99088-4512', { nascimento: '1967-10-09', convenio: 'SulAmérica', origem: 'Google', riscos: ['Hipertensão', 'Obesidade'], medida: { pa: '162/100', fc: 84, em: quando(-8) }, medicacoes: 'Nenhum', criado: quando(-14) }),
    P('p12', 'Sueli Martins de Oliveira', '(41) 98822-3307', { nascimento: '1952-08-25', convenio: 'Unimed', origem: 'Convênio', riscos: ['Doença coronariana', 'Dislipidemia'], medicacoes: 'Clopidogrel 75 mg, Rosuvastatina 20 mg, Metoprolol 50 mg', alerta: 'Stent em DA (2024) · antiagregante', medida: { pa: '124/76', fc: 58, em: quando(-60) }, criado: quando(-600) }),
    P('p13', 'Gabriel Henrique Tavares', '(41) 99671-0098', { nascimento: '2001-03-30', origem: 'Instagram', criado: quando(-9) }),
    P('p14', 'Denise Cordeiro', '(41) 99456-2283', { nascimento: '1975-11-11', convenio: 'Amil', origem: 'Site', riscos: ['Hipertensão'], medida: { pa: '140/90', fc: 77, em: quando(-28) }, criado: quando(-40) }),
    P('p15', 'Osvaldo Prestes', '(41) 3335-1840', { nascimento: '1940-01-05', convenio: 'Unimed', origem: 'Indicação médica', riscos: ['Fibrilação atrial'], medicacoes: 'Apixabana 5 mg', alerta: 'Anticoagulado (apixabana)', medida: { pa: '132/78', fc: 88, em: quando(-200) }, criado: quando(-900), obs: 'Filha (Regina) acompanha. Ligar no fixo.' }),
    P('p16', 'Fernanda Lima Schmitt', '', { nascimento: '1990-06-14', origem: 'Site', criado: quando(0, 7, 40), email: 'fe.schmitt@gmail.com' }),
    P('p17', 'Ricardo Ogliari', '(41) 99923-6604', { nascimento: '1964-09-01', convenio: 'Particular', origem: 'Google', riscos: ['Tabagismo'], criado: quando(-50) }),
    P('p18', 'Juliana Prado Hoffmann', '(41) 99780-1145', { nascimento: '1986-12-22', convenio: 'Bradesco Saúde', origem: 'Indicação de paciente', criado: quando(-70) }),
  ];

  const H = (tipo, texto, dias, h = 10, m = 0) => ({ id: uid('h'), tipo, texto, em: quando(dias, h, m) });
  const J = (id, pacienteId, servicoId, etapa, pedido, criado, desde, historico = [], extra = {}) => ({
    id, pacienteId, servicoId, etapa, pedido, criado, etapaDesde: desde, historico, orcamento: null, motivoPerda: '', valorFinal: null, ...extra,
  });
  const jornadas = [
    J('j1', 'p6', 's9', 'novo', 'Agendar consulta', quando(-1, 18, 22), quando(-1, 18, 22), [H('sistema', 'Pedido pelo site: "Vou começar triatlo em março e preciso de liberação."', -1, 18, 22)]),
    J('j2', 'p16', 's4', 'novo', 'Pedido de exame', quando(0, 7, 40), quando(0, 7, 40), [H('sistema', 'Pedido pelo site com foto do pedido médico (Holter 24 h). Sem telefone informado.', 0, 7, 40)]),
    J('j3', 'p10', 's1', 'novo', 'Mensagem pelo site', quando(-2, 21, 5), quando(-2, 21, 5), [H('sistema', 'Veio pela Doctoralia: "Atendem Unimed? Sinto falta de ar ao subir escada."', -2, 21, 5)]),
    J('j4', 'p3', 's4', 'consulta', 'Agendar consulta', quando(-6), quando(-5), [
      H('sistema', 'Pedido pelo site: palpitações à noite.', -6, 20, 10), H('whatsapp', 'Consulta marcada para quinta 14h. Enviadas as orientações.', -5, 9, 15)]),
    J('j5', 'p8', 's7', 'consulta', 'Agendar consulta', quando(-4), quando(-3), [
      H('ligacao', 'Precisa de risco cirúrgico até 25/11. Cirurgia de joelho dia 02/12.', -3, 11, 0)],
      { orcamento: { valor: 520, cobertura: 520, desconto: 0, forma: 'Convênio', parcelas: 1, validade: quando(20).slice(0, 10), obs: 'Coberto pelo Bradesco Saúde. Guia autorizada.' } }),
    J('j6', 'p4', 's6', 'exames', 'Pedido de exame', quando(-25), quando(-12), [
      H('consulta', 'Consulta: dor torácica atípica. Pedidos teste ergométrico e perfil lipídico.', -12, 15, 0),
      H('nota', 'Aguardando autorização da SulAmérica para o teste ergométrico.', -9, 10, 30)],
      { orcamento: { valor: 360, cobertura: 360, desconto: 0, forma: 'Convênio', parcelas: 1, validade: quando(10).slice(0, 10), obs: '' } }),
    J('j7', 'p11', 's5', 'exames', 'Agendar consulta', quando(-14), quando(-8), [
      H('consulta', 'Consulta: PA 162/100 no consultório. Iniciada medicação e pedido MAPA.', -8, 16, 20)],
      { orcamento: { valor: 340, cobertura: 0, desconto: 30, forma: 'Pix', parcelas: 1, validade: quando(5).slice(0, 10), obs: 'SulAmérica não cobre MAPA no plano dele. Desconto à vista.' } }),
    J('j8', 'p1', 's3', 'exames', 'Pedido de exame', quando(-40), quando(-30), [
      H('consulta', 'Retorno: piora da pressão. Pedido ecocardiograma.', -34, 9, 30), H('ligacao', 'Não atendeu. Deixado recado.', -21, 14, 0)]),
    J('j9', 'p14', 's1', 'retorno', 'Agendar consulta', quando(-40), quando(-26), [
      H('consulta', 'Primeira consulta. Ajuste de anti-hipertensivo.', -28, 10, 0), H('whatsapp', 'Enviado lembrete do retorno em 30 dias.', -26, 10, 40)]),
    J('j10', 'p7', 's3', 'retorno', 'Pedido de exame', quando(-90), quando(-41), [
      H('consulta', 'Ecocardiograma realizado. FE 58%, sem alterações relevantes.', -41, 11, 0)]),
    J('j11', 'p13', 's2', 'consulta', 'Mensagem pelo site', quando(-9), quando(-7), [
      H('whatsapp', 'Quer ECG para academia. Marcado ECG + consulta curta.', -7, 13, 0)],
      { orcamento: { valor: 540, cobertura: 0, desconto: 40, forma: 'Cartão de crédito', parcelas: 2, validade: quando(-1).slice(0, 10), obs: 'Consulta + ECG no mesmo horário.' } }),
    J('j12', 'p2', 's2', 'acompanhamento', 'Agendar consulta', quando(-120), quando(-12), [H('consulta', 'Controle de INR ok. Retorno em 3 meses.', -12, 9, 0)], { valorFinal: 540 }),
    J('j13', 'p17', 's8', 'perdido', 'Mensagem pelo site', quando(-50), quando(-35), [H('ligacao', 'Achou o check-up caro. Vai fazer pelo convênio da empresa.', -35, 17, 0)], { motivoPerda: 'Achou caro' }),
    J('j14', 'p18', 's6', 'acompanhamento', 'Pedido de exame', quando(-70), quando(-44), [H('consulta', 'Teste ergométrico normal.', -44, 8, 0)], { valorFinal: 360 }),
    J('j15', 'p9', 's1', 'retorno', 'Agendar consulta', quando(-60), quando(-15), [H('consulta', 'IC estável. Ajuste de diurético. Retorno em 15 dias.', -15, 10, 0)]),
  ];

  const T = (titulo, dias, h, ref) => ({ id: uid('t'), titulo, venceEm: quando(dias, h), feita: false, ...ref });
  const tarefas = [
    T('Ligar para pedir o telefone (pedido sem contato)', 0, 10, { jornadaId: 'j2' }),
    T('Responder pela Doctoralia se atende Unimed', -1, 9, { jornadaId: 'j3' }),
    T('Confirmar consulta de quinta 14h', 0, 16, { jornadaId: 'j4' }),
    T('Cobrar autorização da SulAmérica (teste ergométrico)', -2, 11, { jornadaId: 'j6' }),
    T('Marcar instalação do MAPA', 1, 9, { jornadaId: 'j7' }),
    T('Oferecer novo horário de eco (agenda cheia)', -5, 14, { jornadaId: 'j8' }),
    T('Lembrar retorno de 30 dias', 1, 10, { jornadaId: 'j9' }),
    T('Enviar relatório de risco cirúrgico ao ortopedista', 3, 12, { jornadaId: 'j5' }),
    T('Retorno de 15 dias: IC (Sr. Antônio)', 0, 15, { jornadaId: 'j15' }),
    T('Ligar no fixo: retorno anual (falar com Regina)', -40, 10, { pacienteId: 'p15' }),
  ];

  const settings = {
    nome: 'Ritmo Cardiologia',
    medico: 'Dra. Helena Maranhão',
    registro: 'CRM-PR 31.482 · RQE 18.207',
    whatsapp: '(41) 99812-4470',
    telefone: '(41) 3022-6181',
    endereco: 'Rua Padre Anchieta, 1846 – sala 704, Bigorrilho',
    cidade: 'Curitiba – PR',
    horario: 'Seg a Sex 7h30 às 19h · Sáb 8h às 12h',
    instagram: '@ritmocardiologia',
    frase: 'Consulta e exames do coração no mesmo andar, no Bigorrilho.',
    anos: '14 anos',
    sobre: 'Consultório de cardiologia clínica com ecocardiograma, Holter, MAPA e teste ergométrico no mesmo andar. A Dra. Helena atende adultos e idosos e faz avaliação de risco cirúrgico e esportiva.',
    convenios: 'Unimed, Bradesco Saúde, SulAmérica, Amil',
    mostrarConvenios: true,
    mostrarPrecos: false,
  };

  return {
    versao: 1,
    settings,
    servicos,
    pacientes,
    jornadas,
    tarefas,
    vitrine: { publicada: ['s8', 's1', 's3', 's6', 's4'], rascunho: null },
    divulgacao: { doctoralia: false, perfis: { s1: 'publicado', s3: 'publicado', s4: 'analise' }, pixel: '' },
    espaco: { usado: 612 * 1024 * 1024, limite: 1024 * 1024 * 1024 },
  };
}

let memoria = null;
export const db = {
  get dados() {
    if (memoria) return memoria;
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo) memoria = JSON.parse(salvo);
    } catch { /* sem armazenamento: usa só a memória */ }
    if (!memoria) { memoria = semente(); this.salvar(); }
    return memoria;
  },
  salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(memoria)); } catch { /* segue só em memória */ }
  },
  recomecar() {
    try { localStorage.removeItem(CHAVE); } catch { /* nada */ }
    memoria = semente();
    this.salvar();
  },
  novoId: (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
};
