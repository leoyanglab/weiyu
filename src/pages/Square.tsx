import {
  Heart,
  MessageCircle,
  Plus,
  Search,
  ArrowUpRight,
  Sparkles,
  Moon,
  X,
  Bookmark,
  MoreHorizontal,
  ShieldCheck,
  ChevronRight,
  Headphones,
} from "lucide-preact";
import { type Post, topics } from "../data";
import { useStore } from "../store";
import { Avatar } from "../components/Avatar";
import { navigate } from "../navigation";

export function Square() {
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

export function Scene({ type }: { type: string }) {
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

export function PostCard({ post: p }: { post: Post }) {
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

export function RightRail() {
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
