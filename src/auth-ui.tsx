import { useState } from "preact/hooks";
import {
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  ShieldCheck,
  Heart,
  ArrowRight,
  Copy,
  Check,
} from "lucide-preact";
import { useStore } from "./store";
export function AccountPanel() {
  const s = useStore(),
    account = s.state.value.account;
  return (
    <section class={`account-panel ${account ? "signed-in" : ""}`}>
      <div class="account-panel-icon">
        {account ? <ShieldCheck size={23} /> : <Heart size={23} />}
      </div>
      <div class="account-panel-copy">
        <strong>
          {account ? "你的小宇宙，已妥善保存" : "让每一次心动，都有迹可循"}
        </strong>
        <p>
          {account
            ? `账号 ${account.username} · 登录后跨设备继续`
            : "注册一个匿名账号，保存动态、收藏和聊天记录。"}
        </p>
      </div>
      {account ? (
        <div class="account-controls">
          <button onClick={() => (s.modal.value = "auth-password")}>
            <KeyRound size={15} />
            修改密码
          </button>
          <button onClick={() => (s.modal.value = "auth-logout-all")}>
            退出所有设备
          </button>
          <button
            disabled={s.busy.value}
            onClick={async () => {
              const r = await s.auth("logout");
              if (r.ok) s.notify("已退出，账号记录仍为你保留");
              else s.notify(r.error);
            }}
          >
            <LogOut size={15} />
            退出登录
          </button>
        </div>
      ) : (
        <div class="account-guest-actions">
          <button
            class="primary-button"
            onClick={() => (s.modal.value = "auth-register")}
          >
            创建账号
            <ArrowRight size={15} />
          </button>
          <button
            class="secondary-button"
            onClick={() => (s.modal.value = "auth-login")}
          >
            已有账号，登录
          </button>
        </div>
      )}
    </section>
  );
}
function PasswordField({
  label,
  value,
  onChange,
  fresh = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  fresh?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <label class="field-label">
      {label}
      <span class="password-field">
        <input
          type={show ? "text" : "password"}
          required
          minLength={fresh ? 12 : 1}
          maxLength={128}
          autoComplete={fresh ? "new-password" : "current-password"}
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
        />
        <button
          type="button"
          aria-label={`${show ? "隐藏" : "显示"}${label}`}
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}
export function AuthForm({ mode }: { mode: string }) {
  const s = useStore();
  const [name, setName] = useState(""),
    [nickname, setNickname] = useState(s.state.value.profile.name),
    [pass, setPass] = useState(""),
    [confirm, setConfirm] = useState(""),
    [current, setCurrent] = useState(""),
    [code, setCode] = useState(""),
    [adult, setAdult] = useState(false),
    [keep, setKeep] = useState(true),
    [remember, setRemember] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  const register = mode === "register",
    recover = mode === "recover",
    change = mode === "password",
    all = mode === "logout-all",
    recovery = mode === "code";
  const close = () => {
    s.recoveryCode.value = "";
    s.modal.value = "";
    if (["/login", "/register", "/recover"].includes(location.pathname))
      history.replaceState(null, "", "/me");
  };
  if (recovery)
    return (
      <div class="recovery-view">
        <div class="auth-illustration">
          <KeyRound size={28} />
        </div>
        <h3>把这把钥匙，放在安全的地方。</h3>
        <p>
          这是你的新恢复码，仅本次显示。忘记密码时，可用它找回账号。旧恢复码已失效。
        </p>
        <div class="recovery-code">
          {s.recoveryCode.value.match(/.{1,8}/g)?.join("-")}
        </div>
        <button
          type="button"
          class="secondary-button full"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                s.recoveryCode.value.match(/.{1,8}/g)!.join("-"),
              );
              setCopied(true);
            } catch {
              s.notify("复制失败，请手动保存恢复码");
            }
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
          {copied ? "已复制" : "复制恢复码"}
        </button>
        <p class="form-note">
          请勿发给任何人。没有恢复码且忘记密码，将无法找回账号。恢复码不保存在浏览器本地存储中。
        </p>
        <button class="primary-button full" onClick={close}>
          我已妥善保存
        </button>
      </div>
    );
  return (
    <form
      class={`auth-form auth-${mode}-form`}
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        if ((register || recover || change) && pass !== confirm) {
          setError("两次输入的密码不一致");
          return;
        }
        const body = register
          ? {
              username: name,
              nickname,
              password: pass,
              confirmPassword: confirm,
              adult,
              importGuest: keep,
              remember,
            }
          : recover
            ? { username: name, code, password: pass, confirmPassword: confirm }
            : change
              ? {
                  currentPassword: current,
                  password: pass,
                  confirmPassword: confirm,
                }
              : all
                ? { password: current }
                : { username: name, password: pass, remember };
        const r = await s.auth(mode, body);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setPass("");
        setConfirm("");
        setCurrent("");
        setCode("");
        if (s.recoveryCode.value) s.modal.value = "recovery-code";
        else {
          close();
          s.notify(all ? "已退出所有设备" : "欢迎回来，你的记录已恢复");
        }
      }}
    >
      {!change && !all && (
        <>
          <div class="auth-intro">
            <span class="auth-illustration">
              <Heart size={25} />
            </span>
            <p>
              {register
                ? "不必公开身份，也能拥有属于自己的小宇宙。"
                : recover
                  ? "用注册时保存的恢复码，重新找回你的小宇宙。"
                  : "你的那些日常和心动，都还在这里。"}
            </p>
          </div>
          {!recover && (
            <div class="auth-tabs">
              <button
                type="button"
                class={!register ? "selected" : ""}
                onClick={() => (s.modal.value = "auth-login")}
              >
                登录
              </button>
              <button
                type="button"
                class={register ? "selected" : ""}
                onClick={() => (s.modal.value = "auth-register")}
              >
                注册
              </button>
            </div>
          )}
          <label class="field-label">
            账号
            <input
              required
              autoComplete="username"
              autoCapitalize="none"
              spellcheck={false}
              pattern="[a-zA-Z][a-zA-Z0-9_]{3,23}"
              minLength={4}
              maxLength={24}
              placeholder="4–24 位字母、数字或下划线"
              value={name}
              onInput={(e) => setName(e.currentTarget.value)}
            />
          </label>
        </>
      )}
      {register && (
        <label class="field-label">
          匿名昵称
          <input
            required
            autoComplete="nickname"
            maxLength={16}
            value={nickname}
            onInput={(e) => setNickname(e.currentTarget.value)}
          />
        </label>
      )}
      {(change || all) && (
        <>
          <p class="auth-security-note">
            {all
              ? "确认后将退出所有已登录设备，包括当前设备。账号记录会保留。"
              : "修改后将退出其他设备，并生成新的恢复码。当前设备会保持登录。"}
          </p>
          <PasswordField
            label="当前密码"
            value={current}
            onChange={setCurrent}
          />
        </>
      )}
      {recover && (
        <label class="field-label">
          恢复码
          <input
            required
            autoComplete="off"
            spellcheck={false}
            maxLength={64}
            placeholder="输入保存的 32 位恢复码"
            value={code}
            onInput={(e) => setCode(e.currentTarget.value)}
          />
        </label>
      )}
      {!all && (
        <PasswordField
          label={change || recover ? "新密码" : "密码"}
          value={pass}
          onChange={setPass}
          fresh={register || recover || change}
        />
      )}
      {(register || recover || change) && (
        <>
          <p class="password-hint">12–128 位，建议使用不易猜测的长口令。</p>
          <PasswordField
            label="确认密码"
            value={confirm}
            onChange={setConfirm}
            fresh
          />
        </>
      )}
      {register && (
        <div class="auth-checks">
          <label>
            <input
              type="checkbox"
              checked={keep}
              onChange={(e) => setKeep(e.currentTarget.checked)}
            />
            <span>保留当前游客体验记录</span>
          </label>
          <label>
            <input
              type="checkbox"
              required
              checked={adult}
              onChange={(e) => setAdult(e.currentTarget.checked)}
            />
            <span>我已年满 18 周岁</span>
          </label>
        </div>
      )}
      {!register && !recover && !change && !all && (
        <label class="remember-me">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.currentTarget.checked)}
          />
          记住登录 30 天<span>默认 7 天</span>
        </label>
      )}
      {error && (
        <div class="auth-error" role="alert">
          {error}
        </div>
      )}
      <button class="primary-button full" disabled={s.busy.value}>
        {s.busy.value
          ? "正在处理…"
          : register
            ? "创建我的账号"
            : recover
              ? "重设密码并登录"
              : change
                ? "更新密码"
                : all
                  ? "确认退出所有设备"
                  : "登录，继续心动"}
        {!s.busy.value && <ArrowRight size={16} />}
      </button>
      {!register && !change && !all && !recover && (
        <button
          type="button"
          class="text-button full"
          onClick={() => (s.modal.value = "auth-recover")}
        >
          忘记密码？使用恢复码找回
        </button>
      )}
      {recover && (
        <button
          type="button"
          class="text-button full"
          onClick={() => (s.modal.value = "auth-login")}
        >
          返回登录
        </button>
      )}
      {register && (
        <p class="form-note">
          登录账号不向其他用户展示。注册后请保存一次性恢复码；暂不提供邮箱、短信找回。
        </p>
      )}
    </form>
  );
}
