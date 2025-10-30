// ========== Р“Р»РѕР±Р°Р»СЊРЅРѕРµ С…СЂР°РЅРёР»РёС‰Рµ ==========
const DATA = {
  apartments: [],
  services: [],
  tariffs: [],
  readings: [],
  charges: [],
  heating: [],
  overrides: [], // РџРµСЂРµРѕРїСЂРµРґРµР»РµРЅРЅС‹Рµ Р·РЅР°С‡РµРЅРёСЏ РґР»СЏ С„РёРєСЃРёСЂРѕРІР°РЅРЅС‹С… СѓСЃР»СѓРі
  settings: { owner: '', repo: '', branch: 'main', datadir: 'data', token: '' },
  calculated: false
};

// --- РђРІС‚Рѕ-owner РёР· РґРѕРјРµРЅР° Рё РїР°СЂР°РјРµС‚СЂС‹ URL ---

// --- Robust decoder: UTF-8 with fallback to Windows-1251 ---
function decodeBytes(bytes) {
  try {
    const s = new TextDecoder('utf-8', {fatal: false}).decode(bytes);
    // If string contains many replacement chars, try cp1251
    const bad = (s.match(/\uFFFD/g) || []).length;
    if (bad > 0) {
      try { return new TextDecoder('windows-1251').decode(bytes); } catch {}
    }
    return s;
  } catch (e) {
    try { return new TextDecoder('windows-1251').decode(bytes); } catch {}
    // Fallback: naive charCode mapping
    let out = '';
    for (let i=0;i<bytes.length;i++) out += String.fromCharCode(bytes[i]);
    return out;
  }
}

function getOwnerFromHost() {
  const h = location.hostname;
  if (h.endsWith('github.io')) return h.split('.')[0];
  return '';
}
function getParam(name) {
  return new URLSearchParams(location.search).get(name) || '';
}



// ========== РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ ==========
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupTabs();
  
  // РЈСЃС‚Р°РЅРѕРІРёС‚СЊ С‚РµРєСѓС‰РёР№ РјРµСЃСЏС† Рё РіРѕРґ
  const now = new Date();
  document.getElementById('receiptYear').value = now.getFullYear();
  document.getElementById('receiptMonth').value = now.getMonth() + 1;
  
  // РЈСЃС‚Р°РЅРѕРІРёС‚СЊ С‚РµРєСѓС‰СѓСЋ РґР°С‚Сѓ РґР»СЏ РєР°Р»СЊРєСѓР»СЏС†РёРё РїРѕ РґРЅСЏРј
  const today = now.toISOString().split('T')[0];
  document.getElementById('dailyDateFrom').value = today;
  document.getElementById('dailyDateTo').value = today;
  
  if (DATA.settings.token) {
    loadAllData();
  }
});

// ========== Р’РєР»Р°РґРєРё ==========
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(tab).classList.add('active');
      
      if (tab === 'tariffs') displayTariffs();
    });
  });
}

// ========== РќР°СЃС‚СЂРѕР№РєРё ==========

function loadSettings() {
  // 1) Р”РµС„РѕР»С‚С‹ СѓР¶Рµ РІ DATA.settings
  // 2) РџСЂРёРјРµРЅСЏРµРј localStorage, РµСЃР»Рё СЃРѕС…СЂР°РЅС‘РЅ
  const saved = localStorage.getItem('communalSettings');
  if (saved) {
    try { Object.assign(DATA.settings, JSON.parse(saved)); } catch {}
  }
  // 3) РџРµСЂРµРѕРїСЂРµРґРµР»РµРЅРёСЏ РёР· URL (?owner&repo&branch&dir&token)
  const urlOwner  = getParam('owner');
  const urlRepo   = getParam('repo');
  const urlBranch = getParam('branch');
  const urlDir    = getParam('dir');
  const urlToken  = getParam('token');
  if (urlOwner)  DATA.settings.owner   = urlOwner;
  if (urlRepo)   DATA.settings.repo    = urlRepo;
  if (urlBranch) DATA.settings.branch  = urlBranch;
  if (urlDir)    DATA.settings.datadir = urlDir;
  if (urlToken)  DATA.settings.token   = urlToken;
  // 4) Р•СЃР»Рё owner РїСѓСЃС‚ вЂ” Р±РµСЂС‘Рј РёР· РґРѕРјРµРЅР° GitHub Pages
  if (!DATA.settings.owner) {
    const hostOwner = getOwnerFromHost();
    if (hostOwner) DATA.settings.owner = hostOwner;
  }
  // 5) РџСЂРѕСЃС‚Р°РІР»СЏРµРј РІ UI
  document.getElementById('owner').value   = DATA.settings.owner || '';
  document.getElementById('repo').value    = DATA.settings.repo  || '';
  document.getElementById('branch').value  = DATA.settings.branch || 'main';
  document.getElementById('datadir').value = DATA.settings.datadir || 'data';
  document.getElementById('token').value   = DATA.settings.token || '';
}


function saveSettings() {
  DATA.settings.owner = document.getElementById('owner').value.trim();
  DATA.settings.repo = document.getElementById('repo').value.trim();
  DATA.settings.branch = document.getElementById('branch').value.trim() || 'main';
  DATA.settings.datadir = document.getElementById('datadir').value.trim() || 'data';
  DATA.settings.token = document.getElementById('token').value.trim();
  
  if (!DATA.settings.owner || !DATA.settings.repo || !DATA.settings.token) {
    showStatus('Р—Р°РїРѕР»РЅРёС‚Рµ РІСЃРµ РїРѕР»СЏ', 'error');
    return;
  }
  
  localStorage.setItem('communalSettings', JSON.stringify(DATA.settings));
  showStatus('РќР°СЃС‚СЂРѕР№РєРё СЃРѕС…СЂР°РЅРµРЅС‹, Р·Р°РіСЂСѓР·РєР° РґР°РЅРЅС‹С…...', 'success');
  loadAllData();
}

function clearSettings() {
  if (confirm('РћС‡РёСЃС‚РёС‚СЊ РІСЃРµ РЅР°СЃС‚СЂРѕР№РєРё?')) {
    localStorage.removeItem('communalSettings');
    DATA.settings = { owner: '', repo: '', branch: 'main', datadir: 'data', token: '' };
    document.getElementById('owner').value = '';
    document.getElementById('repo').value = '';
    document.getElementById('branch').value = 'main';
    document.getElementById('datadir').value = 'data';
    document.getElementById('token').value = '';
    showStatus('РќР°СЃС‚СЂРѕР№РєРё РѕС‡РёС‰РµРЅС‹', 'success');
  }
}

function showStatus(msg, type) {
  const status = document.getElementById('status');
  status.textContent = msg;
  status.className = `status ${type}`;
  status.style.display = 'block';
  setTimeout(() => status.style.display = 'none', 5000);
}

function showLoader(show) {
  document.getElementById('loader').style.display = show ? 'flex' : 'none';
}

// ========== GitHub API ==========
async function githubAPI(path, method = 'GET', body = null) {
  const { owner, repo, branch, token } = DATA.settings;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  
  const options = {
    method,
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  };
  
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function readCSV(filename) {
  try {
    const { datadir } = DATA.settings;
    const data = await githubAPI(`${datadir}/${filename}`);
    
    const base64 = data.content.replace(/\n/g, '');
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const csv = decodeBytes(bytes);
    
    return parseCSV(csv);
  } catch (error) {
    if (String(error).includes('HTTP 404')) {
      return [];
    }
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
}

async function writeCSV(filename, data) {
  const { datadir, branch } = DATA.settings;
  const path = `${datadir}/${filename}`;
  
  let sha;
  try {
    const file = await githubAPI(path);
    sha = file.sha;
  } catch (e) {
    sha = null;
  }
  
  const csv = serializeCSV(data);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(csv);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const content = btoa(binary);
  
  await githubAPI(path, 'PUT', {
    message: `Update ${filename}`,
    content,
    sha,
    branch
  });
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',');
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const obj = {};
    
    headers.forEach((h, idx) => {
      let val = values[idx]?.trim() || '';
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val && !isNaN(val)) val = parseFloat(val);
      obj[h] = val;
    });
    
    data.push(obj);
  }
  
  return data;
}

function serializeCSV(data) {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const lines = [headers.join(',')];
  
  data.forEach(row => {
    const values = headers.map(h => row[h] ?? '');
    lines.push(values.join(','));
  });
  
  return lines.join('\n');
}

// ========== Р—Р°РіСЂСѓР·РєР° РґР°РЅРЅС‹С… ==========
async function loadAllData() {
  showLoader(true);
  
  try {
    DATA.apartments = await readCSV('apartments.csv');
    DATA.services = await readCSV('services.csv');
    DATA.tariffs = await readCSV('tariffs.csv');
    DATA.readings = await readCSV('readings.csv');
    DATA.charges = await readCSV('charges.csv');
    DATA.heating = await readCSV('heating.csv');
    DATA.overrides = await readCSV('overrides.csv');
    DATA.storno = await readCSV('storno.csv');
    
    if (DATA.apartments.length === 0) {
      showStatus('Р¤Р°Р№Р» apartments.csv РїСѓСЃС‚РѕР№', 'error');
      return;
    }
    
    populateDropdowns();
    showStatus(`Р—Р°РіСЂСѓР¶РµРЅРѕ: ${DATA.apartments.length} РєРІР°СЂС‚РёСЂ, ${DATA.readings.length} РїРѕРєР°Р·Р°РЅРёР№`, 'success');
  } catch (error) {
    showStatus(`РћС€РёР±РєР°: ${error.message}`, 'error');
  } finally {
    showLoader(false);
  }
}

function populateDropdowns() {
  ['apartment', 'historyApartment', 'correctionApartment', 'receiptApartment', 'dailyApartment'].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = '<option value="">Р’С‹Р±РµСЂРёС‚Рµ РєРІР°СЂС‚РёСЂСѓ...</option>';
    DATA.apartments.forEach(apt => {
      sel.innerHTML += `<option value="${apt.id}">${apt.name}</option>`;
    });
  });
  
  const srvSel = document.getElementById('tariffService');
  srvSel.innerHTML = '<option value="">Р’С‹Р±РµСЂРёС‚Рµ СѓСЃР»СѓРіСѓ...</option>';
  DATA.services.forEach(srv => {
    srvSel.innerHTML += `<option value="${srv.id}">${srv.name}</option>`;
  });
  
  document.getElementById('apartment').onchange = (e) => {
    if (e.target.value) showInputForm(parseInt(e.target.value));
  };
}

// ========== Р’РІРѕРґ РїРѕРєР°Р·Р°РЅРёР№ ==========
function showInputForm(aptId) {
  const apt = DATA.apartments.find(a => a.id === aptId);
  if (!apt) return;
  
  document.getElementById('calcPanel').style.display = 'block';
  
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('currentPeriod').textContent = period;
  
  renderInputTable(aptId, period, apt.type);
  DATA.calculated = false;
  document.getElementById('saveBtn').disabled = true;
}

function renderInputTable(aptId, period, aptType) {
  const tbody = document.getElementById('inputTableBody');
  let html = '';
  
  DATA.services.forEach(srv => {
    const tariff = getTariff(srv.id, aptType);
    
    if (srv.calc_type === 'meter') {
      const prev = getReading(aptId, srv.id, getPrevPeriod(period)) || 0;
      const curr = getReading(aptId, srv.id, period);
      
      html += `<tr>
        <td><strong>${srv.name}</strong></td>
        <td><span class="badge badge-primary">${tariff} в‚Ѕ</span></td>
        <td><input type="text" value="${prev}" disabled></td>
        <td><input type="number" step="0.01" value="${curr !== null ? curr : ''}" 
            data-service="${srv.id}" class="reading-input" placeholder="0"></td>
        <td class="amount" data-result="${srv.id}">вЂ”</td>
      </tr>`;
      
    } else if (srv.calc_type === 'calculated') {
      html += `<tr>
        <td><strong>${srv.name}</strong></td>
        <td><span class="badge badge-primary">${tariff} в‚Ѕ</span></td>
        <td colspan="2" style="text-align:center; color: var(--text-muted);">РђРІС‚РѕРјР°С‚РёС‡РµСЃРєРё</td>
        <td class="amount" data-result="${srv.id}">вЂ”</td>
      </tr>`;
      
    } else if (srv.calc_type === 'checkbox') {
      const enabled = getHeating(aptId, period);
      html += `<tr>
        <td><strong>${srv.name}</strong></td>
        <td><span class="badge badge-primary">${tariff} в‚Ѕ</span></td>
        <td colspan="2" style="text-align:center;">
          <input type="checkbox" ${enabled ? 'checked' : ''} 
            data-service="${srv.id}" class="heating-checkbox">
        </td>
        <td class="amount" data-result="${srv.id}">вЂ”</td>
      </tr>`;
      
    } else if (srv.calc_type === 'fixed') {
      html += `<tr>
        <td><strong>${srv.name}</strong></td>
        <td><span class="badge badge-primary">${tariff} в‚Ѕ</span></td>
        <td colspan="2" style="text-align:center; color: var(--text-muted);">Р¤РёРєСЃРёСЂРѕРІР°РЅРЅР°СЏ</td>
        <td class="amount" data-result="${srv.id}">${tariff.toFixed(2)} в‚Ѕ</td>
      </tr>`;
    }
  });
  
  // Р”РѕРї РЅР°С‡РёСЃР»РµРЅРёСЏ
  const charge = getCharge(aptId, period);
  html += `<tr class="charge-row">
    <td><strong>Р”РѕРї. РЅР°С‡РёСЃР»РµРЅРёСЏ</strong></td>
    <td>вЂ”</td>
    <td colspan="2">
      <input type="text" placeholder="РљРѕРјРјРµРЅС‚Р°СЂРёР№" value="${charge?.comment || ''}" 
        id="chargeComment" style="width:100%">
    </td>
    <td><input type="number" step="0.01" value="${charge?.amount || ''}" 
        id="chargeAmount" placeholder="0" style="width:100%"></td>
  </tr>`;
  
  tbody.innerHTML = html;
}

function calculateData() {
  const aptId = parseInt(document.getElementById('apartment').value);
  const apt = DATA.apartments.find(a => a.id === aptId);
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  let grandTotal = 0;
  
  DATA.services.forEach(srv => {
    const tariff = getTariff(srv.id, apt.type);
    let amount = 0;
    
    if (srv.calc_type === 'meter') {
      const input = document.querySelector(`input[data-service="${srv.id}"]`);
      const curr = parseFloat(input.value) || 0;
      const prev = getReading(aptId, srv.id, getPrevPeriod(period)) || 0;
      const volume = curr - prev;
      amount = volume * tariff;
      
    } else if (srv.calc_type === 'calculated') {
      if (srv.id === 2) {
        const elecInput = document.querySelector('input[data-service="1"]');
        const elecCurr = parseFloat(elecInput.value) || 0;
        const elecPrev = getReading(aptId, 1, getPrevPeriod(period)) || 0;
        amount = (elecCurr - elecPrev) * 0.1 * tariff;
      } else if (srv.id === 5) {
        const hvInput = document.querySelector('input[data-service="3"]');
        const gvInput = document.querySelector('input[data-service="4"]');
        const hvCurr = parseFloat(hvInput.value) || 0;
        const gvCurr = parseFloat(gvInput.value) || 0;
        const hvPrev = getReading(aptId, 3, getPrevPeriod(period)) || 0;
        const gvPrev = getReading(aptId, 4, getPrevPeriod(period)) || 0;
        const volume = (hvCurr - hvPrev) + (gvCurr - gvPrev);
        amount = volume * tariff;
      }
      
    } else if (srv.calc_type === 'checkbox') {
      const cb = document.querySelector('.heating-checkbox');
      amount = cb.checked ? tariff : 0;
      
    } else if (srv.calc_type === 'fixed') {
      const override = getOverride(aptId, srv.id, period);
      amount = override !== null ? override : tariff;
    }
    
    const cell = document.querySelector(`td[data-result="${srv.id}"]`);
    if (cell) cell.textContent = amount.toFixed(2) + ' в‚Ѕ';
    grandTotal += amount;
  });
  
  // Р”РѕРї РЅР°С‡РёСЃР»РµРЅРёСЏ
  const chargeAmt = parseFloat(document.getElementById('chargeAmount').value) || 0;
  grandTotal += chargeAmt;
  
  DATA.calculated = true;
  document.getElementById('saveBtn').disabled = false;
  
  // РћР±РЅРѕРІРёС‚СЊ РёС‚РѕРіРё
  renderTotals(aptId, apt.type);
  renderHistory3Months(aptId, apt.type);
}

async function saveData() {
  if (!DATA.calculated) {
    alert('РЎРЅР°С‡Р°Р»Р° РЅР°Р¶РјРёС‚Рµ "Р Р°СЃСЃС‡РёС‚Р°С‚СЊ"');
    return;
  }
  
  const aptId = parseInt(document.getElementById('apartment').value);
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  showLoader(true);
  
  try {
    // РџРѕРєР°Р·Р°РЅРёСЏ
    document.querySelectorAll('.reading-input').forEach(input => {
      const srvId = parseInt(input.dataset.service);
      const value = parseFloat(input.value);
      
      if (!isNaN(value)) {
        let reading = DATA.readings.find(r => 
          r.apartment_id === aptId && r.service_id === srvId && r.period === period
        );
        
        if (reading) {
          reading.value = value;
        } else {
          DATA.readings.push({
            id: Math.max(0, ...DATA.readings.map(r => r.id)) + 1,
            apartment_id: aptId,
            service_id: srvId,
            period,
            value
          });
        }
      }
    });
    
    // РћС‚РѕРїР»РµРЅРёРµ
    const heatingCb = document.querySelector('.heating-checkbox');
    if (heatingCb) {
      let heating = DATA.heating.find(h => 
        h.apartment_id === aptId && h.period === period
      );
      
      if (heating) {
        heating.enabled = heatingCb.checked;
      } else {
        DATA.heating.push({
          id: Math.max(0, ...DATA.heating.map(h => h.id)) + 1,
          apartment_id: aptId,
          period,
          enabled: heatingCb.checked
        });
      }
    }
    
    // Р”РѕРї РЅР°С‡РёСЃР»РµРЅРёСЏ
    const chargeAmt = parseFloat(document.getElementById('chargeAmount').value);
    const chargeComment = document.getElementById('chargeComment').value.trim();
    
    if (chargeAmt && chargeComment) {
      let charge = DATA.charges.find(c => 
        c.apartment_id === aptId && c.period === period
      );
      
      if (charge) {
        charge.amount = chargeAmt;
        charge.comment = chargeComment;
      } else {
        DATA.charges.push({
          id: Math.max(0, ...DATA.charges.map(c => c.id)) + 1,
          apartment_id: aptId,
          period,
          amount: chargeAmt,
          comment: chargeComment
        });
      }
    }
    
    await writeCSV('readings.csv', DATA.readings);
    await writeCSV('heating.csv', DATA.heating);
    await writeCSV('charges.csv', DATA.charges);
    
    showStatus('Р”Р°РЅРЅС‹Рµ СЃРѕС…СЂР°РЅРµРЅС‹', 'success');
    DATA.calculated = false;
    document.getElementById('saveBtn').disabled = true;
    
  } catch (error) {
    showStatus(`РћС€РёР±РєР°: ${error.message}`, 'error');
  } finally {
    showLoader(false);
  }
}

// ========== РС‚РѕРіРё Р·Р° 3 РјРµСЃСЏС†Р° ==========
function renderTotals(aptId, aptType) {
  const now = new Date();
  const periods = [];
  
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  
  let html = '<table><thead><tr><th>РЈСЃР»СѓРіР°</th>';
  periods.forEach(p => html += `<th>${p}</th>`);
  html += '</tr></thead><tbody>';
  
  const totals = periods.map(() => 0);
  
  DATA.services.forEach(srv => {
    html += `<tr><td><strong>${srv.name}</strong></td>`;
    const tariff = getTariff(srv.id, aptType);
    
    periods.forEach((period, idx) => {
      let amount = 0;
      
      if (srv.calc_type === 'meter') {
        const prev = getReading(aptId, srv.id, getPrevPeriod(period));
        const curr = getReading(aptId, srv.id, period);
        const vol = curr && prev ? curr - prev : 0;
        amount = vol * tariff;
      } else if (srv.calc_type === 'calculated') {
        if (srv.id === 2) {
          const ePrev = getReading(aptId, 1, getPrevPeriod(period));
          const eCurr = getReading(aptId, 1, period);
          const vol = eCurr && ePrev ? (eCurr - ePrev) * 0.1 : 0;
          amount = vol * tariff;
        } else if (srv.id === 5) {
          const hvPrev = getReading(aptId, 3, getPrevPeriod(period));
          const hvCurr = getReading(aptId, 3, period);
          const gvPrev = getReading(aptId, 4, getPrevPeriod(period));
          const gvCurr = getReading(aptId, 4, period);
          const vol = (hvCurr && hvPrev ? hvCurr - hvPrev : 0) + 
                      (gvCurr && gvPrev ? gvCurr - gvPrev : 0);
          amount = vol * tariff;
        }
      } else if (srv.calc_type === 'checkbox') {
        amount = getHeating(aptId, period) ? tariff : 0;
      } else if (srv.calc_type === 'fixed') {
        const override = getOverride(aptId, srv.id, period);
        amount = override !== null ? override : tariff;
      }
      
      totals[idx] += amount;
      html += `<td>${amount.toFixed(2)} в‚Ѕ</td>`;
    });
    
    html += '</tr>';
  });
  
  // Р”РѕРї РЅР°С‡РёСЃР»РµРЅРёСЏ
  html += `<tr class="charge-row"><td><strong>Р”РѕРї. РЅР°С‡РёСЃР»РµРЅРёСЏ</strong></td>`;
  periods.forEach((period, idx) => {
    const charge = getCharge(aptId, period);
    const amt = charge?.amount || 0;
    totals[idx] += amt;
    html += `<td>${amt.toFixed(2)} в‚Ѕ</td>`;
  });
  html += '</tr>';
  
  // РЎС‚РѕСЂРЅРѕ (РІС‹С‡РёС‚Р°РЅРёРµ)
  html += `<tr style="background: rgba(220, 38, 38, 0.05);"><td><strong>РЎС‚РѕСЂРЅРѕ (РІС‹С‡РµС‚)</strong></td>`;
  periods.forEach((period, idx) => {
    const storno = getStorno(aptId, period);
    const amt = storno?.amount || 0;
    totals[idx] -= amt;
    html += `<td style="color: var(--danger);">${amt > 0 ? '-' + amt.toFixed(2) : 'вЂ”'} в‚Ѕ</td>`;
  });
  html += '</tr>';
  
  // РС‚РѕРіРѕ
  html += `<tr class="total-row"><td><strong>РРўРћР“Рћ:</strong></td>`;
  totals.forEach(t => html += `<td><strong style="color: var(--success); font-size: 14px;">${t.toFixed(2)} в‚Ѕ</strong></td>`);
  html += '</tr></tbody></table>';
  
  document.getElementById('totalsTable').innerHTML = html;
}

// ========== РСЃС‚РѕСЂРёСЏ РЅР° 12 РјРµСЃСЏС†РµРІ ==========
function showHistoryFull() {
  const aptId = parseInt(document.getElementById('historyApartment').value);
  const year = parseInt(document.getElementById('historyYear').value);
  const viewMode = document.getElementById('historyViewMode').value;
  
  if (!aptId) {
    alert('Р’С‹Р±РµСЂРёС‚Рµ РєРІР°СЂС‚РёСЂСѓ');
    return;
  }
  
  document.getElementById('historyPanel').style.display = 'block';
  document.getElementById('historyPeriodTitle').textContent = year;
  
  const apt = DATA.apartments.find(a => a.id === aptId);
  const periods = [];
  const monthNames = ['РЇРЅРІ','Р¤РµРІ','РњР°СЂ','РђРїСЂ','РњР°Р№','РСЋРЅ','РСЋР»','РђРІРі','РЎРµРЅ','РћРєС‚','РќРѕСЏ','Р”РµРє'];
  
  for (let m = 1; m <= 12; m++) {
    periods.push(`${year}-${String(m).padStart(2, '0')}`);
  }
  
  let html = '<table><thead><tr><th style="text-align:left;">РЈСЃР»СѓРіР°</th>';
  monthNames.forEach(month => {
    html += `<th>${month}</th>`;
  });
  html += '<th>РС‚РѕРіРѕ</th></tr></thead><tbody>';
  
  const chartData = periods.map(() => 0);
  
  DATA.services.forEach(srv => {
    html += `<tr><td><strong>${srv.name}</strong></td>`;
    const tariff = getTariff(srv.id, apt.type);
    let rowTotal = 0;
    
    periods.forEach((period, idx) => {
      let displayValue = 'вЂ”';
      let amount = 0;
      
      if (srv.calc_type === 'meter') {
        const prev = getReading(aptId, srv.id, getPrevPeriod(period));
        const curr = getReading(aptId, srv.id, period);
        const vol = curr && prev ? curr - prev : 0;
        amount = vol * tariff;
        
        if (viewMode === 'readings') {
          displayValue = curr !== null ? curr.toString() : 'вЂ”';
        } else if (viewMode === 'volumes') {
          displayValue = vol > 0 ? vol.toFixed(2) : 'вЂ”';
        } else {
          displayValue = amount > 0 ? amount.toFixed(2) : 'вЂ”';
        }
        
      } else if (srv.calc_type === 'calculated') {
        if (srv.id === 2) {
          const ePrev = getReading(aptId, 1, getPrevPeriod(period));
          const eCurr = getReading(aptId, 1, period);
          const vol = eCurr && ePrev ? (eCurr - ePrev) * 0.1 : 0;
          amount = vol * tariff;
        } else if (srv.id === 5) {
          const hvPrev = getReading(aptId, 3, getPrevPeriod(period));
          const hvCurr = getReading(aptId, 3, period);
          const gvPrev = getReading(aptId, 4, getPrevPeriod(period));
          const gvCurr = getReading(aptId, 4, period);
          const vol = (hvCurr && hvPrev ? hvCurr - hvPrev : 0) + 
                      (gvCurr && gvPrev ? gvCurr - gvPrev : 0);
          amount = vol * tariff;
        }
        
        if (viewMode === 'volumes') {
          const vol = amount / tariff;
          displayValue = vol > 0 ? vol.toFixed(2) : 'вЂ”';
        } else if (viewMode !== 'readings') {
          displayValue = amount > 0 ? amount.toFixed(2) : 'вЂ”';
        }
        
      } else if (srv.calc_type === 'checkbox') {
        const enabled = getHeating(aptId, period);
        amount = enabled ? tariff : 0;
        
        if (viewMode === 'readings') {
          displayValue = enabled ? 'вњ“' : 'вЂ”';
        } else if (viewMode !== 'volumes') {
          displayValue = amount > 0 ? amount.toFixed(2) : 'вЂ”';
        }
        
      } else if (srv.calc_type === 'fixed') {
        const override = getOverride(aptId, srv.id, period);
        amount = override !== null ? override : tariff;
        if (viewMode !== 'readings' && viewMode !== 'volumes') {
          displayValue = amount.toFixed(2);
        }
      }
      
      chartData[idx] += amount;
      rowTotal += amount;
      html += `<td>${displayValue}</td>`;
    });
    
    if (viewMode === 'amounts') {
      html += `<td><strong>${rowTotal.toFixed(2)} в‚Ѕ</strong></td>`;
    } else {
      html += `<td>вЂ”</td>`;
    }
    html += '</tr>';
  });
  
  // Р”РѕРї РЅР°С‡РёСЃР»РµРЅРёСЏ
  if (viewMode === 'amounts') {
    html += `<tr class="charge-row"><td><strong>Р”РѕРї. РЅР°С‡РёСЃР»РµРЅРёСЏ</strong></td>`;
    let chargeTotal = 0;
    periods.forEach((period, idx) => {
      const charge = getCharge(aptId, period);
      const amt = charge?.amount || 0;
      chartData[idx] += amt;
      chargeTotal += amt;
      html += `<td>${amt > 0 ? amt.toFixed(2) : 'вЂ”'}</td>`;
    });
    html += `<td><strong>${chargeTotal.toFixed(2)} в‚Ѕ</strong></td></tr>`;
    
    // РЎС‚РѕСЂРЅРѕ
    html += `<tr style="background: rgba(220, 38, 38, 0.05);"><td><strong>РЎС‚РѕСЂРЅРѕ (РІС‹С‡РµС‚)</strong></td>`;
    let stornoTotal = 0;
    periods.forEach((period, idx) => {
      const storno = getStorno(aptId, period);
      const amt = storno?.amount || 0;
      chartData[idx] -= amt;
      stornoTotal += amt;
      html += `<td style="color: var(--danger);">${amt > 0 ? '-' + amt.toFixed(2) : 'вЂ”'}</td>`;
    });
    html += `<td><strong style="color: var(--danger);">-${stornoTotal.toFixed(2)} в‚Ѕ</strong></td></tr>`;
    
    // РС‚РѕРіРѕ
    html += `<tr class="total-row"><td><strong>РРўРћР“Рћ:</strong></td>`;
    let grandTotal = 0;
    chartData.forEach(t => {
      grandTotal += t;
      html += `<td><strong style="color: var(--success); font-size: 14px;">${t.toFixed(2)} в‚Ѕ</strong></td>`;
    });
    html += `<td><strong style="color: var(--success); font-size: 14px;">${grandTotal.toFixed(2)} в‚Ѕ</strong></td></tr>`;
  }
  
  html += '</tbody></table>';
  
  document.getElementById('consumptionTable').innerHTML = html;
}

function exportToExcel() {
  alert('Р­РєСЃРїРѕСЂС‚ РІ Excel Р±СѓРґРµС‚ СЂРµР°Р»РёР·РѕРІР°РЅ РІ СЃР»РµРґСѓСЋС‰РµР№ РІРµСЂСЃРёРё');
}

// ========== РљРѕСЂСЂРµРєС‚РёСЂРѕРІРєР° РґР°РЅРЅС‹С… ==========
function showCorrectionForm() {
  const aptId = parseInt(document.getElementById('correctionApartment').value);
  const year = parseInt(document.getElementById('correctionYear').value);
  
  if (!aptId) {
    alert('Р’С‹Р±РµСЂРёС‚Рµ РєРІР°СЂС‚РёСЂСѓ');
    return;
  }
  
  document.getElementById('correctionPanel').style.display = 'block';
  document.getElementById('correctionPeriodTitle').textContent = year;
  
  const apt = DATA.apartments.find(a => a.id === aptId);
  const periods = [];
  const monthNames = ['РЇРЅРІ','Р¤РµРІ','РњР°СЂ','РђРїСЂ','РњР°Р№','РСЋРЅ','РСЋР»','РђРІРі','РЎРµРЅ','РћРєС‚','РќРѕСЏ','Р”РµРє'];
  
  for (let m = 1; m <= 12; m++) {
    periods.push(`${year}-${String(m).padStart(2, '0')}`);
  }
  
  let html = '<table><thead><tr><th style="text-align:left;">РЈСЃР»СѓРіР°</th>';
  monthNames.forEach(month => html += `<th>${month}</th>`);
  html += '</tr></thead><tbody>';
  
  // 1. РЈСЃР»СѓРіРё СЃРѕ СЃС‡С‘С‚С‡РёРєР°РјРё (СЌР»РµРєС‚СЂРёС‡РµСЃС‚РІРѕ, РІРѕРґР°)
  const meterServices = DATA.services.filter(s => s.calc_type === 'meter');
  
  meterServices.forEach(srv => {
    html += `<tr><td><strong>${srv.name}</strong></td>`;
    
    periods.forEach(period => {
      const curr = getReading(aptId, srv.id, period);
      html += `<td>
        <input type="number" step="0.01" value="${curr !== null ? curr : ''}" 
          data-apt="${aptId}" data-service="${srv.id}" data-period="${period}"
          class="correction-input" placeholder="вЂ”" style="width:70px;">
      </td>`;
    });
    
    html += '</tr>';
  });
  
  // 2. РћС‚РѕРїР»РµРЅРёРµ (С‡РµРєР±РѕРєСЃ)
  const heatingSrv = DATA.services.find(s => s.id === 6);
  if (heatingSrv) {
    html += `<tr><td><strong>${heatingSrv.name}</strong></td>`;
    
    periods.forEach(period => {
      const enabled = getHeating(aptId, period);
      html += `<td style="text-align:center;">
        <input type="checkbox" ${enabled ? 'checked' : ''}
          data-apt="${aptId}" data-period="${period}"
          class="heating-correction-input">
      </td>`;
    });
    
    html += '</tr>';
  }
  
  // 3. Р¤РёРєСЃРёСЂРѕРІР°РЅРЅС‹Рµ СѓСЃР»СѓРіРё (СЃРѕРґРµСЂР¶Р°РЅРёРµ, РјСѓСЃРѕСЂ, РёРЅС‚РµСЂРЅРµС‚)
  const fixedServices = DATA.services.filter(s => s.calc_type === 'fixed');
  
  fixedServices.forEach(srv => {
    const defaultTariff = getTariff(srv.id, apt.type);
    html += `<tr><td><strong>${srv.name}</strong> <span style="color:var(--text-muted); font-size:11px;">(${defaultTariff}в‚Ѕ)</span></td>`;
    
    periods.forEach(period => {
      const override = getOverride(aptId, srv.id, period);
      const value = override !== null ? override : defaultTariff;
      
      html += `<td>
        <input type="number" step="0.01" value="${value}" 
          data-apt="${aptId}" data-service="${srv.id}" data-period="${period}"
          class="fixed-correction-input" placeholder="${defaultTariff}" style="width:70px;">
      </td>`;
    });
    
    html += '</tr>';
  });
  
  // 4. Р”РѕРї РЅР°С‡РёСЃР»РµРЅРёСЏ
  html += `<tr class="charge-row"><td><strong>Р”РѕРї. РЅР°С‡РёСЃР»РµРЅРёСЏ (в‚Ѕ)</strong></td>`;
  periods.forEach(period => {
    const charge = getCharge(aptId, period);
    html += `<td>
      <input type="number" step="0.01" value="${charge?.amount || ''}"
        data-apt="${aptId}" data-period="${period}"
        class="charge-correction-input" placeholder="вЂ”" style="width:70px;">
    </td>`;
  });
  html += '</tr>';
  
  // 5. РљРѕРјРјРµРЅС‚Р°СЂРёРё Рє РґРѕРї РЅР°С‡РёСЃР»РµРЅРёСЏРј
  html += `<tr class="charge-row"><td><strong>РљРѕРјРјРµРЅС‚Р°СЂРёР№</strong></td>`;
  periods.forEach(period => {
    const charge = getCharge(aptId, period);
    html += `<td>
      <input type="text" value="${charge?.comment || ''}"
        data-apt="${aptId}" data-period="${period}"
        class="comment-correction-input" placeholder="вЂ”" style="width:70px; font-size:11px;">
    </td>`;
  });
  html += '</tr>';
  
  // 6. РЎС‚РѕСЂРЅРѕ (РІС‹С‡РµС‚)
  html += `<tr style="background: rgba(220, 38, 38, 0.05);"><td><strong>РЎС‚РѕСЂРЅРѕ (РІС‹С‡РµС‚, в‚Ѕ)</strong></td>`;
  periods.forEach(period => {
    const storno = getStorno(aptId, period);
    html += `<td>
      <input type="number" step="0.01" value="${storno?.amount || ''}"
        data-apt="${aptId}" data-period="${period}"
        class="storno-correction-input" placeholder="вЂ”" style="width:70px;">
    </td>`;
  });
  html += '</tr>';
  
  html += '</tbody></table>';
  document.getElementById('correctionTable').innerHTML = html;
}

async function saveCorrectionData() {
  showLoader(true);
  
  try {
    // 1. РЎРѕС…СЂР°РЅРёС‚СЊ РїРѕРєР°Р·Р°РЅРёСЏ СЃС‡С‘С‚С‡РёРєРѕРІ
    const readingInputs = document.querySelectorAll('.correction-input');
    readingInputs.forEach(input => {
      const aptId = parseInt(input.dataset.apt);
      const srvId = parseInt(input.dataset.service);
      const period = input.dataset.period;
      const value = parseFloat(input.value);
      
      if (!isNaN(value)) {
        let reading = DATA.readings.find(r => 
          r.apartment_id === aptId && r.service_id === srvId && r.period === period
        );
        
        if (reading) {
          reading.value = value;
        } else {
          DATA.readings.push({
            id: Math.max(0, ...DATA.readings.map(r => r.id)) + 1,
            apartment_id: aptId,
            service_id: srvId,
            period,
            value
          });
        }
      }
    });
    
    // 2. РЎРѕС…СЂР°РЅРёС‚СЊ РѕС‚РѕРїР»РµРЅРёРµ
    const heatingInputs = document.querySelectorAll('.heating-correction-input');
    heatingInputs.forEach(input => {
      const aptId = parseInt(input.dataset.apt);
      const period = input.dataset.period;
      const enabled = input.checked;
      
      let heating = DATA.heating.find(h => 
        h.apartment_id === aptId && h.period === period
      );
      
      if (heating) {
        heating.enabled = enabled;
      } else {
        DATA.heating.push({
          id: Math.max(0, ...DATA.heating.map(h => h.id)) + 1,
          apartment_id: aptId,
          period,
          enabled
        });
      }
    });
    
    // 3. РЎРѕС…СЂР°РЅРёС‚СЊ РїРµСЂРµРѕРїСЂРµРґРµР»РµРЅРЅС‹Рµ С„РёРєСЃРёСЂРѕРІР°РЅРЅС‹Рµ СѓСЃР»СѓРіРё
    const fixedInputs = document.querySelectorAll('.fixed-correction-input');
    fixedInputs.forEach(input => {
      const aptId = parseInt(input.dataset.apt);
      const srvId = parseInt(input.dataset.service);
      const period = input.dataset.period;
      const value = parseFloat(input.value);
      
      const apt = DATA.apartments.find(a => a.id === aptId);
      const defaultTariff = getTariff(srvId, apt.type);
      
      if (!isNaN(value) && value !== defaultTariff) {
        // РЎРѕС…СЂР°РЅРёС‚СЊ С‚РѕР»СЊРєРѕ РµСЃР»Рё Р·РЅР°С‡РµРЅРёРµ РѕС‚Р»РёС‡Р°РµС‚СЃСЏ РѕС‚ С‚Р°СЂРёС„Р°
        let override = DATA.overrides.find(o => 
          o.apartment_id === aptId && o.service_id === srvId && o.period === period
        );
        
        if (override) {
          override.amount = value;
        } else {
          DATA.overrides.push({
            id: Math.max(0, ...DATA.overrides.map(o => o.id)) + 1,
            apartment_id: aptId,
            service_id: srvId,
            period,
            amount: value
          });
        }
      } else if (value === defaultTariff) {
        // РЈРґР°Р»РёС‚СЊ override РµСЃР»Рё РІРµСЂРЅСѓР»Рё Рє С‚Р°СЂРёС„Сѓ
        DATA.overrides = DATA.overrides.filter(o => 
          !(o.apartment_id === aptId && o.service_id === srvId && o.period === period)
        );
      }
    });
    
    // 4. РЎРѕС…СЂР°РЅРёС‚СЊ РґРѕРї РЅР°С‡РёСЃР»РµРЅРёСЏ
    const chargeInputs = document.querySelectorAll('.charge-correction-input');
    const commentInputs = document.querySelectorAll('.comment-correction-input');
    
    chargeInputs.forEach((input, idx) => {
      const aptId = parseInt(input.dataset.apt);
      const period = input.dataset.period;
      const amount = parseFloat(input.value);
      const comment = commentInputs[idx].value.trim();
      
      if (!isNaN(amount) && amount > 0 && comment) {
        let charge = DATA.charges.find(c => 
          c.apartment_id === aptId && c.period === period
        );
        
        if (charge) {
          charge.amount = amount;
          charge.comment = comment;
        } else {
          DATA.charges.push({
            id: Math.max(0, ...DATA.charges.map(c => c.id)) + 1,
            apartment_id: aptId,
            period,
            amount,
            comment
          });
        }
      } else if ((!amount || amount <= 0) && !comment) {
        // РЈРґР°Р»РёС‚СЊ РµСЃР»Рё РѕС‡РёСЃС‚РёР»Рё
        DATA.charges = DATA.charges.filter(c => 
          !(c.apartment_id === aptId && c.period === period)
        );
      }
    });
    
    // РЎРѕС…СЂР°РЅРёС‚СЊ РІСЃРµ РІ GitHub
    await writeCSV('readings.csv', DATA.readings);
    await writeCSV('heating.csv', DATA.heating);
    await writeCSV('overrides.csv', DATA.overrides);
    await writeCSV('charges.csv', DATA.charges);
    
    // 5. РЎРѕС…СЂР°РЅРёС‚СЊ СЃС‚РѕСЂРЅРѕ
    const stornoInputs = document.querySelectorAll('.storno-correction-input');
    stornoInputs.forEach(input => {
      const aptId = parseInt(input.dataset.apt);
      const period = input.dataset.period;
      const amount = parseFloat(input.value);
      
      if (!isNaN(amount) && amount > 0) {
        let storno = DATA.storno.find(s => 
          s.apartment_id === aptId && s.period === period
        );
        
        if (storno) {
          storno.amount = amount;
        } else {
          DATA.storno.push({
            id: Math.max(0, ...DATA.storno.map(s => s.id)) + 1,
            apartment_id: aptId,
            period,
            amount
          });
        }
      } else if (!amount || amount <= 0) {
        // РЈРґР°Р»РёС‚СЊ РµСЃР»Рё РѕС‡РёСЃС‚РёР»Рё
        DATA.storno = DATA.storno.filter(s => 
          !(s.apartment_id === aptId && s.period === period)
        );
      }
    });
    
    await writeCSV('storno.csv', DATA.storno);
    
    showStatus('Р’СЃРµ РґР°РЅРЅС‹Рµ СЃРѕС…СЂР°РЅРµРЅС‹ РІ CSV С„Р°Р№Р»С‹', 'success');
    
  } catch (error) {
    showStatus(`РћС€РёР±РєР°: ${error.message}`, 'error');
  } finally {
    showLoader(false);
  }
}

// ========== РљРІРёС‚Р°РЅС†РёСЏ РЅР° РѕРїР»Р°С‚Сѓ ==========
function generateReceipt() {
  const aptId = parseInt(document.getElementById('receiptApartment').value);
  const year = parseInt(document.getElementById('receiptYear').value);
  const month = parseInt(document.getElementById('receiptMonth').value);
  
  if (!aptId) {
    alert('Р’С‹Р±РµСЂРёС‚Рµ РєРІР°СЂС‚РёСЂСѓ');
    return;
  }
  
  const apt = DATA.apartments.find(a => a.id === aptId);
  const period = `${year}-${String(month).padStart(2, '0')}`;
  const monthNames = ['РЇРЅРІР°СЂСЊ','Р¤РµРІСЂР°Р»СЊ','РњР°СЂС‚','РђРїСЂРµР»СЊ','РњР°Р№','РСЋРЅСЊ',
                      'РСЋР»СЊ','РђРІРіСѓСЃС‚','РЎРµРЅС‚СЏР±СЂСЊ','РћРєС‚СЏР±СЂСЊ','РќРѕСЏР±СЂСЊ','Р”РµРєР°Р±СЂСЊ'];
  
  document.getElementById('receiptPanel').style.display = 'block';
  document.getElementById('receiptAptName').textContent = apt.name;
  document.getElementById('receiptPeriodDisplay').textContent = `${monthNames[month-1]} ${year}`;
  
  let html = '<table><thead><tr>';
  html += '<th>РЈСЃР»СѓРіР°</th>';
  html += '<th>РџСЂРµРґС‹РґСѓС‰РµРµ</th>';
  html += '<th>РўРµРєСѓС‰РµРµ</th>';
  html += '<th>Р Р°СЃС…РѕРґ</th>';
  html += '<th>РўР°СЂРёС„</th>';
  html += '<th>РќР°С‡РёСЃР»РµРЅРёРµ</th>';
  html += '</tr></thead><tbody>';
  
  let grandTotal = 0;
  
  DATA.services.forEach(srv => {
    const tariff = getTariff(srv.id, apt.type);
    
    if (srv.calc_type === 'meter') {
      const prev = getReading(aptId, srv.id, getPrevPeriod(period)) || 0;
      const curr = getReading(aptId, srv.id, period) || 0;
      const volume = curr - prev;
      const amount = volume * tariff;
      grandTotal += amount;
      
      html += `<tr>
        <td><strong>${srv.name}</strong></td>
        <td>${prev.toFixed(2)}</td>
        <td>${curr.toFixed(2)}</td>
        <td>${volume.toFixed(2)} ${srv.unit}</td>
        <td>${tariff} в‚Ѕ</td>
        <td class="amount">${amount.toFixed(2)} в‚Ѕ</td>
      </tr>`;
      
    } else if (srv.calc_type === 'calculated') {
      let volume = 0;
      let amount = 0;
      
      if (srv.id === 2) {
        const elecPrev = getReading(aptId, 1, getPrevPeriod(period)) || 0;
        const elecCurr = getReading(aptId, 1, period) || 0;
        volume = (elecCurr - elecPrev) * 0.1;
        amount = volume * tariff;
      } else if (srv.id === 5) {
        const hvPrev = getReading(aptId, 3, getPrevPeriod(period)) || 0;
        const hvCurr = getReading(aptId, 3, period) || 0;
        const gvPrev = getReading(aptId, 4, getPrevPeriod(period)) || 0;
        const gvCurr = getReading(aptId, 4, period) || 0;
        volume = (hvCurr - hvPrev) + (gvCurr - gvPrev);
        amount = volume * tariff;
      }
      
      grandTotal += amount;
      
      html += `<tr>
        <td><strong>${srv.name}</strong></td>
        <td colspan="2" style="text-align:center;">РђРІС‚РѕРјР°С‚РёС‡РµСЃРєРё</td>
        <td>${volume.toFixed(2)} ${srv.unit}</td>
        <td>${tariff} в‚Ѕ</td>
        <td class="amount">${amount.toFixed(2)} в‚Ѕ</td>
      </tr>`;
      
    } else if (srv.calc_type === 'checkbox') {
      const enabled = getHeating(aptId, period);
      const amount = enabled ? tariff : 0;
      grandTotal += amount;
      
      html += `<tr>
        <td><strong>${srv.name}</strong></td>
        <td colspan="3" style="text-align:center;">${enabled ? 'Р’РєР»СЋС‡РµРЅРѕ' : 'Р’С‹РєР»СЋС‡РµРЅРѕ'}</td>
        <td>${tariff} в‚Ѕ</td>
        <td class="amount">${amount.toFixed(2)} в‚Ѕ</td>
      </tr>`;
      
    } else if (srv.calc_type === 'fixed') {
      const override = getOverride(aptId, srv.id, period);
      const amount = override !== null ? override : tariff;
      grandTotal += amount;
      
      html += `<tr>
        <td><strong>${srv.name}</strong></td>
        <td colspan="3" style="text-align:center;">Р¤РёРєСЃРёСЂРѕРІР°РЅРЅР°СЏ</td>
        <td>${tariff} в‚Ѕ${override ? ' (РёР·Рј.)' : ''}</td>
        <td class="amount">${amount.toFixed(2)} в‚Ѕ</td>
      </tr>`;
    }
  });
  
  // Р”РѕРї РЅР°С‡РёСЃР»РµРЅРёСЏ
  const charge = getCharge(aptId, period);
  if (charge) {
    grandTotal += charge.amount;
    html += `<tr class="charge-row">
      <td><strong>Р”РѕРї. РЅР°С‡РёСЃР»РµРЅРёСЏ</strong></td>
      <td colspan="4">${charge.comment}</td>
      <td class="amount">${charge.amount.toFixed(2)} в‚Ѕ</td>
    </tr>`;
  }
  
  // РЎС‚РѕСЂРЅРѕ
  const storno = getStorno(aptId, period);
  if (storno) {
    grandTotal -= storno.amount;
    html += `<tr style="background: rgba(220, 38, 38, 0.05);">
      <td><strong>РЎС‚РѕСЂРЅРѕ (РІС‹С‡РµС‚)</strong></td>
      <td colspan="4">РљРѕСЂСЂРµРєС‚РёСЂРѕРІРєР° СЂР°СЃС‡РµС‚Р°</td>
      <td style="color: var(--danger); font-weight: 600;">-${storno.amount.toFixed(2)} в‚Ѕ</td>
    </tr>`;
  }
  
  // РС‚РѕРіРѕ
  html += `<tr class="total-row">
    <td colspan="5"><strong>РРўРћР“Рћ Рљ РћРџР›РђРўР•:</strong></td>
    <td><strong style="color: var(--success); font-size: 16px;">${grandTotal.toFixed(2)} в‚Ѕ</strong></td>
  </tr>`;
  
  html += '</tbody></table>';
  document.getElementById('receiptTable').innerHTML = html;
  document.getElementById('exportReceiptBtn').disabled = false;
}

function exportReceiptToWord() {
  alert('Р­РєСЃРїРѕСЂС‚ РєРІРёС‚Р°РЅС†РёРё РІ Word Р±СѓРґРµС‚ СЂРµР°Р»РёР·РѕРІР°РЅ РІ СЃР»РµРґСѓСЋС‰РµР№ РІРµСЂСЃРёРё.\nРџРѕРєР° РјРѕР¶РµС‚Рµ РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ Ctrl+P РґР»СЏ РїРµС‡Р°С‚Рё.');
}

// ========== РљР°Р»СЊРєСѓР»СЏС†РёСЏ РїРѕ РґРЅСЏРј ==========
let dailyCalcData = null;

function loadDailyCalc() {
  const aptId = parseInt(document.getElementById('dailyApartment').value);
  const dateFrom = document.getElementById('dailyDateFrom').value;
  const dateTo = document.getElementById('dailyDateTo').value;
  
  if (!aptId || !dateFrom || !dateTo) {
    alert('Р—Р°РїРѕР»РЅРёС‚Рµ РІСЃРµ РїРѕР»СЏ');
    return;
  }
  
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  
  if (from >= to) {
    alert('Р”Р°С‚Р° "РџРћ" РґРѕР»Р¶РЅР° Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ РґР°С‚С‹ "РЎ"');
    return;
  }
  
  const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
  const monthDays = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate();
  
  const apt = DATA.apartments.find(a => a.id === aptId);
  const period = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`;
  
  dailyCalcData = {
    aptId,
    apt,
    dateFrom,
    dateTo,
    days,
    monthDays,
    period,
    calculated: false
  };
  
  document.getElementById('dailyPanel').style.display = 'block';
  document.getElementById('dailyPeriodDisplay').textContent = `${dateFrom} вЂ” ${dateTo}`;
  document.getElementById('dailyDaysCount').textContent = days;
  
  renderDailyTable();
}

function renderDailyTable() {
  const { aptId, apt, period, days, monthDays } = dailyCalcData;
  
  let html = '<table><thead><tr>';
  html += '<th>РЈСЃР»СѓРіР°</th>';
  html += '<th>РџСЂРµРґС‹РґСѓС‰РµРµ</th>';
  html += '<th>РўРµРєСѓС‰РµРµ</th>';
  html += '<th>Р Р°СЃС…РѕРґ</th>';
  html += '<th>РўР°СЂРёС„</th>';
  html += '<th>РќР°С‡РёСЃР»РµРЅРёРµ</th>';
  html += '</tr></thead><tbody>';
  
  DATA.services.forEach(srv => {
    const tariff = getTariff(srv.id, apt.type);
    
    if (srv.calc_type === 'meter') {
      const prev = getReading(aptId, srv.id, getPrevPeriod(period)) || 0;
      const curr = getReading(aptId, srv.id, period);
      
      html += `<tr>
        <td><strong>${srv.name}</strong></td>
        <td>${prev.toFixed(2)}</td>
        <td><input type="number" step="0.01" value="${curr !== null ? curr : ''}" 
            data-service="${srv.id}" class="daily-reading-input" placeholder="0" style="width:100px;"></td>
        <td data-volume="${srv.id}">вЂ”</td>
        <td>${tariff} в‚Ѕ</td>
        <td class="amount" data-result="${srv.id}">вЂ”</td>
      </tr>`;
      
    } else if (srv.calc_type === 'calculated') {
      html += `<tr>
        <td><strong>${srv.name}</strong></td>
        <td colspan="2" style="text-align:center;">РђРІС‚РѕРјР°С‚РёС‡РµСЃРєРё</td>
        <td data-volume="${srv.id}">вЂ”</td>
        <td>${tariff} в‚Ѕ</td>
        <td class="amount" data-result="${srv.id}">вЂ”</td>
      </tr>`;
      
    } else if (srv.calc_type === 'checkbox') {
      const enabled = getHeating(aptId, period);
      const dailyAmount = (tariff / monthDays * days);
      
      html += `<tr>
        <td><strong>${srv.name}</strong></td>
        <td colspan="2" style="text-align:center;">
          <input type="checkbox" ${enabled ? 'checked' : ''} 
            data-service="${srv.id}" class="daily-heating-checkbox">
          ${days} РёР· ${monthDays} РґРЅРµР№
        </td>
        <td>вЂ”</td>
        <td>${tariff} в‚Ѕ/РјРµСЃ</td>
        <td class="amount" data-result="${srv.id}">вЂ”</td>
      </tr>`;
      
    } else if (srv.calc_type === 'fixed') {
      const override = getOverride(aptId, srv.id, period);
      const baseTariff = override !== null ? override : tariff;
      const dailyAmount = (baseTariff / monthDays * days);
      
      html += `<tr>
        <td><strong>${srv.name}</strong></td>
        <td colspan="2" style="text-align:center;">${days} РёР· ${monthDays} РґРЅРµР№</td>
        <td>вЂ”</td>
        <td>${baseTariff.toFixed(2)} в‚Ѕ/РјРµСЃ</td>
        <td class="amount" data-result="${srv.id}">${dailyAmount.toFixed(2)} в‚Ѕ</td>
      </tr>`;
    }
  });
  
  // РС‚РѕРіРѕ
  html += `<tr class="total-row">
    <td colspan="5"><strong>РРўРћР“Рћ Рљ РћРџР›РђРўР•:</strong></td>
    <td id="dailyTotal"><strong>вЂ”</strong></td>
  </tr>`;
  
  html += '</tbody></table>';
  document.getElementById('dailyTable').innerHTML = html;
}

function calculateDaily() {
  const { aptId, apt, period, days, monthDays } = dailyCalcData;
  
  let grandTotal = 0;
  
  DATA.services.forEach(srv => {
    const tariff = getTariff(srv.id, apt.type);
    let amount = 0;
    
    if (srv.calc_type === 'meter') {
      const input = document.querySelector(`.daily-reading-input[data-service="${srv.id}"]`);
      const curr = parseFloat(input.value) || 0;
      const prev = getReading(aptId, srv.id, getPrevPeriod(period)) || 0;
      const volume = curr - prev;
      amount = volume * tariff;
      
      document.querySelector(`td[data-volume="${srv.id}"]`).textContent = volume.toFixed(2);
      
    } else if (srv.calc_type === 'calculated') {
      if (srv.id === 2) {
        const elecInput = document.querySelector('.daily-reading-input[data-service="1"]');
        const elecCurr = parseFloat(elecInput.value) || 0;
        const elecPrev = getReading(aptId, 1, getPrevPeriod(period)) || 0;
        const volume = (elecCurr - elecPrev) * 0.1;
        amount = volume * tariff;
        document.querySelector(`td[data-volume="${srv.id}"]`).textContent = volume.toFixed(2);
      } else if (srv.id === 5) {
        const hvInput = document.querySelector('.daily-reading-input[data-service="3"]');
        const gvInput = document.querySelector('.daily-reading-input[data-service="4"]');
        const hvCurr = parseFloat(hvInput.value) || 0;
        const gvCurr = parseFloat(gvInput.value) || 0;
        const hvPrev = getReading(aptId, 3, getPrevPeriod(period)) || 0;
        const gvPrev = getReading(aptId, 4, getPrevPeriod(period)) || 0;
        const volume = (hvCurr - hvPrev) + (gvCurr - gvPrev);
        amount = volume * tariff;
        document.querySelector(`td[data-volume="${srv.id}"]`).textContent = volume.toFixed(2);
      }
      
    } else if (srv.calc_type === 'checkbox') {
      const cb = document.querySelector('.daily-heating-checkbox');
      const baseTariff = cb.checked ? tariff : 0;
      amount = baseTariff / monthDays * days;
      
    } else if (srv.calc_type === 'fixed') {
      const override = getOverride(aptId, srv.id, period);
      const baseTariff = override !== null ? override : tariff;
      amount = baseTariff / monthDays * days;
    }
    
    const cell = document.querySelector(`td[data-result="${srv.id}"]`);
    if (cell) cell.textContent = amount.toFixed(2) + ' в‚Ѕ';
    grandTotal += amount;
  });
  
  document.getElementById('dailyTotal').innerHTML = 
    `<strong style="color: var(--success); font-size: 16px;">${grandTotal.toFixed(2)} в‚Ѕ</strong>`;
  
  dailyCalcData.calculated = true;
  dailyCalcData.total = grandTotal;
  document.getElementById('exportDailyBtn').disabled = false;
  document.getElementById('fixStornoBtn').disabled = false;
}

async function fixStorno() {
  if (!dailyCalcData.calculated) {
    alert('РЎРЅР°С‡Р°Р»Р° РЅР°Р¶РјРёС‚Рµ "Р Р°СЃСЃС‡РёС‚Р°С‚СЊ"');
    return;
  }
  
  const { aptId, period, total } = dailyCalcData;
  
  if (!confirm(`Р—Р°С„РёРєСЃРёСЂРѕРІР°С‚СЊ СЃС‚РѕСЂРЅРѕ ${total.toFixed(2)} в‚Ѕ РґР»СЏ РїРµСЂРёРѕРґР° ${period}?`)) {
    return;
  }
  
  showLoader(true);
  
  try {
    let storno = DATA.storno.find(s => 
      s.apartment_id === aptId && s.period === period
    );
    
    if (storno) {
      storno.amount = total;
    } else {
      DATA.storno.push({
        id: Math.max(0, ...DATA.storno.map(s => s.id)) + 1,
        apartment_id: aptId,
        period,
        amount: total
      });
    }
    
    await writeCSV('storno.csv', DATA.storno);
    showStatus('РЎС‚РѕСЂРЅРѕ Р·Р°С„РёРєСЃРёСЂРѕРІР°РЅРѕ', 'success');
    
  } catch (error) {
    showStatus(`РћС€РёР±РєР°: ${error.message}`, 'error');
  } finally {
    showLoader(false);
  }
}

function exportDailyToWord() {
  alert('Р­РєСЃРїРѕСЂС‚ СЂР°СЃС‡С‘С‚Р° РІ Word Р±СѓРґРµС‚ СЂРµР°Р»РёР·РѕРІР°РЅ РІ СЃР»РµРґСѓСЋС‰РµР№ РІРµСЂСЃРёРё.\nРџРѕРєР° РјРѕР¶РµС‚Рµ РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ Ctrl+P РґР»СЏ РїРµС‡Р°С‚Рё.');
}

// ========== РўР°СЂРёС„С‹ ==========
function displayTariffs() {
  let html = '<table><thead><tr><th>РЈСЃР»СѓРіР°</th><th>Р¦РµРЅР°</th><th>РўРёРї РєРІР°СЂС‚РёСЂС‹</th></tr></thead><tbody>';
  
  DATA.tariffs.forEach(t => {
    const srv = DATA.services.find(s => s.id === t.service_id);
    const aptType = t.apartment_type === 'all' ? 'Р’СЃРµ' : 
                    t.apartment_type === 'studio' ? 'РЎС‚СѓРґРёРё' : 'Р”РІСѓС…СѓСЂРѕРІРЅРµРІС‹Рµ';
    
    html += `<tr>
      <td>${srv?.name || 'N/A'}</td>
      <td><strong class="amount">${t.price} в‚Ѕ</strong></td>
      <td><span class="badge badge-primary">${aptType}</span></td>
    </tr>`;
  });
  
  html += '</tbody></table>';
  document.getElementById('tariffsTable').innerHTML = html;
}

async function updateTariff() {
  const srvId = parseInt(document.getElementById('tariffService').value);
  const price = parseFloat(document.getElementById('tariffPrice').value);
  const aptType = document.getElementById('tariffAptType').value;
  
  if (!srvId || !price) {
    alert('Р—Р°РїРѕР»РЅРёС‚Рµ РІСЃРµ РїРѕР»СЏ');
    return;
  }
  
  showLoader(true);
  
  try {
    let tariff = DATA.tariffs.find(t => 
      t.service_id === srvId && t.apartment_type === aptType
    );
    
    if (tariff) {
      tariff.price = price;
    } else {
      DATA.tariffs.push({
        id: Math.max(0, ...DATA.tariffs.map(t => t.id)) + 1,
        service_id: srvId,
        price,
        apartment_type: aptType
      });
    }
    
    await writeCSV('tariffs.csv', DATA.tariffs);
    showStatus('РўР°СЂРёС„ РѕР±РЅРѕРІР»С‘РЅ', 'success');
    displayTariffs();
    
  } catch (error) {
    showStatus(`РћС€РёР±РєР°: ${error.message}`, 'error');
  } finally {
    showLoader(false);
  }
}

// ========== Р’СЃРїРѕРјРѕРіР°С‚РµР»СЊРЅС‹Рµ ==========
function getTariff(serviceId, aptType) {
  const tariff = DATA.tariffs.find(t => 
    t.service_id === serviceId && 
    (t.apartment_type === 'all' || t.apartment_type === aptType)
  );
  return tariff ? tariff.price : 0;
}

function getReading(aptId, srvId, period) {
  const reading = DATA.readings.find(r => 
    r.apartment_id === aptId && 
    r.service_id === srvId && 
    r.period === period
  );
  return reading ? reading.value : null;
}

function getHeating(aptId, period) {
  const heating = DATA.heating.find(h => 
    h.apartment_id === aptId && h.period === period
  );
  return heating ? heating.enabled : false;
}

function getCharge(aptId, period) {
  return DATA.charges.find(c => 
    c.apartment_id === aptId && c.period === period
  );
}

function getStorno(aptId, period) {
  return DATA.storno.find(s => 
    s.apartment_id === aptId && s.period === period
  );
}

function getOverride(aptId, srvId, period) {
  const override = DATA.overrides.find(o => 
    o.apartment_id === aptId && 
    o.service_id === srvId && 
    o.period === period
  );
  return override ? override.amount : null;
}

function getPrevPeriod(period) {
  const [year, month] = period.split('-').map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

// ========== Р“Р»РѕР±Р°Р»СЊРЅС‹Рµ С„СѓРЅРєС†РёРё ==========
window.calculateData = calculateData;
window.saveData = saveData;
window.saveSettings = saveSettings;
window.clearSettings = clearSettings;
window.updateTariff = updateTariff;
window.showHistoryFull = showHistoryFull;
window.exportToExcel = exportToExcel;
window.showCorrectionForm = showCorrectionForm;
window.saveCorrectionData = saveCorrectionData;
window.generateReceipt = generateReceipt;
window.exportReceiptToWord = exportReceiptToWord;
window.loadDailyCalc = loadDailyCalc;
window.calculateDaily = calculateDaily;
window.fixStorno = fixStorno;
window.exportDailyToWord = exportDailyToWord;
