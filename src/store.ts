import { signal } from "@preact/signals";
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import { type State, type Action, type View } from "./data";
export function createStore(initial: State, view: View, initialModal = "") {
  const state = signal(initial),
    page = signal(view),
    topic = signal("全部"),
    sort = signal("推荐"),
    search = signal(""),
    toast = signal(""),
    busy = signal(false),
    modal = signal(initialModal),
    recoveryCode = signal(""),
    selected = signal(""),
    tab = signal("动态");
  let timer: ReturnType<typeof setTimeout>;
  let revision = 0;
  const announce = () => {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("weiyu-account");
      channel.postMessage("changed");
      channel.close();
    }
  };
  const refresh = async () => {
    const version = ++revision;
    try {
      const r = await fetch("/api/state");
      if (r.ok) {
        const data = await r.json();
        if (version === revision) {
          if (state.value.account?.id !== data.account?.id) {
            recoveryCode.value = "";
            if (
              ["recovery-code", "auth-password", "auth-logout-all"].includes(
                modal.value,
              )
            )
              modal.value = "";
          }
          state.value = data;
        }
      }
    } catch {
      /* Keep the current view when temporarily offline. */
    }
  };
  const auth = async (
    operation: string,
    body: Record<string, unknown> = {},
  ) => {
    if (busy.value) return { ok: false, error: "正在处理，请稍候" };
    busy.value = true;
    ++revision;
    try {
      const r = await fetch("/api/auth/" + operation, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (r.status === 401 && data.error?.includes("会话")) {
        await refresh();
        modal.value = "auth-login";
      }
      if (!r.ok) return { ok: false, error: data.error || "操作失败" };
      state.value = data.state;
      recoveryCode.value = data.recoveryCode || "";
      announce();
      return { ok: true, error: "" };
    } catch {
      return { ok: false, error: "网络连接失败，请重试" };
    } finally {
      busy.value = false;
    }
  };
  const notify = (message: string) => {
    toast.value = message;
    clearTimeout(timer);
    timer = setTimeout(() => (toast.value = ""), 3500);
  };
  const act = async (action: Action) => {
    if (busy.value) return false;
    busy.value = true;
    try {
      const r = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const data = await r.json();
      if (r.status === 401) {
        await refresh();
        modal.value = "auth-login";
        throw new Error(data.error || "请重新登录");
      }
      if (!r.ok) throw new Error(data.error || "操作失败");
      state.value = data;
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : "网络连接失败");
      return false;
    } finally {
      busy.value = false;
    }
  };
  return {
    state,
    page,
    topic,
    sort,
    search,
    toast,
    busy,
    modal,
    selected,
    tab,
    notify,
    act,
    auth,
    refresh,
    recoveryCode,
  };
}
export type Store = ReturnType<typeof createStore>;
export const StoreContext = createContext<Store | null>(null);
export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error("Missing store");
  return s;
}
