import { AccountPanel } from "../auth-ui";
import { Heart, Bookmark, RefreshCw } from "lucide-preact";
import { useStore } from "../store";
import { Avatar } from "../components/Avatar";
import { navigate } from "../navigation";
import { PostCard } from "./Square";

export function Profile() {
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
      <AccountPanel />
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
