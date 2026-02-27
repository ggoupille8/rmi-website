import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

interface ContactFormProps {
  preselectedProjectType?: string;
}

export default function ContactForm({
  preselectedProjectType,
}: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    projectType: preselectedProjectType || "",
    message: "",
    website: "", // Honeypot field (should stay empty)
  });
  const mountedAtRef = useRef(Date.now());
  const formRef = useRef<HTMLFormElement>(null);

  // Signal that React has hydrated (used by Playwright tests)
  useEffect(() => {
    formRef.current?.setAttribute("data-hydrated", "true");
  }, []);

  // Update projectType when preselectedProjectType prop changes or URL param is present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectTypeParam = urlParams.get("projectType");

    if (projectTypeParam) {
      setFormData((prev) => ({ ...prev, projectType: projectTypeParam }));
      // Clean up URL parameter after reading it
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    } else if (preselectedProjectType) {
      setFormData((prev) => ({ ...prev, projectType: preselectedProjectType }));
    }

    // Listen for custom event from CTA buttons
    const handlePreselect = (e: CustomEvent) => {
      setFormData((prev) => ({ ...prev, projectType: e.detail.projectType }));
    };

    window.addEventListener(
      "preselectProjectType",
      handlePreselect as EventListener
    );

    return () => {
      window.removeEventListener(
        "preselectProjectType",
        handlePreselect as EventListener
      );
    };
  }, [preselectedProjectType]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    projectType?: string;
    message?: string;
  }>({});
  const [contactError, setContactError] = useState(false); // email-or-phone group error
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const projectTypeRef = useRef<HTMLSelectElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name as keyof typeof fieldErrors];
        return next;
      });
    }

    // Typing in either email or phone clears the contact group error on both
    if ((name === "email" || name === "phone") && contactError) {
      setContactError(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Prevent double-submit: if already submitting, ignore
    if (isSubmitting) {
      return;
    }

    flushSync(() => {
      setIsSubmitting(true);
    });
    // Yield a microtask so submitting state is observable in the DOM.
    await Promise.resolve();
    setSubmitStatus("idle");

    // Validate required fields: Name, Email-or-Phone, Project Type, Project Details
    const errors: typeof fieldErrors = {};
    const needsContact = !formData.email.trim() && !formData.phone.trim();

    if (!formData.name.trim()) {
      errors.name = "Please enter your name";
    }
    if (!formData.projectType.trim()) {
      errors.projectType = "Please select a project type";
    }
    if (!formData.message.trim()) {
      errors.message = "Please describe your project";
    }

    const hasErrors = Object.keys(errors).length > 0 || needsContact;

    if (hasErrors) {
      setFieldErrors(errors);
      setContactError(needsContact);
      setIsSubmitting(false);

      // Scroll to first error field smoothly (top-to-bottom order)
      setTimeout(() => {
        const firstErrorField = errors.name
          ? nameInputRef.current
          : needsContact
            ? emailInputRef.current
            : errors.projectType
              ? projectTypeRef.current
              : messageRef.current;
        firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
        firstErrorField?.focus();
      }, 0);
      return;
    }

    const elapsedMs = Date.now() - mountedAtRef.current;
    const fastSubmit = elapsedMs < 800;

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          company: formData.company.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          message: formData.message.trim(),
          serviceType: formData.projectType.trim(),
          website: formData.website, // Should be empty
          timestamp: Date.now(), // Client timestamp at submission time
          metadata: {
            elapsedMs,
            fastSubmit,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Contact submit failed: ${response.status}`);
      }

      setSubmitStatus("success");
      setFieldErrors({});
      setContactError(false);

      // Track successful form submission (GA4 conversion event)
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", "form_submission", {
          event_category: "contact",
          event_label: "quote_request",
          value: 1,
        });
      }
      setFormData({
        name: "",
        company: "",
        email: "",
        phone: "",
        projectType: "",
        message: "",
        website: "",
      });
    } catch (error) {
      console.error("Form submission error:", error);
      // Only show generic error for network/server errors
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase =
    "block w-full rounded-md shadow-sm focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 text-base px-3 py-2 border bg-neutral-800 text-white placeholder:text-neutral-400 leading-relaxed min-w-0 min-h-[44px]";
  const inputNormal = `${inputBase} border-neutral-600 focus-visible:border-primary-400`;
  const inputError = `${inputBase} border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500`;

  return (
    <section
      className="bg-neutral-900 overflow-hidden border-t border-neutral-700/40"
      aria-labelledby="contact-heading"
    >
      <div className="container-custom pt-8 pb-10 sm:pt-10 sm:pb-14 lg:pt-12 lg:pb-16">
        <div className="max-w-2xl mx-auto">
          <h2
            id="contact-heading"
            className="text-xl sm:text-2xl lg:text-3xl font-bold text-white uppercase tracking-tight text-center"
          >
            Get a Quote
          </h2>
          <div className="w-12 h-0.5 bg-accent-500 mt-4 rounded-full mx-auto" />
          <p className="mt-3 text-neutral-400 text-sm sm:text-base text-center">
            Tell us what you need.
          </p>

          <form
            ref={formRef}
            method="post"
            onSubmit={handleSubmit}
            className="mt-6 space-y-3"
            noValidate
            aria-busy={isSubmitting ? "true" : "false"}
          >
            {/* Name + Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-neutral-200 mb-1"
                >
                  Name
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className={fieldErrors.name ? inputError : inputNormal}
                  aria-invalid={fieldErrors.name ? "true" : "false"}
                  aria-describedby={fieldErrors.name ? "name-error" : undefined}
                />
                {fieldErrors.name && (
                  <div id="name-error" className="mt-1 text-xs text-red-400" role="alert" aria-live="polite">
                    {fieldErrors.name}
                  </div>
                )}
              </div>
              <div>
                <label
                  htmlFor="company"
                  className="block text-sm font-semibold text-neutral-200 mb-1"
                >
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className={inputNormal}
                />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-neutral-200 mb-1"
                >
                  Email
                </label>
                <input
                  ref={emailInputRef}
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={contactError ? inputError : inputNormal}
                  aria-invalid={contactError ? "true" : "false"}
                  aria-describedby={contactError ? "contact-error" : undefined}
                />
                {contactError && (
                  <div id="contact-error" className="mt-1 text-xs text-red-400" role="alert" aria-live="polite">
                    Please provide an email or phone number
                  </div>
                )}
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-semibold text-neutral-200 mb-1"
                >
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={contactError ? inputError : inputNormal}
                  aria-invalid={contactError ? "true" : "false"}
                />
              </div>
            </div>

            {/* Project Type */}
            <div>
              <label
                htmlFor="projectType"
                className="block text-sm font-semibold text-neutral-200 mb-1"
              >
                Project Type
              </label>
              <select
                ref={projectTypeRef}
                id="projectType"
                name="projectType"
                value={formData.projectType}
                onChange={handleChange}
                className={`${fieldErrors.projectType ? inputError : inputNormal} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%239ca3af%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.25em_1.25em] bg-[right_0.5rem_center] bg-no-repeat pr-8`}
                aria-invalid={fieldErrors.projectType ? "true" : "false"}
                aria-describedby={fieldErrors.projectType ? "projectType-error" : undefined}
              >
                <option value="">Select a project type...</option>
                <option value="installation">Insulation Services</option>
                <option value="materials">Materials</option>
                <option value="pipe-supports">Pipe Supports Pricing</option>
                <option value="other">Other</option>
              </select>
              {fieldErrors.projectType && (
                <div id="projectType-error" className="mt-1 text-xs text-red-400" role="alert" aria-live="polite">
                  {fieldErrors.projectType}
                </div>
              )}
            </div>

            {/* Project Details */}
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-semibold text-neutral-200 mb-1"
              >
                Project Details
              </label>
              <textarea
                ref={messageRef}
                id="message"
                name="message"
                required
                rows={3}
                value={formData.message}
                onChange={handleChange}
                onInput={(e) => {
                  const textarea = e.currentTarget;
                  textarea.style.height = "auto";
                  textarea.style.height = `${textarea.scrollHeight}px`;
                }}
                placeholder="Describe your project, timeline, and requirements..."
                className={`${fieldErrors.message ? inputError : inputNormal} resize-none`}
                aria-invalid={fieldErrors.message ? "true" : "false"}
                aria-describedby={fieldErrors.message ? "message-error" : undefined}
              />
              {fieldErrors.message && (
                <div id="message-error" className="mt-1 text-xs text-red-400" role="alert" aria-live="polite">
                  {fieldErrors.message}
                </div>
              )}
            </div>

            {submitStatus === "success" && (
              <div
                className="rounded-md bg-success-dark/20 p-3 text-success-light border border-success/20 text-sm"
                role="alert"
                aria-live="polite"
              >
                Thank you for your inquiry! Our team will review your request
                and get back to you within 24 hours.
              </div>
            )}

            {submitStatus === "error" && (
              <div
                className="rounded-md bg-error-dark/20 p-3 text-red-400 border border-red-500/20 text-sm"
                role="alert"
                aria-live="polite"
              >
                Something went wrong. Please try again or call us directly.
              </div>
            )}

            {/* Honeypot field - hidden from users */}
            <div
              className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0 pointer-events-none"
              aria-hidden="true"
            >
              <label htmlFor="website">Website</label>
              <input
                type="text"
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={formData.website}
                onChange={handleChange}
                className="h-0 w-0 border-0 p-0 m-0"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3 text-base sm:text-lg font-bold"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
