const SAMPLE_TEXT = `黄庭坚《登快阁》

痴儿了却公家事，快阁东西倚晚晴。
落木千山天远大，澄江一道月分明。
朱弦已为佳人绝，青眼聊因美酒横。
万里归船弄长笛，此心吾与白鸥盟。`;

const QUESTION_TYPES = [
  {
    id: "choice",
    name: "四选一选择题",
    level: "高频",
    desc: "考查诗歌理解、手法辨析与综合判断，适合快速区分基础掌握度。",
  },
  {
    id: "appreciation",
    name: "主观鉴赏题",
    level: "高频",
    desc: "围绕意象、情感、表达技巧生成 6 分结构化问答。",
  },
  {
    id: "rubric",
    name: "评分标准",
    level: "必备",
    desc: "同步生成分点答案、给分细则和常见失分提示。",
  },
  {
    id: "extension",
    name: "迁移拓展题",
    level: "拔高",
    desc: "结合高考常见题型，设计比较阅读或情境化表达任务。",
  },
];

const MODELS = [
  {
    id: "moheng",
    name: "基础题组",
    desc: "题干稳妥，适合作为常规训练或测验题。",
  },
  {
    id: "teaching",
    name: "讲评题组",
    desc: "强调课堂可讲、答案分层和评分可操作。",
  },
  {
    id: "exam",
    name: "拔高题组",
    desc: "提高区分度，适合作为模拟卷或拓展题。",
  },
];

const PAPER_TONES = {
  "宣纸米白": {
    paper: "#f4efe2",
    deep: "#ece4d2",
    surface: "#fbf8f1",
    s2: "#fffdf7",
  },
  "素净月白": {
    paper: "#f3f1ea",
    deep: "#e9e6db",
    surface: "#fbfaf5",
    s2: "#ffffff",
  },
  "教研浅灰": {
    paper: "#eef0eb",
    deep: "#e0e4dd",
    surface: "#f8faf6",
    s2: "#ffffff",
  },
};

const ACCENTS = [
  ["#9c3a2c", "#7d2c20", "#b8493a", "#f0e0d6"],
  ["#3c4f57", "#2c3a40", "#56707a", "#e2e6e2"],
  ["#4a6b4a", "#39523a", "#5f825f", "#e2ebe0"],
  ["#8a6d2f", "#6d5523", "#a8863f", "#efe7d2"],
];

const app = document.querySelector("#app");
const STORAGE_KEY = "moheng_poem_assistant_state";
const TEXT_KEY = "moheng_poem_assistant_text";

const initialState = {
  text: localStorage.getItem(TEXT_KEY) || localStorage.getItem("moheng_text") || SAMPLE_TEXT,
  types: ["choice", "appreciation", "rubric"],
  difficulty: "高考模拟",
  outputs: ["参考答案", "详细解析", "评分标准", "命题意图"],
  models: ["moheng", "teaching", "exam"],
  analysis: null,
  proposals: [],
  finalQuestions: [],
  toast: "",
  tweak: {
    accent: ACCENTS[0],
    paper: "宣纸米白",
    texture: true,
    fontScale: 100,
  },
};

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return { ...initialState };
  try {
    return { ...initialState, ...JSON.parse(saved), toast: "" };
  } catch {
    return { ...initialState };
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    text: state.text,
    types: state.types,
    difficulty: state.difficulty,
    outputs: state.outputs,
    models: state.models,
    analysis: state.analysis,
    proposals: state.proposals,
    finalQuestions: state.finalQuestions,
    tweak: state.tweak,
  }));
  localStorage.setItem(TEXT_KEY, state.text);
}

function setState(patch) {
  state = { ...state, ...patch };
  applyTweaks();
  persist();
  render();
}

function applyTweaks() {
  const root = document.documentElement.style;
  const [base, dark, light, wash] = state.tweak.accent;
  root.setProperty("--cinnabar", base);
  root.setProperty("--cinnabar-ink", dark);
  root.setProperty("--cinnabar-2", light);
  root.setProperty("--cinnabar-wash", wash);
  const tone = PAPER_TONES[state.tweak.paper] || PAPER_TONES["宣纸米白"];
  root.setProperty("--paper", tone.paper);
  root.setProperty("--paper-deep", tone.deep);
  root.setProperty("--surface", tone.surface);
  root.setProperty("--surface-2", tone.s2);
  root.setProperty("--tex-op", state.tweak.texture ? "0.9" : "0");
  root.setProperty("font-size", `${(state.tweak.fontScale / 100) * 16}px`);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getLines(text = state.text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getPoemLines(text = state.text) {
  return getLines(text).filter((line) => /[，。！？；]/.test(line));
}

function pick(arr, index) {
  return arr[index % arr.length];
}

function inferTheme(text = state.text) {
  const rules = [
    ["月", "澄江", "白鸥", "长笛", "旷达归隐"],
    ["落木", "千山", "晚晴", "登临望远"],
    ["朱弦", "青眼", "佳人", "知音难遇"],
    ["公家事", "归船", "盟", "仕途倦意"],
  ];
  const hit = rules.find((rule) => rule.slice(0, -1).some((word) => text.includes(word)));
  return hit ? hit[hit.length - 1] : "意象与情感变化";
}

function buildAnalysis() {
  const lines = getPoemLines();
  const text = state.text;
  const allText = text.replace(/\s/g, "");
  const concepts = [
    "意象组合",
    "情景交融",
    "用典",
    "炼字",
    "情感脉络",
    "虚实相生",
    "高考诗歌鉴赏",
    "分点作答",
  ];
  const imageWords = ["落木", "千山", "澄江", "月", "朱弦", "青眼", "长笛", "白鸥"].filter((word) => text.includes(word));
  const metrics = {
    chars: allText.length,
    poemLines: lines.length,
    images: imageWords.length || 4,
    difficulty: state.difficulty,
  };
  return {
    metrics,
    theme: inferTheme(text),
    imageWords: imageWords.length ? imageWords : ["景物", "时间", "声音", "人物"],
    concepts,
    scores: [
      ["文本理解", 88],
      ["手法辨析", state.types.includes("appreciation") ? 84 : 72],
      ["区分度", state.difficulty === "拔高" ? 91 : state.difficulty === "基础" ? 68 : 82],
      ["课堂讲评", 86],
    ],
    segments: lines.slice(0, 4).map((line, index) => ({
      title: ["起句背景", "景象展开", "情感转折", "旨归收束"][index] || `片段 ${index + 1}`,
      line,
      note: pick([
        "提示学生先找景语，再转入情语。",
        "适合考查意象关系与画面概括。",
        "可追问用典背后的情绪层次。",
        "可落到诗人精神选择与人格表达。",
      ], index),
    })),
  };
}

function buildChoiceQuestion(analysis, seed) {
  const line = pick(getPoemLines(), seed) || "落木千山天远大，澄江一道月分明。";
  const theme = analysis.theme;
  return {
    id: `q-choice-${Date.now()}-${seed}`,
    type: "选择题",
    score: 3,
    sourceModel: "基础题组",
    title: `下列对诗句“${line.replace(/[。！？]$/, "")}”的理解和赏析，不正确的一项是`,
    options: [
      "A. 诗句以开阔景象映衬诗人胸襟，体现登临所见的空间层次。",
      "B. 诗人将自然景象与内心情绪相互勾连，形成情景交融的表达效果。",
      "C. 诗句主要借热闹场面突出宴饮欢会，情感基调轻快而无波澜。",
      `D. 相关意象与全诗“${theme}”的主旨形成呼应。`,
    ],
    answer: "C",
    analysis: "C 项把诗歌开阔清朗中的复杂情绪误读为单纯热闹欢会，忽略了仕途倦意和精神自守。",
    rubric: ["判断选项内容是否贴合诗句", "结合意象、手法和情感基调说明理由", "能指出误读点可得满分"],
    intent: "考查学生对诗句内容、情感基调和表达效果的综合判断。",
  };
}

function buildAppreciationQuestion(analysis, seed) {
  const images = analysis.imageWords.slice(0, 3).join("、") || "景物、声音、人物";
  return {
    id: `q-app-${Date.now()}-${seed}`,
    type: "主观鉴赏题",
    score: 6,
    sourceModel: "讲评题组",
    title: `本诗如何借“${images}”等意象表现诗人的情感变化？请结合全诗简要分析。`,
    answer: "诗人先从公务已了写起，转入登阁所见；中间以开阔景象拓展胸襟，又以用典写知音难遇；结尾写归船、长笛、白鸥之盟，表现出超脱仕途、归向自然的精神选择。",
    analysis: "作答应按“景象概括、手法说明、情感落点”组织。不能只翻译诗句，也不能把情感概括为单一喜悦。",
    rubric: ["意象概括 2 分", "情感变化 2 分", "表达技巧和语言组织 2 分"],
    intent: "训练学生从意象群进入情感脉络，形成规范分点作答。",
  };
}

function buildExtensionQuestion(analysis, seed) {
  return {
    id: `q-ext-${Date.now()}-${seed}`,
    type: "迁移拓展题",
    score: 8,
    sourceModel: "拔高题组",
    title: `请将本诗与另一首登临诗比较，说明二者在“景与情的关系”上有何异同。要求观点明确，至少引用两处文本依据。`,
    answer: "可从同为登临写景、借景抒怀入手；差异可落在情感方向、意象密度、收束方式等方面。答案允许多元，但必须紧扣文本。",
    analysis: "该题用于拔高比较阅读能力，教师可按教材或校本诗篇替换比较对象。",
    rubric: ["相同点 2 分", "不同点 3 分", "文本依据 2 分", "表达清晰 1 分"],
    intent: "连接高考比较鉴赏趋势，提升迁移和证据表达能力。",
  };
}

function buildProposalGroups(analysis) {
  const selected = state.types.length ? state.types : ["choice", "appreciation", "rubric"];
  const modelIds = state.models.length ? state.models : MODELS.map((model) => model.id);
  return modelIds.map((modelId, modelIndex) => {
    const model = MODELS.find((item) => item.id === modelId) || MODELS[0];
    const items = [];
    if (selected.includes("choice")) items.push(buildChoiceQuestion(analysis, modelIndex + 1));
    if (selected.includes("appreciation")) items.push(buildAppreciationQuestion(analysis, modelIndex + 2));
    if (selected.includes("extension")) items.push(buildExtensionQuestion(analysis, modelIndex + 3));
    return {
      model: model.name,
      desc: model.desc,
      stance: pick([
        "题干稳健，适合常规考试直接采用。",
        "讲评路径清晰，适合课堂训练后使用。",
        "区分度更强，建议作为压轴或拓展题。",
      ], modelIndex),
      scores: [
        ["准确性", 88 + modelIndex * 3],
        ["区分度", 80 + modelIndex * 4],
        ["可讲评", 91 - modelIndex * 3],
      ],
      items,
    };
  });
}

function mergeFinalQuestions(proposals = state.proposals) {
  const merged = [];
  proposals.forEach((proposal) => {
    proposal.items.forEach((item) => {
      if (!merged.some((exists) => exists.type === item.type)) {
        merged.push({ ...item, id: `${item.id}-final` });
      }
    });
  });
  if (state.types.includes("rubric") && merged.length > 0) {
    merged.forEach((item) => {
      item.rubric = item.rubric && item.rubric.length ? item.rubric : ["要点准确", "结合文本", "表达清楚"];
    });
  }
  return merged;
}

function generateAuxiliaryContent() {
  if (!state.text.trim()) {
    toast("请先输入诗歌文本。");
    return;
  }
  const analysis = buildAnalysis();
  const proposals = buildProposalGroups(analysis);
  const finalQuestions = mergeFinalQuestions(proposals);
  setState({ analysis, proposals, finalQuestions });
  window.requestAnimationFrame(() => {
    document.querySelector(".output-module")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  toast("辅助出题内容已生成，可在右侧继续编辑。");
}

function saveQuestionDraft(id, field, value) {
  state.finalQuestions = state.finalQuestions.map((item) => (item.id === id ? { ...item, [field]: value } : item));
  persist();
}

function toast(message) {
  state.toast = message;
  render();
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    state.toast = "";
    render();
  }, 2600);
}

function exportText() {
  const content = renderPaperText();
  download("墨衡题目内容.txt", content, "text/plain;charset=utf-8");
}

async function copyText() {
  const content = renderPaperText();
  try {
    await navigator.clipboard.writeText(content);
  } catch {
    const field = document.createElement("textarea");
    field.value = content;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
  toast("题目内容已复制。");
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function renderPaperText() {
  const parts = [
    "墨衡 · 高中语文原创命题定稿",
    `难度：${state.difficulty}`,
    `生成内容：${state.outputs.join("、")}`,
    "",
    "【原文】",
    state.text,
    "",
    "【试题】",
  ];
  state.finalQuestions.forEach((item, index) => {
    parts.push(`${index + 1}.（${item.type}，${item.score}分）${item.title}`);
    if (item.options) parts.push(...item.options);
    parts.push(`参考答案：${item.answer}`);
    parts.push(`解析：${item.analysis}`);
    parts.push(`评分标准：${item.rubric.join("；")}`);
    parts.push("");
  });
  return parts.join("\n");
}

function readFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => setState({ text: String(reader.result || "") });
  reader.readAsText(file, "utf-8");
}

function toggleItem(list, id) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function stepAction() {
  generateAuxiliaryContent();
}

function nextLabel() {
  return "生成辅助出题内容";
}

function render() {
  app.innerHTML = `
    <div class="app-shell simple-shell">
      <main class="main">
        ${renderTopbar()}
        <section class="workspace two-module-workspace">
          ${renderTwoModuleLayout()}
        </section>
      </main>
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ""}
    </div>
  `;
  bindEvents();
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div class="brand-title">
        <strong>墨衡 · 语文原创命题助手</strong>
        <span>输入诗歌，输出辅助出题内容</span>
      </div>
      <div class="top-actions">
        <span class="teacher-pill">辅助出题助手</span>
        <span class="avatar">瑜</span>
      </div>
    </header>
  `;
}

function renderTwoModuleLayout() {
  return `
    <div class="two-module-grid ${state.finalQuestions.length ? "has-output" : ""}">
      ${renderPoemInputModule()}
      ${renderAuxiliaryOutputModule()}
    </div>
  `;
}

function renderPoemInputModule() {
  return `
    <section class="panel module-card input-module">
      <div class="panel-header module-head">
        <div class="panel-title">
          <strong>输入诗歌</strong>
          <span>粘贴原诗，设置题型、难度和需要输出的内容</span>
        </div>
        <div class="input-toolbar">
          <button class="btn" data-load-sample>载入示例</button>
          <label class="btn" for="fileInput">导入文本</label>
          <input id="fileInput" class="hidden-file" type="file" accept=".txt,.md,.csv" />
        </div>
      </div>
      <textarea class="primary-input poem-input" data-text placeholder="粘贴一首诗歌，系统会输出辅助出题内容">${escapeHtml(state.text)}</textarea>
      <div class="input-foot">
        <span>${state.text.replace(/\s/g, "").length} 字 · ${getPoemLines().length || getLines().length} 行</span>
        <span>内容保存在当前浏览器本地</span>
      </div>
      <div class="module-config">
        <button class="btn primary generate-btn" data-main-action>${nextLabel()}</button>
        <details class="assist-details">
          <summary>题型和难度设置</summary>
          <div class="details-body">
            <div class="section">
              <h3>题型</h3>
              <div class="chips">
                ${QUESTION_TYPES.map((item) => `
                  <label class="chip"><input type="checkbox" data-type="${item.id}" ${state.types.includes(item.id) ? "checked" : ""} />${item.name}</label>
                `).join("")}
              </div>
            </div>
            <div class="section compact-section">
              <h3>难度</h3>
              <div class="segmented">
                ${["基础", "高考模拟", "拔高"].map((item) => `
                  <button data-difficulty="${item}" class="${state.difficulty === item ? "active" : ""}">${item}</button>
                `).join("")}
              </div>
            </div>
            <div class="section">
              <h3>输出</h3>
              <div class="chips">
                ${["参考答案", "详细解析", "评分标准", "命题意图"].map((item) => `
                  <label class="chip"><input type="checkbox" data-output="${item}" ${state.outputs.includes(item) ? "checked" : ""} />${item}</label>
                `).join("")}
              </div>
            </div>
          </div>
        </details>
      </div>
    </section>
  `;
}

function renderAuxiliaryOutputModule() {
  const analysis = state.analysis;
  return `
    <section class="panel module-card output-module">
      <div class="panel-header module-head">
        <div class="panel-title">
          <strong>输出辅助出题内容</strong>
          <span>${state.finalQuestions.length ? `${state.finalQuestions.length} 道题 · ${state.finalQuestions.reduce((sum, item) => sum + Number(item.score || 0), 0)} 分` : "等待生成"}</span>
        </div>
        <div class="inline-actions">
          <button class="btn" data-copy-text ${state.finalQuestions.length ? "" : "disabled"}>复制题目</button>
          <button class="btn dark" data-export-text ${state.finalQuestions.length ? "" : "disabled"}>下载题目</button>
        </div>
      </div>
      <div class="panel-body output-body">
        ${state.finalQuestions.length ? `
          <div class="section output-section main-output">
            <h3>题目内容</h3>
            <div class="question-list">
              ${state.finalQuestions.map((item, index) => renderQuestion(item, index)).join("")}
            </div>
          </div>
        ` : `<div class="empty">先输入诗歌，点击“生成辅助出题内容”。生成后，题目会出现在这里。</div>`}
        ${analysis ? `
          <details class="assist-details output-assist">
            <summary>查看命题依据和文本拆解</summary>
            <div class="details-body">${renderOutputAnalysis(analysis)}</div>
          </details>
        ` : ""}
      </div>
    </section>
  `;
}

function renderOutputAnalysis(analysis) {
  return `
    <div class="output-summary">
      <div class="metric"><span>文本字数</span><strong>${analysis.metrics.chars}</strong></div>
      <div class="metric"><span>有效行数</span><strong>${analysis.metrics.poemLines}</strong></div>
      <div class="metric"><span>核心意象</span><strong>${analysis.metrics.images}</strong></div>
      <div class="metric"><span>难度</span><strong>${analysis.metrics.difficulty}</strong></div>
    </div>
    <div class="section output-section">
      <h3>命题依据</h3>
      <div class="small-box">
        <span>主题方向</span>
        <p>${escapeHtml(analysis.theme)}</p>
      </div>
      <div class="concept-cloud compact-cloud">
        ${analysis.concepts.map((item, index) => `<span class="concept ${index < 3 ? "major" : ""}">${item}</span>`).join("")}
      </div>
    </div>
    <div class="section output-section">
      <h3>文本拆解</h3>
      <div class="timeline">
        ${analysis.segments.map((item) => `
          <div class="quote-box">
            <strong>${item.title}</strong><br />
            ${escapeHtml(item.line)}<br />
            <span>${item.note}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderQuestion(item, index) {
  return `
    <article class="question-card">
      <div class="question-top">
        <strong><span class="tag red">${index + 1}</span>${item.type} · ${item.score}分</strong>
        <div class="inline-actions">
          <span class="tag">${item.sourceModel || "融合定稿"}</span>
        </div>
      </div>
      <div class="question-content">
        <textarea class="editable question-title" data-question-field="title" data-question-id="${item.id}">${escapeHtml(item.title)}</textarea>
        ${item.options ? `<textarea class="editable question-options" data-question-field="options" data-question-id="${item.id}">${escapeHtml(item.options.join("\n"))}</textarea>` : ""}
        <details class="assist-details answer-details">
          <summary>展开答案、解析与评分标准</summary>
          <div class="details-body">
            <div class="answer-grid">
              <div class="small-box">
                <span>参考答案</span>
                <textarea class="editable" data-question-field="answer" data-question-id="${item.id}">${escapeHtml(item.answer)}</textarea>
              </div>
              <div class="small-box">
                <span>解析</span>
                <textarea class="editable" data-question-field="analysis" data-question-id="${item.id}">${escapeHtml(item.analysis)}</textarea>
              </div>
            </div>
            <div class="small-box">
              <span>评分标准</span>
              <textarea class="editable" data-question-field="rubric" data-question-id="${item.id}">${escapeHtml((item.rubric || []).join("\n"))}</textarea>
            </div>
          </div>
        </details>
      </div>
    </article>
  `;
}

function bindEvents() {
  const text = document.querySelector("[data-text]");
  if (text) {
    text.addEventListener("input", (event) => {
      state.text = event.target.value;
      persist();
    });
  }

  document.querySelector("[data-load-sample]")?.addEventListener("click", () => setState({ text: SAMPLE_TEXT }));
  document.querySelector("#fileInput")?.addEventListener("change", (event) => readFile(event.target.files[0]));

  document.querySelectorAll("[data-type]").forEach((input) => {
    input.addEventListener("change", () => setState({ types: toggleItem(state.types, input.dataset.type) }));
  });
  document.querySelectorAll("[data-output]").forEach((input) => {
    input.addEventListener("change", () => setState({ outputs: toggleItem(state.outputs, input.dataset.output) }));
  });
  document.querySelectorAll("[data-difficulty]").forEach((button) => {
    button.addEventListener("click", () => setState({ difficulty: button.dataset.difficulty }));
  });

  document.querySelector("[data-main-action]")?.addEventListener("click", stepAction);

  document.querySelector("[data-copy-text]")?.addEventListener("click", copyText);
  document.querySelector("[data-export-text]")?.addEventListener("click", exportText);

  document.querySelectorAll("[data-question-field]").forEach((field) => {
    field.addEventListener("input", (event) => {
      const value = event.target.value;
      const question = state.finalQuestions.find((item) => item.id === field.dataset.questionId);
      if (!question) return;
      if (field.dataset.questionField === "options") saveQuestionDraft(question.id, "options", value.split(/\n+/).filter(Boolean));
      else if (field.dataset.questionField === "rubric") saveQuestionDraft(question.id, "rubric", value.split(/\n+/).filter(Boolean));
      else saveQuestionDraft(question.id, field.dataset.questionField, value);
    });
    field.addEventListener("blur", render);
  });
}

applyTweaks();
render();
