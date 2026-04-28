import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("defaults to type=button to avoid unintended form submits", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("applies default variant + size via data attributes", () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-variant", "primary");
    expect(btn).toHaveAttribute("data-size", "md");
  });

  it("forwards a custom variant + size", () => {
    render(
      <Button variant="danger" size="lg">
        Delete
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-variant", "danger");
    expect(btn).toHaveAttribute("data-size", "lg");
  });

  it("fires onClick", () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Tap</Button>);
    screen.getByRole("button").click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("renders as the child element when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/dashboard">Go</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Go" });
    expect(link).toHaveAttribute("href", "/dashboard");
    expect(link).toHaveAttribute("data-variant", "primary");
  });
});
