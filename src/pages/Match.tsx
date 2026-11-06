import { useState } from "preact/hooks";
import { ArrowRight, ShieldCheck } from "lucide-preact";
import { useStore } from "../store";
import { Avatar } from "../components/Avatar";
import { navigate } from "../navigation";

export function Match() {
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
