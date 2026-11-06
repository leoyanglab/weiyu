export function Avatar({
  kind = "moon",
  small = false,
}: {
  kind?: string;
  small?: boolean;
}) {
  const shapes: Record<string, string> = {
    moon: "☾",
    sun: "☀",
    planet: "♄",
    flower: "✿",
    cloud: "☁",
    star: "✧",
  };
  return (
    <span
      class={`avatar avatar-${kind} ${small ? "avatar-small" : ""}`}
      aria-hidden="true"
    >
      {shapes[kind] || "✧"}
    </span>
  );
}
