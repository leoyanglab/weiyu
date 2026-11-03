export type View = "square" | "match" | "messages" | "me";
export type Post = {
  id: string;
  author: string;
  avatar: string;
  time: string;
  topic: string;
  content: string;
  likes: number;
  liked: boolean;
  saved: boolean;
  scene?: string;
  comments: { author: string; text: string }[];
  own?: boolean;
};
export type Message = { id: string; from: "me" | "them"; text: string };
export type Account = { id: string; username: string; createdAt: number };
export type State = {
  account?: Account | null;
  posts: Post[];
  profile: { name: string; bio: string; intent: string };
  matched: boolean;
  heart: boolean;
  decision: string;
  messages: Message[];
  blocked: string[];
  reports: string[];
};
export const topics = [
  "全部",
  "日常碎片",
  "深夜心事",
  "恋爱脑一下",
  "音乐同频",
  "城市漫游",
];
export const paths: Record<View, string> = {
  square: "/",
  match: "/match",
  messages: "/messages",
  me: "/me",
};
export const viewFromPath = (p: string): View =>
  p === "/match"
    ? "match"
    : p === "/messages"
      ? "messages"
      : ["/me", "/login", "/register", "/recover"].includes(p)
        ? "me"
        : "square";
export const authModalFromPath = (p: string) =>
  p === "/login"
    ? "auth-login"
    : p === "/register"
      ? "auth-register"
      : p === "/recover"
        ? "auth-recover"
        : "";
export function initialState(): State {
  return {
    account: null,
    profile: {
      name: "路过的星星",
      bio: "在这里，等一场刚刚好的相遇。",
      intent: "认真认识，慢慢靠近",
    },
    matched: false,
    heart: false,
    decision: "",
    blocked: [],
    reports: [],
    messages: [
      {
        id: "hello",
        from: "them",
        text: "嗨，我是晚风。比起热闹的聚会，我好像更喜欢和一个人沿着河边慢慢走。你呢？",
      },
    ],
    posts: [
      {
        id: "p1",
        author: "把月亮寄给你",
        avatar: "moon",
        time: "刚刚",
        topic: "深夜心事",
        content:
          "理想中的约会，是一起去便利店买点喝的，然后沿着没有目的地的路，一直走到夜深。\n\n不用找话题，偶尔安静也很好。",
        likes: 128,
        liked: false,
        saved: false,
        comments: [{ author: "小行星", text: "连沉默都舒服，才是最难得的。" }],
      },
      {
        id: "p2",
        author: "橘子海",
        avatar: "sun",
        time: "12 分钟前",
        topic: "城市漫游",
        content: "今天的落日有点偏心。\n这么好看的天空，想分一半给你。",
        scene: "sunset",
        likes: 86,
        liked: false,
        saved: false,
        comments: [],
      },
      {
        id: "p3",
        author: "凌晨两点半",
        avatar: "planet",
        time: "26 分钟前",
        topic: "音乐同频",
        content:
          "分享一首适合现在听的歌。\n如果你也喜欢，我们应该会有很多话可以聊。",
        scene: "music",
        likes: 64,
        liked: false,
        saved: false,
        comments: [{ author: "慢半拍", text: "耳机分你一半。" }],
      },
      {
        id: "p4",
        author: "慢热小狗",
        avatar: "flower",
        time: "38 分钟前",
        topic: "恋爱脑一下",
        content:
          "我好像不是一个很会说情话的人。\n但如果是你说的每一件小事，我都会记得。",
        likes: 203,
        liked: false,
        saved: false,
        comments: [],
      },
      {
        id: "p5",
        author: "有空一起发呆",
        avatar: "cloud",
        time: "1 小时前",
        topic: "日常碎片",
        content:
          "周末计划：逛一家旧书店，喝一杯不加糖的拿铁。\n还有，期待一个意料之外的人。",
        likes: 42,
        liked: false,
        saved: false,
        comments: [],
      },
    ],
  };
}
export type Action = { type: string; [key: string]: unknown };
function text(v: unknown, max: number) {
  if (typeof v !== "string" || !v.trim() || v.trim().length > max)
    throw new Error(`请填写 1–${max} 个字`);
  return v.trim();
}
export function mutate(state: State, a: Action): State {
  const s = structuredClone(state);
  const post = () => {
    const p = s.posts.find(
      (p) => p.id === a.id && !s.blocked.includes(p.author),
    );
    if (!p) throw new Error("动态不存在");
    return p;
  };
  switch (a.type) {
    case "publish": {
      if (s.posts.filter((p) => p.own).length >= 30)
        throw new Error("演示动态已达上限，请重置体验");
      const topic = text(a.topic, 20);
      if (!topics.slice(1).includes(topic)) throw new Error("话题不存在");
      s.posts.unshift({
        id: crypto.randomUUID(),
        author: s.profile.name,
        avatar: "star",
        time: "刚刚",
        topic,
        content: text(a.content, 500),
        likes: 0,
        liked: false,
        saved: false,
        comments: [],
        own: true,
      });
      break;
    }
    case "like": {
      const p = post();
      p.liked = !p.liked;
      p.likes += p.liked ? 1 : -1;
      break;
    }
    case "save": {
      const p = post();
      p.saved = !p.saved;
      break;
    }
    case "comment": {
      const p = post();
      if (p.comments.length >= 30) throw new Error("评论已达演示上限");
      p.comments.push({ author: s.profile.name, text: text(a.text, 200) });
      break;
    }
    case "match":
      s.matched = true;
      s.decision = "";
      break;
    case "message":
      if (!s.matched) throw new Error("请先开启一段相遇");
      if (s.messages.length >= 100) throw new Error("消息已达演示上限");
      s.messages.push({
        id: crypto.randomUUID(),
        from: "me",
        text: text(a.text, 500),
      });
      s.messages.push({
        id: crypto.randomUUID(),
        from: "them",
        text:
          s.messages.filter((m) => m.from === "me").length % 2
            ? "我喜欢这样的分享。慢慢聊就好，我在听。〔演示回复〕"
            : "那我们把这件事记在小小的约会清单里吧。〔演示回复〕",
      });
      break;
    case "heart":
      if (!s.matched) throw new Error("请先开启一段相遇");
      s.heart = !s.heart;
      break;
    case "decision":
      if (!s.matched) throw new Error("请先开启一段相遇");
      if (
        !["继续匿名认识", "申请交换资料", "结束这段相遇"].includes(
          String(a.value),
        )
      )
        throw new Error("无效选择");
      s.decision = String(a.value);
      if (a.value === "结束这段相遇") {
        s.matched = false;
        s.heart = false;
        s.messages = initialState().messages;
      }
      break;
    case "profile": {
      const old = s.profile.name;
      s.profile = {
        name: text(a.name, 16),
        bio: text(a.bio, 100),
        intent: text(a.intent, 40),
      };
      s.posts.forEach((p) => {
        if (p.own) p.author = s.profile.name;
        p.comments.forEach((c) => {
          if (c.author === old) c.author = s.profile.name;
        });
      });
      break;
    }
    case "report": {
      const p = post();
      if (!s.reports.includes(p.id)) s.reports.push(p.id);
      break;
    }
    case "block": {
      const p = post();
      if (p.own) throw new Error("不能屏蔽自己");
      if (!s.blocked.includes(p.author)) s.blocked.push(p.author);
      break;
    }
    case "reset":
      return initialState();
    default:
      throw new Error("不支持的操作");
  }
  return s;
}
