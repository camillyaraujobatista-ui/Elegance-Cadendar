// Elegance Calendar - lógica da interface e integração com a API
/* =========================================================
   ELEGANCE CALENDAR — lógica do protótipo
   Dados guardados em memória (sem backend) para fins de demonstração do TCC.
   ========================================================= */

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const WEEKDAY_SHORT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

/* ---------- estado da aplicação ---------- */
const state = {
  userName: 'Roberta',
  today: new Date(),
  cycleLength: 28,
  periodLength: 5,
  lastPeriodStart: null,      // Date do último início de menstruação
  selectedDate: new Date(),   // dia selecionado no calendário / week strip
  calCursor: new Date(),      // mês exibido no calendário
  routine: [
    { id:'water', emoji:'💧', title:'Beber 2L de água', desc:'Meta diária de hidratação', done:true },
    { id:'meditate', emoji:'🧘‍♀️', title:'Meditação ou Alongamento', desc:'10 minutos para autocuidado', done:false },
    { id:'vitamin', emoji:'💊', title:'Vitaminas / Anticoncepcional', desc:'Tomar logo após o café', done:false },
  ],
  loggedDays: {}, // "YYYY-MM-DD": { symptoms:[...], period:bool }
  denuncias: [],
};

// define um ciclo de exemplo começando 12 dias atrás, para bater com o rascunho ("Dia 12 do ciclo")
state.lastPeriodStart = addDays(state.today, -11);

/* ---------- helpers de data ---------- */
function addDays(date, days){
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function sameDay(a,b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function toKey(d){
  return d.getFullYear()+"-"+(d.getMonth()+1).toString().padStart(2,'0')+"-"+d.getDate().toString().padStart(2,'0');
}
function cycleDayOf(date){
  const diff = Math.floor((stripTime(date) - stripTime(state.lastPeriodStart)) / 86400000);
  const mod = ((diff % state.cycleLength) + state.cycleLength) % state.cycleLength;
  return mod + 1; // dia 1 a cycleLength
}
function stripTime(d){
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function phaseColorOf(cycleDay){
  const ovulationDay = state.cycleLength - 14; // aprox.
  if(cycleDay <= state.periodLength) return '--rose-dark';
  if(cycleDay < ovulationDay - 1) return '--rose';
  if(cycleDay <= ovulationDay + 1) return '--gold';
  return '--sage';
}
function isFertileDay(cycleDay){
  const ovulationDay = state.cycleLength - 14;
  return cycleDay >= ovulationDay - 4 && cycleDay <= ovulationDay + 1;
}
function isOvulationDay(cycleDay){
  const ovulationDay = state.cycleLength - 14;
  return cycleDay === ovulationDay;
}
function isPeriodDay(cycleDay){
  return cycleDay <= state.periodLength;
}

/* =========================================================
   TELA: INÍCIO
   ========================================================= */
function renderInicio(){
  document.getElementById('monthLabel').textContent =
    MONTH_NAMES[state.today.getMonth()] + " " + state.today.getFullYear();

  renderWeekStrip();
  renderCycleCard();
  renderRoutine();
}

function renderWeekStrip(){
  const strip = document.getElementById('weekStrip');
  strip.innerHTML = '';
  const start = addDays(state.today, -2);
  for(let i=0; i<7; i++){
    const d = addDays(start, i);
    const chip = document.createElement('div');
    chip.className = 'day-chip' + (sameDay(d, state.selectedDate) ? ' selected' : '');
    const cd = cycleDayOf(d);
    chip.innerHTML = `
      <span class="dow">${WEEKDAY_SHORT[d.getDay()]}</span>
      <span class="num">${d.getDate().toString().padStart(2,'0')}</span>
      ${isPeriodDay(cd) ? '<div class="period-dot"></div>' : ''}
    `;
    chip.addEventListener('click', () => {
      state.selectedDate = d;
      renderWeekStrip();
      renderCycleCard();
    });
    strip.appendChild(chip);
  }
}

function renderCycleCard(){
  const cd = cycleDayOf(state.selectedDate);
  const daysRemaining = state.cycleLength - cd;

  document.getElementById('wheelDay').textContent = cd;
  document.getElementById('periodCountdown').textContent = daysRemaining >= 0
    ? `Faltam ${daysRemaining} dias para o próximo período`
    : 'Novo ciclo começando';

  const wheelLabelEl = document.querySelector('.wheel-label');
  wheelLabelEl.textContent = daysRemaining >= 0 ? `${daysRemaining} dias restantes` : 'novo ciclo';

  const circumference = 2 * Math.PI * 60;
  const progress = cd / state.cycleLength;
  const progressEl = document.getElementById('wheelProgress');
  progressEl.style.strokeDasharray = `${circumference * progress} ${circumference}`;
  progressEl.style.stroke = `var(${phaseColorOf(cd)})`;
}

function renderRoutine(){
  const list = document.getElementById('routineList');
  list.innerHTML = '';
  state.routine.forEach(item => {
    const row = document.createElement('div');
    row.className = 'routine-item';
    row.innerHTML = `
      <span class="routine-emoji">${item.emoji}</span>
      <div class="routine-texts">
        <strong>${item.title}</strong>
        <span>${item.desc}</span>
      </div>
      <div class="routine-check ${item.done ? 'done' : ''}">${item.done ? '✓' : ''}</div>
      <div class="row-actions">
        <button class="row-action edit-routine" title="Editar">✎</button>
        <button class="row-action del-routine" title="Excluir">✕</button>
      </div>
    `;
    row.querySelector('.routine-check').addEventListener('click', () => {
      item.done = !item.done;
      renderRoutine();
      if(item.done) showToast(`"${item.title}" concluído ✨`);
    });
    row.querySelector('.edit-routine').addEventListener('click', () => openRoutineModal(item));
    row.querySelector('.del-routine').addEventListener('click', () => {
      state.routine = state.routine.filter(r => r.id !== item.id);
      renderRoutine();
      showToast('Rotina removida');
    });
    list.appendChild(row);
  });
}

/* ----- modal: nova/editar rotina ----- */
const ICON_OPTIONS = ['💧','🧘‍♀️','💊','🍎','🚶‍♀️','😴','📖','🧴','✨','❤️','🌿','☀️'];
let editingRoutineId = null;
let selectedRoutineIcon = '✨';

function renderIconPicker(selected){
  const wrap = document.getElementById('iconPicker');
  wrap.innerHTML = '';
  ICON_OPTIONS.forEach(icon => {
    const chip = document.createElement('div');
    chip.className = 'icon-chip' + (icon === selected ? ' selected' : '');
    chip.textContent = icon;
    chip.addEventListener('click', () => {
      selectedRoutineIcon = icon;
      renderIconPicker(icon);
    });
    wrap.appendChild(chip);
  });
}

function openRoutineModal(item){
  editingRoutineId = item ? item.id : null;
  document.getElementById('routineModalTitle').textContent = item ? 'Editar rotina' : 'Nova rotina';
  document.getElementById('routineTitle').value = item ? item.title : '';
  document.getElementById('routineDesc').value = item ? item.desc : '';
  selectedRoutineIcon = item ? item.emoji : '✨';
  renderIconPicker(selectedRoutineIcon);
  document.getElementById('routineModalOverlay').classList.add('open');
}

document.getElementById('btnAddRoutine').addEventListener('click', () => openRoutineModal(null));
document.getElementById('routineModalCancel').addEventListener('click', () => {
  document.getElementById('routineModalOverlay').classList.remove('open');
});
document.getElementById('routineModalSave').addEventListener('click', () => {
  const title = document.getElementById('routineTitle').value.trim();
  const desc = document.getElementById('routineDesc').value.trim();
  if(!title){
    showToast('Dê um título para a rotina');
    return;
  }
  if(editingRoutineId){
    const item = state.routine.find(r => r.id === editingRoutineId);
    item.title = title;
    item.desc = desc;
    item.emoji = selectedRoutineIcon;
    showToast('Rotina atualizada ✨');
  } else {
    state.routine.push({ id:'r'+Date.now(), emoji:selectedRoutineIcon, title, desc, done:false });
    showToast('Rotina adicionada 🌿');
  }
  document.getElementById('routineModalOverlay').classList.remove('open');
  renderRoutine();
});

/* =========================================================
   TELA: CALENDÁRIO
   ========================================================= */
function renderCalendario(){
  const label = MONTH_NAMES[state.calCursor.getMonth()] + " " + state.calCursor.getFullYear();
  document.getElementById('calMonthLabel').textContent = label;

  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  const year = state.calCursor.getFullYear();
  const month = state.calCursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  for(let i=0; i<firstDay; i++){
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  for(let day=1; day<=totalDays; day++){
    const d = new Date(year, month, day);
    const cd = cycleDayOf(d);
    const cell = document.createElement('div');
    let cls = 'cal-day';
    if(isPeriodDay(cd)) cls += ' period';
    else if(isOvulationDay(cd)) cls += ' ovulation';
    else if(isFertileDay(cd)) cls += ' fertile';
    if(sameDay(d, state.today)) cls += ' today';
    cell.className = cls;
    cell.textContent = day;

    if(state.loggedDays[toKey(d)]){
      const mark = document.createElement('div');
      mark.className = 'mark';
      cell.appendChild(mark);
    }

    cell.addEventListener('click', () => openDayModal(d));
    grid.appendChild(cell);
  }
}

document.getElementById('calPrev').addEventListener('click', () => {
  state.calCursor = new Date(state.calCursor.getFullYear(), state.calCursor.getMonth() - 1, 1);
  renderCalendario();
});
document.getElementById('calNext').addEventListener('click', () => {
  state.calCursor = new Date(state.calCursor.getFullYear(), state.calCursor.getMonth() + 1, 1);
  renderCalendario();
});

/* ----- modal: registrar dia / sintomas ----- */
const SYMPTOMS = ['Cólica','Dor de cabeça','Inchaço','Humor instável','Sensibilidade','Cansaço'];
let dayModalDate = null;

function openDayModal(d){
  dayModalDate = d;
  document.getElementById('dayModalTitle').textContent =
    'Registrar — ' + d.getDate() + ' de ' + MONTH_NAMES[d.getMonth()];

  const saved = state.loggedDays[toKey(d)] || { symptoms:[], period:false };
  const grid = document.getElementById('symptomGrid');
  grid.innerHTML = '';
  SYMPTOMS.forEach(s => {
    const chip = document.createElement('div');
    chip.className = 'symptom-chip' + (saved.symptoms.includes(s) ? ' selected' : '');
    chip.textContent = s;
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
    grid.appendChild(chip);
  });
  document.getElementById('markPeriod').checked = saved.period;
  document.getElementById('markPeriodEnd').checked = !!saved.periodEnd;
  document.getElementById('dayModalOverlay').classList.add('open');
}

document.getElementById('dayModalCancel').addEventListener('click', () => {
  document.getElementById('dayModalOverlay').classList.remove('open');
});

document.getElementById('dayModalSave').addEventListener('click', () => {
  const selected = Array.from(document.querySelectorAll('#symptomGrid .symptom-chip.selected')).map(el => el.textContent);
  const period = document.getElementById('markPeriod').checked;
  const periodEnd = document.getElementById('markPeriodEnd').checked;
  state.loggedDays[toKey(dayModalDate)] = { symptoms:selected, period, periodEnd };
  if(period){
    state.lastPeriodStart = new Date(dayModalDate);
  }
  if(periodEnd){
    const diffDays = Math.floor((stripTime(dayModalDate) - stripTime(state.lastPeriodStart)) / 86400000) + 1;
    state.periodLength = Math.max(1, diffDays);
    showToast(`Fim da menstruação registrado — duração ajustada para ${state.periodLength} dia(s)`);
  } else {
    showToast('Registro salvo com sucesso 🌸');
  }
  document.getElementById('dayModalOverlay').classList.remove('open');
  renderCalendario();
  renderInicio();
});

/* =========================================================
   TELA: LEMBRETES
   ========================================================= */
/* =========================================================
   TELA: DENÚNCIAS
   ========================================================= */
function renderDenuncias(){
  const list = document.getElementById('denunciaList');
  list.innerHTML = '';

  if(state.denuncias.length === 0){
    list.innerHTML = '<div class="empty-state">Você ainda não enviou nenhum relato.<br>Este espaço é sigiloso e só você vê o histórico.</div>';
    return;
  }

  const sorted = [...state.denuncias].sort((a,b) => b.createdAt - a.createdAt);
  sorted.forEach(d => {
    const card = document.createElement('div');
    card.className = 'denuncia-item';
    card.innerHTML = `
      <div class="denuncia-top">
        <span class="denuncia-cat">${d.categoria}</span>
        <div class="row-actions">
          <span class="denuncia-date">${d.createdAt.getDate().toString().padStart(2,'0')}/${(d.createdAt.getMonth()+1).toString().padStart(2,'0')}</span>
          <button class="row-action edit-denuncia" title="Editar">✎</button>
          <button class="row-action del-denuncia" title="Excluir">✕</button>
        </div>
      </div>
      <p class="denuncia-desc">${d.descricao || 'Sem descrição adicional.'}${d.local ? ' — ' + d.local : ''}</p>
      <span class="denuncia-tag">${d.anonima ? 'Enviada anonimamente' : 'Identificada'}</span>
    `;
    card.querySelector('.edit-denuncia').addEventListener('click', () => openDenunciaModal(d));
    card.querySelector('.del-denuncia').addEventListener('click', () => {
      state.denuncias = state.denuncias.filter(x => x.id !== d.id);
      renderDenuncias();
      showToast('Relato removido');
    });
    list.appendChild(card);
  });
}

let editingDenunciaId = null;

function openDenunciaModal(d){
  editingDenunciaId = d ? d.id : null;
  document.getElementById('denunciaModalTitle').textContent = d ? 'Editar denúncia' : 'Nova denúncia';
  document.getElementById('denunciaCategoria').value = d ? d.categoria : 'Assédio';
  document.getElementById('denunciaLocal').value = d ? d.local : '';
  document.getElementById('denunciaDesc').value = d ? d.descricao : '';
  document.getElementById('denunciaAnonima').checked = d ? d.anonima : true;
  document.getElementById('denunciaModalOverlay').classList.add('open');
}

document.getElementById('btnAddDenuncia').addEventListener('click', () => openDenunciaModal(null));
document.getElementById('denunciaModalCancel').addEventListener('click', () => {
  document.getElementById('denunciaModalOverlay').classList.remove('open');
});
document.getElementById('denunciaModalSave').addEventListener('click', () => {
  const categoria = document.getElementById('denunciaCategoria').value;
  const local = document.getElementById('denunciaLocal').value.trim();
  const descricao = document.getElementById('denunciaDesc').value.trim();
  const anonima = document.getElementById('denunciaAnonima').checked;

  if(editingDenunciaId){
    const d = state.denuncias.find(x => x.id === editingDenunciaId);
    d.categoria = categoria; d.local = local; d.descricao = descricao; d.anonima = anonima;
    showToast('Relato atualizado');
  } else {
    state.denuncias.push({
      id: Date.now(),
      categoria, local, descricao, anonima,
      createdAt: new Date(),
    });
    showToast('Relato enviado com segurança 🤍');
  }
  document.getElementById('denunciaModalOverlay').classList.remove('open');
  renderDenuncias();
});

/* =========================================================
   POP-UP DE LEMBRETE + NOTIFICAÇÕES (toast)
   ========================================================= */
function showToast(msg){
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2600);
}

/* notificação automática de demonstração, simulando um alerta push */
setTimeout(() => {
  showToast('💧 Não esqueça de beber água hoje!');
}, 3000);

/* =========================================================
   TELA: CHAT (assistente baseado em regras)
   ========================================================= */
const CHAT_RULES = [
  { keys:['atraso','atrasad'], reply:'Pequenos atrasos (até 5-7 dias) podem acontecer por estresse, sono ou rotina. Se o atraso persistir, vale registrar os sintomas aqui e procurar seu ginecologista.' },
  { keys:['cólica','colica','dor'], reply:'Cólicas leves a moderadas são comuns na fase menstrual. Calor local, hidratação e alongamento leve costumam ajudar. Dores muito intensas merecem avaliação médica.' },
  { keys:['ovulação','ovulacao','fértil','fertil'], reply:'Sua janela fértil costuma ocorrer por volta do meio do ciclo, geralmente entre 4-5 dias antes da ovulação até 1 dia depois. Você pode acompanhar isso na aba Calendário.' },
  { keys:['próximo período','proximo periodo','quando','menstruar'], reply:'Com base no seu ciclo atual, a estimativa aparece no card da tela Início — o número de "dias restantes" indica quanto falta para o próximo período.' },
  { keys:['sintoma'], reply:'Você pode registrar sintomas como cólica, dor de cabeça, inchaço e humor diretamente em um dia no Calendário. Isso ajuda a identificar padrões ao longo dos ciclos.' },
  { keys:['denúncia','denuncia','assédio','assedio','violência','violencia','perseguição','perseguicao'], reply:'Sinto muito que esteja passando por isso. Na aba Denúncias você pode registrar um relato de forma anônima, e também encontra os telefones 180, 190 e 100 para ajuda imediata.' },
  { keys:['oi','olá','ola','bom dia','boa tarde','boa noite'], reply:'Oi! 🌸 Estou aqui para ajudar com dúvidas sobre seu ciclo e sintomas. O que você quer saber?' },
];

function botReply(userText){
  const lower = userText.toLowerCase();
  const match = CHAT_RULES.find(rule => rule.keys.some(k => lower.includes(k)));
  return match ? match.reply : 'Ainda estou aprendendo sobre esse assunto. Você pode reformular a pergunta ou falar sobre sintomas, ovulação ou atraso?';
}

function appendMessage(text, from){
  const win = document.getElementById('chatWindow');
  const msg = document.createElement('div');
  msg.className = 'msg ' + from;
  msg.textContent = text;
  win.appendChild(msg);
  win.scrollTop = win.scrollHeight;
}

function initChat(){
  const win = document.getElementById('chatWindow');
  if(win.dataset.started) return;
  win.dataset.started = '1';
  appendMessage('Oi! 🌸 Sou a assistente do Elegance Calendar. Pergunte sobre ciclo, sintomas ou ovulação.', 'bot');
}

document.getElementById('chatSend').addEventListener('click', sendChat);
document.getElementById('chatInput').addEventListener('keydown', e => {
  if(e.key === 'Enter') sendChat();
});
function sendChat(){
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if(!text) return;
  appendMessage(text, 'user');
  input.value = '';
  setTimeout(() => appendMessage(botReply(text), 'bot'), 400);
}

/* =========================================================
   NAVEGAÇÃO ENTRE TELAS
   ========================================================= */
function goToScreen(name){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });

  const mainTabs = ['inicio','calendario','denuncias','chat'];
  document.getElementById('bottomNav').classList.toggle('hidden', !mainTabs.includes(name));

  if(name === 'calendario') renderCalendario();
  if(name === 'denuncias') renderDenuncias();
  if(name === 'chat') initChat();
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => goToScreen(btn.dataset.screen));
});


/* =========================================================
   BANCO DE DADOS — integração com api.php (XAMPP + MySQL)
   ========================================================= */
let currentUserId = null;
let authMode = 'login';

async function api(action, data = {}){
  const response = await fetch('api.php', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({action, ...data})
  });
  const result = await response.json();
  if(!response.ok || !result.ok) throw new Error(result.message || 'Não foi possível concluir a operação.');
  return result;
}

async function loadUserData(){
  if(!currentUserId) return;
  const result = await api('load_data', {user_id:currentUserId});
  const d = result.data;

  if(d.user){
    state.userName = d.user.name;
    document.getElementById('userName').textContent = state.userName;
    state.cycleLength = Number(d.user.cycle_length || 28);
    state.periodLength = Number(d.user.period_length || 5);
    state.lastPeriodStart = d.user.last_period_start ? new Date(d.user.last_period_start+'T00:00:00') : addDays(state.today,-11);
  }

  state.routine = (d.routines || []).map(r => ({
    id:Number(r.id), emoji:r.icon, title:r.title, desc:r.description || '', done:Number(r.done) === 1
  }));

  state.denuncias = (d.reports || []).map(r => ({
    id:Number(r.id), categoria:r.category, local:r.location || '', descricao:r.description || '',
    anonima:Number(r.is_anonymous) === 1, createdAt:new Date(r.created_at)
  }));

  state.loggedDays = {};
  (d.day_logs || []).forEach(l => {
    state.loggedDays[l.log_date] = {
      symptoms:l.symptoms || [], period:Number(l.period_start) === 1, periodEnd:Number(l.period_end) === 1
    };
  });
}

function setAuthMode(mode){
  authMode = mode;
  document.getElementById('btnLogin').textContent = mode === 'login' ? 'Entrar' : 'Criar conta';
  document.getElementById('authHint').innerHTML = mode === 'login'
    ? 'Ainda não tem conta? <a href="#" id="linkSignup">Criar conta</a>'
    : 'Já tem conta? <a href="#" id="linkSignup">Entrar</a>';
  document.getElementById('linkSignup').addEventListener('click', e => {
    e.preventDefault(); setAuthMode(authMode === 'login' ? 'register' : 'login');
  });
}

document.getElementById('btnLogin').addEventListener('click', async () => {
  const name = document.getElementById('loginName').value.trim();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if(!email || !password || (authMode === 'register' && !name)){
    showToast('Preencha os campos obrigatórios.');
    return;
  }

  try{
    const result = await api(authMode, {name, email, password});
    currentUserId = Number(result.user.id);
    state.userName = result.user.name;
    document.getElementById('userName').textContent = state.userName;

    if(authMode === 'login'){
      await loadUserData();
      if(result.user.last_period_start) {
        renderInicio();
        goToScreen('inicio');
      } else {
        goToScreen('onboarding');
      }
    } else {
      goToScreen('onboarding');
    }
  }catch(err){
    showToast(err.message);
  }
});

setAuthMode('login');

document.getElementById('btnFinishOnboarding').addEventListener('click', async () => {
  const lastPeriodInput = document.getElementById('obLastPeriod').value;
  const cycleLength = parseInt(document.getElementById('obCycleLength').value, 10) || 28;
  const periodLength = parseInt(document.getElementById('obPeriodLength').value, 10) || 5;

  if(!currentUserId){ showToast('Faça login novamente.'); return; }

  try{
    await api('save_cycle', {
      user_id:currentUserId,
      last_period_start:lastPeriodInput || null,
      cycle_length:cycleLength,
      period_length:periodLength
    });
    state.cycleLength = cycleLength;
    state.periodLength = periodLength;
    state.lastPeriodStart = lastPeriodInput ? new Date(lastPeriodInput+'T00:00:00') : addDays(state.today,-11);
    renderInicio();
    goToScreen('inicio');
  }catch(err){ showToast(err.message); }
});

/* Persistência das rotinas */
const originalRenderRoutine = renderRoutine;
renderRoutine = function(){
  const list = document.getElementById('routineList');
  list.innerHTML = '';
  state.routine.forEach(item => {
    const row = document.createElement('div');
    row.className = 'routine-item';
    row.innerHTML = `
      <span class="routine-emoji">${item.emoji}</span>
      <div class="routine-texts"><strong>${item.title}</strong><span>${item.desc}</span></div>
      <div class="routine-check ${item.done ? 'done' : ''}">${item.done ? '✓' : ''}</div>
      <div class="row-actions"><button class="row-action edit-routine" title="Editar">✎</button><button class="row-action del-routine" title="Excluir">✕</button></div>`;
    row.querySelector('.routine-check').addEventListener('click', async () => {
      item.done = !item.done;
      renderRoutine();
      if(currentUserId){
        try{ await api('save_routine',{user_id:currentUserId,id:item.id,title:item.title,description:item.desc,icon:item.emoji,done:item.done?1:0}); }
        catch(err){ showToast(err.message); }
      }
    });
    row.querySelector('.edit-routine').addEventListener('click', () => openRoutineModal(item));
    row.querySelector('.del-routine').addEventListener('click', async () => {
      const removed = state.routine.filter(r=>r.id===item.id)[0];
      state.routine = state.routine.filter(r=>r.id!==item.id); renderRoutine();
      if(currentUserId && typeof item.id === 'number'){
        try{ await api('delete_routine',{user_id:currentUserId,id:item.id}); }catch(err){ state.routine.push(removed); renderRoutine(); showToast(err.message); }
      }
    });
    list.appendChild(row);
  });
};

document.getElementById('routineModalSave').addEventListener('click', async () => {
  if(!currentUserId) return;
  const title = document.getElementById('routineTitle').value.trim();
  const desc = document.getElementById('routineDesc').value.trim();
  if(!title) return;
  const item = editingRoutineId ? state.routine.find(r=>r.id===editingRoutineId) : state.routine[state.routine.length-1];
  if(!item) return;
  try{
    const result = await api('save_routine',{user_id:currentUserId,id:typeof item.id==='number'?item.id:null,title:item.title,description:item.desc,icon:item.emoji,done:item.done?1:0});
    if(!editingRoutineId) item.id = Number(result.id);
  }catch(err){ showToast(err.message); }
});

/* Persistência dos registros do calendário */
document.getElementById('dayModalSave').addEventListener('click', async () => {
  if(!currentUserId || !dayModalDate) return;
  const log = state.loggedDays[toKey(dayModalDate)] || {symptoms:[],period:false,periodEnd:false};
  try{
    await api('save_day_log',{user_id:currentUserId,log_date:toKey(dayModalDate),symptoms:log.symptoms,period_start:log.period?1:0,period_end:log.periodEnd?1:0});
    if(log.period){
      await api('save_cycle',{user_id:currentUserId,last_period_start:toKey(dayModalDate),cycle_length:state.cycleLength,period_length:state.periodLength});
    }
  }catch(err){ showToast(err.message); }
});

/* Persistência dos relatos */
const originalRenderDenuncias = renderDenuncias;
renderDenuncias = function(){
  const list = document.getElementById('denunciaList');
  list.innerHTML = '';
  if(state.denuncias.length === 0){
    list.innerHTML = '<div class="empty-state">Você ainda não registrou nenhum relato. Este histórico fica vinculado à sua conta no banco de dados.</div>';
    return;
  }
  [...state.denuncias].sort((a,b)=>b.createdAt-a.createdAt).forEach(d=>{
    const card=document.createElement('div'); card.className='denuncia-item';
    card.innerHTML=`<div class="denuncia-top"><span class="denuncia-cat">${d.categoria}</span><div class="row-actions"><span class="denuncia-date">${d.createdAt.getDate().toString().padStart(2,'0')}/${(d.createdAt.getMonth()+1).toString().padStart(2,'0')}</span><button class="row-action edit-denuncia">✎</button><button class="row-action del-denuncia">✕</button></div></div><p class="denuncia-desc">${d.descricao || 'Sem descrição adicional.'}${d.local ? ' — '+d.local : ''}</p><span class="denuncia-tag">${d.anonima?'Registro marcado como anônimo':'Registro identificado'}</span>`;
    card.querySelector('.edit-denuncia').addEventListener('click',()=>openDenunciaModal(d));
    card.querySelector('.del-denuncia').addEventListener('click',async()=>{
      state.denuncias=state.denuncias.filter(x=>x.id!==d.id); renderDenuncias();
      if(currentUserId && typeof d.id==='number'){try{await api('delete_report',{user_id:currentUserId,id:d.id});}catch(err){showToast(err.message);}}
    });
    list.appendChild(card);
  });
};

document.getElementById('denunciaModalSave').addEventListener('click', async () => {
  if(!currentUserId) return;
  const categoria=document.getElementById('denunciaCategoria').value;
  const local=document.getElementById('denunciaLocal').value.trim();
  const descricao=document.getElementById('denunciaDesc').value.trim();
  const anonima=document.getElementById('denunciaAnonima').checked;
  const item=editingDenunciaId ? state.denuncias.find(x=>x.id===editingDenunciaId) : state.denuncias[state.denuncias.length-1];
  if(!item) return;
  try{
    const result=await api('save_report',{user_id:currentUserId,id:typeof item.id==='number'?item.id:null,category:categoria,location:local,description:descricao,is_anonymous:anonima?1:0});
    if(!editingDenunciaId) item.id=Number(result.id);
  }catch(err){showToast(err.message);}
});

goToScreen('login');
