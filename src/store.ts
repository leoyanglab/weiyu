import { signal } from "@preact/signals";
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import { type State, type Action, type View } from "./data";
export function createStore(initial: State, view: View) {
  const state = signal(initial),
    page = signal(view),
    topic = signal("全部"),
    sort = signal("推荐"),
    search = signal(""),
    toast = signal(""),
    busy = signal(false),
    modal = signal(""),
    selected = signal(""),
    tab = signal("动态");
  let timer: ReturnType<typeof setTimeout>;
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
  };
}
export type Store = ReturnType<typeof createStore>;
export const StoreContext = createContext<Store | null>(null);
export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error("Missing store");
  return s;
}
