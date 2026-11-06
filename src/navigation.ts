import { Compass, MessageCircle, UserRound, Sparkles } from "lucide-preact";
import { type View, paths } from "./data";

export function navigate(view: View) {
  history.pushState(null, "", paths[view]);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export const navItems = [
  { id: "square" as View, label: "心动广场", icon: Compass },
  { id: "match" as View, label: "遇见同频", icon: Sparkles },
  { id: "messages" as View, label: "私语信箱", icon: MessageCircle },
  { id: "me" as View, label: "我的小宇宙", icon: UserRound },
];
