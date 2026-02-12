const STORAGE_KEY = 'friendlyFileNamerV2';

const state = loadState();
const ui = {
  stepContainer: document.getElementById('stepContainer'),
  progressText: document.getElementById('progressText'),
  finalName: document.getElementById('finalName'),
  finalPath: document.getElementById('finalPath'),
  history: document.getElementById('history'),
  downloadBtn: document.getElementById('downloadBtn')
};

const answers = {
  file: null,
  type: 'PRT',
  project: state.lastProject || '1251',
  assembly: '001',
  scope: 'single',
  part: '051',
  cutStock: 'yes',
  thk: '0.25in',
  rev: 1,
  cut: nextCut(state.cutCounter)
};

let currentStep = 0;
const assemblyChoices = Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(3, '0'));
const partChoices = Array.from({ length: 25 }, (_, i) => String(51 + i * 2).padStart(3, '0'));

renderStep();
renderHistory();

function steps() {
  return [
    {
      title: 'First, choose your file',
      hint: 'We will keep the extension and rename it for you.',
      body: `<label>Upload file<input id="fileInput" type="file" required /></label>`,
      setup: () => {
        const input = byId('fileInput');
        input.onchange = () => (answers.file = input.files[0]);
      },
      valid: () => !!answers.file
    },
    {
      title: 'What is this for?',
      hint: 'Pick the kind of file so we can ask only what matters.',
      body: `<label>Type<select id="type"><option value="PRT">Part (PRT)</option><option value="NS">Nest (NS)</option><option value="ASY">Assembly (ASY)</option></select></label>`,
      setup: () => {
        const el = byId('type');
        el.value = answers.type;
        el.onchange = () => (answers.type = el.value);
      },
      valid: () => true
    },
    {
      title: 'Great. What project is this for?',
      hint: 'Use a 4-digit project number.',
      body: `<label>Project #<input id="project" value="${answers.project}" maxlength="4" placeholder="1251" /></label>`,
      setup: () => {
        const el = byId('project');
        el.oninput = () => (answers.project = el.value.replace(/\D/g, '').slice(0, 4));
      },
      valid: () => /^\d{4}$/.test(answers.project)
    },
    {
      title: 'Pick an assembly number',
      hint: 'Simple list, no setup needed.',
      body: `<label>Assembly<select id="assembly">${assemblyChoices.map(a => `<option>${a}</option>`).join('')}</select></label>`,
      setup: () => {
        const el = byId('assembly');
        el.value = answers.assembly;
        el.onchange = () => (answers.assembly = el.value);
      },
      valid: () => true
    },
    nestScopeStep(),
    partStep(),
    thicknessStep(),
    revisionStep(),
    cutStep(),
    reviewStep()
  ].filter(Boolean);
}

function nestScopeStep() {
  if (answers.type !== 'NS') return null;
  return {
    title: 'Almost done — is this nest for one part or many?',
    hint: 'If it is multi-part, part number is skipped.',
    body: `<label>Nest scope<select id="scope"><option value="single">Single part</option><option value="multi">Multi-part (assembly-level)</option></select></label>`,
    setup: () => {
      const el = byId('scope');
      el.value = answers.scope;
      el.onchange = () => (answers.scope = el.value);
    },
    valid: () => true
  };
}

function partStep() {
  const needed = answers.type === 'PRT' || (answers.type === 'NS' && answers.scope === 'single');
  if (!needed) return null;
  return {
    title: 'Pick a part number',
    hint: 'Odd series starts at 051 to match your standard.',
    body: `<label>Part<select id="part">${partChoices.map(p => `<option>${p}</option>`).join('')}</select></label>`,
    setup: () => {
      const el = byId('part');
      el.value = answers.part;
      el.onchange = () => (answers.part = el.value);
    },
    valid: () => true
  };
}

function thicknessStep() {
  const needed = answers.type === 'NS' || (answers.type === 'PRT' && answers.cutStock === 'yes');
  if (!needed) return null;
  return {
    title: 'What thickness should we use?',
    hint: 'This goes straight into the filename token.',
    body: `<label>Thickness<select id="thk"><option>0.25in</option><option>0.125in</option><option>0.063in</option><option>0.025in</option></select></label>`,
    setup: () => {
      const el = byId('thk');
      el.value = answers.thk;
      el.onchange = () => (answers.thk = el.value);
    },
    valid: () => true
  };
}

function revisionStep() {
  return {
    title: 'Revision number?',
    hint: 'Just enter the number. We add the P for you.',
    body: `<label>Revision<input id="rev" type="number" min="1" step="1" value="${answers.rev}" /></label>`,
    setup: () => {
      const el = byId('rev');
      el.oninput = () => (answers.rev = Number(el.value || 0));
    },
    valid: () => Number.isInteger(answers.rev) && answers.rev > 0
  };
}

function cutStep() {
  if (answers.type !== 'NS') return null;
  return {
    title: 'Last one: cut number',
    hint: 'Format is always C###.',
    body: `<label>Cut<input id="cut" value="${answers.cut}" placeholder="C001" /></label>`,
    setup: () => {
      const el = byId('cut');
      el.oninput = () => (answers.cut = el.value.toUpperCase().replace(/\s/g, ''));
    },
    valid: () => /^C\d{3}$/.test(answers.cut)
  };
}

function reviewStep() {
  const generated = buildFilename();
  const savePath = buildPath();
  return {
    title: 'Nice work ✨ Ready to save',
    hint: 'You can go back and tweak anything.',
    body: `<p><strong>${generated}</strong></p><p class="tiny">${savePath}${generated}</p>`,
    setup: () => {
      ui.finalName.textContent = generated;
      ui.finalPath.textContent = `${savePath}${generated}`;
      ui.downloadBtn.classList.remove('hidden');
      ui.downloadBtn.onclick = () => downloadRenamed(answers.file, generated);
      persistRecord(generated, savePath);
    },
    valid: () => true,
    hideNext: true
  };
}

function renderStep(direction = 'in') {
  const flow = steps();
  currentStep = Math.min(currentStep, flow.length - 1);
  const step = flow[currentStep];

  ui.progressText.textContent = `Step ${currentStep + 1} of ${flow.length}`;
  const shell = document.createElement('div');
  shell.className = `step ${direction === 'out' ? 'fade-out' : ''}`;
  shell.innerHTML = `
    <h2>${step.title}</h2>
    <p class="tiny">${step.hint}</p>
    ${step.body}
    <div class="row">
      <button id="backBtn" class="secondary" ${currentStep === 0 ? 'disabled' : ''}>Back</button>
      <button id="nextBtn">${step.hideNext ? 'Start another file' : 'Next'}</button>
    </div>
  `;

  ui.stepContainer.innerHTML = '';
  ui.stepContainer.appendChild(shell);
  step.setup?.();

  byId('backBtn').onclick = () => {
    if (currentStep === 0) return;
    currentStep -= 1;
    renderStep();
  };

  byId('nextBtn').onclick = () => {
    if (step.hideNext) {
      resetForNewFile();
      return;
    }
    if (!step.valid()) {
      alert('Just one quick fix before continuing.');
      return;
    }
    currentStep += 1;
    renderStep();
  };
}

function buildFilename() {
  const ext = answers.file.name.includes('.') ? `.${answers.file.name.split('.').pop()}` : '';
  const list = [answers.type, answers.project, answers.assembly];
  const includePart = answers.type === 'PRT' || (answers.type === 'NS' && answers.scope === 'single');
  const includeThk = answers.type === 'NS' || answers.type === 'PRT';
  if (includePart) list.push(answers.part);
  if (includeThk) list.push(answers.thk);
  list.push(`P${answers.rev}`);
  if (answers.type === 'NS') list.push(answers.cut);
  return `${list.join('-')}${ext}`;
}

function buildPath() {
  const base = `${state.oneDriveRoot}/Projects/${answers.project}/ASY-${answers.assembly}/`;
  if (answers.type === 'PRT') return `${base}Parts/`;
  if (answers.type === 'NS') return `${base}Nests/`;
  return `${base}CAD/`;
}

function persistRecord(generated, savePath) {
  if (state.lastSaved === generated) return;
  state.lastSaved = generated;
  state.lastProject = answers.project;
  if (answers.type === 'NS') state.cutCounter = Math.max(state.cutCounter, Number(answers.cut.slice(1)) + 1);
  state.history.unshift({
    name: generated,
    path: `${savePath}${generated}`,
    at: new Date().toISOString()
  });
  state.history = state.history.slice(0, 20);
  saveState();
  renderHistory();
}

function resetForNewFile() {
  answers.file = null;
  answers.scope = 'single';
  answers.rev = 1;
  answers.cut = nextCut(state.cutCounter);
  state.lastSaved = null;
  currentStep = 0;
  ui.finalName.textContent = '—';
  ui.finalPath.textContent = '—';
  ui.downloadBtn.classList.add('hidden');
  renderStep();
}

function renderHistory() {
  ui.history.innerHTML = state.history.map(item => `<li><strong>${item.name}</strong><br/><span class="tiny">${item.path}</span></li>`).join('');
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      oneDriveRoot: saved.oneDriveRoot || 'OneDriveRoot',
      history: saved.history || [],
      cutCounter: saved.cutCounter || 1,
      lastProject: saved.lastProject || '1251',
      lastSaved: null
    };
  } catch {
    return { oneDriveRoot: 'OneDriveRoot', history: [], cutCounter: 1, lastProject: '1251', lastSaved: null };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nextCut(n) {
  return `C${String(n).padStart(3, '0')}`;
}

function byId(id) {
  return document.getElementById(id);
}

function downloadRenamed(file, filename) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
