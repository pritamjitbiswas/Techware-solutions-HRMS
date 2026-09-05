import { avatarClass, initials } from "../../lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-24 w-24 text-3xl",
};

export function Avatar({ name, src, size = "md", className = "" }: AvatarProps) {
  const sizeClass = SIZES[size];
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} shrink-0 rounded-full border border-slate-200 object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} ${avatarClass(name)} flex shrink-0 items-center justify-center rounded-full border border-slate-200 font-display font-bold ${className}`}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
