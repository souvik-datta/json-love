const input = document.querySelector('#jsonInput');
const output = document.querySelector('#jsonOutput');
const inputMeta = document.querySelector('#inputMeta');
const outputMeta = document.querySelector('#outputMeta');
const message = document.querySelector('#validationMessage');
const copyButton = document.querySelector('#copyButton');
const downloadButton = document.querySelector('#downloadButton');
const indentSelect = document.querySelector('#indentSelect');
const inputPane = document.querySelector('#inputPane');
const apiUrl = document.querySelector('#apiUrl');
const fetchButton = document.querySelector('#fetchButton');
const inputLineNumbers = document.querySelector('#inputLineNumbers');
const outputLineNumbers = document.querySelector('#outputLineNumbers');
const workspace = document.querySelector('.workspace');
const diffPanel = document.querySelector('#diffPanel');
const diffOutput = document.querySelector('#diffOutput');
const inputDiffLayer = document.querySelector('#inputDiffLayer');
const outputDiffLayer = document.querySelector('#outputDiffLayer');

let formattedJson = '';

function setMessage(text, isError = false) {
  message.classList.toggle('error', isError);
  message.innerHTML = `<span class="message-icon">${isError ? '!' : '●'}</span> ${text}`;
}

function getIndent() {
  return indentSelect.value === 'tab' ? '\t' : Number(indentSelect.value);
}

function updateLineNumbers(element, value) {
  const lineCount = Math.max(1, value.split('\n').length);
  element.textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
}

function syncLineNumbers(editor, gutter) {
  gutter.scrollTop = editor.scrollTop;
}

function clearErrorHighlight() {
  inputPane.classList.remove('has-error');
  input.removeAttribute('aria-invalid');
}

function highlightError(position) {
  const safePosition = Math.min(Math.max(position, 0), input.value.length);
  const selectionStart = safePosition < input.value.length ? safePosition : Math.max(0, safePosition - 1);
  inputPane.classList.add('has-error');
  input.setAttribute('aria-invalid', 'true');
  input.focus();
  input.setSelectionRange(selectionStart, Math.min(selectionStart + 1, input.value.length));
  const beforeError = input.value.slice(0, safePosition);
  const line = beforeError.split('\n').length;
  const column = safePosition - beforeError.lastIndexOf('\n');
  return { line, column };
}

function getErrorPosition(error, source) {
  const positionMatch = error.message.match(/position\s+(\d+)/i);
  if (positionMatch) return Number(positionMatch[1]);

  const tokenMatch = error.message.match(/Unexpected token ['"]([^'"]+)['"]/i);
  if (tokenMatch) return source.lastIndexOf(tokenMatch[1]);
  if (/Unexpected end|unterminated/i.test(error.message)) return source.length;
  return null;
}

function getErrorMessage(error, source, position) {
  const character = position < source.length ? source[position] : '';
  const before = source.slice(0, position).trimEnd();
  const previousCharacter = before.at(-1);
  const nextCharacter = source.slice(position + 1).trimStart()[0];

  if (position >= source.length || /Unexpected end|unterminated/i.test(error.message)) {
    const openBrackets = (source.match(/[\[{]/g) || []).length;
    const closeBrackets = (source.match(/[\]}]/g) || []).length;
    if (openBrackets > closeBrackets) return 'JSON ends too soon; add a closing bracket or brace';
    return 'JSON ends too soon; complete the last value';
  }

  if (character === "'") return 'Use double quotes for JSON keys and text values';
  if ((character === '}' || character === ']') && previousCharacter === ',') {
    return `Remove the trailing comma before ${character}`;
  }
  if (character === '"' && /[\]}0-9"tfn]/.test(previousCharacter || '')) {
    return 'Add a comma between these values';
  }
  if (character === ':' && previousCharacter !== '"') {
    return 'Object keys must be wrapped in double quotes';
  }
  if (/Unexpected token/.test(error.message) && character && !/[\],}"\d]/.test(character)) {
    return `Unexpected character ${JSON.stringify(character)}; check the value or add quotes`;
  }
  if (nextCharacter && character === ',' && /[}\]]/.test(nextCharacter)) {
    return 'Remove the comma before the closing bracket';
  }
  return 'Check the syntax near the highlighted character';
}

function writeOutput(value, status) {
  formattedJson = value;
  output.value = value;
  outputMeta.textContent = `${value.length.toLocaleString()} characters`;
  updateLineNumbers(outputLineNumbers, value);
  copyButton.disabled = false;
  downloadButton.disabled = false;
  setMessage(status);
}

function stringifyJson() {
  const source = input.value.trim();
  if (!source) return formatJson();

  try {
    clearErrorHighlight();
    const parsed = JSON.parse(source);
    writeOutput(JSON.stringify(JSON.stringify(parsed)), 'JSON stringified successfully');
  } catch (error) {
    showJsonError(error, source);
  }
}

function unstringifyJson() {
  const source = input.value.trim();
  if (!source) return formatJson();

  try {
    clearErrorHighlight();
    const parsed = JSON.parse(source);
    const unstringified = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
    writeOutput(JSON.stringify(unstringified, null, getIndent()), 'JSON unstringified successfully');
  } catch (error) {
    showJsonError(error, source);
  }
}

function showJsonError(error, source) {
  formattedJson = '';
  output.value = 'There is a small problem with this JSON.';
  outputMeta.textContent = 'Invalid';
  copyButton.disabled = true;
  downloadButton.disabled = true;
  const position = getErrorPosition(error, source);
  if (Number.isInteger(position) && position >= 0) {
    const location = highlightError(position);
    const reason = getErrorMessage(error, source, position);
    setMessage(`${reason} (line ${location.line}, column ${location.column})`, true);
  } else {
    inputPane.classList.add('has-error');
    input.setAttribute('aria-invalid', 'true');
    setMessage('Invalid JSON, check your syntax', true);
  }
}

function formatJson(minify = false) {
  const source = input.value.trim();
  if (!source) {
    clearErrorHighlight();
    output.value = 'Formatted JSON will appear here.';
    outputMeta.textContent = 'Waiting';
    updateLineNumbers(outputLineNumbers, output.value);
    formattedJson = '';
    copyButton.disabled = true;
    downloadButton.disabled = true;
    setMessage('Ready for JSON');
    return;
  }

  try {
    clearErrorHighlight();
    const parsed = JSON.parse(source);
    formattedJson = JSON.stringify(parsed, null, minify ? 0 : getIndent());
    output.value = formattedJson;
    outputMeta.textContent = `${formattedJson.length.toLocaleString()} characters`;
    updateLineNumbers(outputLineNumbers, formattedJson);
    copyButton.disabled = false;
    downloadButton.disabled = false;
    setMessage(minify ? 'JSON minified successfully' : 'Valid JSON, formatted successfully');
  } catch (error) {
    showJsonError(error, source);
  }
}

function updateInputMeta() {
  inputMeta.textContent = `${input.value.length.toLocaleString()} characters`;
  updateLineNumbers(inputLineNumbers, input.value);
}

async function fetchJsonFromApi() {
  const url = apiUrl.value.trim();
  if (!url) {
    setMessage('Enter an API URL first', true);
    apiUrl.focus();
    return;
  }

  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Use an http:// or https:// URL');
  } catch (error) {
    setMessage(error.message === 'Use an http:// or https:// URL' ? error.message : 'Enter a valid API URL', true);
    apiUrl.focus();
    return;
  }

  fetchButton.disabled = true;
  fetchButton.innerHTML = '<span aria-hidden="true">…</span> Fetching';
  setMessage('Fetching JSON from the API...');

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`API returned ${response.status} ${response.statusText}`);
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error('API response was not valid JSON');
    }
    input.value = JSON.stringify(data, null, getIndent());
    clearErrorHighlight();
    updateInputMeta();
    formatJson();
    setMessage('JSON fetched from the API successfully');
  } catch (error) {
    const isCorsError = error instanceof TypeError;
    setMessage(isCorsError ? 'Could not reach the API; check its CORS policy and URL' : error.message, true);
  } finally {
    fetchButton.disabled = false;
    fetchButton.innerHTML = '<span aria-hidden="true">↓</span> Fetch JSON';
  }
}

document.querySelector('#formatButton').addEventListener('click', () => formatJson());
document.querySelector('#minifyButton').addEventListener('click', () => formatJson(true));
document.querySelector('#stringifyButton').addEventListener('click', stringifyJson);
document.querySelector('#unstringifyButton').addEventListener('click', unstringifyJson);
function formatDiffPath(path) {
  return path || 'root';
}

function collectDiffs(left, right, path = '') {
  const differences = [];
  const leftIsObject = left !== null && typeof left === 'object';
  const rightIsObject = right !== null && typeof right === 'object';
  if (!leftIsObject || !rightIsObject || Array.isArray(left) !== Array.isArray(right)) {
    if (JSON.stringify(left) !== JSON.stringify(right)) differences.push(`~ ${formatDiffPath(path)}: ${JSON.stringify(left)} -> ${JSON.stringify(right)}`);
    return differences;
  }

  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])];
  keys.forEach((key) => {
    const nextPath = Array.isArray(left) ? `${path}[${key}]` : path ? `${path}.${key}` : key;
    if (!(key in left)) differences.push(`+ ${nextPath}: ${JSON.stringify(right[key])}`);
    else if (!(key in right)) differences.push(`- ${nextPath}: ${JSON.stringify(left[key])}`);
    else differences.push(...collectDiffs(left[key], right[key], nextPath));
  });
  return differences;
}

function getLineOperations(leftLines, rightLines) {
  const table = Array.from({ length: leftLines.length + 1 }, () => Array(rightLines.length + 1).fill(0));
  for (let leftIndex = leftLines.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = rightLines.length - 1; rightIndex >= 0; rightIndex -= 1) {
      table[leftIndex][rightIndex] = leftLines[leftIndex] === rightLines[rightIndex]
        ? table[leftIndex + 1][rightIndex + 1] + 1
        : Math.max(table[leftIndex + 1][rightIndex], table[leftIndex][rightIndex + 1]);
    }
  }

  const operations = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < leftLines.length || rightIndex < rightLines.length) {
    if (leftIndex < leftLines.length && rightIndex < rightLines.length && leftLines[leftIndex] === rightLines[rightIndex]) {
      operations.push({ type: 'equal', leftIndex, rightIndex });
      leftIndex += 1;
      rightIndex += 1;
    } else if (rightIndex < rightLines.length && (leftIndex === leftLines.length || table[leftIndex][rightIndex + 1] >= table[leftIndex + 1][rightIndex])) {
      operations.push({ type: 'add', rightIndex });
      rightIndex += 1;
    } else {
      operations.push({ type: 'remove', leftIndex });
      leftIndex += 1;
    }
  }
  return operations;
}

function applyDiffHighlights(leftText, rightText) {
  const leftLines = leftText.split('\n');
  const rightLines = rightText.split('\n');
  const operations = getLineOperations(leftLines, rightLines);
  const leftStatuses = Array(leftLines.length).fill('');
  const rightStatuses = Array(rightLines.length).fill('');
  const removed = operations.filter((operation) => operation.type === 'remove');
  const added = operations.filter((operation) => operation.type === 'add');
  const usedAdded = new Set();
  const getLineKey = (line) => line.match(/^\s*"([^"\n]+)"\s*:/)?.[1] || null;

  removed.forEach((removedOperation) => {
    const removedKey = getLineKey(leftLines[removedOperation.leftIndex]);
    const addedIndex = added.findIndex((addedOperation, index) => {
      if (usedAdded.has(index)) return false;
      const addedKey = getLineKey(rightLines[addedOperation.rightIndex]);
      return removedKey !== null && removedKey === addedKey;
    });
    if (addedIndex !== -1) {
      usedAdded.add(addedIndex);
      leftStatuses[removedOperation.leftIndex] = 'changed';
      rightStatuses[added[addedIndex].rightIndex] = 'changed';
    }
  });

  if (removed.length === 1 && added.length === 1 && !leftStatuses[removed[0].leftIndex]) {
    leftStatuses[removed[0].leftIndex] = 'changed';
    rightStatuses[added[0].rightIndex] = 'changed';
    usedAdded.add(0);
  }

  removed.forEach((operation) => {
    if (!leftStatuses[operation.leftIndex]) leftStatuses[operation.leftIndex] = 'removed';
  });
  added.forEach((operation, index) => {
    if (!usedAdded.has(index)) rightStatuses[operation.rightIndex] = 'added';
  });

  inputDiffLayer.innerHTML = leftStatuses.map((status) => `<div class="diff-line${status ? ` ${status}` : ''}"></div>`).join('');
  outputDiffLayer.innerHTML = rightStatuses.map((status) => `<div class="diff-line${status ? ` ${status}` : ''}"></div>`).join('');
}

function clearDiffHighlights() {
  inputDiffLayer.textContent = '';
  outputDiffLayer.textContent = '';
}

function compareJson() {
  clearDiffHighlights();
  let left;
  let right;
  try {
    left = JSON.parse(input.value.trim());
  } catch {
    diffOutput.textContent = 'Input is not valid JSON.';
    diffPanel.hidden = false;
    return;
  }
  try {
    right = JSON.parse(output.value.trim());
  } catch {
    diffOutput.textContent = 'Output is not valid JSON.';
    diffPanel.hidden = false;
    return;
  }

  const leftFormatted = JSON.stringify(left, null, getIndent());
  const rightFormatted = JSON.stringify(right, null, getIndent());
  input.value = leftFormatted;
  output.value = rightFormatted;
  formattedJson = rightFormatted;
  updateInputMeta();
  outputMeta.textContent = `${rightFormatted.length.toLocaleString()} characters`;
  updateLineNumbers(outputLineNumbers, rightFormatted);
  copyButton.disabled = false;
  downloadButton.disabled = false;
  applyDiffHighlights(leftFormatted, rightFormatted);
  const differences = collectDiffs(left, right);
  diffOutput.textContent = differences.length ? differences.join('\n') : 'No differences. The JSON documents contain the same data.';
  diffPanel.hidden = false;
  setMessage(differences.length ? `${differences.length} difference${differences.length === 1 ? '' : 's'} found` : 'JSON documents match');
}

document.querySelector('#diffButton').addEventListener('click', compareJson);
document.querySelector('#closeDiffButton').addEventListener('click', () => { diffPanel.hidden = true; });
fetchButton.addEventListener('click', fetchJsonFromApi);
apiUrl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') fetchJsonFromApi();
});
document.querySelector('#clearButton').addEventListener('click', () => { input.value = ''; updateInputMeta(); formatJson(); input.focus(); });
indentSelect.addEventListener('change', () => { if (formattedJson) formatJson(); });
input.addEventListener('input', () => { clearErrorHighlight(); clearDiffHighlights(); updateInputMeta(); });
input.addEventListener('scroll', () => syncLineNumbers(input, inputLineNumbers));
output.addEventListener('input', () => {
  clearDiffHighlights();
  formattedJson = output.value;
  outputMeta.textContent = `${output.value.length.toLocaleString()} characters`;
  updateLineNumbers(outputLineNumbers, output.value);
  setMessage('Output edited');
});
output.addEventListener('scroll', () => syncLineNumbers(output, outputLineNumbers));
function setupSearch(pane, editor) {
  const searchPanel = pane.querySelector('.pane-search');
  const searchToggle = pane.querySelector('.pane-search-toggle');
  const searchInput = pane.querySelector('.find-input');
  const replaceInput = pane.querySelector('.replace-input');

  function findNext() {
    const query = searchInput.value;
    if (!query) return;
    const nextMatch = editor.value.indexOf(query, editor.selectionEnd || 0);
    const matchStart = nextMatch === -1 ? editor.value.indexOf(query) : nextMatch;
    if (matchStart === -1) {
      setMessage('No matches found', true);
      return;
    }
    editor.focus();
    editor.setSelectionRange(matchStart, matchStart + query.length);
    setMessage(`Found match in ${editor === input ? 'input' : 'output'}`);
  }

  function replaceCurrent() {
    const query = searchInput.value;
    if (!query) return;
    if (editor.value.slice(editor.selectionStart, editor.selectionEnd) !== query) {
      findNext();
      return;
    }
    editor.setRangeText(replaceInput.value, editor.selectionStart, editor.selectionEnd, 'end');
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    setMessage('Match replaced');
  }

  function replaceAll() {
    const query = searchInput.value;
    if (!query) return;
    const matches = editor.value.split(query).length - 1;
    if (!matches) {
      setMessage('No matches found', true);
      return;
    }
    editor.value = editor.value.split(query).join(replaceInput.value);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    setMessage(`Replaced ${matches} ${matches === 1 ? 'match' : 'matches'}`);
  }

  searchToggle.addEventListener('click', () => {
    searchPanel.hidden = !searchPanel.hidden;
    searchToggle.setAttribute('aria-expanded', String(!searchPanel.hidden));
    if (!searchPanel.hidden) searchInput.focus();
  });
  pane.querySelector('.find-next').addEventListener('click', findNext);
  pane.querySelector('.replace-current').addEventListener('click', replaceCurrent);
  pane.querySelector('.replace-all').addEventListener('click', replaceAll);
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') findNext();
  });
}

setupSearch(inputPane, input);
setupSearch(document.querySelector('.output-pane'), output);
function updateExpandControls() {
  document.querySelectorAll('.pane-expand').forEach((button) => {
    const pane = button.closest('.editor-pane');
    const paneName = pane.classList.contains('input-pane') ? 'input' : 'output';
    const isExpanded = pane.classList.contains('is-expanded');
    const label = isExpanded ? `Restore ${paneName} editor` : `Enlarge ${paneName} editor`;
    button.setAttribute('aria-expanded', String(isExpanded));
    button.setAttribute('aria-label', label);
    button.title = label;
  });
}

document.querySelectorAll('.pane-expand').forEach((button) => {
  button.addEventListener('click', () => {
    const pane = button.closest('.editor-pane');
    const isExpanded = pane.classList.toggle('is-expanded');
    workspace.classList.toggle('editor-expanded', isExpanded);
    document.body.classList.toggle('editor-expanded', isExpanded);
    updateExpandControls();
  });
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const expandedPane = document.querySelector('.editor-pane.is-expanded');
  if (!expandedPane) return;
  expandedPane.classList.remove('is-expanded');
  workspace.classList.remove('editor-expanded');
  document.body.classList.remove('editor-expanded');
  updateExpandControls();
});
inputPane.addEventListener('dragover', (event) => {
  event.preventDefault();
  inputPane.classList.add('is-dragging');
});
inputPane.addEventListener('dragleave', (event) => {
  if (!inputPane.contains(event.relatedTarget)) inputPane.classList.remove('is-dragging');
});
inputPane.addEventListener('drop', async (event) => {
  event.preventDefault();
  inputPane.classList.remove('is-dragging');
  const file = event.dataTransfer.files[0];
  try {
    const text = file ? await file.text() : event.dataTransfer.getData('text/plain');
    if (!text.trim()) throw new Error('The dropped item was empty');
    input.value = text;
    clearErrorHighlight();
    updateInputMeta();
    formatJson();
    if (!message.classList.contains('error')) setMessage(file ? `${file.name} loaded successfully` : 'Dropped JSON loaded successfully');
  } catch (error) {
    setMessage(error.message, true);
  }
});
input.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    formatJson();
  }
});

copyButton.addEventListener('click', async () => {
  await navigator.clipboard.writeText(formattedJson);
  const original = copyButton.innerHTML;
  copyButton.textContent = 'Copied';
  setTimeout(() => { copyButton.innerHTML = original; }, 1500);
});

downloadButton.addEventListener('click', () => {
  const blob = new Blob([formattedJson], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'formatted.json';
  link.click();
  URL.revokeObjectURL(link.href);
});

updateInputMeta();
updateLineNumbers(outputLineNumbers, output.value);