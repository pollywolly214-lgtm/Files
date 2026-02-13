const STORAGE_KEY = 'friendlyFileNamerV4';

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
  assemblyMode: '3D',
  scope: 'single',
  part: '051',
  thk: '1/4in',
  rev: 1,
  cut: nextCut(state.cutCounter)
};

let currentStep = 0;
const assemblyChoices = Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(3, '0'));
const partChoices = Array.from({ length: 25 }, (_, i) => String(51 + i * 2).padStart(3, '0'));
const typeChoices = ['PRT', 'NS', 'ASY', 'PARENT'];
const scopeChoices = ['single', 'multi'];
const assemblyModeChoices = ['2D', '3D'];
const commonThicknessLabels = ['1/8in', '3/16in', '1/4in', '3/8in', '1/2in'];
const allThicknessChoices = buildThicknessChoices();

renderStep();
renderHistory();

function steps() {
  return [
    fileStep(),
    typeStep(),
    projectStep(),
    assemblyStep(),
    assemblyModeStep(),
    nestScopeStep(),
    partStep(),
    thicknessStep(),
    revisionStep(),
    cutStep(),
    reviewStep()
  ].filter(Boolean);
}

function fileStep() {
  return {
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
  };
}

function typeStep() {
  return {
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
      if (answers.type !== 'ASY') answers.assemblyMode = '3D';
    }, { autoNext: true }),
    valid: () => typeChoices.includes(answers.type),
    error: 'Please select a valid type.',
    autoAdvance: true
  };
}

function projectStep() {
  return {
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
  };
}

function assemblyStep() {
  return {
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
  };
}

function assemblyModeStep() {
  if (answers.type !== 'ASY') return null;
  return {
    title: 'Assembly type',
    hint: '2D assemblies require thickness. 3D assemblies skip thickness.',
    body: choiceButtons('assemblyMode', assemblyModeChoices, answers.assemblyMode),
    setup: () => setupChoiceButtons('assemblyMode', value => (answers.assemblyMode = value), { autoNext: true }),
    valid: () => assemblyModeChoices.includes(answers.assemblyMode),
    error: 'Choose 2D or 3D assembly.',
    autoAdvance: true
  };
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
    setup: () => setupChoiceButtons('scope', value => (answers.scope = value), { autoNext: true }),
    valid: () => scopeChoices.includes(answers.scope),
    error: 'Pick single-part or multi-part.',
    autoAdvance: true
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
  const needed = answers.type === 'PRT' || answers.type === 'NS' || (answers.type === 'ASY' && answers.assemblyMode === '2D');
  if (!needed) return null;

  return {
    title: 'Choose thickness',
    hint: 'Quick picks on top. Full list from gauge sheet to 2in below.',
    body: `
      <p class="tiny">Most common:</p>
      ${choiceButtons('thkCommon', commonThicknessLabels, answers.thk)}
      <label for="thkAny">Any thickness (full list)
        <select id="thkAny">${allThicknessChoices.map(t => `<option value="${t}" ${t === answers.thk ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </label>
    `,
    setup: () => {
      setupChoiceButtons('thkCommon', label => {
        answers.thk = label;
      }, { autoNext: true });

      const any = byId('thkAny');
      any.onchange = () => {
        answers.thk = normalizeThickness(any.value);
      };
    },
    valid: () => allThicknessChoices.includes(answers.thk),
    error: 'Choose a valid thickness from the list.'
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

  return {
    title: 'Looks great ✨',
    hint: randomNote(),
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

  const nextButton = step.autoAdvance && !step.hideNext
    ? ''
    : `<button id="nextBtn" type="button">${step.hideNext ? 'Start another file' : 'Next'}</button>`;

  const shell = document.createElement('div');
  shell.className = 'step';
  shell.innerHTML = `
    <h2>${step.title}</h2>
    <p class="tiny">${step.hint}</p>
    ${step.body}
    <div class="row">
      <button id="backBtn" type="button" class="secondary" ${currentStep === 0 ? 'disabled' : ''}>Back</button>
      ${nextButton}
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

  const nextBtn = byId('nextBtn');
  if (nextBtn) nextBtn.onclick = () => {
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

function goToNextStep() {
  currentStep += 1;
  renderStep();
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

function setupChoiceButtons(name, onPick, options = {}) {
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

      if (options.autoNext) {
        goToNextStep();
      }
    });
  });
}

function buildFilename() {
  if (!answers.file) return '';

  const ext = extractExtension(answers.file.name);
  const list = [answers.type, answers.project, answers.assembly];
  const includePart = answers.type === 'PRT' || (answers.type === 'NS' && answers.scope === 'single');
  const includeThk = answers.type === 'PRT' || answers.type === 'NS' || (answers.type === 'ASY' && answers.assemblyMode === '2D');

  if (includePart) list.push(answers.part);
  if (includeThk) list.push(thicknessForFilename(answers.thk));
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
  answers.assemblyMode = '3D';
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

function buildThicknessChoices() {
  const list = ['Gauge Sheet'];
  for (let i = 1; i <= 32; i += 1) {
    list.push(formatSixteenth(i));
  }
  return Array.from(new Set(list));
}

function formatSixteenth(i) {
  const whole = Math.floor(i / 16);
  const remainder = i % 16;
  if (remainder === 0) return `${whole}in`;
  const g = gcd(remainder, 16);
  const num = remainder / g;
  const den = 16 / g;
  if (whole === 0) return `${num}/${den}in`;
  return `${whole}-${num}/${den}in`;
}

function normalizeThickness(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/gauge/i.test(raw)) return 'Gauge Sheet';

  const label = raw.replace(/\s+/g, '');
  const direct = allThicknessChoices.find(option => option.toLowerCase() == label.toLowerCase());
  return direct || value;
}

function thicknessForFilename(value) {
  if (/gauge/i.test(String(value || ''))) return 'GaugeSheet';

  const inches = parseThicknessToInches(value);
  if (inches == null) return value;

  return `${formatExactDecimal(inches)}in`;
}

function parseThicknessToInches(raw) {
  const text = String(raw || '').toLowerCase().replace(/in|"/g, '').trim();
  if (!text) return null;

  if (/^\d*\.?\d+$/.test(text)) return Number(text);

  if (/^\d+-\d+\/\d+$/.test(text)) {
    const [whole, frac] = text.split('-');
    const [num, den] = frac.split('/').map(Number);
    if (!den) return null;
    return Number(whole) + (num / den);
  }

  if (/^\d+\/\d+$/.test(text)) {
    const [num, den] = text.split('/').map(Number);
    if (!den) return null;
    return num / den;
  }

  return null;
}

function formatExactDecimal(inches) {
  if (!Number.isFinite(inches)) return '';
  let text = inches.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  const dot = text.indexOf('.');
  if (dot === -1) {
    return `${text}.00`;
  }
  const decimals = text.length - dot - 1;
  if (decimals === 1) return `${text}0`;
  return text;
}

function gcd(a, b) {
  if (!b) return a;
  return gcd(b, a % b);
}

function extractExtension(filename) {
  const name = String(filename || '');
  const lastDot = name.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === name.length - 1) return '';
  return name.slice(lastDot);
}

function wireEnterToNext() {
  const next = byId('nextBtn');
  if (!next) return;
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
