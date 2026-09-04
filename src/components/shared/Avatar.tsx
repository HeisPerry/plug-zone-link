import { avatarColor, cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  username,
  src,
  size = 40,
  className,
}: {
  name: string;
  username: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) };
  if (src) {
    return <img src={src} alt={name} style={style} className={cn("shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <div
      style={{ ...style, backgroundColor: avatarColor(username), color: "#fff" }}
      className={cn("flex shrink-0 items-center justify-center rounded-full font-heading font-bold ", className)}
      aria-hidden="true"
    >
      {initials(name || username)}
    </div>
  );
}
