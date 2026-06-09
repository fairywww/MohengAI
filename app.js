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
    name: "墨衡 Pro",
    desc: "负责原题构思、答案骨架和题干风格统一。",
  },
  {
    id: "teaching",
    name: "教研审校",
    desc: "检查知识点、评分点和课堂可讲解性。",
  },
  {
    id: "exam",
    name: "考情增强",
    desc: "对齐高考模拟难度，补充干扰项和区分度。",
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

const initialState = {
  step: 1,
  text: localStorage.getItem("moheng_text") || SAMPLE_TEXT,
  types: ["choice", "appreciation", "rubric"],
  difficulty: "高考模拟",
  outputs: ["参考答案", "详细解析", "评分标准", "命题意图"],
  models: ["moheng", "teaching", "exam"],
  analysis: null,
  proposals: [],
  finalQuestions: [],
  activeRail: "workspace",
  showTweaks: false,
  showBank: false,
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
  const saved = localStorage.getItem("moheng_state");
  if (!saved) return { ...initialState };
  try {
    return { ...initialState, ...JSON.parse(saved), toast: "", showTweaks: false, showBank: false };
  } catch {
    return { ...initialState };
  }
}

function persist() {
  localStorage.setItem("moheng_state", JSON.stringify({
    text: state.text,
    types: state.types,
    difficulty: state.difficulty,
    outputs: state.outputs,
    models: state.models,
    analysis: state.analysis,
    proposals: state.proposals,
    finalQuestions: state.finalQuestions,
    tweak: state.tweak,
    step: state.step,
  }));
  localStorage.setItem("moheng_text", state.text);
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

function analyzeText() {
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
  const analysis = {
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
  setState({ analysis, step: 2 });
  toast("文本分析完成，已生成知识点和命题方向。");
}

function buildChoiceQuestion(analysis, seed) {
  const line = pick(getPoemLines(), seed) || "落木千山天远大，澄江一道月分明。";
  const theme = analysis.theme;
  return {
    id: `q-choice-${Date.now()}-${seed}`,
    type: "选择题",
    score: 3,
    sourceModel: "墨衡 Pro",
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
    sourceModel: "教研审校",
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
    sourceModel: "考情增强",
    title: `请将本诗与另一首登临诗比较，说明二者在“景与情的关系”上有何异同。要求观点明确，至少引用两处文本依据。`,
    answer: "可从同为登临写景、借景抒怀入手；差异可落在情感方向、意象密度、收束方式等方面。答案允许多元，但必须紧扣文本。",
    analysis: "该题用于拔高比较阅读能力，教师可按教材或校本诗篇替换比较对象。",
    rubric: ["相同点 2 分", "不同点 3 分", "文本依据 2 分", "表达清晰 1 分"],
    intent: "连接高考比较鉴赏趋势，提升迁移和证据表达能力。",
  };
}

function generateProposals() {
  const analysis = state.analysis || createInlineAnalysis();
  const selected = state.types;
  const proposals = state.models.map((modelId, modelIndex) => {
    const model = MODELS.find((item) => item.id === modelId) || MODELS[0];
    const items = [];
    if (selected.includes("choice")) items.push(buildChoiceQuestion(analysis, modelIndex + 1));
    if (selected.includes("appreciation")) items.push(buildAppreciationQuestion(analysis, modelIndex + 2));
    if (selected.includes("extension") || modelId === "exam") items.push(buildExtensionQuestion(analysis, modelIndex + 3));
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
  setState({ proposals, step: 3 });
  toast("多模型协同完成，已生成候选题组。");
}

function createInlineAnalysis() {
  const lines = getPoemLines();
  return {
    metrics: { chars: state.text.replace(/\s/g, "").length, poemLines: lines.length, images: 4, difficulty: state.difficulty },
    theme: inferTheme(),
    imageWords: ["落木", "澄江", "长笛", "白鸥"],
    concepts: ["意象组合", "情景交融", "分点作答"],
    scores: [["文本理解", 80], ["手法辨析", 78], ["区分度", 82], ["课堂讲评", 84]],
    segments: lines.slice(0, 4).map((line, index) => ({ title: `片段 ${index + 1}`, line, note: "可作为命题依据。" })),
  };
}

function finalizeQuestions() {
  const merged = [];
  state.proposals.forEach((proposal) => {
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
  setState({ finalQuestions: merged, step: 4 });
  toast("定稿已生成，可继续编辑、导出或入库。");
}

function updateQuestion(id, field, value) {
  const finalQuestions = state.finalQuestions.map((item) => (item.id === id ? { ...item, [field]: value } : item));
  setState({ finalQuestions });
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

function saveToBank() {
  const bank = getBank();
  const entry = {
    id: `bank-${Date.now()}`,
    title: inferTheme(),
    difficulty: state.difficulty,
    createdAt: new Date().toLocaleString("zh-CN"),
    questions: state.finalQuestions,
    source: state.text.slice(0, 120),
  };
  localStorage.setItem("moheng_bank", JSON.stringify([entry, ...bank]));
  setState({ showBank: true });
  toast("已保存到本地题库。");
}

function getBank() {
  try {
    return JSON.parse(localStorage.getItem("moheng_bank") || "[]");
  } catch {
    return [];
  }
}

function exportText() {
  const content = renderPaperText();
  download("墨衡命题定稿.txt", content, "text/plain;charset=utf-8");
}

function exportJson() {
  download("墨衡命题定稿.json", JSON.stringify({
    source: state.text,
    difficulty: state.difficulty,
    outputs: state.outputs,
    analysis: state.analysis,
    questions: state.finalQuestions,
  }, null, 2), "application/json;charset=utf-8");
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
  if (state.step === 1) analyzeText();
  else if (state.step === 2) generateProposals();
  else if (state.step === 3) finalizeQuestions();
  else exportText();
}

function nextLabel() {
  if (state.step === 1) return "开始篇目分析";
  if (state.step === 2) return "启动多模型协同";
  if (state.step === 3) return "合并为定稿";
  return "导出试卷文本";
}

function render() {
  app.innerHTML = `
    <div class="app-shell">
      ${renderRail()}
      <main class="main">
        ${renderTopbar()}
        ${renderSteps()}
        <section class="workspace">
          ${renderScreen()}
        </section>
      </main>
      ${renderBottomBar()}
      ${renderTweaks()}
      ${renderDrawer()}
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ""}
    </div>
  `;
  bindEvents();
}

function renderRail() {
  return `
    <aside class="rail">
      <div class="seal" title="墨衡">命</div>
      <button class="rail-button active" data-step="1" title="命题工作台">1</button>
      <button class="rail-button" data-step="2" title="篇目分析">2</button>
      <button class="rail-button" data-step="3" title="多模型协同">3</button>
      <button class="rail-button" data-step="4" title="编辑定稿">4</button>
      <div class="rail-spacer"></div>
      <button class="rail-button" data-open-bank title="题库">库</button>
      <button class="rail-button" data-open-tweaks title="样式微调">调</button>
    </aside>
  `;
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div class="brand-title">
        <strong>墨衡 · 语文原创命题助手</strong>
        <span>诗歌鉴赏 · AI 多模型协同出题</span>
      </div>
      <div class="top-actions">
        <span class="teacher-pill">人机协同 · AI 拟初稿，教师终审定稿</span>
        <span class="avatar">瑜</span>
      </div>
    </header>
  `;
}

function renderSteps() {
  const steps = [
    ["命题工作台", "输入与要求"],
    ["篇目分析", "考点与方向"],
    ["多模型协同", "对比与融合"],
    ["编辑定稿", "评价与导出"],
  ];
  return `
    <nav class="steps" aria-label="命题步骤">
      ${steps.map(([title, desc], index) => {
        const number = index + 1;
        const cls = number === state.step ? "active" : number < state.step ? "done" : "";
        return `
          <button class="step ${cls}" data-step="${number}">
            <span class="step-index">${number < state.step ? "✓" : number}</span>
            <span class="step-copy"><strong>${title}</strong><span>${desc}</span></span>
          </button>
        `;
      }).join("")}
    </nav>
  `;
}

function renderScreen() {
  if (state.step === 1) return renderInputScreen();
  if (state.step === 2) return renderAnalysisScreen();
  if (state.step === 3) return renderCompareScreen();
  return renderFinalizeScreen();
}

function screenHead(kicker, title, copy) {
  return `
    <div class="screen-head">
      <div>
        <div class="screen-kicker">${kicker}</div>
        <h1>${title}</h1>
        <p>${copy}</p>
      </div>
      <div class="status-strip"><i class="dot"></i><span>本地演示系统 · 数据自动保存</span></div>
    </div>
  `;
}

function renderInputScreen() {
  return `
    ${screenHead("STEP 01 · 命题工作台", "输入文本，设定命题要求", "三步即可成稿：输入文本、选择模型与要求、生成并修改。AI 负责拟出初稿，最终判断权在教师。")}
    <div class="grid-2">
      <article class="panel">
        <div class="panel-header">
          <div class="panel-title"><strong>命题文本</strong><span>支持粘贴、TXT 文件导入和示例载入</span></div>
          <div class="input-toolbar">
            <span class="tag red">古诗词</span>
            <button class="btn" data-load-sample>载入示例</button>
            <label class="btn" for="fileInput">导入文本</label>
            <input id="fileInput" class="hidden-file" type="file" accept=".txt,.md,.csv" />
          </div>
        </div>
        <textarea class="primary-input" data-text placeholder="粘贴一首诗词、文言片段或现代文阅读材料">${escapeHtml(state.text)}</textarea>
        <div class="input-foot">
          <span>${state.text.replace(/\s/g, "").length} 字 · ${getPoemLines().length || getLines().length} 行</span>
          <span>点击右侧配置后开始分析</span>
        </div>
      </article>

      <aside class="panel">
        <div class="panel-header">
          <div class="panel-title"><strong>命题要求</strong><span>组合题型、难度与交付内容</span></div>
        </div>
        <div class="panel-body">
          <div class="section">
            <h3>题型组合</h3>
            <div class="check-list">
              ${QUESTION_TYPES.map((item) => `
                <label class="check-row">
                  <input type="checkbox" data-type="${item.id}" ${state.types.includes(item.id) ? "checked" : ""} />
                  <span class="check-main"><strong>${item.name}</strong><span>${item.desc}</span></span>
                  <span class="tag">${item.level}</span>
                </label>
              `).join("")}
            </div>
          </div>
          <div class="section">
            <h3>难度定位</h3>
            <div class="segmented">
              ${["基础", "高考模拟", "拔高"].map((item) => `
                <button data-difficulty="${item}" class="${state.difficulty === item ? "active" : ""}">${item}</button>
              `).join("")}
            </div>
          </div>
          <div class="section">
            <h3>同时生成</h3>
            <div class="chips">
              ${["参考答案", "详细解析", "评分标准", "命题意图"].map((item) => `
                <label class="chip"><input type="checkbox" data-output="${item}" ${state.outputs.includes(item) ? "checked" : ""} />${item}</label>
              `).join("")}
            </div>
          </div>
          <div class="section">
            <h3>参与生成的模型</h3>
            <div class="model-list">
              ${MODELS.map((model) => `
                <label class="model-card">
                  <strong>${model.name}</strong>
                  <span class="switch"><input type="checkbox" data-model="${model.id}" ${state.models.includes(model.id) ? "checked" : ""} /><i></i></span>
                  <span>${model.desc}</span>
                </label>
              `).join("")}
            </div>
          </div>
        </div>
      </aside>
    </div>
  `;
}

function renderAnalysisScreen() {
  const analysis = state.analysis || createInlineAnalysis();
  return `
    ${screenHead("STEP 02 · 篇目分析", "识别考点，生成命题方向", "系统先把文本拆解为意象、手法、情感和课堂讲评路径，再给多模型命题提供约束。")}
    <div class="analysis-layout">
      <aside class="panel plain">
        <div class="panel-header">
          <div class="panel-title"><strong>文本画像</strong><span>由当前篇目自动生成</span></div>
        </div>
        <div class="panel-body">
          <div class="metric-grid">
            <div class="metric"><span>文本字数</span><strong>${analysis.metrics.chars}</strong></div>
            <div class="metric"><span>有效行数</span><strong>${analysis.metrics.poemLines}</strong></div>
            <div class="metric"><span>核心意象</span><strong>${analysis.metrics.images}</strong></div>
            <div class="metric"><span>难度</span><strong>${analysis.metrics.difficulty}</strong></div>
          </div>
          <div class="section" style="margin-top: 22px">
            <h3>能力指标</h3>
            <div class="bar-list">
              ${analysis.scores.map(([label, value]) => `
                <div class="bar-row"><span>${label}</span><div class="bar-track"><i class="bar-fill" style="width:${value}%"></i></div><span>${value}</span></div>
              `).join("")}
            </div>
          </div>
        </div>
      </aside>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title"><strong>命题依据</strong><span>${analysis.theme}</span></div>
          <span class="tag red">可进入协同出题</span>
        </div>
        <div class="panel-body">
          <div class="section">
            <h3>考点云图</h3>
            <div class="concept-cloud">
              ${analysis.concepts.map((item, index) => `<span class="concept ${index < 3 ? "major" : ""}">${item}</span>`).join("")}
            </div>
          </div>
          <div class="section">
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
        </div>
      </section>
    </div>
  `;
}

function renderCompareScreen() {
  const proposals = state.proposals.length ? state.proposals : [];
  return `
    ${screenHead("STEP 03 · 多模型协同", "对比候选题，融合最佳方案", "不同模型从原创度、教学可讲评性和考试区分度三个角度生成候选题。")}
    ${proposals.length ? `
      <div class="compare-grid">
        ${proposals.map((proposal) => `
          <article class="proposal-card">
            <div class="proposal-head">
              <div><h3>${proposal.model}</h3><p>${proposal.desc}</p></div>
              <span class="tag blue">${proposal.items.length} 题</span>
            </div>
            <p>${proposal.stance}</p>
            <div class="bar-list">
              ${proposal.scores.map(([label, value]) => `
                <div class="score-row"><span>${label}</span><span class="mini-track"><i style="width:${value}%"></i></span></div>
              `).join("")}
            </div>
            ${proposal.items.map((item) => `
              <div class="small-box">
                <span>${item.type} · ${item.score}分</span>
                <p>${escapeHtml(item.title)}</p>
              </div>
            `).join("")}
          </article>
        `).join("")}
      </div>
    ` : `
      <div class="empty">尚未生成候选题。请先完成篇目分析，或点击下方按钮启动多模型协同。</div>
    `}
  `;
}

function renderFinalizeScreen() {
  return `
    ${screenHead("STEP 04 · 编辑定稿", "教师终审，导出试卷", "所有题目都可直接编辑。定稿可保存到本地题库，也可导出为文本、JSON 或打印为 PDF。")}
    <div class="final-layout">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title"><strong>命题定稿</strong><span>${state.finalQuestions.length} 道题 · ${state.finalQuestions.reduce((sum, item) => sum + Number(item.score || 0), 0)} 分</span></div>
          <div class="inline-actions">
            <button class="btn" data-save-bank>入库</button>
            <button class="btn" data-export-json>JSON</button>
            <button class="btn" data-print>打印</button>
          </div>
        </div>
        <div class="panel-body">
          ${state.finalQuestions.length ? `
            <div class="question-list">
              ${state.finalQuestions.map((item, index) => renderQuestion(item, index)).join("")}
            </div>
          ` : `<div class="empty">还没有定稿题目。请在上一步合并候选方案。</div>`}
        </div>
      </section>
      <aside class="panel">
        <div class="panel-header">
          <div class="panel-title"><strong>试卷预览</strong><span>按当前定稿实时生成</span></div>
        </div>
        <div class="panel-body">
          ${renderPaperPreview()}
        </div>
      </aside>
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
        <textarea class="editable" data-question-field="title" data-question-id="${item.id}">${escapeHtml(item.title)}</textarea>
        ${item.options ? `<textarea class="editable" data-question-field="options" data-question-id="${item.id}">${escapeHtml(item.options.join("\n"))}</textarea>` : ""}
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
    </article>
  `;
}

function renderPaperPreview() {
  if (!state.finalQuestions.length) return `<div class="empty">生成定稿后显示完整试卷。</div>`;
  return `
    <div class="paper-preview">
      <h3>高中语文诗歌鉴赏原创试题</h3>
      <div class="meta"><span>${state.difficulty}</span><span>${state.finalQuestions.length} 题</span><span>${state.outputs.join(" / ")}</span></div>
      ${state.finalQuestions.map((item, index) => `
        <p><strong>${index + 1}.（${item.score}分）</strong>${escapeHtml(item.title)}</p>
        ${item.options ? `<p>${item.options.map(escapeHtml).join("<br />")}</p>` : ""}
      `).join("")}
    </div>
  `;
}

function renderBottomBar() {
  const canAct = state.step !== 4 || state.finalQuestions.length > 0;
  return `
    <footer class="bottom-bar">
      <div class="progress-note">${bottomNote()}</div>
      <div class="inline-actions">
        <button class="btn ghost" data-prev ${state.step === 1 ? "disabled" : ""}>上一步</button>
        <button class="btn primary" data-main-action ${canAct ? "" : "disabled"}>${nextLabel()}</button>
      </div>
    </footer>
  `;
}

function bottomNote() {
  if (state.step === 1) return "当前尚未进入分析。建议先确认题型、难度和输出内容。";
  if (state.step === 2) return `已识别主题：${(state.analysis || createInlineAnalysis()).theme}`;
  if (state.step === 3) return `候选方案：${state.proposals.reduce((sum, item) => sum + item.items.length, 0)} 道题`;
  return "定稿可编辑，修改后会自动保存到浏览器本地。";
}

function renderTweaks() {
  return `
    <aside class="tweaks-pop ${state.showTweaks ? "open" : ""}">
      <div class="panel-title"><strong>样式微调</strong><span>同步 Claude 原型里的可调设计语言</span></div>
      <div class="section">
        <h3>印章主色</h3>
        <div class="swatches">
          ${ACCENTS.map((colors, index) => `
            <button class="swatch ${state.tweak.accent[0] === colors[0] ? "active" : ""}" data-accent="${index}" style="--swatch:${colors[0]}"></button>
          `).join("")}
        </div>
      </div>
      <div class="section">
        <h3>纸面</h3>
        <div class="segmented">
          ${Object.keys(PAPER_TONES).map((paper) => `<button data-paper="${paper}" class="${state.tweak.paper === paper ? "active" : ""}">${paper}</button>`).join("")}
        </div>
      </div>
      <div class="range-row">
        <span>字号</span>
        <input type="range" min="90" max="115" value="${state.tweak.fontScale}" data-font-scale />
        <span>${state.tweak.fontScale}%</span>
      </div>
      <label class="chip"><input type="checkbox" data-texture ${state.tweak.texture ? "checked" : ""} />纸纹理</label>
    </aside>
  `;
}

function renderDrawer() {
  const bank = getBank();
  return `
    <aside class="drawer ${state.showBank ? "open" : ""}">
      <div class="drawer-head">
        <div class="panel-title"><strong>本地题库</strong><span>${bank.length} 份命题记录</span></div>
        <button class="btn icon" data-close-bank>×</button>
      </div>
      <div class="drawer-body">
        ${bank.length ? bank.map((entry) => `
          <article class="bank-item">
            <div class="inline-actions">
              <span class="tag red">${entry.difficulty}</span>
              <span class="tag">${entry.createdAt}</span>
            </div>
            <strong>${escapeHtml(entry.title)}</strong>
            <p>${escapeHtml(entry.source)}...</p>
            <button class="btn" data-load-bank="${entry.id}">载入这份题组</button>
          </article>
        `).join("") : `<div class="empty">尚无题库记录。定稿后点击“入库”保存。</div>`}
      </div>
    </aside>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-step]").forEach((button) => {
    button.addEventListener("click", () => setState({ step: Number(button.dataset.step) }));
  });

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
  document.querySelectorAll("[data-model]").forEach((input) => {
    input.addEventListener("change", () => setState({ models: toggleItem(state.models, input.dataset.model) }));
  });
  document.querySelectorAll("[data-difficulty]").forEach((button) => {
    button.addEventListener("click", () => setState({ difficulty: button.dataset.difficulty }));
  });

  document.querySelector("[data-main-action]")?.addEventListener("click", stepAction);
  document.querySelector("[data-prev]")?.addEventListener("click", () => setState({ step: Math.max(1, state.step - 1) }));

  document.querySelector("[data-save-bank]")?.addEventListener("click", saveToBank);
  document.querySelector("[data-export-json]")?.addEventListener("click", exportJson);
  document.querySelector("[data-print]")?.addEventListener("click", () => window.print());

  document.querySelector("[data-open-bank]")?.addEventListener("click", () => setState({ showBank: true }));
  document.querySelector("[data-close-bank]")?.addEventListener("click", () => setState({ showBank: false }));
  document.querySelector("[data-open-tweaks]")?.addEventListener("click", () => setState({ showTweaks: !state.showTweaks }));

  document.querySelectorAll("[data-load-bank]").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = getBank().find((item) => item.id === button.dataset.loadBank);
      if (!entry) return;
      setState({ finalQuestions: entry.questions, difficulty: entry.difficulty, step: 4, showBank: false });
    });
  });

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

  document.querySelectorAll("[data-accent]").forEach((button) => {
    button.addEventListener("click", () => setState({ tweak: { ...state.tweak, accent: ACCENTS[Number(button.dataset.accent)] } }));
  });
  document.querySelectorAll("[data-paper]").forEach((button) => {
    button.addEventListener("click", () => setState({ tweak: { ...state.tweak, paper: button.dataset.paper } }));
  });
  document.querySelector("[data-font-scale]")?.addEventListener("input", (event) => {
    setState({ tweak: { ...state.tweak, fontScale: Number(event.target.value) } });
  });
  document.querySelector("[data-texture]")?.addEventListener("change", (event) => {
    setState({ tweak: { ...state.tweak, texture: event.target.checked } });
  });
}

applyTweaks();
render();
