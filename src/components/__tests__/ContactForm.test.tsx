import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "../landing/ContactForm";

vi.mock("../../content/site", () => ({
  phoneTel: "tel:+14197056153",
  phoneDisplay: "419-705-6153",
  email: "fab@rmi-llc.net",
  companyNameFull: "Resource Mechanical Insulation, LLC",
  address: {
    street: "11677 Wayne Road, Suite 112",
    city: "Romulus",
    state: "MI",
    zip: "48174",
    full: "11677 Wayne Road, Suite 112, Romulus, MI 48174",
  },
}));

describe("ContactForm component", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Default successful response
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders the form with all required fields", () => {
      render(<ContactForm />);

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/project type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/project details/i)).toBeInTheDocument();
    });

    it("renders with custom title and subtitle", () => {
      render(
        <ContactForm
          title="Custom Title"
          subtitle="Custom subtitle text"
        />
      );

      expect(
        screen.getByRole("heading", { name: "Custom Title" })
      ).toBeInTheDocument();
      expect(screen.getByText("Custom subtitle text")).toBeInTheDocument();
    });

    it("renders with default title when not provided", () => {
      render(<ContactForm />);

      expect(
        screen.getByRole("heading", { name: "Request a Quote" })
      ).toBeInTheDocument();
    });

    it("renders submit button", () => {
      render(<ContactForm />);

      expect(
        screen.getByRole("button", { name: /send message/i })
      ).toBeInTheDocument();
    });

    it("renders project type options", () => {
      render(<ContactForm />);

      const select = screen.getByLabelText(/project type/i);
      const options = select.querySelectorAll("option");
      const optionTexts = Array.from(options).map((o) => o.textContent);

      expect(optionTexts).toContain("Select a project type...");
      expect(optionTexts).toContain("Insulation Services");
      expect(optionTexts).toContain("Materials");
      expect(optionTexts).toContain("Pipe Supports Pricing");
      expect(optionTexts).toContain("Other");
    });
  });

  describe("form validation", () => {
    it("shows error when name and company are both empty", async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      // Fill only email and message (leaving name and company empty)
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(
        screen.getByLabelText(/project details/i),
        "Test message"
      );

      // Submit
      await user.click(screen.getByRole("button", { name: /send message/i }));

      // Should show error for name/company - check for the error alert
      await waitFor(() => {
        const errorMessages = screen.getAllByRole("alert");
        const hasNameCompanyError = errorMessages.some(el =>
          el.textContent?.toLowerCase().includes("name or company")
        );
        expect(hasNameCompanyError).toBe(true);
      });
    });

    it("shows error when email and phone are both empty", async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      // Fill name and message
      await user.type(screen.getByLabelText(/^name/i), "John Doe");
      await user.type(
        screen.getByLabelText(/project details/i),
        "Test message"
      );

      // Submit
      await user.click(screen.getByRole("button", { name: /send message/i }));

      // Should show error for email/phone - check for the error alert
      await waitFor(() => {
        const errorMessages = screen.getAllByRole("alert");
        const hasEmailPhoneError = errorMessages.some(el =>
          el.textContent?.toLowerCase().includes("email or phone")
        );
        expect(hasEmailPhoneError).toBe(true);
      });
    });

    it("shows error for invalid email format", async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/^name/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "invalid-email");
      await user.type(
        screen.getByLabelText(/project details/i),
        "Test message"
      );

      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email/i)
        ).toBeInTheDocument();
      });
    });

    it("shows error when message is empty", async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/^name/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "test@example.com");

      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/project details are required/i)
        ).toBeInTheDocument();
      });
    });

    it("accepts valid phone number instead of email", async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/^name/i), "John Doe");
      await user.type(screen.getByLabelText(/phone/i), "555-123-4567");
      await user.type(
        screen.getByLabelText(/project details/i),
        "Test message"
      );

      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
    });

    it("clears field errors when user starts typing", async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      // Trigger validation error
      await user.click(screen.getByRole("button", { name: /send message/i }));

      // Wait for errors to appear
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/^name/i);
        expect(nameInput).toHaveAttribute("aria-invalid", "true");
      });

      // Start typing in name field
      await user.type(screen.getByLabelText(/^name/i), "J");

      // Error should be cleared for the name field
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/^name/i);
        expect(nameInput).toHaveAttribute("aria-invalid", "false");
      });
    });
  });

  describe("form submission", () => {
    it("submits form data correctly", async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/^name/i), "John Doe");
      await user.type(screen.getByLabelText(/company/i), "ACME Corp");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(screen.getByLabelText(/phone/i), "555-123-4567");
      await user.selectOptions(
        screen.getByLabelText(/project type/i),
        "installation"
      );
      await user.type(
        screen.getByLabelText(/project details/i),
        "Test project details"
      );

      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/contact",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      // Verify the body contains expected data
      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.name).toBe("John Doe");
      expect(body.company).toBe("ACME Corp");
      expect(body.email).toBe("john@example.com");
      expect(body.phone).toBe("555-123-4567");
      expect(body.serviceType).toBe("installation");
      expect(body.message).toBe("Test project details");
    });

    it("disables submit button while submitting", async () => {
      const user = userEvent.setup();

      // Make fetch take a while
      fetchMock.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ ok: true }),
                }),
              100
            )
          )
      );

      render(<ContactForm />);

      await user.type(screen.getByLabelText(/^name/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(
        screen.getByLabelText(/project details/i),
        "Test message"
      );

      const submitButton = screen.getByRole("button", { name: /send message/i });
      await user.click(submitButton);

      // Button should be disabled during submission
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /sending/i })
        ).toBeDisabled();
      });
    });

    it("shows success message after successful submission", async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/^name/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(
        screen.getByLabelText(/project details/i),
        "Test message"
      );

      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText(/thank you for your inquiry/i)).toBeInTheDocument();
      });
    });

    it("clears form after successful submission", async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/^name/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(
        screen.getByLabelText(/project details/i),
        "Test message"
      );

      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/^name/i)).toHaveValue("");
        expect(screen.getByLabelText(/email/i)).toHaveValue("");
        expect(screen.getByLabelText(/project details/i)).toHaveValue("");
      });
    });

    it("re-enables submit button after submission failure", async () => {
      const user = userEvent.setup();

      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<ContactForm />);

      await user.type(screen.getByLabelText(/^name/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(
        screen.getByLabelText(/project details/i),
        "Test message"
      );

      await user.click(screen.getByRole("button", { name: /send message/i }));

      // After failure, submit button should be re-enabled (not stuck on "Sending...")
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /send message/i })
        ).not.toBeDisabled();
      });
    });

    it("preserves form data after submission error", async () => {
      const user = userEvent.setup();

      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<ContactForm />);

      await user.type(screen.getByLabelText(/^name/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(
        screen.getByLabelText(/project details/i),
        "Test message"
      );

      await user.click(screen.getByRole("button", { name: /send message/i }));

      // Wait for submission to complete (button re-enabled)
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /send message/i })
        ).not.toBeDisabled();
      });

      // Form data should still be present
      expect(screen.getByLabelText(/^name/i)).toHaveValue("John Doe");
      expect(screen.getByLabelText(/email/i)).toHaveValue("john@example.com");
      expect(screen.getByLabelText(/project details/i)).toHaveValue(
        "Test message"
      );
    });

    it("prevents double submission", async () => {
      const user = userEvent.setup();

      // Make fetch slow
      fetchMock.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ ok: true }),
                }),
              200
            )
          )
      );

      render(<ContactForm />);

      await user.type(screen.getByLabelText(/^name/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(
        screen.getByLabelText(/project details/i),
        "Test message"
      );

      const submitButton = screen.getByRole("button", { name: /send message/i });

      // Click multiple times quickly
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Wait for submission to complete
      await waitFor(
        () => {
          expect(screen.getByText(/thank you for your inquiry/i)).toBeInTheDocument();
        },
        { timeout: 500 }
      );

      // Should only have been called once
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("honeypot field", () => {
    it("includes honeypot field in form (hidden)", () => {
      render(<ContactForm />);

      const honeypotField = screen.getByLabelText(/website/i);
      expect(honeypotField).toBeInTheDocument();
      // Check it's hidden via parent container
      expect(honeypotField.closest('[aria-hidden="true"]')).toBeInTheDocument();
    });

    it("sends empty honeypot field value", async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await user.type(screen.getByLabelText(/^name/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(
        screen.getByLabelText(/project details/i),
        "Test message"
      );

      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.website).toBe("");
    });
  });

  describe("accessibility", () => {
    it("has proper ARIA attributes on form", () => {
      render(<ContactForm />);

      // Form doesn't have role="form" by default, query directly
      const form = document.querySelector("form");
      expect(form).toHaveAttribute("aria-busy", "false");
    });

    it("marks required fields with aria-required", () => {
      render(<ContactForm />);

      expect(screen.getByLabelText(/^name/i)).toHaveAttribute(
        "aria-required",
        "true"
      );
      expect(screen.getByLabelText(/email/i)).toHaveAttribute(
        "aria-required",
        "true"
      );
      expect(screen.getByLabelText(/project type/i)).toHaveAttribute(
        "aria-required",
        "true"
      );
      expect(screen.getByLabelText(/project details/i)).toHaveAttribute(
        "aria-required",
        "true"
      );
    });

    it("sets aria-invalid on invalid fields", async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/^name/i)).toHaveAttribute(
          "aria-invalid",
          "true"
        );
      });
    });

    it("has proper heading structure", () => {
      render(<ContactForm />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toBeInTheDocument();
    });

    it("links error messages to fields via aria-describedby", async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/^name/i);
        // Check that aria-describedby contains error reference when invalid
        expect(nameInput).toHaveAttribute("aria-invalid", "true");
        const describedBy = nameInput.getAttribute("aria-describedby");
        // The describedby should reference an error element
        expect(describedBy).toBeTruthy();
      });
    });
  });

  describe("preselected project type", () => {
    it("preselects project type from prop", () => {
      render(<ContactForm preselectedProjectType="materials" />);

      expect(screen.getByLabelText(/project type/i)).toHaveValue("materials");
    });
  });
});
