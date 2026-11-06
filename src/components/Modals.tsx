import { AuthForm } from "../auth-ui";
import { useEffect, useState } from "preact/hooks";
import { Heart, X, Send, Bookmark, Check, Flag, Ban } from "lucide-preact";
import { topics } from "../data";
import { useStore } from "../store";
import { Avatar } from "./Avatar";

export function Modals() {
  const s = useStore();
  if (!s.modal.value) return null;
  return <ModalContent key={s.modal.value + ":" + s.selected.value} />;
}

export function ModalContent() {
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
  const close = () => {
    s.modal.value = "";
    s.recoveryCode.value = "";
    if (["/login", "/register", "/recover"].includes(location.pathname))
      history.replaceState(null, "", "/me");
  };
  const [decision, setDecision] = useState("继续匿名认识");
  const title =
    kind === "auth-login"
      ? "欢迎回到未遇"
      : kind === "auth-register"
        ? "认识你，很高兴"
        : kind === "auth-recover"
          ? "找回你的小宇宙"
          : kind === "auth-password"
            ? "修改登录密码"
            : kind === "auth-logout-all"
              ? "管理登录设备"
              : kind === "recovery-code"
                ? "请保存账号恢复码"
                : kind === "compose"
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
        class={`modal-card ${kind.startsWith("auth-") || kind === "recovery-code" ? "auth-modal" : ""}`}
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
        {(kind.startsWith("auth-") || kind === "recovery-code") && (
          <AuthForm mode={kind === "recovery-code" ? "code" : kind.slice(5)} />
        )}
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
              将清除当前演示空间的动态、收藏、聊天和资料，恢复初始数据。登录状态和账号密码不受影响。
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
              游客记录按浏览器隔离，有效期七天。注册后，记录会保存在账号下，可跨设备登录继续使用。账号不向其他用户展示；不提供端到端加密。注册、修改密码或找回后，请保存新恢复码；暂不支持邮箱或短信找回。
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
