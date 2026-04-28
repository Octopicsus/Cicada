import "../src/tokens/index.css";

import type { GlobalProvider } from "@ladle/react";

export const Provider: GlobalProvider = ({ children }) => (
  <div
    style={{
      fontFamily: "var(--font-sans)",
      color: "var(--color-text-primary)",
      background: "var(--color-surface-canvas)",
      padding: "var(--space-6)",
      minHeight: "100vh",
    }}
  >
    {children}
  </div>
);
