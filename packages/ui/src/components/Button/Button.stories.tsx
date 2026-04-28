import { Button, type ButtonProps } from "./Button";

import type { Story } from "@ladle/react";

export default {
  title: "Components/Button",
};

export const Default: Story<ButtonProps> = (args) => <Button {...args}>Save changes</Button>;
Default.args = { variant: "primary", size: "md" };

export const AllVariants: Story = () => (
  <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="danger">Danger</Button>
  </div>
);

export const AllSizes: Story = () => (
  <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
    <Button size="sm">Small</Button>
    <Button size="md">Medium</Button>
    <Button size="lg">Large</Button>
  </div>
);

export const Disabled: Story = () => (
  <div style={{ display: "flex", gap: "var(--space-3)" }}>
    <Button disabled>Primary disabled</Button>
    <Button variant="secondary" disabled>
      Secondary disabled
    </Button>
  </div>
);

export const AsChildLink: Story = () => (
  <Button asChild>
    <a href="https://example.com" target="_blank" rel="noreferrer">
      Open external link
    </a>
  </Button>
);
