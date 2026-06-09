const SAMPLE_TEXT = `黄庭坚《登快阁》

痴儿了却公家事，快阁东西倚晚晴。
落木千山天远大，澄江一道月分明。
朱弦已为佳人绝，青眼聊因美酒横。
万里归船弄长笛，此心吾与白鸥盟。`;

const app = document.querySelector("#app");

const MODES = [
  {
    id: "material",
    label: "找材料",
    hint: "先判断材料值不值得原创，给检索和避雷方向。",
    placeholder: "写下年级、体裁、考点，或粘贴候选材料。例如：高一，现代文，想找一篇适合考象征手法的文本。",
  },
  {
    id: "adapt",
    label: "改已有题",
    hint: "适合从学科网、真题、教辅选题后象征性改编。",
    placeholder: "粘贴已有题目、答案或材料。我会指出保留什么、改哪里、如何降低雷同感。",
  },
  {
    id: "original",
    label: "原创出题",
    hint: "在材料确定后，生成可编辑题目和答案。",
    placeholder: "粘贴材料，并补充要求。例如：出两道选择题、一道主观题，难度高考模拟，附评分标准。",
  },
];

const initialState = {
  mode: "material",
  text: localStorage.getItem("moheng_text") || "",
  result: null,
  draft: [],
  showBank: false,
  toast: "",
};

let state = loadState();

function loadState() {
  const saved = localStorage.getItem("moheng_state_v2");
  if (!saved) return { ...initialState };
  try {
    return { ...initialState, ...JSON.parse(saved), showBank: false, toast: "" };
  } catch {
    return { ...initialState };
  }
}

function persist() {
  localStorage.setItem("moheng_text", state.text);
  localStorage.setItem("moheng_state_v2", JSON.stringify({
    mode: state.mode,
    text: state.text,
    result: state.result,
    draft: state.draft,
  }));
}

function setState(patch) {
  state = { ...state, ...patch };
  persist();
  render();
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
  return text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

function hasText() {
  return state.text.replace(/\s/g, "").length > 0;
}

function inferTopic(text = state.text) {
  const candidates = [
    ["月", "江", "白鸥", "登临抒怀"],
    ["象征", "隐喻", "象征手法"],
    ["小说", "人物", "情节", "现代文小说阅读"],
    ["散文", "抒情", "文化散文阅读"],
    ["文言", "传记", "文言文阅读"],
  ];
  const hit = candidates.find((item) => item.slice(0, -1).some((word) => text.includes(word)));
  return hit ? hit[hit.length - 1] : "材料筛选与命题适配";
}

function inferRisk(text = state.text) {
  const compact = text.replace(/\s/g, "");
  if (compact.length < 80) return "偏高：材料信息不足，容易只能生成套路题。";
  if (/登快阁|赤壁赋|琵琶行|劝学|师说/.test(text)) return "偏高：材料较常见，需要换角度或做比较阅读。";
  if (compact.length > 900) return "中等：材料较长，适合节选后再命题。";
  return "中低：材料长度适中，可以继续排查同题和同材料。";
}

function buildMaterialResult() {
  const topic = inferTopic();
  const risk = inferRisk();
  const lines = getLines();
  return {
    mode: "material",
    title: "先别急着出题，先判断材料值不值得用",
    summary: hasText()
      ? `这份材料可以先按“${topic}”方向排查。${risk}`
      : "先确定年级、体裁、考点和题型，再去学科网、真题库、公众号或教辅里找候选材料。",
    sections: [
      {
        title: "排查顺序",
        items: [
          "先搜材料标题、作者、关键句，判断是否高频出现在试卷里。",
          "再搜“材料关键词 + 阅读题 / 赏析题 / 答案”，看是否已有成熟题。",
          "最后检查可考点是否足够：主题、结构、手法、语言、人物或情境。",
        ],
      },
      {
        title: "适合原创的信号",
        items: [
          "文本有明确层次，但答案不只靠一句话能概括。",
          "能自然形成 2-3 个考点，而不是硬凑题。",
          "材料不是课内高频篇目，也不是网传试题常客。",
        ],
      },
      {
        title: "建议检索词",
        items: [
          `${topic} 阅读题 答案`,
          `${lines[0] || "材料关键词"} 试题`,
          `${topic} 高中语文 原创命题`,
        ],
      },
    ],
    next: "找到候选材料后，粘贴进来，我再判断是否适合改编或原创。",
  };
}

function buildAdaptResult() {
  return {
    mode: "adapt",
    title: "改题比从零出题更符合真实使用场景",
    summary: hasText()
      ? "这类任务建议保留材料和核心考点，重写题干、干扰项和评分表述，避免只换几个词。"
      : "粘贴已有题后，我会给出可改位置、保留位置和降低雷同感的方案。",
    sections: [
      {
        title: "优先保留",
        items: [
          "材料本身和主要考点。",
          "能区分学生水平的核心设问。",
          "答案中真正依赖文本证据的部分。",
        ],
      },
      {
        title: "优先修改",
        items: [
          "题干问法改成新的能力指向，比如从“赏析作用”改为“解释表达逻辑”。",
          "选择题干扰项不要只改词，要改变误读角度。",
          "主观题答案改成分层表述，减少和原题答案结构一致。",
        ],
      },
      {
        title: "风险提醒",
        items: [
          "只替换人名、句子顺序、个别关键词，雷同感仍然很强。",
          "如果材料和题干都来自同一现成题，建议至少重做 50% 以上设问。",
        ],
      },
    ],
    next: "如果要定稿，可以点“生成草稿”，我会给一版可编辑题目。",
  };
}

function buildOriginalResult() {
  const topic = inferTopic();
  const risk = inferRisk();
  return {
    mode: "original",
    title: "可以原创，但先控制范围",
    summary: hasText()
      ? `材料方向：${topic}。撞题风险：${risk}`
      : "原创出题需要先有材料。没有材料时，建议先切到“找材料”。",
    sections: [
      {
        title: "建议题组",
        items: [
          "1 道选择题：检查文本理解和常见误读。",
          "1 道主观题：围绕手法、结构或情感变化。",
          "1 份评分标准：分点给分，方便教师改卷。",
        ],
      },
      {
        title: "定稿前检查",
        items: [
          "题干是否必须回到文本才能回答。",
          "答案是否能分点给分，而不是只凭感觉。",
          "是否和常见题过于相似。",
        ],
      },
    ],
    next: "右侧草稿已生成，可以直接改题干、答案和评分标准。",
  };
}

function buildDraft() {
  const lines = getLines();
  const firstLine = lines.find((line) => /[，。！？；]/.test(line)) || "材料中的关键语句";
  const topic = inferTopic();
  if (state.mode === "material") return [];
  if (state.mode === "adapt") {
    return [
      {
        type: "改编方向",
        title: "把原题从“直接赏析”改为“解释表达逻辑”",
        answer: "保留材料和核心考点，重写设问角度，要求学生结合文本层次作答。",
        rubric: ["指出原题核心考点", "说明新题角度", "避免答案结构照搬"],
      },
    ];
  }
  return [
    {
      type: "选择题",
      title: `下列对“${firstLine.replace(/[。！？]$/, "")}”相关内容的理解，不正确的一项是`,
      options: [
        "A. 该句可以作为理解文本情感或结构转折的入口。",
        "B. 相关意象或叙述细节需要结合上下文判断。",
        "C. 该句只起装饰作用，与文本主旨没有关联。",
        `D. 该句可与“${topic}”方向形成命题联系。`,
      ],
      answer: "C",
      rubric: ["能识别明显误读", "能结合上下文说明理由", "表述清楚"],
    },
    {
      type: "主观题",
      title: `请结合材料，分析文本如何体现“${topic}”这一命题方向。`,
      answer: "应先概括文本内容，再结合关键语句说明表现方式，最后落到主题或表达效果。",
      rubric: ["内容概括 2 分", "文本依据 2 分", "表达效果 2 分"],
    },
  ];
}

function runAssistant() {
  const result = state.mode === "material"
    ? buildMaterialResult()
    : state.mode === "adapt"
      ? buildAdaptResult()
      : buildOriginalResult();
  const draft = buildDraft();
  setState({ result, draft });
  toast(state.mode === "material" ? "已生成材料排查建议。" : "已生成可编辑草稿。");
}

function getMode() {
  return MODES.find((mode) => mode.id === state.mode) || MODES[0];
}

function saveToBank() {
  const bank = getBank();
  const entry = {
    id: `bank-${Date.now()}`,
    mode: state.mode,
    title: state.result?.title || inferTopic(),
    createdAt: new Date().toLocaleString("zh-CN"),
    text: state.text.slice(0, 180),
    result: state.result,
    draft: state.draft,
  };
  localStorage.setItem("moheng_bank_v2", JSON.stringify([entry, ...bank]));
  setState({ showBank: true });
  toast("已保存到本地题库。");
}

function getBank() {
  try {
    return JSON.parse(localStorage.getItem("moheng_bank_v2") || "[]");
  } catch {
    return [];
  }
}

function loadBankItem(id) {
  const item = getBank().find((entry) => entry.id === id);
  if (!item) return;
  setState({
    mode: item.mode || "material",
    text: item.text || "",
    result: item.result || null,
    draft: item.draft || [],
    showBank: false,
  });
}

function updateDraft(index, field, value) {
  state.draft = state.draft.map((item, itemIndex) => {
    if (itemIndex !== index) return item;
    if (field === "options") return { ...item, options: value.split(/\n+/).filter(Boolean) };
    if (field === "rubric") return { ...item, rubric: value.split(/\n+/).filter(Boolean) };
    return { ...item, [field]: value };
  });
  persist();
}

function renderExportText() {
  const parts = [
    "墨衡工作记录",
    `模式：${getMode().label}`,
    "",
    "【输入】",
    state.text || "未填写",
    "",
  ];
  if (state.result) {
    parts.push("【建议】", state.result.title, state.result.summary, "");
    state.result.sections.forEach((section) => {
      parts.push(`【${section.title}】`, ...section.items.map((item) => `- ${item}`), "");
    });
  }
  if (state.draft.length) {
    parts.push("【草稿】");
    state.draft.forEach((item, index) => {
      parts.push(`${index + 1}. ${item.type}：${item.title}`);
      if (item.options) parts.push(...item.options);
      parts.push(`答案：${item.answer || ""}`);
      parts.push(`评分：${(item.rubric || []).join("；")}`);
      parts.push("");
    });
  }
  return parts.join("\n");
}

function exportText() {
  const blob = new Blob([renderExportText()], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "墨衡工作记录.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function readFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => setState({ text: String(reader.result || "") });
  reader.readAsText(file, "utf-8");
}

function toast(message) {
  state.toast = message;
  render();
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    state.toast = "";
    render();
  }, 2200);
}

function render() {
  const mode = getMode();
  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div>
          <strong>墨衡</strong>
          <span>找材料 · 改题 · 原创出题</span>
        </div>
        <nav>
          <button data-bank>题库</button>
          <button data-export ${!state.result && !state.draft.length ? "disabled" : ""}>导出</button>
          <span class="avatar">瑜</span>
        </nav>
      </header>

      <main class="page">
        <section class="work">
          <div class="hero">
            <p>高中语文命题工作流</p>
            <h1>你想找材料、改题，还是从零出题？</h1>
          </div>

          <div class="mode-tabs" role="tablist" aria-label="任务模式">
            ${MODES.map((item) => `
              <button class="${item.id === state.mode ? "active" : ""}" data-mode="${item.id}">
                <strong>${item.label}</strong>
                <span>${item.hint}</span>
              </button>
            `).join("")}
          </div>

          <section class="chat">
            <article class="message assistant">
              <div class="bubble">
                <p>${mode.hint}</p>
                <p class="muted">少填表，直接说需求。电脑上可编辑草稿；手机上优先阅读和复制。</p>
              </div>
            </article>

            <article class="composer-card">
              <textarea data-text placeholder="${escapeHtml(mode.placeholder)}">${escapeHtml(state.text)}</textarea>
              <div class="composer-actions">
                <div>
                  <button data-sample>示例</button>
                  <label for="fileInput">导入</label>
                  <input id="fileInput" type="file" accept=".txt,.md,.csv" hidden />
                </div>
                <button class="primary" data-run>${state.mode === "material" ? "开始排查" : "生成草稿"}</button>
              </div>
            </article>

            ${state.result ? renderResult() : renderEmptyResult()}
          </section>
        </section>

        <aside class="draft">
          ${renderDraft()}
        </aside>
      </main>

      ${renderBank()}
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ""}
    </div>
  `;
  bindEvents();
}

function renderEmptyResult() {
  return `
    <article class="message assistant subtle">
      <div class="bubble">
        <p>建议先用“找材料”模式。很多时候不是缺题，而是缺一份适合改、适合原创、撞题风险低的材料。</p>
      </div>
    </article>
  `;
}

function renderResult() {
  return `
    <article class="message assistant">
      <div class="bubble result">
        <h2>${escapeHtml(state.result.title)}</h2>
        <p>${escapeHtml(state.result.summary)}</p>
        ${state.result.sections.map((section) => `
          <section>
            <h3>${escapeHtml(section.title)}</h3>
            <ul>
              ${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </section>
        `).join("")}
        <p class="next">${escapeHtml(state.result.next)}</p>
      </div>
    </article>
  `;
}

function renderDraft() {
  if (!state.draft.length) {
    return `
      <div class="draft-empty">
        <span>草稿</span>
        <p>“找材料”阶段先不急着生成题。切到“改已有题”或“原创出题”后，这里会出现可编辑草稿。</p>
      </div>
    `;
  }
  return `
    <div class="draft-head">
      <span>草稿</span>
      <button data-save>入库</button>
    </div>
    <div class="draft-list">
      ${state.draft.map((item, index) => `
        <article class="draft-item">
          <small>${escapeHtml(item.type)}</small>
          <textarea data-draft="${index}" data-field="title">${escapeHtml(item.title)}</textarea>
          ${item.options ? `<textarea data-draft="${index}" data-field="options">${escapeHtml(item.options.join("\n"))}</textarea>` : ""}
          <label>答案</label>
          <textarea data-draft="${index}" data-field="answer">${escapeHtml(item.answer || "")}</textarea>
          <label>评分</label>
          <textarea data-draft="${index}" data-field="rubric">${escapeHtml((item.rubric || []).join("\n"))}</textarea>
        </article>
      `).join("")}
    </div>
  `;
}

function renderBank() {
  const bank = getBank();
  return `
    <aside class="bank ${state.showBank ? "open" : ""}">
      <div class="bank-head">
        <strong>本地题库</strong>
        <button data-close-bank>关闭</button>
      </div>
      ${bank.length ? bank.map((item) => `
        <article>
          <small>${item.createdAt} · ${MODES.find((mode) => mode.id === item.mode)?.label || "记录"}</small>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.text || "无输入摘要")}</p>
          <button data-load-bank="${item.id}">载入</button>
        </article>
      `).join("") : `<p class="muted">还没有保存记录。</p>`}
    </aside>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => setState({ mode: button.dataset.mode, result: null, draft: [] }));
  });
  document.querySelector("[data-text]")?.addEventListener("input", (event) => {
    state.text = event.target.value;
    persist();
  });
  document.querySelector("[data-run]")?.addEventListener("click", runAssistant);
  document.querySelector("[data-sample]")?.addEventListener("click", () => setState({ text: SAMPLE_TEXT, result: null, draft: [] }));
  document.querySelector("#fileInput")?.addEventListener("change", (event) => readFile(event.target.files[0]));
  document.querySelector("[data-export]")?.addEventListener("click", exportText);
  document.querySelector("[data-bank]")?.addEventListener("click", () => setState({ showBank: true }));
  document.querySelector("[data-close-bank]")?.addEventListener("click", () => setState({ showBank: false }));
  document.querySelector("[data-save]")?.addEventListener("click", saveToBank);
  document.querySelectorAll("[data-load-bank]").forEach((button) => {
    button.addEventListener("click", () => loadBankItem(button.dataset.loadBank));
  });
  document.querySelectorAll("[data-draft]").forEach((field) => {
    field.addEventListener("input", (event) => updateDraft(Number(field.dataset.draft), field.dataset.field, event.target.value));
  });
}

render();
