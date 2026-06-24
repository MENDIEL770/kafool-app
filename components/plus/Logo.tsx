"use client";

export default function Logo({ url, name, size = 40 }: { url?: string | null; name: string; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} style={{ height: size }} className="object-contain rounded-lg" />;
  }
  // fallback: initials badge in brand color
  const initials = name.trim().slice(0, 2);
  return (
    <div
      className="flex items-center justify-center rounded-xl font-bold text-white"
      style={{ width: size, height: size, background: "var(--primary)", fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}
