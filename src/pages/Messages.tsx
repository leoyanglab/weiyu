import { useEffect, useState } from "preact/hooks";
import {
  Heart,
  MessageCircle,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Send,
  Settings2,
} from "lucide-preact";
import { useStore } from "../store";
import { Avatar } from "../components/Avatar";
import { navigate } from "../navigation";

export function Messages() {
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
