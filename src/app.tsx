import { useEffect } from "preact/hooks";
import {
  Plus,
  ArrowUpRight,
  MoreHorizontal,
  ShieldCheck,
  Check,
} from "lucide-preact";
import { paths } from "./data";
import { useStore } from "./store";
import { Avatar } from "./components/Avatar";
import { Brand } from "./components/Brand";
import { navigate, navItems } from "./navigation";
import { Square } from "./pages/Square";
import { Match } from "./pages/Match";
import { Messages } from "./pages/Messages";
import { Profile } from "./pages/Profile";
import { Modals } from "./components/Modals";

export function App() {
  const s = useStore();
  useEffect(() => {
    const listener = () => {
      const path = window.location.pathname;
      s.page.value =
        path === "/match"
          ? "match"
          : path === "/messages"
            ? "messages"
            : path === "/me"
              ? "me"
              : "square";
    };
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);
  useEffect(() => {
    const sync = () => {
      void s.refresh();
    };
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("weiyu-account")
        : null;
    if (channel) channel.onmessage = sync;
    window.addEventListener("focus", sync);
    return () => {
      channel?.close();
      window.removeEventListener("focus", sync);
    };
  }, []);
  useEffect(() => {
    const names = {
      square: "心动广场",
      match: "遇见同频",
      messages: "私语信箱",
      me: "我的小宇宙",
    };
    document.title = names[s.page.value] + " · 未遇 WEIYU";
  }, [s.page.value]);
  return (
    <div class="app-shell">
      <aside class="sidebar">
        <Brand />
        <div class="side-kicker">从一句你好开始</div>
        <nav aria-label="主导航">
          {navItems.map((n) => (
            <a
              href={paths[n.id]}
              class={`nav-item ${s.page.value === n.id ? "active" : ""}`}
              aria-current={s.page.value === n.id ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                navigate(n.id);
              }}
            >
              <n.icon size={21} />
              <span>{n.label}</span>
              {n.id === "messages" && s.state.value.matched && (
                <span class="nav-dot" />
              )}
            </a>
          ))}
        </nav>
        <button
          class="publish-button"
          onClick={() => (s.modal.value = "compose")}
        >
          <Plus size={19} />
          记录此刻
        </button>
        <div class="side-bottom">
          <div class="small-quote">
            <span>“</span>总有一个人，
            <br />
            懂你的欲言又止。<div class="quote-star">✧</div>
          </div>
          <div
            class="sidebar-user"
            onClick={() => navigate("me")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("me")}
          >
            <Avatar kind="star" small />
            <div>
              <strong>{s.state.value.profile.name}</strong>
              <span>今天也值得被喜欢</span>
            </div>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>
      <div class="main-shell">
        <header class="topbar">
          <div class="mobile-brand">
            <Brand />
          </div>
          <div class="topbar-note">
            <span class="live-dot" />
            把频率调到心动这一格
          </div>
          <div class="top-actions">
            <span class="demo-pill">DEMO · 18+</span>
            {!s.state.value.account && (
              <button
                class="header-login"
                onClick={() => (s.modal.value = "auth-login")}
              >
                登录 / 注册
              </button>
            )}
            <button
              class="icon-button"
              aria-label="体验说明"
              onClick={() => (s.modal.value = "about")}
            >
              <ShieldCheck size={18} />
            </button>
            <button
              class="mini-profile"
              aria-label="我的小宇宙"
              onClick={() => navigate("me")}
            >
              <Avatar kind="star" small />
            </button>
          </div>
        </header>
        <main>
          {s.page.value === "square" ? (
            <Square />
          ) : s.page.value === "match" ? (
            <Match />
          ) : s.page.value === "messages" ? (
            <Messages />
          ) : (
            <Profile />
          )}
        </main>
        <footer class="site-footer">
          <span>未遇 WEIYU · 先对话，再心动。</span>
          <button onClick={() => (s.modal.value = "about")}>
            关于这个小宇宙 <ArrowUpRight size={12} />
          </button>
        </footer>
      </div>
      <nav class="mobile-nav" aria-label="手机导航">
        {navItems.map((n) => (
          <a
            href={paths[n.id]}
            class={s.page.value === n.id ? "active" : ""}
            onClick={(e) => {
              e.preventDefault();
              navigate(n.id);
            }}
          >
            <n.icon size={21} />
            <span>
              {n.label.slice(0, 2) === "遇见"
                ? "遇见"
                : n.id === "me"
                  ? "我的"
                  : n.id === "messages"
                    ? "消息"
                    : "广场"}
            </span>
          </a>
        ))}
      </nav>
      {s.toast.value && (
        <div class="toast" role="status">
          <Check size={17} />
          {s.toast.value}
        </div>
      )}
      <Modals />
    </div>
  );
}
