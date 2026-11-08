import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Code2,
  ArrowUpRight,
  ArrowLeft,
  Plus,
  Search,
  Sparkles,
  Users,
  LayoutGrid,
  FileCode2,
  LogOut,
  ArrowRight,
  Check,
  Terminal,
  Leaf,
  X,
  LoaderCircle,
  Trash2,
  Pencil,
  UserRound,
  Copy,
  ChevronRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import "./style.css";
const LANGUAGES = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C",
  "C++",
  "SQL",
  "HTML/CSS",
  "기타",
];
async function api(path, options = {}) {
  const res = await fetch("/api" + path, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "요청에 실패했어요.");
  return data;
}
const date = (s) =>
  new Date(s).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
function App() {
  const [user, setUser] = useState(null),
    [view, setView] = useState("feed"),
    [auth, setAuth] = useState(null),
    [posts, setPosts] = useState([]),
    [members, setMembers] = useState([]),
    [selected, setSelected] = useState(null),
    [edit, setEdit] = useState(null),
    [lang, setLang] = useState("전체"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [reviewBusy, setReviewBusy] = useState(false),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    api("/auth/me")
      .then((d) => setUser(d.user))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!["feed", "mine", "members"].includes(view)) return;
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        q: query,
        language: lang === "전체" ? "" : lang,
        mine: String(view === "mine"),
        reviewed: String(filter === "reviewed"),
      });
      api(view === "members" ? "/community" : "/posts?" + params)
        .then((d) => {
          if (active) {
            if (view === "members") setMembers(d.members);
            else setPosts(d.posts);
          }
        })
        .catch((e) => active && setError(e.message))
        .finally(() => active && setLoading(false));
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [view, lang, query, filter, refresh]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const navigate = (v) => {
    if ((v === "mine" || v === "profile") && !user) {
      setAuth("login");
      return;
    }
    setView(v);
    setError("");
    setSelected(null);
    setEdit(null);
  };
  const newPost = () => {
    if (!user) {
      setAuth("login");
      return;
    }
    setEdit(null);
    setView("editor");
    setError("");
  };
  const open = async (id) => {
    setError("");
    try {
      const d = await api("/posts/" + id);
      setSelected(d.post);
      setView("detail");
    } catch (e) {
      setError(e.message);
    }
  };
  const refreshAll = () => setRefresh((n) => n + 1);
  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      navigate("feed");
      refreshAll();
      setToast("로그아웃했어요.");
    } catch (e) {
      setToast(e.message);
    }
  };
  const remove = async () => {
    if (!confirm("이 코드 질문과 AI 리뷰를 삭제할까요?")) return;
    setBusy(true);
    try {
      await api("/posts/" + selected.id, { method: "DELETE" });
      navigate("feed");
      refreshAll();
      setToast("게시글을 삭제했어요.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const review = async () => {
    setReviewBusy(true);
    setError("");
    try {
      const d = await api(`/posts/${selected.id}/review`, { method: "POST" });
      setSelected(d.post);
      setToast("AI 리뷰가 도착했어요.");
    } catch (e) {
      setError(e.message);
    } finally {
      setReviewBusy(false);
    }
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("feed")}>
          <span className="brand-icon">
            <Code2 size={24} />
          </span>
          codegarden<span className="brand-dot">.</span>
        </button>
        <div className="workspace-label">YOUR CODING SPACE</div>
        <nav>
          {[
            [LayoutGrid, "feed", "전체 코드"],
            [FileCode2, "mine", "내 코드"],
            [Users, "members", "개발자들"],
          ].map(([Icon, key, label]) => (
            <button
              key={key}
              className={view === key ? "nav-item active" : "nav-item"}
              onClick={() => navigate(key)}
            >
              <Icon size={19} />
              {label}
              {key === "feed" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-icon">
            <Leaf size={21} />
          </span>
          <strong>좋은 코드는 함께 자라요.</strong>
          <p>
            작은 질문 하나가
            <br />
            다음 성장의 시작이니까.
          </p>
          <button onClick={newPost}>
            첫 코드 나누기 <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="sidebar-bottom">
          {user ? (
            <>
              <button className="user-chip" onClick={() => navigate("profile")}>
                <span className="avatar">{user.nickname[0]}</span>
                <span>
                  <strong>{user.nickname}</strong>
                  <small>마이페이지</small>
                </span>
                <ChevronRight size={17} />
              </button>
              <button className="logout" onClick={logout}>
                <LogOut size={15} /> 로그아웃
              </button>
            </>
          ) : (
            <button
              className="btn primary full"
              onClick={() => setAuth("login")}
            >
              로그인 <ArrowRight size={16} />
            </button>
          )}
          <div className="sidebar-caption">A LITTLE BETTER, EVERY COMMIT.</div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            워크스페이스 <ChevronRight size={14} />
            <strong>
              {
                {
                  feed: "전체 코드",
                  mine: "내 코드",
                  members: "개발자들",
                  profile: "마이페이지",
                  editor: edit ? "코드 수정" : "새 코드",
                  detail: "코드 리뷰",
                }[view]
              }
            </strong>
          </div>
          <div className="top-actions">
            <span className="live-tag">
              <span /> 함께 배우는 개발 커뮤니티
            </span>
            {user ? (
              <>
                <button
                  className="top-avatar"
                  aria-label="마이페이지"
                  onClick={() => navigate("profile")}
                >
                  {user.nickname[0]}
                </button>
                <button
                  className="mobile-logout"
                  aria-label="로그아웃"
                  onClick={logout}
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <button className="text-btn" onClick={() => setAuth("register")}>
                가입하기 <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        </header>
        <div className="content">
          {error && (
            <div className="alert" role="alert">
              {error}
              <button aria-label="알림 닫기" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {["feed", "mine"].includes(view) && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="eyebrow">
                    <span /> CODE. SHARE. GROW.
                  </div>
                  <h1>
                    {view === "mine" ? (
                      <>
                        차곡차곡 쌓이는
                        <br />
                        <em>나의 성장 기록.</em>
                      </>
                    ) : (
                      <>
                        혼자 고민한 코드,
                        <br />
                        <em>함께 더 나은 코드로.</em>
                      </>
                    )}
                  </h1>
                  <p>
                    코드를 나누고, 새로운 시선을 만나보세요.
                    <br />
                    AI 리뷰와 함께 한 단계 더 성장하는 공간.
                  </p>
                  <button className="btn primary" onClick={newPost}>
                    <Plus size={17} /> 코드 공유하기 <ArrowUpRight size={17} />
                  </button>
                </div>
                <div className="hero-code">
                  <div className="editor-top">
                    <div className="dots">
                      <i />
                      <i />
                      <i />
                    </div>
                    <span>a-little-better.js</span>
                    <Code2 size={15} />
                  </div>
                  <div className="hero-code-body">
                    <p>
                      <b>01</b>
                      <span className="purple">const</span> developer = {"{"}
                    </p>
                    <p>
                      <b>02</b>　 curiosity:{" "}
                      <span className="yellow">Infinity</span>,
                    </p>
                    <p>
                      <b>03</b>　 learning: <span className="green">true</span>,
                    </p>
                    <p>
                      <b>04</b>　 alone: <span className="orange">false</span>
                    </p>
                    <p>
                      <b>05</b>
                      {"};"}
                    </p>
                    <p>
                      <b>06</b>
                    </p>
                    <p>
                      <b>07</b>
                      <span className="muted-code">
                        // 더 나은 코드는, 함께.
                      </span>
                    </p>
                  </div>
                  <div className="review-float">
                    <span>
                      <Sparkles size={18} />
                    </span>
                    <div>
                      <strong>새로운 관점이 필요할 때</strong>
                      <small>AI 코드 리뷰와 함께하세요</small>
                    </div>
                    <span className="float-check">
                      <Check size={15} />
                    </span>
                  </div>
                </div>
                <div className="hero-watermark">{"{ }"}</div>
              </section>
              <div className="feed-heading">
                <div>
                  <span className="section-overline">THE COMMUNITY</span>
                  <h2>
                    {view === "mine"
                      ? "내가 공유한 코드"
                      : "오늘도, 한 줄 더 성장하기"}{" "}
                    <span>{posts.length}</span>
                  </h2>
                </div>
                <button
                  className="text-btn"
                  onClick={() => {
                    setQuery("");
                    setLang("전체");
                    setFilter("all");
                    refreshAll();
                  }}
                >
                  새로고침 ↗
                </button>
              </div>
              <div className="toolbar">
                <div className="tabs">
                  <button
                    className={filter === "all" ? "selected" : ""}
                    onClick={() => setFilter("all")}
                  >
                    전체 코드
                  </button>
                  <button
                    className={filter === "reviewed" ? "selected" : ""}
                    onClick={() => setFilter("reviewed")}
                  >
                    <Sparkles size={14} /> AI 리뷰 완료
                  </button>
                </div>
                <label className="search">
                  <Search size={17} />
                  <input
                    aria-label="코드 검색"
                    placeholder="제목, 질문, 작성자 검색"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              <div className="language-filters">
                {["전체", ...LANGUAGES].map((l) => (
                  <button
                    className={lang === l ? "selected" : ""}
                    key={l}
                    onClick={() => setLang(l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {loading ? (
                <div className="empty">
                  <LoaderCircle className="spin" />
                  코드를 불러오고 있어요.
                </div>
              ) : posts.length ? (
                <div className="post-grid">
                  {posts.map((p) => (
                    <button
                      className="post-card"
                      key={p.id}
                      onClick={() => open(p.id)}
                    >
                      <div className="card-top">
                        <span
                          className={
                            "lang lang-" + p.language.replace(/[^a-z]/gi, "")
                          }
                        >
                          {p.language}
                        </span>
                        {p.ai_review ? (
                          <span className="reviewed">
                            <Sparkles size={12} /> 리뷰 완료
                          </span>
                        ) : (
                          <span className="waiting">리뷰 대기</span>
                        )}
                      </div>
                      <h3>{p.title}</h3>
                      <p className="card-question">{p.question}</p>
                      <pre className="code-preview">
                        {p.code
                          .split("\n")
                          .slice(0, 4)
                          .map((line, i) => (
                            <span key={i}>
                              <b>{i + 1}</b>
                              {line || " "}
                              {"\n"}
                            </span>
                          ))}
                      </pre>
                      <div className="card-bottom">
                        <span className="author">
                          <span className="avatar small">{p.author[0]}</span>
                          {p.author}
                        </span>
                        <span>
                          {date(p.created_at)} <ArrowUpRight size={15} />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <FileCode2 size={32} />
                  <h3>
                    {query || lang !== "전체"
                      ? "조건에 맞는 코드가 없어요."
                      : "첫 번째 코드를 기다리고 있어요."}
                  </h3>
                  <p>작은 질문도 괜찮아요. 함께 생각해봐요.</p>
                  <button className="btn primary" onClick={newPost}>
                    코드 공유하기
                  </button>
                </div>
              )}
              <div className="bottom-note">
                <span>
                  <Leaf size={15} /> 완벽한 코드보다, 함께 성장하는 과정.
                </span>
                <span>MADE FOR CURIOUS MINDS</span>
              </div>
            </>
          )}
          {view === "members" && (
            <>
              <div className="page-heading">
                <span className="section-overline">PEOPLE BEHIND THE CODE</span>
                <h1>함께 자라는 개발자들</h1>
                <p>서로 다른 코드, 같은 성장의 방향.</p>
              </div>
              {loading ? (
                <div className="empty">불러오는 중…</div>
              ) : members.length ? (
                <div className="member-grid">
                  {members.map((m) => (
                    <article className="member-card" key={m.id}>
                      <span className="avatar large">{m.nickname[0]}</span>
                      <h3>{m.nickname}</h3>
                      <p>{m.bio || "코드로 생각을 나누는 개발자입니다."}</p>
                      <div>
                        <span>
                          공유한 코드 <strong>{m.post_count}</strong>
                        </span>
                        <span>
                          AI 리뷰 <strong>{m.review_count || 0}</strong>
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  첫 번째 개발자가 되어주세요.
                  <button
                    className="btn primary"
                    onClick={() => setAuth("register")}
                  >
                    회원가입
                  </button>
                </div>
              )}
            </>
          )}
          {view === "editor" && (
            <Editor
              initial={edit}
              onCancel={() =>
                edit ? (setSelected(edit), setView("detail")) : navigate("feed")
              }
              onSave={async (data) => {
                const d = await api(edit ? "/posts/" + edit.id : "/posts", {
                  method: edit ? "PATCH" : "POST",
                  body: data,
                });
                setSelected(d.post);
                setView("detail");
                refreshAll();
                setToast(
                  edit
                    ? "수정했어요. 최신 코드로 AI 리뷰를 다시 받을 수 있어요."
                    : "코드가 공유되었어요.",
                );
              }}
            />
          )}
          {view === "detail" && selected && (
            <>
              <button className="back" onClick={() => navigate("feed")}>
                <ArrowLeft size={16} /> 전체 코드로 돌아가기
              </button>
              <div className="detail-heading">
                <div className="card-top">
                  <span className="lang">{selected.language}</span>
                  <span className="subtle">{date(selected.created_at)}</span>
                </div>
                <h1>{selected.title}</h1>
                <div className="detail-byline">
                  <span className="author">
                    <span className="avatar small">{selected.author[0]}</span>
                    {selected.author}
                  </span>
                  {user?.id === selected.user_id && (
                    <div>
                      <button
                        className="text-btn"
                        disabled={reviewBusy}
                        onClick={() => {
                          setEdit(selected);
                          setView("editor");
                        }}
                      >
                        <Pencil size={14} />
                        수정
                      </button>
                      <button
                        className="text-btn danger-text"
                        disabled={busy || reviewBusy}
                        onClick={remove}
                      >
                        <Trash2 size={14} />
                        삭제
                      </button>
                    </div>
                  )}
                </div>
                <p className="question-full">{selected.question}</p>
              </div>
              <div className="detail-columns">
                <section className="code-panel">
                  <div className="editor-top">
                    <span>
                      <Terminal size={15} /> 공유한 코드
                    </span>
                    <button
                      title="코드 복사"
                      aria-label="코드 복사"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(selected.code)
                          .then(() => setToast("코드를 복사했어요."))
                          .catch(() =>
                            setToast("브라우저에서 복사를 허용해주세요."),
                          )
                      }
                    >
                      <Copy size={15} />
                    </button>
                  </div>
                  <pre>
                    {selected.code.split("\n").map((line, i) => (
                      <span className="code-line" key={i}>
                        <b>{i + 1}</b>
                        <code>{line || " "}</code>
                      </span>
                    ))}
                  </pre>
                </section>
                <section className="ai-panel">
                  <div className="ai-header">
                    <span>
                      <Sparkles size={19} /> AI 코드 리뷰
                    </span>
                    <span className="mini-label">OPENAI</span>
                  </div>
                  {selected.ai_review ? (
                    <div className="markdown">
                      <ReactMarkdown>{selected.ai_review}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="review-empty">
                      <span className="sparkle-orb">
                        <Sparkles size={28} />
                      </span>
                      <h3>다른 관점에서 바라보기</h3>
                      <p>
                        오류의 원인부터 더 나은 구현까지.
                        <br />
                        AI와 함께 코드를 살펴보세요.
                      </p>
                    </div>
                  )}
                  {user?.id === selected.user_id ? (
                    <>
                      <button
                        className="btn primary full"
                        disabled={reviewBusy}
                        onClick={review}
                      >
                        {reviewBusy ? (
                          <LoaderCircle size={17} className="spin" />
                        ) : (
                          <Sparkles size={17} />
                        )}{" "}
                        {reviewBusy
                          ? "AI가 코드를 읽고 있어요…"
                          : selected.ai_review
                            ? "다시 리뷰받기"
                            : "AI 리뷰 요청하기"}
                      </button>
                      <small className="disclosure">
                        요청 시 코드와 질문이 OpenAI로 전송됩니다.
                        <br />
                        비밀 키·개인정보는 코드에 넣지 마세요. AI 분석은 틀릴 수
                        있어요.
                      </small>
                    </>
                  ) : (
                    <p className="disclosure">
                      작성자가 AI 리뷰를 요청할 수 있어요.
                    </p>
                  )}
                </section>
              </div>
            </>
          )}
          {view === "profile" && user && (
            <Profile
              user={user}
              onSave={(u) => {
                setUser(u);
                setToast("프로필을 수정했어요.");
                refreshAll();
              }}
              onDelete={() => {
                setUser(null);
                navigate("feed");
                refreshAll();
                setToast("회원 탈퇴가 완료되었어요.");
              }}
            />
          )}
        </div>
      </main>
      {auth && (
        <Auth
          mode={auth}
          setMode={setAuth}
          onClose={() => setAuth(null)}
          onSuccess={(u) => {
            setUser(u);
            setAuth(null);
            refreshAll();
            setToast(`${u.nickname}님, 반가워요!`);
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Auth({ mode, setMode, onClose, onSuccess }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      onSuccess(
        (await api("/auth/" + mode, { method: "POST", body: data })).user,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const fn = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button className="close" aria-label="닫기" onClick={onClose}>
          <X />
        </button>
        <span className="brand-icon">
          <Code2 size={27} />
        </span>
        <h2 id="auth-title">
          {mode === "register"
            ? "함께 성장할 준비됐나요?"
            : "다시 만나서 반가워요."}
        </h2>
        <p>당신의 다음 한 줄을, 코드가든에서.</p>
        <form onSubmit={submit}>
          {mode === "register" && (
            <label>
              닉네임
              <input
                autoFocus
                name="nickname"
                minLength={2}
                maxLength={30}
                placeholder="어떻게 불러드릴까요?"
                required
              />
            </label>
          )}
          <label>
            이메일
            <input
              autoFocus={mode === "login"}
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              name="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              minLength={8}
              maxLength={72}
              placeholder="8자 이상 입력해주세요"
              required
            />
          </label>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button className="btn primary full" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : mode === "register" ? (
              "가입하고 시작하기"
            ) : (
              "로그인"
            )}
            <ArrowRight size={17} />
          </button>
        </form>
        <div className="switch-auth">
          {mode === "login" ? "아직 계정이 없나요?" : "이미 계정이 있나요?"}
          <button
            onClick={() => {
              setError("");
              setMode(mode === "login" ? "register" : "login");
            }}
          >
            {mode === "login" ? "회원가입" : "로그인"}
          </button>
        </div>
      </section>
    </div>
  );
}
function Editor({ initial, onCancel, onSave }) {
  const [data, setData] = useState(
      initial || { title: "", language: "JavaScript", code: "", question: "" },
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const change = (e) => setData({ ...data, [e.target.name]: e.target.value });
  return (
    <>
      <button className="back" onClick={onCancel}>
        <ArrowLeft size={16} /> 돌아가기
      </button>
      <div className="page-heading">
        <span className="section-overline">A NEW PERSPECTIVE STARTS HERE</span>
        <h1>
          {initial ? "코드를 다듬어볼까요?" : "어떤 코드를 고민하고 있나요?"}
        </h1>
        <p>완성되지 않은 코드도 좋아요. 고민하는 부분을 함께 알려주세요.</p>
      </div>
      <form
        className="editor-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onSave(data);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-row">
          <label>
            제목
            <input
              name="title"
              value={data.title}
              onChange={change}
              minLength={3}
              maxLength={100}
              placeholder="코드에 대한 고민을 한 문장으로"
              required
            />
          </label>
          <label>
            언어
            <select name="language" value={data.language} onChange={change}>
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          코드{" "}
          <span className="label-hint">
            {data.code.length.toLocaleString()} / 20,000
          </span>
          <textarea
            className="code-input"
            name="code"
            value={data.code}
            onChange={change}
            spellCheck={false}
            maxLength={20000}
            required
            placeholder={
              '// 이곳에 코드를 붙여넣어 주세요.\nfunction hello() {\n  return "Hello, Codegarden!";\n}'
            }
          />
        </label>
        <label>
          어떤 도움이 필요한가요?
          <textarea
            name="question"
            value={data.question}
            onChange={change}
            minLength={5}
            maxLength={2000}
            required
            placeholder="기대했던 동작, 실제 결과, 궁금한 점을 알려주세요."
            rows={4}
          />
        </label>
        <div className="editor-disclosure">
          <Users size={17} /> 등록한 코드와 질문, AI 리뷰는 커뮤니티에
          공개됩니다.
        </div>
        {initial && (
          <p className="subtle">수정하면 이전 AI 리뷰가 초기화됩니다.</p>
        )}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="form-footer">
          <button type="button" className="btn secondary" onClick={onCancel}>
            취소
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <ArrowUpRight size={17} />
            )}{" "}
            {initial ? "수정 저장" : "코드 공유하기"}
          </button>
        </div>
      </form>
    </>
  );
}
function Profile({ user, onSave, onDelete }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState(false);
  return (
    <>
      <div className="page-heading">
        <span className="section-overline">YOUR GROWTH, YOUR SPACE</span>
        <h1>마이페이지</h1>
        <p>커뮤니티에 보여줄 나를 소개해주세요.</p>
      </div>
      <div className="profile-layout">
        <form
          className="profile-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const body = Object.fromEntries(new FormData(e.currentTarget));
            try {
              onSave((await api("/users/me", { method: "PATCH", body })).user);
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="profile-intro">
            <span className="avatar large">{user.nickname[0]}</span>
            <div>
              <h3>{user.nickname}</h3>
              <p>{user.email}</p>
            </div>
          </div>
          <label>
            닉네임
            <input
              name="nickname"
              defaultValue={user.nickname}
              minLength={2}
              maxLength={30}
              required
            />
          </label>
          <label>
            한 줄 소개
            <textarea
              name="bio"
              defaultValue={user.bio}
              maxLength={240}
              rows={4}
              placeholder="요즘 어떤 기술에 관심이 있나요?"
            />
          </label>
          <button className="btn primary" disabled={busy}>
            프로필 저장 <Check size={16} />
          </button>
        </form>
        <section className="account-card">
          <UserRound size={22} />
          <h3>내 계정 관리</h3>
          <p>
            탈퇴하면 작성한 코드와 AI 리뷰가 함께 삭제되며 복구할 수 없습니다.
          </p>
          <button
            className="text-btn danger-text"
            onClick={() => setDeleting(!deleting)}
          >
            회원 탈퇴
          </button>
          {deleting && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!confirm("계정과 모든 게시글을 영구 삭제할까요?")) return;
                const password = new FormData(e.currentTarget).get("password");
                setBusy(true);
                try {
                  await api("/users/me", {
                    method: "DELETE",
                    body: { password },
                  });
                  onDelete();
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                비밀번호 확인
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                />
              </label>
              <button className="btn danger" disabled={busy}>
                계정 영구 삭제
              </button>
            </form>
          )}
        </section>
      </div>
      {error && (
        <div role="alert" className="form-error">
          {error}
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
