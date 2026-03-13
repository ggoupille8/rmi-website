import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";

// Component that throws on render
function ThrowingChild({ message }: { message: string }): JSX.Element {
  throw new Error(message);
}

// Component that renders normally
function GoodChild() {
  return <div>All good</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );

    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("renders fallback when child throws", () => {
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <ThrowingChild message="Test error" />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("All good")).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("renders null when child throws and no fallback provided", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(
      <ErrorBoundary>
        <ThrowingChild message="Test error" />
      </ErrorBoundary>
    );

    expect(container.innerHTML).toBe("");

    consoleSpy.mockRestore();
  });

  it("logs error via componentDidCatch", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Fallback</div>}>
        <ThrowingChild message="Caught error" />
      </ErrorBoundary>
    );

    // componentDidCatch logs "Component error:" + error + info
    const componentErrorCall = consoleSpy.mock.calls.find(
      (call) => call[0] === "Component error:"
    );
    expect(componentErrorCall).toBeDefined();
    expect(componentErrorCall?.[1]).toBeInstanceOf(Error);
    expect((componentErrorCall?.[1] as Error).message).toBe("Caught error");

    consoleSpy.mockRestore();
  });
});
