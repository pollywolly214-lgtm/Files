const STORAGE_KEY = 'fileOrganizerStateV1';

const defaultState = {
  oneDriveRoot: 'OneDriveRoot',
  oneDriveUrl: '',
  projects: {},
  cutCounter: 1,
  history: []
};

const state = loadState();
const el = {
  oneDriveRoot: document.getElementById('oneDriveRoot'),
  oneDriveUrl: document.getElementById('oneDriveUrl'),
  saveOneDrive: document.getElementById('saveOneDrive'),
  openOneDrive: document.getElementById('openOneDrive'),
  fileInput: document.getElementById('fileInput'),
  projectSelect: document.getElementById('projectSelect'),
  newProjectBtn: document.getElementById('newProjectBtn'),
  fileType: document.getElementById('fileType'),
  asySelect: document.getElementById('asySelect'),
  newAsyBtn: document.getElementById('newAsyBtn'),
  nsScopeWrap: document.getElementById('nsScopeWrap'),
  nestScope: document.getElementById('nestScope'),
  partWrap: document.getElementById('partWrap'),
  partSelect: document.getElementById('partSelect'),
  newPartBtn: document.getElementById('newPartBtn'),
  cutStockWrap: document.getElementById('cutStockWrap'),
  cutStock: document.getElementById('cutStock'),
  thkWrap: document.getElementById('thkWrap'),
  thk: document.getElementById('thk'),
  revision: document.getElementById('revision'),
  cutWrap: document.getElementById('cutWrap'),
  cut: document.getElementById('cut'),
  wizardForm: document.getElementById('wizardForm'),
  generatedName: document.getElementById('generatedName'),
  savePath: document.getElementById('savePath'),
  downloadBtn: document.getElementById('downloadBtn'),
  history: document.getElementById('history')
};

init();

function init() {
  el.oneDriveRoot.value = state.oneDriveRoot;
  el.oneDriveUrl.value = state.oneDriveUrl;
  refreshOpenDriveLink();

  if (Object.keys(state.projects).length === 0) {
    createProject('1251');
    createAssembly('1251');
    createPart('1251', '001');
  }

  bindEvents();
  renderProjects();
  renderHistory();
  updateConditionalFields();
}

function bindEvents() {
  el.saveOneDrive.addEventListener('click', () => {
    state.oneDriveRoot = (el.oneDriveRoot.value || 'OneDriveRoot').trim();
    state.oneDriveUrl = el.oneDriveUrl.value.trim();
    saveState();
    refreshOpenDriveLink();
    alert('OneDrive settings saved.');
  });

  el.newProjectBtn.addEventListener('click', () => {
    const input = prompt('Enter 4-digit project number (leave blank for auto):');
    const projectNo = input?.trim() || nextProjectNumber();
    if (!/^\d{4}$/.test(projectNo)) return alert('Project must be 4 digits.');
    if (state.projects[projectNo]) return alert('Project already exists.');
    createProject(projectNo);
    renderProjects(projectNo);
  });

  el.projectSelect.addEventListener('change', () => {
    renderAssemblies();
    renderParts();
  });

  el.newAsyBtn.addEventListener('click', () => {
    const proj = currentProject();
    if (!proj) return;
    const asy = createAssembly(proj);
    renderAssemblies(asy);
    renderParts();
  });

  el.asySelect.addEventListener('change', renderParts);

  el.newPartBtn.addEventListener('click', () => {
    const proj = currentProject();
    const asy = currentAssembly();
    if (!proj || !asy) return;
    const part = createPart(proj, asy);
    renderParts(part);
  });

  ['change', 'input'].forEach(evt => {
    el.fileType.addEventListener(evt, updateConditionalFields);
    el.nestScope.addEventListener(evt, updateConditionalFields);
    el.cutStock.addEventListener(evt, updateConditionalFields);
  });

  el.wizardForm.addEventListener('submit', onSubmit);
}

function updateConditionalFields() {
  const type = el.fileType.value;
  const ns = type === 'NS';
  const prt = type === 'PRT';
  const multi = el.nestScope.value === 'multi';
  const needsPart = (prt || (ns && !multi));
  const needsThk = ns || (prt && el.cutStock.value === 'yes');

  el.nsScopeWrap.classList.toggle('hidden', !ns);
  el.partWrap.classList.toggle('hidden', !needsPart);
  el.cutStockWrap.classList.toggle('hidden', !prt);
  el.thkWrap.classList.toggle('hidden', !needsThk);
  el.cutWrap.classList.toggle('hidden', !ns);

  if (ns && !/^C\d{3}$/.test(el.cut.value)) {
    el.cut.value = formatCut(state.cutCounter);
  }
}

function onSubmit(event) {
  event.preventDefault();
  const file = el.fileInput.files[0];
  if (!file) return alert('Please upload a file first.');

  const proj = currentProject();
  const asy = currentAssembly();
  const type = el.fileType.value;
  const scope = el.nestScope.value;
  const part = el.partSelect.value;
  const thk = el.thk.value;
  const revision = Number(el.revision.value);
  const cut = el.cut.value.toUpperCase();
  const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';

  if (!proj || !asy) return alert('Project and assembly are required.');
  if (revision < 1 || !Number.isInteger(revision)) return alert('Revision must be an integer >= 1.');

  if (type === 'NS' && !/^C\d{3}$/.test(cut)) return alert('Cut must match C###.');

  const needsPart = type === 'PRT' || (type === 'NS' && scope === 'single');
  if (needsPart && !isValidPart(part)) return alert('Part must be odd and >= 051.');

  const needsThk = type === 'NS' || (type === 'PRT' && el.cutStock.value === 'yes');
  const tokens = [type, proj, asy];

  if (needsPart) tokens.push(part);
  if (needsThk) tokens.push(thk);
  tokens.push(`P${revision}`);
  if (type === 'NS') tokens.push(cut);

  const generated = `${tokens.join('-')}${ext}`;
  const savePath = buildSavePath(type, proj, asy);

  const record = {
    generated,
    savePath,
    metadata: {
      uploader: 'Local User',
      timestamp: new Date().toISOString(),
      project: proj,
      assembly: asy,
      part: needsPart ? part : null,
      thickness: needsThk ? thk : null,
      revision,
      cut: type === 'NS' ? cut : null,
      fileType: type,
      originalFilename: file.name
    }
  };

  if (type === 'NS') state.cutCounter = Math.max(state.cutCounter, Number(cut.slice(1)) + 1);

  state.history.unshift(record);
  state.history = state.history.slice(0, 50);
  saveState();
  renderHistory();

  el.generatedName.textContent = generated;
  el.savePath.textContent = `${savePath}${generated}`;
  el.downloadBtn.classList.remove('hidden');
  el.downloadBtn.onclick = () => downloadRenamed(file, generated);

  updateConditionalFields();
}

function buildSavePath(type, project, assembly) {
  const base = `${state.oneDriveRoot}/Projects/${project}/ASY-${assembly}/`;
  if (type === 'PRT') return `${base}Parts/`;
  if (type === 'NS') return `${base}Nests/`;
  if (type === 'ASY') return `${base}CAD/`;
  return base;
}

function createProject(projectNo) {
  state.projects[projectNo] = state.projects[projectNo] || { assemblies: {} };
  saveState();
}

function createAssembly(projectNo) {
  const project = state.projects[projectNo];
  const existing = Object.keys(project.assemblies).sort();
  const next = String(existing.length ? Number(existing[existing.length - 1]) + 1 : 1).padStart(3, '0');
  project.assemblies[next] = project.assemblies[next] || { parts: [] };
  saveState();
  return next;
}

function createPart(projectNo, assemblyNo) {
  const parts = state.projects[projectNo].assemblies[assemblyNo].parts;
  const next = parts.length ? Number(parts[parts.length - 1]) + 2 : 51;
  const padded = String(next).padStart(3, '0');
  parts.push(padded);
  saveState();
  return padded;
}

function renderProjects(selected) {
  const keys = Object.keys(state.projects).sort();
  el.projectSelect.innerHTML = keys.map(k => `<option value="${k}">${k}</option>`).join('');
  if (selected) el.projectSelect.value = selected;
  renderAssemblies();
  renderParts();
}

function renderAssemblies(selected) {
  const project = currentProject();
  const assemblies = Object.keys(state.projects[project].assemblies).sort();
  el.asySelect.innerHTML = assemblies.map(a => `<option value="${a}">${a}</option>`).join('');
  if (selected) el.asySelect.value = selected;
}

function renderParts(selected) {
  const project = currentProject();
  const asy = currentAssembly();
  const parts = state.projects[project].assemblies[asy].parts;
  el.partSelect.innerHTML = parts.map(p => `<option value="${p}">${p}</option>`).join('');
  if (selected) el.partSelect.value = selected;
}

function renderHistory() {
  el.history.innerHTML = state.history.map(item => {
    const m = item.metadata;
    return `<li><strong>${item.generated}</strong><br/><small>${item.savePath}</small><br/><small>${new Date(m.timestamp).toLocaleString()} • ${m.fileType} • original: ${m.originalFilename}</small></li>`;
  }).join('');
}

function refreshOpenDriveLink() {
  if (state.oneDriveUrl) {
    el.openOneDrive.href = state.oneDriveUrl;
    el.openOneDrive.textContent = 'Open configured OneDrive folder';
  } else {
    el.openOneDrive.removeAttribute('href');
    el.openOneDrive.textContent = 'No OneDrive URL saved yet';
  }
}

function nextProjectNumber() {
  const keys = Object.keys(state.projects);
  const max = keys.length ? Math.max(...keys.map(Number)) : 1250;
  return String(max + 1).padStart(4, '0');
}

function formatCut(num) {
  return `C${String(num).padStart(3, '0')}`;
}

function currentProject() {
  return el.projectSelect.value;
}

function currentAssembly() {
  return el.asySelect.value;
}

function isValidPart(part) {
  const n = Number(part);
  return Number.isInteger(n) && n >= 51 && n % 2 === 1;
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed ? { ...defaultState, ...parsed } : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function downloadRenamed(file, newName) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = newName;
  a.click();
  URL.revokeObjectURL(url);
}
