import { invoke } from '@tauri-apps/api/core';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { openPath, openUrl } from '@tauri-apps/plugin-opener';

const $ = (selector) => document.querySelector(selector);
const state = { subjects: [], topics: [], resources: [], subjectId: null, topicId: null, kind: 'note', editingResourceId: null, naming: null, editingNameId: null };
const kindInfo = {
  note: { label: 'Nota', plural: 'Notas', icon: '✎', contentLabel: 'Contenido de la nota', placeholder: 'Escribe tus apuntes, fórmulas o ideas…' },
  document: { label: 'Documento', plural: 'Documentos', icon: '▤', contentLabel: 'Descripción (opcional)', placeholder: 'Añade una descripción del documento…' },
  video: { label: 'Vídeo', plural: 'Vídeos', icon: '▷', contentLabel: 'URL del vídeo', placeholder: 'https://…' },
  link: { label: 'Enlace', plural: 'Enlaces', icon: '↗', contentLabel: 'URL del enlace', placeholder: 'https://…' },
  image: { label: 'Imagen', plural: 'Imágenes', icon: '▧', contentLabel: 'Descripción (opcional)', placeholder: 'Añade una descripción…' },
};

function notify(message, error = false) {
  $('#statusMessage').textContent = message;
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div'); toast.className = `toast${error ? ' error' : ''}`; toast.textContent = message; document.body.append(toast);
  window.setTimeout(() => toast.remove(), 3000);
}
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function activeSubject() { return state.subjects.find(s => s.id === state.subjectId); }
function activeTopic() { return state.topics.find(t => t.id === state.topicId); }
async function loadSubjects() {
  state.subjects = await invoke('list_subjects');
  if (state.subjectId && !state.subjects.some(s => s.id === state.subjectId)) { state.subjectId = null; state.topicId = null; }
  if (!state.subjectId && state.subjects.length) state.subjectId = state.subjects[0].id;
  await loadTopics(); renderSubjects(); renderTopics(); renderMain();
}
async function loadTopics() {
  state.topics = state.subjectId ? await invoke('list_topics', { subjectId: state.subjectId }) : [];
  if (state.topicId && !state.topics.some(t => t.id === state.topicId)) state.topicId = null;
  if (!state.topicId && state.topics.length) state.topicId = state.topics[0].id;
  await loadResources();
}
async function loadResources() { state.resources = state.topicId ? await invoke('list_resources', { topicId: state.topicId }) : []; }
function renderSubjects() {
  const q = $('#subjectSearch').value.trim().toLocaleLowerCase();
  const visible = state.subjects.filter(s => s.name.toLocaleLowerCase().includes(q));
  $('#subjectList').innerHTML = visible.length ? visible.map(s => {
    const count = s.topic_count ?? 0;
    return `<div class="subject-row"><button class="subject-item ${s.id === state.subjectId ? 'active' : ''}" data-subject-id="${s.id}"><span class="subject-glyph">▦</span><span class="subject-text"><span class="subject-name">${escapeHtml(s.name)}</span><span class="subject-meta">${count} ${count === 1 ? 'tema' : 'temas'}</span></span><span class="subject-chevron">›</span></button><div class="subject-actions"><button class="subject-mini-action" data-rename-subject="${s.id}" title="Renombrar asignatura" aria-label="Renombrar ${escapeHtml(s.name)}">✎</button><button class="subject-mini-action danger" data-delete-subject="${s.id}" title="Eliminar asignatura" aria-label="Eliminar ${escapeHtml(s.name)}">×</button></div></div>`;
  }).join('') : `<div class="empty-state"><h3>${q ? 'Sin coincidencias' : 'Aún no hay asignaturas'}</h3><p>${q ? 'Prueba con otro término.' : 'Crea una asignatura para comenzar.'}</p></div>`;
  $('#addTopicBtn').disabled = !state.subjectId; $('#addTopicBtn').style.opacity = state.subjectId ? '1' : '.45';
}
function renderTopics() {
  const container = $('#topicList');
  if (!state.subjectId) { container.innerHTML = '<div class="topic-empty">Crea o selecciona una asignatura.</div>'; return; }
  if (!state.topics.length) { container.innerHTML = '<div class="topic-empty">Todavía no hay temas. Pulsa “Nuevo tema” para crear uno.</div>'; return; }
  container.innerHTML = state.topics.map(t => `<button class="topic-item ${t.id === state.topicId ? 'active' : ''}" data-topic-id="${t.id}"><span class="topic-dot"></span><span>${escapeHtml(t.name)}</span><span class="topic-count">${t.resource_count ?? 0}</span></button>`).join('');
}
function renderMain() {
  const subject = activeSubject(); const topic = activeTopic();
  $('#welcomeCard').classList.toggle('hidden', !!subject);
  $('#contentView').classList.toggle('hidden', !subject);
  if (!subject) return;
  $('#breadcrumb').textContent = subject.name.toLocaleUpperCase();
  $('#activeTitle').textContent = topic ? topic.name : 'Selecciona o crea un tema';
  $('#activeSubtitle').textContent = topic ? `${subject.name} · ${topic.name}` : 'Crea un tema para guardar material de estudio.';
  $('#renameBtn').textContent = topic ? 'Renombrar tema' : 'Renombrar asignatura';
  $('#deleteBtn').textContent = topic ? 'Eliminar tema' : 'Eliminar asignatura';
  $('#renameBtn').disabled = false; $('#deleteBtn').disabled = false;
  $('#tabs').querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.kind === state.kind));
  renderResources();
}
function renderResources() {
  const topic = activeTopic(); const grid = $('#resourceGrid');
  if (!topic) { grid.innerHTML = `<div class="empty-state"><div class="empty-symbol">⌘</div><h3>Este espacio está listo</h3><p>Usa “Nuevo tema” para crear una sección dentro de esta asignatura.</p></div>`; $('#addResourceBtn').disabled = true; return; }
  $('#addResourceBtn').disabled = false;
  const info = kindInfo[state.kind]; const items = state.resources.filter(r => r.kind === state.kind);
  if (!items.length) { grid.innerHTML = `<div class="empty-state"><div class="empty-symbol">${info.icon}</div><h3>Todavía no hay ${info.plural.toLocaleLowerCase()}</h3><p>Añade ${info.label.toLocaleLowerCase()} para tener tus materiales organizados y disponibles en este equipo.</p><button class="button button-primary" id="emptyAddBtn">＋ Añadir ${info.label.toLocaleLowerCase()}</button></div>`; $('#emptyAddBtn').addEventListener('click', () => openResourceEditor()); return; }
  grid.innerHTML = items.map(r => {
    const preview = r.kind === 'note' ? r.content : (r.path || r.content || 'Sin descripción');
    const actionLabel = r.kind === 'note' ? 'Abrir' : (r.kind === 'document' || r.kind === 'image' ? 'Abrir archivo' : 'Abrir enlace');
    return `<article class="resource-card"><div class="resource-card-top"><div class="resource-glyph">${info.icon}</div><span class="resource-type">${info.label}</span></div><h3>${escapeHtml(r.title)}</h3><div class="resource-preview">${escapeHtml(preview)}</div><div class="resource-actions"><button class="small-action" data-open-resource="${r.id}">${actionLabel}</button><button class="small-action" data-edit-resource="${r.id}">Editar</button><button class="small-action delete" data-delete-resource="${r.id}" aria-label="Eliminar ${escapeHtml(r.title)}">Eliminar</button></div></article>`;
  }).join('');
}
function openNameDialog(mode, id = null) {
  state.naming = mode; state.editingNameId = id;
  const editing = id !== null;
  const current = mode === 'subject' ? state.subjects.find(s => s.id === id) : state.topics.find(t => t.id === id);
  $('#nameEyebrow').textContent = mode === 'subject' ? 'ASIGNATURAS' : 'TEMAS';
  $('#nameTitle').textContent = `${editing ? 'Renombrar' : 'Nueva'} ${mode === 'subject' ? 'asignatura' : 'tema'}`;
  $('#nameInput').value = current?.name ?? ''; $('#nameInput').placeholder = mode === 'subject' ? 'Ej. Matemática' : 'Ej. Integrales';
  $('#nameDialog').showModal(); $('#nameInput').focus();
}
function openResourceEditor(resource = null) {
  if (!state.topicId) return notify('Primero crea o selecciona un tema.', true);
  state.editingResourceId = resource?.id ?? null;
  const info = kindInfo[state.kind]; const isFile = ['document','image'].includes(state.kind); const isUrl = ['video','link'].includes(state.kind);
  $('#dialogEyebrow').textContent = resource ? 'EDITAR CONTENIDO' : `NUEVA ${info.label.toLocaleUpperCase()}`;
  $('#dialogTitle').textContent = `${resource ? 'Editar' : 'Añadir'} ${info.label.toLocaleLowerCase()}`;
  $('#itemTitle').value = resource?.title ?? ''; $('#itemContent').value = resource?.content ?? ''; $('#itemPath').value = resource?.path ?? '';
  $('#contentLabel').textContent = info.contentLabel; $('#itemContent').placeholder = info.placeholder;
  $('#contentField').classList.remove('hidden');
  $('#pathField').classList.toggle('hidden', !isFile); $('#urlHint').classList.toggle('hidden', !isUrl);
  $('#itemContent').required = isUrl; $('#itemPath').required = isFile;
  $('#editorDialog').showModal(); $('#itemTitle').focus();
}
async function chooseFile() {
  const filters = state.kind === 'image' ? [{name:'Imágenes', extensions:['png','jpg','jpeg','gif','webp','bmp','svg']}] : [{name:'Todos los archivos', extensions:['*']}];
  const path = await openDialog({ multiple: false, directory: false, filters });
  if (path) $('#itemPath').value = path;
}
async function submitName(event) {
  event.preventDefault(); const name = $('#nameInput').value.trim(); if (!name) return;
  try {
    if (state.naming === 'subject') {
      if (state.editingNameId) await invoke('rename_subject', { id: state.editingNameId, name });
      else { const item = await invoke('create_subject', { name }); state.subjectId = item.id; state.topicId = null; }
    } else {
      if (state.editingNameId) await invoke('rename_topic', { id: state.editingNameId, name });
      else { const item = await invoke('create_topic', { subjectId: state.subjectId, name }); state.topicId = item.id; }
    }
    $('#nameDialog').close(); await loadSubjects(); notify('Cambios guardados.');
  } catch (e) { notify(String(e), true); }
}
async function submitResource(event) {
  event.preventDefault(); const title = $('#itemTitle').value.trim(); const content = $('#itemContent').value.trim(); const path = $('#itemPath').value.trim();
  if (!title) return; if (['document','image'].includes(state.kind) && !path) return notify('Selecciona un archivo.', true);
  if (['video','link'].includes(state.kind) && !/^https?:\/\//i.test(content)) return notify('Introduce una URL que comience por http:// o https://.', true);
  try {
    await invoke('save_resource', { id: state.editingResourceId, topicId: state.topicId, kind: state.kind, title, content, path });
    $('#editorDialog').close(); await loadResources(); renderResources(); notify('Contenido guardado.');
  } catch (e) { notify(String(e), true); }
}
async function deleteSelected() {
  const topic = activeTopic(); const subject = activeSubject();
  if (topic) {
    if (!confirm(`¿Eliminar el tema “${topic.name}” y sus registros? Los archivos originales no se borrarán.`)) return;
    try { await invoke('delete_topic', { id: topic.id }); state.topicId = null; await loadSubjects(); notify('Tema eliminado.'); } catch(e) { notify(String(e), true); }
  } else if (subject) {
    if (!confirm(`¿Eliminar la asignatura “${subject.name}” y todo su contenido registrado? Los archivos originales no se borrarán.`)) return;
    try { await invoke('delete_subject', { id: subject.id }); state.subjectId = null; state.topicId = null; await loadSubjects(); notify('Asignatura eliminada.'); } catch(e) { notify(String(e), true); }
  }
}
async function openResource(id) {
  const r = state.resources.find(item => item.id === id); if (!r) return;
  try {
    if (r.kind === 'note') { alert(`${r.title}

${r.content || '(Nota vacía)'}`); return; }
    if (r.kind === 'document' || r.kind === 'image') {
      if (!r.path) return notify('Este registro no tiene una ruta guardada.', true);
      await openPath(r.path); return;
    }
    if (r.content) { await openUrl(r.content); return; }
    notify('Este registro no tiene una dirección guardada.', true);
  } catch(e) { notify(`No se pudo abrir el recurso: ${String(e)}`, true); }
}
async function backupDatabase() {
  try {
    const destination = await saveDialog({ defaultPath: 'organizador-academico-backup.sqlite', filters: [{name:'Base de datos SQLite', extensions:['sqlite','db']}] });
    if (!destination) return;
    await invoke('backup_database', { destination }); notify('Copia de seguridad creada.');
  } catch(e) { notify(`No se pudo crear la copia: ${String(e)}`, true); }
}
function wireEvents() {
  $('#addSubjectBtn').addEventListener('click', () => openNameDialog('subject'));
  $('#welcomeAddSubject').addEventListener('click', () => openNameDialog('subject'));
  $('#addTopicBtn').addEventListener('click', () => state.subjectId ? openNameDialog('topic') : notify('Crea primero una asignatura.', true));
  $('#subjectSearch').addEventListener('input', renderSubjects);
  $('#subjectList').addEventListener('click', async e => {
    const rename = e.target.closest('[data-rename-subject]');
    const del = e.target.closest('[data-delete-subject]');
    if (rename) { e.stopPropagation(); return openNameDialog('subject', Number(rename.dataset.renameSubject)); }
    if (del) {
      e.stopPropagation(); const id = Number(del.dataset.deleteSubject); const subject = state.subjects.find(item => item.id === id);
      if (!subject || !confirm(`¿Eliminar la asignatura “${subject.name}” y todos sus temas y registros? Los archivos originales no se borrarán.`)) return;
      try { await invoke('delete_subject', { id }); if (state.subjectId === id) { state.subjectId = null; state.topicId = null; } await loadSubjects(); notify('Asignatura eliminada.'); } catch(err) { notify(String(err), true); }
      return;
    }
    const button = e.target.closest('[data-subject-id]'); if (!button) return;
    state.subjectId = Number(button.dataset.subjectId); state.topicId = null; await loadTopics(); renderSubjects(); renderTopics(); renderMain();
  });
  $('#topicList').addEventListener('click', async e => { const button = e.target.closest('[data-topic-id]'); if (!button) return; state.topicId = Number(button.dataset.topicId); await loadResources(); renderTopics(); renderMain(); });
  $('#tabs').addEventListener('click', e => { const tab = e.target.closest('[data-kind]'); if (!tab) return; state.kind = tab.dataset.kind; renderMain(); });
  $('#addResourceBtn').addEventListener('click', () => openResourceEditor());
  $('#renameBtn').addEventListener('click', () => { const topic = activeTopic(); if (topic) openNameDialog('topic', topic.id); else if (activeSubject()) openNameDialog('subject', state.subjectId); });
  $('#deleteBtn').addEventListener('click', deleteSelected);
  $('#chooseFileBtn').addEventListener('click', chooseFile);
  $('#editorForm').addEventListener('submit', submitResource); $('#nameForm').addEventListener('submit', submitName);
  document.querySelectorAll('.close-dialog').forEach(b => b.addEventListener('click', () => $('#editorDialog').close()));
  document.querySelectorAll('.close-name-dialog').forEach(b => b.addEventListener('click', () => $('#nameDialog').close()));
  $('#resourceGrid').addEventListener('click', async e => {
    const open = e.target.closest('[data-open-resource]'); const edit = e.target.closest('[data-edit-resource]'); const del = e.target.closest('[data-delete-resource]');
    if (open) return openResource(Number(open.dataset.openResource));
    if (edit) { const r = state.resources.find(item => item.id === Number(edit.dataset.editResource)); if (r) openResourceEditor(r); return; }
    if (del) { const r = state.resources.find(item => item.id === Number(del.dataset.deleteResource)); if (!r || !confirm(`¿Eliminar “${r.title}”? El archivo original no se borrará.`)) return; try { await invoke('delete_resource', { id: r.id }); await loadResources(); renderResources(); notify('Registro eliminado.'); } catch(err) { notify(String(err), true); } }
  });
  $('#backupBtn').addEventListener('click', backupDatabase);
  $('#editorDialog').addEventListener('click', e => { if (e.target === $('#editorDialog')) $('#editorDialog').close(); });
  $('#nameDialog').addEventListener('click', e => { if (e.target === $('#nameDialog')) $('#nameDialog').close(); });
}
async function start() {
  wireEvents();
  try { await invoke('initialize_database'); await loadSubjects(); notify('Base de datos lista.'); }
  catch (e) { notify(`Error al iniciar la base de datos: ${String(e)}`, true); console.error(e); }
}
start();
