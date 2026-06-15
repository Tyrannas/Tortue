/* DONNÉES — chargées depuis les fichiers JSON du dossier questions/ */
let TOPICS = [];

/* STATE */
let state = { topicIdx: null, remaining: [], selected: null, answered: false };

/* UTILS */
const $ = id => document.getElementById(id);

function showScreen(name) {
  ["topics","debate"].forEach(n => {
    $("screen-" + n).classList.toggle("active", n === name);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* CHARGEMENT DES QUESTIONS */
async function loadTopics() {
  const files = await fetch("questions/index.json").then(r => r.json());
  TOPICS = await Promise.all(
    files.map(f => fetch("questions/" + f).then(r => r.json()))
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
function replayTopic() { startTopic(state.topicIdx); }

loadTopics();
