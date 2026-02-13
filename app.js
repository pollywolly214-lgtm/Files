const STORAGE_KEY = 'friendlyFileNamerV3';

const state = loadState();
const ui = {
  stepContainer: document.getElementById('stepContainer'),
  progressText: document.getElementById('progressText'),
  finalName: document.getElementById('finalName'),
  finalPath: document.getElementById('finalPath'),
  history: document.getElementById('history'),
  downloadBtn: document.getElementById('downloadBtn'),
  inlineError: document.getElementById('inlineError')
};

const answers = {
  file: null,
  type: 'PRT',
  project: state.lastProject || '1251',
  assembly: '001',
  scope: 'single',
  part: '051',
  thk: '0.25in',
  rev: 1,
  cut: nextCut(state.cutCounter)
};

let currentStep = 0;
const assemblyChoices = Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(3, '0'));
const partChoices = Array.from({ length: 25 }, (_, i) => String(51 + i * 2).padStart(3, '0'));
const typeChoices = ['PRT', 'NS', 'ASY', 'PARENT'];
const scopeChoices = ['single', 'multi'];
const thicknessChoices = ['0.25in', '0.125in', '0.063in', '0.025in'];

renderStep();
renderHistory();

function steps() {
  return [
    {
      title: 'First, choose your file',
      hint: 'We keep the extension and rename only the filename body.',
      body: `
        <label for="fileInput">Upload file<input id="fileInput" type="file" required /></label>
        <p class="tiny">${answers.file ? `${answers.file.name} (${formatBytes(answers.file.size)})` : 'No file selected yet.'}</p>
      `,
      setup: () => {
        const input = byId('fileInput');
        input.onchange = () => {
          answers.file = input.files?.[0] || null;
          renderStep();
        };
      },
      valid: () => Boolean(answers.file),
      error: 'Please choose a file to continue.'
    },
    {
      title: 'What is this for?',
      hint: 'One click. Type decides which next questions appear.',
      body: choiceButtons('type', typeChoices, answers.type, {
        PRT: 'Part',
        NS: 'Nest',
        ASY: 'Assembly',
        PARENT: 'Parent'
      }),
      setup: () => setupChoiceButtons('type', value => {
        answers.type = value;
        if (answers.type !== 'NS') answers.scope = 'single';
      }),
      valid: () => typeChoices.includes(answers.type),
      error: 'Please select a valid type.'
    },
    {
      title: 'What project is this for?',
      hint: 'Project number is exactly 4 digits.',
      body: `<label for="project">Project #<input id="project" value="${answers.project}" maxlength="4" inputmode="numeric" placeholder="1251" /></label>`,
      setup: () => {
        const el = byId('project');
        el.oninput = () => {
          answers.project = el.value.replace(/\D/g, '').slice(0, 4);
          el.value = answers.project;
        };
      },
      valid: () => /^\d{4}$/.test(answers.project),
      error: 'Project must be exactly 4 digits.'
    },
    {
      title: 'Pick an assembly number',
      hint: 'Dropdown kept for quick list scanning.',
      body: `<label for="assembly">Assembly<select id="assembly">${assemblyChoices.map(a => `<option value="${a}">${a}</option>`).join('')}</select></label>`,
      setup: () => {
        const el = byId('assembly');
        el.value = answers.assembly;
        el.onchange = () => (answers.assembly = el.value);
      },
      valid: () => assemblyChoices.includes(answers.assembly),
      error: 'Please choose an assembly number.'
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
    title: 'Nest scope',
    hint: 'Single-part includes part token. Multi-part skips part token.',
    body: choiceButtons('scope', scopeChoices, answers.scope, {
      single: 'Single part',
      multi: 'Multi-part'
    }),
    setup: () => setupChoiceButtons('scope', value => (answers.scope = value)),
    valid: () => scopeChoices.includes(answers.scope),
    error: 'Pick single-part or multi-part.'
  };
}

function partStep() {
  const needed = answers.type === 'PRT' || (answers.type === 'NS' && answers.scope === 'single');
  if (!needed) return null;

  return {
    title: 'Pick a part number',
    hint: 'Dropdown kept here by request.',
    body: `<label for="part">Part<select id="part">${partChoices.map(p => `<option value="${p}">${p}</option>`).join('')}</select></label>`,
    setup: () => {
      const el = byId('part');
      el.value = answers.part;
      el.onchange = () => (answers.part = el.value);
    },
    valid: () => partChoices.includes(answers.part),
    error: 'Please choose a part number.'
  };
}

function thicknessStep() {
  const needed = answers.type === 'PRT' || answers.type === 'NS';
  if (!needed) return null;

  return {
    title: 'Choose thickness',
    hint: 'One click chip, no dropdown.',
    body: choiceButtons('thk', thicknessChoices, answers.thk),
    setup: () => setupChoiceButtons('thk', value => (answers.thk = value)),
    valid: () => thicknessChoices.includes(answers.thk),
    error: 'Please choose a thickness.'
  };
}

function revisionStep() {
  return {
    title: 'Revision number',
    hint: 'Positive whole number only (we add P automatically).',
    body: `<label for="rev">Revision<input id="rev" type="number" min="1" step="1" value="${answers.rev}" /></label>`,
    setup: () => {
      const el = byId('rev');
      el.oninput = () => {
        answers.rev = Number.parseInt(el.value, 10);
      };
    },
    valid: () => Number.isInteger(answers.rev) && answers.rev > 0,
    error: 'Revision must be a whole number greater than 0.'
  };
}

function cutStep() {
  if (answers.type !== 'NS') return null;

  return {
    title: 'Cut number',
    hint: 'Format: C###. We auto-format as you type.',
    body: `<label for="cut">Cut<input id="cut" value="${answers.cut}" placeholder="C001" /></label>`,
    setup: () => {
      const el = byId('cut');
      el.oninput = () => {
        answers.cut = normalizeCut(el.value);
        el.value = answers.cut;
      };
      el.onblur = () => {
        answers.cut = normalizeCut(el.value);
        el.value = answers.cut;
      };
    },
    valid: () => /^C\d{3}$/.test(answers.cut),
    error: 'Cut must be C### (example C007).'
  };
}

function reviewStep() {
  const generated = buildFilename();
  const savePath = buildPath();
  const hasFile = Boolean(answers.file);
  const clickableText = randomNote();

  return {
    title: 'Looks great ✨',
    hint: clickableText,
    body: hasFile
      ? `<p><strong>${generated}</strong></p><p class="tiny">${savePath}${generated}</p>`
      : '<p class="tiny">Missing file upload. Go back to step 1.</p>',
    setup: () => {
      ui.finalName.textContent = hasFile ? generated : '—';
      ui.finalPath.textContent = hasFile ? `${savePath}${generated}` : '—';
      ui.downloadBtn.classList.toggle('hidden', !hasFile);
      ui.downloadBtn.disabled = !hasFile;
      ui.downloadBtn.onclick = () => hasFile && downloadRenamed(answers.file, generated);
      if (hasFile) persistRecord(generated, savePath);
    },
    valid: () => hasFile,
    error: 'A file must be uploaded before saving.',
    hideNext: true
  };
}

function renderStep() {
  const flow = steps();
  currentStep = Math.max(0, Math.min(currentStep, flow.length - 1));
  const step = flow[currentStep];

  ui.progressText.textContent = `Step ${currentStep + 1} of ${flow.length}`;
  ui.inlineError.textContent = '';

  const shell = document.createElement('div');
  shell.className = 'step';
  shell.innerHTML = `
    <h2>${step.title}</h2>
    <p class="tiny">${step.hint}</p>
    ${step.body}
    <div class="row">
      <button id="backBtn" type="button" class="secondary" ${currentStep === 0 ? 'disabled' : ''}>Back</button>
      <button id="nextBtn" type="button">${step.hideNext ? 'Start another file' : 'Next'}</button>
    </div>
  `;

  ui.stepContainer.innerHTML = '';
  ui.stepContainer.appendChild(shell);
  step.setup?.();
  wireEnterToNext();

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
      ui.inlineError.textContent = step.error || 'Please fix this answer before continuing.';
      return;
    }

    currentStep += 1;
    renderStep();
  };
}

function choiceButtons(name, options, selected, labels = {}) {
  return `
    <div class="choice-group" role="radiogroup" aria-label="${name}">
      ${options
        .map(
          option => `<button type="button" class="choice ${selected === option ? 'active' : ''}" data-choice="${name}" data-value="${option}" aria-pressed="${selected === option}">${labels[option] || option}</button>`
        )
        .join('')}
    </div>
  `;
}

function setupChoiceButtons(name, onPick) {
  ui.stepContainer.querySelectorAll(`[data-choice="${name}"]`).forEach(button => {
    button.addEventListener('click', () => {
      onPick(button.dataset.value);
      ui.stepContainer
        .querySelectorAll(`[data-choice="${name}"]`)
        .forEach(btn => {
          const active = btn === button;
          btn.classList.toggle('active', active);
          btn.setAttribute('aria-pressed', String(active));
        });
    });
  });
}

function buildFilename() {
  if (!answers.file) return '';

  const ext = extractExtension(answers.file.name);
  const list = [answers.type, answers.project, answers.assembly];
  const includePart = answers.type === 'PRT' || (answers.type === 'NS' && answers.scope === 'single');
  const includeThk = answers.type === 'PRT' || answers.type === 'NS';

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
  if (answers.type === 'PARENT') return `${base}Parent/`;
  return `${base}CAD/`;
}

function persistRecord(generated, savePath) {
  const fullPath = `${savePath}${generated}`;
  const dedupeKey = `${generated}|${fullPath}`;
  if (state.lastSaved === dedupeKey) return;

  state.lastSaved = dedupeKey;
  state.lastProject = answers.project;
  if (answers.type === 'NS') {
    state.cutCounter = Math.max(state.cutCounter, Number(answers.cut.slice(1)) + 1);
  }

  state.history = [
    { name: generated, path: fullPath, at: new Date().toISOString() },
    ...state.history.filter(item => `${item.name}|${item.path}` !== dedupeKey)
  ].slice(0, 20);

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
  ui.downloadBtn.disabled = true;
  ui.inlineError.textContent = '';
  renderStep();
}

function renderHistory() {
  if (!state.history.length) {
    ui.history.innerHTML = '<li class="tiny">No files renamed yet.</li>';
    return;
  }

  ui.history.innerHTML = state.history
    .map(item => `<li><strong>${item.name}</strong><br/><span class="tiny">${item.path}</span></li>`)
    .join('');
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      oneDriveRoot: saved.oneDriveRoot || 'OneDriveRoot',
      history: Array.isArray(saved.history) ? saved.history : [],
      cutCounter: Number.isInteger(saved.cutCounter) && saved.cutCounter > 0 ? saved.cutCounter : 1,
      lastProject: /^\d{4}$/.test(saved.lastProject) ? saved.lastProject : '1251',
      lastSaved: null
    };
  } catch {
    return { oneDriveRoot: 'OneDriveRoot', history: [], cutCounter: 1, lastProject: '1251', lastSaved: null };
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      oneDriveRoot: state.oneDriveRoot,
      history: state.history,
      cutCounter: state.cutCounter,
      lastProject: state.lastProject
    })
  );
}

function nextCut(n) {
  return `C${String(n).padStart(3, '0')}`;
}

function normalizeCut(value) {
  const cleaned = String(value || '').toUpperCase().replace(/\s/g, '').replace(/[^C\d]/g, '');
  const digits = cleaned.replace(/^C/, '').replace(/\D/g, '').slice(0, 3);
  return `C${digits.padStart(3, '0')}`;
}

function extractExtension(filename) {
  const name = String(filename || '');
  const lastDot = name.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === name.length - 1) return '';
  return name.slice(lastDot);
}

function wireEnterToNext() {
  const next = byId('nextBtn');
  const controls = ui.stepContainer.querySelectorAll('input, select');
  controls.forEach(control => {
    control.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        next?.click();
      }
    });
  });
}

function randomNote() {
  const notes = [
    'Nice click-flow. Want to tweak anything before download?',
    'Quick and clean ✨ You can still go back and adjust.',
    'All tokens look valid. Save when ready.'
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function byId(id) {
  return document.getElementById(id);
}

function downloadRenamed(file, filename) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
