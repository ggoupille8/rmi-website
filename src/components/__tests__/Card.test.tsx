import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Card from "../landing/Card";

describe("Card component", () => {
  describe("rendering", () => {
    it("renders children content", () => {
      render(
        <Card>
          <p>Test content</p>
        </Card>
      );

      expect(screen.getByText("Test content")).toBeInTheDocument();
    });

    it("applies default variant class", () => {
      render(
        <Card>
          <p>Content</p>
        </Card>
      );

      const card = screen.getByText("Content").parentElement;
      expect(card).toHaveClass("card");
    });

    it("applies custom variant classes", () => {
      const variants = [
        "hover",
        "elevated",
        "interactive",
        "gradient",
        "accent",
        "bordered",
        "minimal",
      ] as const;

      variants.forEach((variant) => {
        const { unmount } = render(
          <Card variant={variant}>
            <p>{variant} content</p>
          </Card>
        );

        const card = screen.getByText(`${variant} content`).parentElement;
        expect(card).toHaveClass(`card-${variant}`);
        unmount();
      });
    });

    it("applies custom className", () => {
      render(
        <Card className="custom-class">
          <p>Content</p>
        </Card>
      );

      const card = screen.getByText("Content").parentElement;
      expect(card).toHaveClass("custom-class");
    });

    it("combines variant and custom classes", () => {
      render(
        <Card variant="elevated" className="my-custom-class">
          <p>Content</p>
        </Card>
      );

      const card = screen.getByText("Content").parentElement;
      expect(card).toHaveClass("card-elevated");
      expect(card).toHaveClass("my-custom-class");
    });
  });

  describe("interactivity", () => {
    it("does not have button role when not clickable", () => {
      render(
        <Card>
          <p>Non-clickable</p>
        </Card>
      );

      const card = screen.getByText("Non-clickable").parentElement;
      expect(card).not.toHaveAttribute("role");
      expect(card).not.toHaveAttribute("tabIndex");
    });

    it("has button role when onClick is provided", () => {
      const handleClick = vi.fn();

      render(
        <Card onClick={handleClick}>
          <p>Clickable</p>
        </Card>
      );

      const card = screen.getByText("Clickable").parentElement;
      expect(card).toHaveAttribute("role", "button");
      expect(card).toHaveAttribute("tabIndex", "0");
    });

    it("calls onClick handler when clicked", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Card onClick={handleClick}>
          <p>Click me</p>
        </Card>
      );

      const card = screen.getByText("Click me").parentElement!;
      await user.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("applies cursor-pointer class when clickable", () => {
      const handleClick = vi.fn();

      render(
        <Card onClick={handleClick}>
          <p>Clickable</p>
        </Card>
      );

      const card = screen.getByText("Clickable").parentElement;
      expect(card).toHaveClass("cursor-pointer");
    });

    it("does not apply cursor-pointer class when not clickable", () => {
      render(
        <Card>
          <p>Non-clickable</p>
        </Card>
      );

      const card = screen.getByText("Non-clickable").parentElement;
      expect(card).not.toHaveClass("cursor-pointer");
    });
  });

  describe("keyboard accessibility", () => {
    it("triggers onClick on Enter key", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Card onClick={handleClick}>
          <p>Press Enter</p>
        </Card>
      );

      const card = screen.getByText("Press Enter").parentElement!;
      card.focus();
      await user.keyboard("{Enter}");

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("triggers onClick on Space key", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Card onClick={handleClick}>
          <p>Press Space</p>
        </Card>
      );

      const card = screen.getByText("Press Space").parentElement!;
      card.focus();
      await user.keyboard(" ");

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("does not trigger onClick on other keys", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Card onClick={handleClick}>
          <p>Press other key</p>
        </Card>
      );

      const card = screen.getByText("Press other key").parentElement!;
      card.focus();
      await user.keyboard("a");

      expect(handleClick).not.toHaveBeenCalled();
    });

    it("does not have keyboard handlers when not clickable", () => {
      render(
        <Card>
          <p>Non-clickable</p>
        </Card>
      );

      const card = screen.getByText("Non-clickable").parentElement;
      // onKeyDown is not attached when onClick is not provided
      expect(card?.onkeydown).toBeNull();
    });
  });

  describe("complex children", () => {
    it("renders nested React components", () => {
      const NestedComponent = () => (
        <div data-testid="nested">
          <span>Nested content</span>
        </div>
      );

      render(
        <Card>
          <NestedComponent />
        </Card>
      );

      expect(screen.getByTestId("nested")).toBeInTheDocument();
      expect(screen.getByText("Nested content")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
      render(
        <Card>
          <h3>Title</h3>
          <p>Description</p>
          <button>Action</button>
        </Card>
      );

      expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
        "Title"
      );
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByRole("button")).toHaveTextContent("Action");
    });
  });
});
