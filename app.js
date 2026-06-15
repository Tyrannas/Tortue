/* DONNÉES — chargées depuis les fichiers JSON du dossier questions/ */
let TOPICS = [];

/* DÉPÔT GITHUB — base des liens « Modifier sur GitHub ».
   L'arborescence du dépôt est identique à celle de ce dossier. */
const GITHUB_REPO   = "https://github.com/Tyrannas/Tortue";
const GITHUB_BRANCH = "main";

/* Construit l'URL d'édition pointant vers la ligne de début de l'argument. */
function editUrl(topic, arg) {
  return `${GITHUB_REPO}/blob/${GITHUB_BRANCH}/questions/${topic._file}#L${arg._line}`;
}

/* Repère, dans le texte brut d'un fichier topic, le numéro de ligne du « { »
   qui ouvre chaque objet du tableau "args". Renvoie un tableau de lignes (1-based)
   dans l'ordre des arguments. */
function computeArgLines(raw) {
  const lines = [];
  const argsKeyIdx = raw.indexOf('"args"');
  let inStr = false, esc = false, line = 1;
  let foundArgs = false, argsArrayDepth = -1;
  const stack = [];
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === "\n") { line++; continue; }
    if (inStr) {
      if (esc)            esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"')  inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; }
    else if (c === "[" || c === "{") {
      if (!foundArgs && c === "[" && argsKeyIdx !== -1 && i > argsKeyIdx) {
        foundArgs = true;
        argsArrayDepth = stack.length;
      } else if (foundArgs && c === "{" &&
                 stack.length === argsArrayDepth + 1 &&
                 stack[stack.length - 1] === "[") {
        lines.push(line);
      }
      stack.push(c);
    } else if (c === "]" || c === "}") {
      stack.pop();
    }
  }
  return lines;
}

/* STATE */
let state = { topicIdx: null, remaining: [], selected: null, answered: false };

/* UTILS */
const $ = id => document.getElementById(id);

function showScreen(name) {
  ["topics","debate","about"].forEach(n => {
    $("screen-" + n).classList.toggle("active", n === name);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* CHARGEMENT DES QUESTIONS */
async function loadTopics() {
  const files = await fetch("questions/index.json").then(r => r.json());
  TOPICS = await Promise.all(
    files.map(async f => {
      const raw   = await fetch("questions/" + f).then(r => r.text());
      const topic = JSON.parse(raw);
      topic._file = f;
      const argLines = computeArgLines(raw);
      topic.args.forEach((a, j) => { a._line = argLines[j]; });
      return topic;
    })
  );
  renderTopics();
}

/* TOPICS */
function renderTopics() {
  $("topics-grid").innerHTML = TOPICS.map((t, i) =>
    `<button class="topic-card" onclick="startTopic(${i})">
       <span class="topic-emoji">${t.emoji}</span>
       <div class="topic-name">${t.name}</div>
       <div class="topic-desc">${t.desc}</div>
     </button>`
  ).join("");
}

/* START */
function startTopic(i) {
  state.topicIdx = i;
  state.remaining = TOPICS[i].args.map((_, j) => j);
  state.selected = null;
  state.answered = false;
  renderDebate();
  showScreen("debate");
}

/* RENDER */
function renderDebate() {
  const topic = TOPICS[state.topicIdx];
  const rem   = state.remaining.length;
  const total = topic.args.length;

  $("dh-emoji").textContent = topic.emoji;
  $("dh-name").textContent = topic.name;

  const done = total - rem;
  $("args-badge-text").textContent =
    rem === 0
    ? "Tous les arguments ont été abordés"
    : `${rem} argument${rem > 1 ? "s" : ""} restant${rem > 1 ? "s" : ""} sur ${total}`;

  $("debate-prompt").textContent =
    rem > 0
    ? "Sélectionnez l'argument adverse de votre choix. La France Insoumise répondra."
    : "";

  $("args-list").innerHTML = rem === 0 ? "" :
    state.remaining.map(idx => {
      const a = topic.args[idx];
      return `<button class="arg-btn" id="arg-${idx}" onclick="selectArg(${idx})">
        <span class="arg-label">${a.label}</span>
        ${a.text}
      </button>`;
    }).join("");

  const resp = $("lfi-response");
  resp.classList.remove("show");
  $("btn-continue").classList.remove("show");

  const endEl = $("end-message");
  if (rem === 0) {
    $("end-text").textContent = topic.endText;
    endEl.classList.add("show");
  } else {
    endEl.classList.remove("show");
  }

  state.answered = false;
}

/* SELECT */
function selectArg(idx) {
  if (state.answered) return;
  state.answered = true;
  state.selected = idx;

  const topic = TOPICS[state.topicIdx];
  const arg   = topic.args[idx];

  state.remaining.forEach(j => {
    const btn = $(`arg-${j}`);
    if (!btn) return;
    btn.disabled = true;
    if (j === idx) btn.classList.add("selected");
    else           btn.classList.add("dimmed");
  });

  $("resp-counter").textContent = arg.counter;
  $("resp-text").innerHTML      = arg.response;

  const srcEl = $("resp-sources");
  if (arg.sources && arg.sources.length) {
    srcEl.innerHTML = "<strong>Sources</strong>" + arg.sources.map(s =>
      `<div class="src-item"><sup>${s.n}</sup> <a href="${s.url}" target="_blank" rel="noopener">${s.text}</a></div>`
    ).join("");
    srcEl.style.display = "block";
  } else {
    srcEl.innerHTML = "";
    srcEl.style.display = "none";
  }

  const editEl = $("resp-edit");
  if (arg._line) {
    editEl.href = editUrl(topic, arg);
    editEl.style.display = "inline-flex";
  } else {
    editEl.style.display = "none";
  }

  const resp = $("lfi-response");
  resp.classList.remove("show");
  void resp.offsetWidth;
  resp.classList.add("show");

  $("btn-continue").classList.add("show");
}

/* CONTINUE */
function continueDebate() {
  state.remaining = state.remaining.filter(i => i !== state.selected);
  state.selected  = null;
  state.answered  = false;
  renderDebate();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* NAV */
function goTopics()    { showScreen("topics"); }
function goAbout()     { showScreen("about"); }
function replayTopic() { startTopic(state.topicIdx); }

/* PARTAGE — lien direct vers une réponse.
   Format du fragment : #<id-du-sujet>/<index-de-l-argument>. */
function responseUrl(topicId, argIdx) {
  return location.origin + location.pathname +
         "#" + encodeURIComponent(topicId) + "/" + argIdx;
}

async function shareResponse() {
  if (state.topicIdx == null || state.selected == null) return;
  const topic = TOPICS[state.topicIdx];
  const url   = responseUrl(topic.id, state.selected);
  const btn   = $("resp-share");

  try {
    await navigator.clipboard.writeText(url);
  } catch (e) {
    // Repli pour les navigateurs sans accès au presse-papier.
    const ta = document.createElement("textarea");
    ta.value = url;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (_) {}
    document.body.removeChild(ta);
  }

  const prev = btn.textContent;
  btn.textContent = "Lien copié !";
  btn.classList.add("copied");
  clearTimeout(btn._t);
  btn._t = setTimeout(() => {
    btn.textContent = prev;
    btn.classList.remove("copied");
  }, 2000);
}

/* Ouvre directement la réponse désignée par le fragment d'URL, le cas échéant. */
function openFromHash() {
  const m = location.hash.match(/^#([^/]+)\/(\d+)$/);
  if (!m) return false;
  const topicId = decodeURIComponent(m[1]);
  const argIdx  = parseInt(m[2], 10);
  const ti = TOPICS.findIndex(t => t.id === topicId);
  if (ti === -1 || !TOPICS[ti].args[argIdx]) return false;
  startTopic(ti);
  selectArg(argIdx);
  return true;
}

/* SOURCES — liste de référence affichée sur la page « À propos ». */
function hostLabel(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch (e) { return url; }
}

async function loadSources() {
  const urls = await fetch("sources.json").then(r => r.json());
  $("about-sources").innerHTML = urls.map(url =>
    `<li><a href="${url}" target="_blank" rel="noopener">
       <span class="src-host">${hostLabel(url)}</span>
       <span class="src-url">${url}</span>
     </a></li>`
  ).join("");
}

loadTopics().then(openFromHash);
loadSources();
window.addEventListener("hashchange", openFromHash);
