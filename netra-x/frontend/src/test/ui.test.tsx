import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge, KpiCard, ConnectionLost } from "../components/ui";

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge status="ONLINE" />);
    expect(screen.getByText("ONLINE")).toBeInTheDocument();
  });

  it("falls back gracefully for unknown status", () => {
    render(<StatusBadge status="WEIRD_STATUS" />);
    expect(screen.getByText("WEIRD_STATUS")).toBeInTheDocument();
  });
});

describe("KpiCard", () => {
  it("renders label and value", () => {
    render(<KpiCard label="CAMERAS ONLINE" value="42/45" />);
    expect(screen.getByText("CAMERAS ONLINE")).toBeInTheDocument();
    expect(screen.getByText("42/45")).toBeInTheDocument();
  });

  it("renders an optional suffix", () => {
    render(<KpiCard label="AVG SPEED" value={32} suffix="km/h" />);
    expect(screen.getByText("km/h")).toBeInTheDocument();
  });
});

describe("ConnectionLost", () => {
  it("shows a retry button and calls onRetry when clicked", async () => {
    const onRetry = vi.fn();
    render(<ConnectionLost onRetry={onRetry} />);
    const btn = screen.getByText("Retry");
    btn.click();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
