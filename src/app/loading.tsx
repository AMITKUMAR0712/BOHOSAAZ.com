export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="h-8 w-56 rounded-(--radius) bg-muted/40" />
      <div className="mt-6 grid gap-3">
        <div className="h-24 rounded-(--radius) bg-muted/30" />
        <div className="h-24 rounded-(--radius) bg-muted/30" />
        <div className="h-24 rounded-(--radius) bg-muted/30" />
      </div>
    </div>
  );
}
