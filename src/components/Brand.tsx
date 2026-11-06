import { Heart, Sparkles } from "lucide-preact";

export function Brand() {
  return (
    <a href="/" class="brand">
      <span class="brand-symbol">
        <Heart size={22} fill="currentColor" />
        <Sparkles size={13} />
      </span>
      <span>
        未遇<span class="brand-en">WEIYU</span>
      </span>
    </a>
  );
}
