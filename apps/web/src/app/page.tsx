import { Button } from "@cicada/ui";

export default function HomePage() {
  return (
    <main
      style={{
        padding: "var(--space-12)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        maxWidth: "var(--breakpoint-md)",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "var(--font-size-3xl)", margin: 0 }}>Cicada</h1>
      <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
        Phase 0 / Foundation. Tokens, components, and the Next.js app are wired up.
      </p>
      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    </main>
  );
}
