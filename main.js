const GITHUB_USER = "kauanrubem";

const repoGrid = document.getElementById("repoGrid");
const repoStatus = document.getElementById("repoStatus");
const repoSearch = document.getElementById("repoSearch");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const repoCountEl = document.getElementById("repoCount");
const avatarImg = document.getElementById("avatarImg");
const yearEl = document.getElementById("year");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

const state = {
  repos: [],
  filteredRepos: [],
  visibleCount: 9,
};

function formatDate(iso) {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  } catch {
    return "";
  }
}

function setStatus(message) {
  repoStatus.textContent = message ?? "";
}

function numberCompact(value) {
  try {
    return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  } catch {
    return String(value);
  }
}

function repoMatchesQuery(repo, query) {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const haystack = [
    repo.name,
    repo.full_name,
    repo.description,
    repo.language,
    ...(repo.topics || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function sortRepos(repos) {
  return [...repos].sort((a, b) => {
    const da = new Date(a.pushed_at || a.updated_at || 0).getTime();
    const db = new Date(b.pushed_at || b.updated_at || 0).getTime();
    return db - da;
  });
}

function createRepoCard(repo) {
  const card = document.createElement("article");
  card.className = "repo-card";

  const title = document.createElement("h3");
  title.className = "repo-card__title";

  const link = document.createElement("a");
  link.href = repo.html_url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = repo.name;

  title.append(link);

  const desc = document.createElement("p");
  desc.className = "repo-card__desc";
  desc.textContent = repo.description || "Sem descrição.";

  const meta = document.createElement("div");
  meta.className = "repo-card__meta";

  if (repo.language) {
    const lang = document.createElement("code");
    lang.textContent = repo.language;
    meta.append(lang);
  }

  const stars = document.createElement("span");
  stars.textContent = `★ ${numberCompact(repo.stargazers_count || 0)}`;
  meta.append(stars);

  const forks = document.createElement("span");
  forks.textContent = `⑂ ${numberCompact(repo.forks_count || 0)}`;
  meta.append(forks);

  if (repo.updated_at) {
    const updated = document.createElement("span");
    updated.textContent = `Atualizado em ${formatDate(repo.updated_at)}`;
    meta.append(updated);
  }

  const actions = document.createElement("div");
  actions.className = "repo-card__actions";

  const openBtn = document.createElement("a");
  openBtn.className = "btn btn--secondary";
  openBtn.href = repo.html_url;
  openBtn.target = "_blank";
  openBtn.rel = "noreferrer";
  openBtn.textContent = "Abrir";

  const codeBtn = document.createElement("a");
  codeBtn.className = "btn btn--ghost";
  codeBtn.href = repo.html_url + (repo.default_branch ? `/tree/${repo.default_branch}` : "");
  codeBtn.target = "_blank";
  codeBtn.rel = "noreferrer";
  codeBtn.textContent = "Código";

  actions.append(openBtn, codeBtn);
  card.append(title, desc, meta, actions);
  return card;
}

function renderRepos() {
  const slice = state.filteredRepos.slice(0, state.visibleCount);
  repoGrid.replaceChildren(...slice.map(createRepoCard));

  const total = state.filteredRepos.length;
  const shown = slice.length;

  if (total === 0) {
    loadMoreBtn.hidden = true;
    setStatus("Nenhum repositório encontrado.");
    return;
  }

  if (shown < total) {
    loadMoreBtn.hidden = false;
    setStatus(`Mostrando ${shown} de ${total}.`);
  } else {
    loadMoreBtn.hidden = true;
    setStatus(`Mostrando ${shown} de ${total}.`);
  }
}

function applyFilter() {
  const query = repoSearch.value || "";
  state.filteredRepos = sortRepos(state.repos.filter((repo) => repoMatchesQuery(repo, query)));
  state.visibleCount = 9;
  renderRepos();
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function loadGitHubData() {
  setStatus("Carregando repositórios...");

  try {
    const [profile, repos] = await Promise.all([
      fetchJson(`https://api.github.com/users/${GITHUB_USER}`),
      fetchJson(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`),
    ]);

    if (profile?.avatar_url && avatarImg && avatarImg.dataset.photoSource !== "local") {
      avatarImg.src = profile.avatar_url;
    }

    if (repoCountEl) {
      repoCountEl.textContent = String(profile?.public_repos ?? repos?.length ?? "—");
    }

    const filtered = Array.isArray(repos) ? repos.filter((r) => !r.fork) : [];
    state.repos = sortRepos(filtered);
    state.filteredRepos = state.repos;
    renderRepos();
    setStatus(`Mostrando ${Math.min(state.visibleCount, state.filteredRepos.length)} de ${state.filteredRepos.length}.`);
  } catch {
    setStatus("Não foi possível carregar os repositórios agora. Confira direto no GitHub.");
    loadMoreBtn.hidden = true;
  }
}

function tryUseLocalPhoto() {
  if (!avatarImg) return;
  const localSrc = avatarImg.dataset.localSrc;
  if (!localSrc) return;

  const probe = new Image();
  probe.onload = () => {
    avatarImg.src = localSrc;
    avatarImg.dataset.photoSource = "local";
  };
  probe.onerror = () => {};
  probe.src = localSrc;
}

function getPreferredTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return "dark";
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  if (themeIcon) themeIcon.textContent = theme === "light" ? "☀" : "◐";
}

function initTheme() {
  setTheme(getPreferredTheme());
  themeToggle?.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(current === "light" ? "dark" : "light");
  });
}

function initHandlers() {
  repoSearch?.addEventListener("input", () => {
    window.clearTimeout(initHandlers._t);
    initHandlers._t = window.setTimeout(applyFilter, 120);
  });

  loadMoreBtn?.addEventListener("click", () => {
    state.visibleCount += 9;
    renderRepos();
  });
}

if (yearEl) yearEl.textContent = String(new Date().getFullYear());
initTheme();
initHandlers();
tryUseLocalPhoto();
loadGitHubData();
