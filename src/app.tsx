import { useEffect, useState } from "preact/hooks";
import {
  Heart,
  Compass,
  MessageCircle,
  UserRound,
  Plus,
  Search,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Moon,
  X,
  Send,
  Bookmark,
  MoreHorizontal,
  ShieldCheck,
  ChevronRight,
  Headphones,
  Check,
  RefreshCw,
  Flag,
  Ban,
  Settings2,
} from "lucide-preact";
import { type View, type Post, paths, topics } from "./data";
import { useStore } from "./store";

function Avatar({
  kind = "moon",
  small = false,
}: {
  kind?: string;
  small?: boolean;
}) {
  const shapes: Record<string, string> = {
    moon: "☾",
    sun: "☀",
    planet: "♄",
    flower: "✿",
    cloud: "☁",
    star: "✧",
  };
  return (
    <span
      class={`avatar avatar-${kind} ${small ? "avatar-small" : ""}`}
      aria-hidden="true"
    >
      {shapes[kind] || "✧"}
    </span>
  );
}
function Brand() {
  return (
    <a href="/" class="brand">
      <span class="brand-symbol">
        <Heart size={22} fill="currentColor" />
        <Sparkles size={13} />
      </span>
      <span>
        未遇<span class="brand-en">WEIYU</span>
      </span>
    </a>
  );
}
function navigate(view: View) {
  history.pushState(null, "", paths[view]);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
const navItems = [
  { id: "square" as View, label: "心动广场", icon: Compass },
  { id: "match" as View, label: "遇见同频", icon: Sparkles },
  { id: "messages" as View, label: "私语信箱", icon: MessageCircle },
  { id: "me" as View, label: "我的小宇宙", icon: UserRound },
];
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
function Square() {
  const s = useStore();
  let posts = s.state.value.posts.filter(
    (p) =>
      !s.state.value.blocked.includes(p.author) &&
      (s.topic.value === "全部" || p.topic === s.topic.value) &&
      (!s.search.value ||
        (p.content + p.author)
          .toLowerCase()
          .includes(s.search.value.toLowerCase())),
  );
  if (s.sort.value === "热门")
    posts = [...posts].sort((a, b) => b.likes - a.likes);
  if (s.sort.value === "最新")
    posts = [...posts].sort((a, b) => Number(!!b.own) - Number(!!a.own));
  return (
    <div class="page-content">
      <div class="page-heading">
        <div>
          <div class="eyebrow">A LITTLE CLOSER, EVERY DAY</div>
          <h1>
            心动广场<span class="heading-star">✳</span>
          </h1>
          <p>一些日常，一点心事，和刚刚好的你。</p>
        </div>
        <span class="heading-date">
          不赶时间，慢慢遇见 <Moon size={15} />
        </span>
      </div>
      <section class="hero">
        <div class="hero-copy">
          <div class="hero-label">
            <span />
            匿名相遇 · 认真心动
          </div>
          <h2>
            在这里，
            <br />
            让喜欢<span>自然发生。</span>
          </h2>
          <p>
            卸下人设，藏起姓名。
            <br />
            用一句真心话，遇见另一个小宇宙。
          </p>
          <button class="cream-button" onClick={() => navigate("match")}>
            遇见我的同频 <ArrowUpRight size={17} />
          </button>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="orbit orbit-one" />
          <div class="orbit orbit-two" />
          <div class="orb orb-back" />
          <div class="orb orb-front" />
          <div class="art-star star-one">✦</div>
          <div class="art-star star-two">✧</div>
          <div class="art-star star-three">✦</div>
          <div class="floating-note note-one">
            <Heart size={14} fill="currentColor" />
            有点想认识你
          </div>
          <div class="floating-note note-two">「 原来，你也在这里 」</div>
          <div class="art-caption">
            SOMEWHERE, SOMEONE
            <br />
            IS LOOKING FOR YOU.
          </div>
        </div>
      </section>
      <div class="square-layout">
        <section class="feed">
          <button
            class="composer-preview"
            onClick={() => (s.modal.value = "compose")}
          >
            <Avatar kind="star" small />
            <span>今天，有什么想被听见的？</span>
            <span class="composer-plus">
              <Plus size={18} />
            </span>
          </button>
          <div class="feed-heading">
            <h2>
              此刻的心动<span>每一份分享，都有回音</span>
            </h2>
            <div class="sort-tabs" aria-label="动态排序">
              {["推荐", "最新", "热门"].map((t) => (
                <button
                  class={s.sort.value === t ? "selected" : ""}
                  onClick={() => (s.sort.value = t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div class="topic-tabs" aria-label="话题筛选">
            {topics.map((t, i) => (
              <button
                class={s.topic.value === t ? "selected" : ""}
                onClick={() => (s.topic.value = t)}
              >
                {i === 0 ? "" : "# "}
                {t}
              </button>
            ))}
          </div>
          <div class="search-mobile">
            <Search size={16} />
            <input
              aria-label="搜索广场"
              placeholder="寻找一句同频的话"
              value={s.search.value}
              onInput={(e) => (s.search.value = e.currentTarget.value)}
            />
          </div>
          <div class="posts">
            {posts.length ? (
              posts.map((p) => <PostCard key={p.id} post={p} />)
            ) : (
              <div class="empty">
                <Moon />
                <h3>这里暂时很安静</h3>
                <p>换个话题，或分享你的第一句心事。</p>
                <button
                  class="primary-button"
                  onClick={() => (s.modal.value = "compose")}
                >
                  写点什么
                </button>
              </div>
            )}
          </div>
          <div class="feed-end">✧&nbsp; 暂时逛到这里，心动还会继续 &nbsp;✧</div>
        </section>
        <RightRail />
      </div>
    </div>
  );
}
function Scene({ type }: { type: string }) {
  return type === "music" ? (
    <div class="music-card">
      <div class="record">
        <div />
      </div>
      <div>
        <span>今晚的单曲循环</span>
        <strong>把耳机分你一半</strong>
        <small>音乐同频 · 氛围歌单</small>
      </div>
      <Headphones size={23} />
    </div>
  ) : (
    <div class="sunset-scene" role="img" aria-label="粉紫色日落与远山的插画">
      <div class="scene-sun" />
      <div class="mountain mountain-back" />
      <div class="mountain mountain-front" />
      <div class="scene-caption">
        日落是免费的，浪漫也是。<span>THE SKY IS OURS.</span>
      </div>
    </div>
  );
}
function PostCard({ post: p }: { post: Post }) {
  const s = useStore();
  return (
    <article class="post-card">
      <div class="post-top">
        <Avatar kind={p.avatar} />
        <div class="post-author">
          <strong>
            {p.author}
            {p.own ? (
              <span class="own-label">我</span>
            ) : (
              <span class="demo-label">演示角色</span>
            )}
          </strong>
          <span>{p.time} · 在自己的小宇宙</span>
        </div>
        <button
          class="icon-button"
          aria-label={`更多操作：${p.author}`}
          onClick={() => {
            s.selected.value = p.id;
            s.modal.value = "more";
          }}
        >
          <MoreHorizontal size={20} />
        </button>
      </div>
      <p class="post-content">{p.content}</p>
      {p.scene && <Scene type={p.scene} />}
      <button
        class="post-topic"
        onClick={() => {
          s.topic.value = p.topic;
          window.scrollTo({ top: 450, behavior: "smooth" });
        }}
      >
        ＃ {p.topic}
      </button>
      <div class="post-actions">
        <button
          disabled={s.busy.value}
          class={p.liked ? "is-liked" : ""}
          aria-label={`${p.liked ? "取消喜欢" : "喜欢"}：${p.author}`}
          aria-pressed={p.liked}
          onClick={() => s.act({ type: "like", id: p.id })}
        >
          <Heart size={17} fill={p.liked ? "currentColor" : "none"} />
          {p.likes}
        </button>
        <button
          aria-label={`评论：${p.author}`}
          onClick={() => {
            s.selected.value = p.id;
            s.modal.value = "comments";
          }}
        >
          <MessageCircle size={17} />
          {p.comments.length || "回应"}
        </button>
        <button
          class={p.saved ? "is-saved" : ""}
          aria-label={`${p.saved ? "取消收藏" : "收藏"}：${p.author}`}
          aria-pressed={p.saved}
          disabled={s.busy.value}
          onClick={() => s.act({ type: "save", id: p.id })}
        >
          <Bookmark size={17} fill={p.saved ? "currentColor" : "none"} />
          <span class="save-label">{p.saved ? "已收藏" : "收藏"}</span>
        </button>
        {!p.own && (
          <button
            class="meet-button"
            onClick={() => {
              s.notify("从同频匹配开始，先认识演示角色「晚风」");
              navigate("match");
            }}
          >
            想认识 <ArrowUpRight size={14} />
          </button>
        )}
      </div>
    </article>
  );
}
function RightRail() {
  const s = useStore();
  return (
    <aside class="right-rail">
      <div class="search-box">
        <Search size={17} />
        <input
          aria-label="搜索动态"
          placeholder="寻找一句同频的话"
          value={s.search.value}
          onInput={(e) => (s.search.value = e.currentTarget.value)}
        />
        {s.search.value && (
          <button
            class="icon-button"
            aria-label="清除搜索"
            onClick={() => (s.search.value = "")}
          >
            <X size={14} />
          </button>
        )}
      </div>
      <section class="rail-card daily-card">
        <div class="rail-title">
          <span>
            <Sparkles size={16} />
            今日心动话题
          </span>
          <small>DAILY</small>
        </div>
        <div class="daily-art" aria-hidden="true">
          “<span>✧</span>
        </div>
        <h3>
          你会因为什么瞬间，
          <br />
          对一个人心动？
        </h3>
        <p>是被记住的小习惯，还是恰好的对视。</p>
        <button
          onClick={() => {
            s.topic.value = "恋爱脑一下";
            s.modal.value = "compose";
          }}
        >
          我也想说说 <ArrowUpRight size={15} />
        </button>
      </section>
      <section class="rail-card">
        <div class="rail-title">
          <span>同频话题</span>
          <span class="tiny-star">✳</span>
        </div>
        <div class="trending-topics">
          {[
            {
              name: "深夜心事",
              desc: "把没说出口的话，留在这里",
              color: "lilac",
            },
            {
              name: "恋爱脑一下",
              desc: "允许自己，偶尔不那么理性",
              color: "rose",
            },
            {
              name: "音乐同频",
              desc: "听同一首歌的人会相遇吗",
              color: "green",
            },
          ].map((t) => (
            <button
              onClick={() => {
                s.topic.value = t.name;
              }}
            >
              <span class={`topic-icon ${t.color}`}>#</span>
              <span>
                <strong>{t.name}</strong>
                <small>{t.desc}</small>
              </span>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
      </section>
      <section class="rail-card gentle-card">
        <span class="gentle-icon">
          <ShieldCheck size={19} />
        </span>
        <h3>匿名，也可以很真诚。</h3>
        <p>
          尊重每一种心动，也尊重每一次告别。
          <br />
          让彼此舒服，是相遇的第一步。
        </p>
        <button onClick={() => (s.modal.value = "about")}>
          我们的小小约定 <ArrowUpRight size={13} />
        </button>
      </section>
      <div class="rail-footer">
        原型体验 · 所有人物与互动均为模拟
        <br />
        先对话，再心动，慢慢认识你。<span>✧</span>
      </div>
    </aside>
  );
}
function Match() {
  const s = useStore();
  const [intent, setIntent] = useState("认真认识");
  return (
    <div class="page-content inner-page">
      <div class="eyebrow">FIND YOUR FREQUENCY</div>
      <h1>
        遇见同频<span class="heading-star">✳</span>
      </h1>
      <p class="page-subtitle">不用努力变得有趣，你本来就值得被了解。</p>
      <div class="match-layout">
        <section class="match-main">
          <div class="match-visual">
            <div class="orbit" />
            <Avatar kind="star" />
            <span class="connection-line">· · · ♡ · · ·</span>
            <Avatar kind="moon" />
          </div>
          <span class="mini-eyebrow">七日匿名心动 · 演示体验</span>
          <h2>
            {s.state.value.matched
              ? "有一个人，正等你说你好。"
              : "从一句真心话，靠近彼此。"}
          </h2>
          <p>
            先藏起姓名，用七天时间认识彼此。
            <br />
            没有标准答案，也不必急着揭晓。
          </p>
          <div class="intent-options">
            {["认真认识", "轻松聊聊", "听听彼此"].map((t) => (
              <button
                class={intent === t ? "selected" : ""}
                onClick={() => setIntent(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            class="primary-button match-start"
            disabled={s.busy.value}
            onClick={async () => {
              if (!s.state.value.matched) await s.act({ type: "match" });
              if (s.state.value.matched) navigate("messages");
            }}
          >
            {s.state.value.matched ? "回到我们的私语" : "开启一段相遇"}
            <ArrowRight size={17} />
          </button>
          <small class="match-disclaimer">
            固定匹配演示角色「晚风」，不代表真实用户在线
          </small>
        </section>
        <aside class="match-notes">
          <h3>慢慢靠近的七天</h3>
          {[
            {
              n: "01",
              title: "初见，只需一句你好",
              text: "一个小问题，让对话自然开始。",
            },
            {
              n: "02—06",
              title: "交换日常，积攒心动",
              text: "一首歌、一句晚安，和你的小习惯。",
            },
            {
              n: "07",
              title: "下一步，由彼此决定",
              text: "继续匿名、申请交换资料，或温柔告别。",
            },
          ].map((x) => (
            <div class="timeline-item">
              <span>{x.n}</span>
              <div>
                <h4>{x.title}</h4>
                <p>{x.text}</p>
              </div>
            </div>
          ))}
          <div class="soft-note">
            <ShieldCheck size={18} />
            <span>
              你可以随时离开。
              <br />
              每一次靠近，都需要双方愿意。
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
function Messages() {
  const s = useStore();
  const [draft, setDraft] = useState("");
  useEffect(() => {
    const box = document.querySelector(".chat-scroll");
    if (box) box.scrollTop = box.scrollHeight;
  }, [s.state.value.messages.length]);
  return (
    <div class="page-content inner-page">
      <div class="eyebrow">A SPACE JUST FOR TWO</div>
      <h1>
        私语信箱<span class="heading-star">✳</span>
      </h1>
      <p class="page-subtitle">世界很大，这里只听见彼此。</p>
      {!s.state.value.matched ? (
        <div class="empty empty-large">
          <MessageCircle size={36} />
          <h2>第一句你好，还在路上。</h2>
          <p>开启匿名相遇，给一段故事留个位置。</p>
          <button class="primary-button" onClick={() => navigate("match")}>
            去遇见同频 <ArrowRight size={17} />
          </button>
        </div>
      ) : (
        <div class="chat-layout">
          <section class="chat-panel">
            <div class="chat-header">
              <Avatar kind="moon" />
              <div>
                <strong>
                  晚风 <span class="demo-label">演示角色</span>
                </strong>
                <small>第 1 天 · 彼此初见</small>
              </div>
              <button
                class="icon-button"
                aria-label="相遇设置"
                onClick={() => (s.modal.value = "decision")}
              >
                <Settings2 size={19} />
              </button>
            </div>
            <div class="chat-scroll">
              <div class="chat-system">
                匿名让相遇轻一点，真诚让距离近一点。
              </div>
              <div class="icebreaker">
                <Sparkles size={17} />
                <div>
                  <small>今日破冰</small>
                  <p>如果明天有一整天空闲，你想和喜欢的人做什么？</p>
                </div>
              </div>
              {s.state.value.messages.map((m) => (
                <div
                  key={m.id}
                  class={`message-row ${m.from === "me" ? "mine" : ""}`}
                >
                  {m.from === "them" && <Avatar kind="moon" small />}
                  <div class="message-bubble">{m.text}</div>
                </div>
              ))}
              <div class="messages-end" />
            </div>
            <form
              class="chat-compose"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  draft.trim() &&
                  (await s.act({ type: "message", text: draft }))
                )
                  setDraft("");
              }}
            >
              <input
                aria-label="发送私语"
                placeholder="把此刻的心情说给 TA 听…"
                maxLength={500}
                value={draft}
                onInput={(e) => setDraft(e.currentTarget.value)}
              />
              <button
                class="send-button"
                aria-label="发送消息"
                disabled={s.busy.value || !draft.trim()}
              >
                <Send size={19} />
              </button>
            </form>
            <div class="chat-demo-note">
              模拟聊天 · 回复由预设规则生成，不是真人或 AI 实时对话
            </div>
          </section>
          <aside class="chat-aside rail-card">
            <span class="tiny-star">✳</span>
            <h3>把心动，悄悄放在这里。</h3>
            <p>
              只有彼此都愿意，
              <br />
              才迈向下一步。
            </p>
            <button
              aria-label={s.state.value.heart ? "取消心动" : "记录心动"}
              aria-pressed={s.state.value.heart}
              class={`heart-button ${s.state.value.heart ? "hearted" : ""}`}
              disabled={s.busy.value}
              onClick={() => s.act({ type: "heart" })}
            >
              <Heart
                size={31}
                fill={s.state.value.heart ? "currentColor" : "none"}
              />
            </button>
            <small>
              {s.state.value.heart
                ? "已记录你的心动 · 对方尚未确认"
                : "今天，有一点心动"}
            </small>
            <div class="chat-day">
              <strong>DAY 01</strong>
              <span>先了解，再靠近。</span>
            </div>
            <button
              class="text-button"
              onClick={() => (s.modal.value = "decision")}
            >
              我们接下来 <ArrowUpRight size={14} />
            </button>
            {s.state.value.decision && (
              <p class="decision-note">
                你的选择：{s.state.value.decision}
                {s.state.value.decision === "申请交换资料"
                  ? "，等待对方同意（演示中不开放真实资料）。"
                  : ""}
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
function Profile() {
  const s = useStore();
  const posts = s.state.value.posts.filter((p) =>
    s.tab.value === "收藏"
      ? p.saved && !s.state.value.blocked.includes(p.author)
      : p.own,
  );
  return (
    <div class="page-content inner-page">
      <div class="eyebrow">YOUR LITTLE UNIVERSE</div>
      <h1>
        我的小宇宙<span class="heading-star">✳</span>
      </h1>
      <p class="page-subtitle">在遇见别人之前，先好好喜欢自己。</p>
      <section class="profile-card">
        <Avatar kind="star" />
        <div>
          <h2>{s.state.value.profile.name}</h2>
          <p>{s.state.value.profile.bio}</p>
          <span class="profile-intent">
            <Heart size={12} />
            {s.state.value.profile.intent}
          </span>
        </div>
        <button
          class="secondary-button"
          onClick={() => (s.modal.value = "profile")}
        >
          编辑资料
        </button>
      </section>
      <div class="profile-stats">
        <div>
          <strong>{s.state.value.posts.filter((p) => p.own).length}</strong>
          <span>我的碎片</span>
        </div>
        <div>
          <strong>{s.state.value.posts.filter((p) => p.saved).length}</strong>
          <span>收藏的共鸣</span>
        </div>
        <div>
          <strong>{s.state.value.matched ? "1" : "0"}</strong>
          <span>正在认识</span>
        </div>
      </div>
      <div class="profile-tabs">
        {["动态", "收藏"].map((t) => (
          <button
            class={s.tab.value === t ? "selected" : ""}
            onClick={() => (s.tab.value = t)}
          >
            {t === "动态" ? "我的动态" : "心动收藏"}
          </button>
        ))}
        <button class="reset-button" onClick={() => (s.modal.value = "reset")}>
          <RefreshCw size={14} />
          重置演示
        </button>
      </div>
      <div class="profile-posts">
        {posts.length ? (
          posts.map((p) => <PostCard post={p} key={p.id} />)
        ) : (
          <div class="empty">
            <Bookmark />
            <h3>
              {s.tab.value === "收藏"
                ? "留住让你共鸣的瞬间"
                : "你的小宇宙，等待第一颗星"}
            </h3>
            <p>
              {s.tab.value === "收藏"
                ? "去广场逛逛，把喜欢的动态收藏起来。"
                : "发一条动态，让同频的人看见你。"}
            </p>
            <button
              class="secondary-button"
              onClick={() =>
                s.tab.value === "收藏"
                  ? navigate("square")
                  : (s.modal.value = "compose")
              }
            >
              {s.tab.value === "收藏" ? "逛逛广场" : "记录此刻"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
function Modals() {
  const s = useStore();
  if (!s.modal.value) return null;
  return <ModalContent key={s.modal.value + ":" + s.selected.value} />;
}
function ModalContent() {
  const s = useStore(),
    kind = s.modal.value;
  const [content, setContent] = useState(""),
    [topic, setTopic] = useState(
      s.topic.value === "全部" ? "日常碎片" : s.topic.value,
    ),
    [name, setName] = useState(s.state.value.profile.name),
    [bio, setBio] = useState(s.state.value.profile.bio),
    [intent, setIntent] = useState(s.state.value.profile.intent);
  const post = s.state.value.posts.find((p) => p.id === s.selected.value);
  const close = () => (s.modal.value = "");
  const [decision, setDecision] = useState("继续匿名认识");
  const title =
    kind === "compose"
      ? "记录此刻"
      : kind === "comments"
        ? "给这份心事一个回音"
        : kind === "profile"
          ? "编辑你的小宇宙"
          : kind === "more"
            ? "这条动态"
            : kind === "decision"
              ? "下一步，听从你的心意"
              : kind === "reset"
                ? "重新开始这次体验？"
                : "我们的小小约定";
  const submit = async (
    type: string,
    values: Record<string, unknown>,
    msg: string,
  ) => {
    if (await s.act({ type, ...values })) {
      close();
      s.notify(msg);
    }
  };
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector(".modal-card") as HTMLElement | null;
    dialog?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const list = Array.from(
          dialog?.querySelectorAll<HTMLElement>(
            "button,input,textarea,select,a[href]",
          ) || [],
        ).filter((el) => !el.hasAttribute("disabled"));
        const first = list[0],
          last = list[list.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === dialog)
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      class="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        class="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        <div class="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button class="icon-button" aria-label="关闭弹窗" onClick={close}>
            <X size={21} />
          </button>
        </div>
        {kind === "compose" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(
                "publish",
                { content, topic },
                "你的心事，已被这个小宇宙收下",
              );
            }}
          >
            <div class="compose-user">
              <Avatar kind="star" small />
              <strong>{s.state.value.profile.name}</strong>
              <span>匿名发布</span>
            </div>
            <textarea
              aria-label="动态内容"
              placeholder="分享一点日常、一段心事，或一句想说给某个人的话…"
              maxLength={500}
              required
              value={content}
              onInput={(e) => setContent(e.currentTarget.value)}
            />
            <div class="textarea-count">{content.length} / 500</div>
            <label class="field-label">
              为这份心情选个话题
              <select
                value={topic}
                onChange={(e) => setTopic(e.currentTarget.value)}
              >
                {topics.slice(1).map((t) => (
                  <option>{t}</option>
                ))}
              </select>
            </label>
            <p class="form-note">
              内容仅保存于你的独立演示空间，不会发布给其他访客。
            </p>
            <button
              class="primary-button full"
              disabled={s.busy.value || !content.trim()}
            >
              <Send size={16} />
              发布此刻
            </button>
          </form>
        )}
        {kind === "comments" && post && (
          <>
            <blockquote>{post.content}</blockquote>
            <div class="comment-list">
              {post.comments.length ? (
                post.comments.map((c) => (
                  <div>
                    <Avatar kind="star" small />
                    <p>
                      <strong>{c.author}</strong>
                      <span>{c.text}</span>
                    </p>
                  </div>
                ))
              ) : (
                <p class="muted">还没有回应，你可以留下第一句。</p>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit("comment", { id: post.id, text: content }, "回应已留下");
              }}
            >
              <input
                class="text-input"
                aria-label="评论内容"
                placeholder="温柔地回应一句…"
                maxLength={200}
                required
                value={content}
                onInput={(e) => setContent(e.currentTarget.value)}
              />
              <button
                class="primary-button full"
                disabled={s.busy.value || !content.trim()}
              >
                发送回应 <Send size={15} />
              </button>
            </form>
          </>
        )}
        {kind === "profile" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit("profile", { name, bio, intent }, "资料已更新");
            }}
          >
            <label class="field-label">
              匿名昵称
              <input
                required
                maxLength={16}
                value={name}
                onInput={(e) => setName(e.currentTarget.value)}
              />
            </label>
            <label class="field-label">
              一句话介绍
              <textarea
                required
                maxLength={100}
                value={bio}
                onInput={(e) => setBio(e.currentTarget.value)}
              />
            </label>
            <label class="field-label">
              相遇意向
              <select
                value={intent}
                onChange={(e) => setIntent(e.currentTarget.value)}
              >
                {[
                  "认真认识，慢慢靠近",
                  "先做朋友，顺其自然",
                  "分享日常，轻松聊聊",
                ].map((t) => (
                  <option>{t}</option>
                ))}
              </select>
            </label>
            <button class="primary-button full" disabled={s.busy.value}>
              保存资料
            </button>
          </form>
        )}
        {kind === "more" && post && (
          <div class="menu-options">
            <button
              onClick={() =>
                submit(
                  "save",
                  { id: post.id },
                  post.saved ? "已取消收藏" : "已收藏",
                )
              }
            >
              <Bookmark size={18} />
              {post.saved ? "取消收藏" : "收藏这条动态"}
            </button>
            {!post.own && (
              <>
                <button
                  onClick={() =>
                    submit(
                      "report",
                      { id: post.id },
                      "演示举报已记录；原型未接入人工审核",
                    )
                  }
                >
                  <Flag size={18} />
                  举报这条动态（演示）
                </button>
                <button
                  onClick={() =>
                    submit(
                      "block",
                      { id: post.id },
                      "已屏蔽，广场将隐藏 TA 的动态",
                    )
                  }
                >
                  <Ban size={18} />
                  不再看 TA 的动态
                </button>
              </>
            )}
          </div>
        )}
        {kind === "decision" && (
          <>
            <p class="muted">每一次靠近，都应该是你自己的选择。</p>
            <div class="decision-options">
              {["继续匿名认识", "申请交换资料", "结束这段相遇"].map((t) => (
                <button
                  class={decision === t ? "selected" : ""}
                  onClick={() => setDecision(t)}
                >
                  {t}
                  <span>{decision === t && <Check size={16} />}</span>
                </button>
              ))}
            </div>
            <p class="form-note">
              演示中不会交换真实资料。申请仅记录你的意愿，不能代替对方同意。
            </p>
            <button
              class="primary-button full"
              disabled={s.busy.value}
              onClick={() =>
                submit("decision", { value: decision }, "已记录你的选择")
              }
            >
              确认选择
            </button>
          </>
        )}
        {kind === "reset" && (
          <>
            <p class="muted">
              将清除当前浏览器演示空间的动态、收藏、聊天和资料，恢复初始数据。
            </p>
            <button
              class="primary-button full"
              disabled={s.busy.value}
              onClick={() => submit("reset", {}, "已恢复初始演示数据")}
            >
              确认重置
            </button>
            <button class="text-button full" onClick={close}>
              保留这些回忆
            </button>
          </>
        )}
        {kind === "about" && (
          <div class="about-content">
            <div class="about-logo">
              <Heart size={29} />
              先对话，再心动。
            </div>
            <p>
              这是「未遇」的 Web
              产品原型，仅面向成年人体验。所有角色、动态、匹配和回复均为模拟，不存在真实在线人数或双向心动承诺。
            </p>
            <h3>真诚，也要有边界</h3>
            <p>
              不骚扰、不冒充、不索取金钱。尊重拒绝，不发布真实身份、联系方式和敏感信息。举报仅在演示中记录，尚无人工审核服务。
            </p>
            <h3>你的独立演示空间</h3>
            <p>
              通过浏览器 Cookie 隔离，操作保存在演示数据库中；清除 Cookie
              后无法找回。数据有效期七天，可在「我的」重置。它不提供真实账号认证或私密通信保障。
            </p>
            <button class="primary-button full" onClick={close}>
              知道了，温柔地相遇
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
