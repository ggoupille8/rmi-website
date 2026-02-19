import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";

interface ContactFormProps {
  title?: string;
  subtitle?: string;
  preselectedProjectType?: string;
}

export default function ContactForm({
  title = "Request a Quote",
  subtitle = "Get in touch with our team to discuss your insulation project or material needs.",
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
    name?: boolean;
    company?: boolean;
    email?: boolean;
    phone?: boolean;
    projectType?: boolean;
    message?: boolean;
  }>({});
  const nameInputRef = useRef<HTMLInputElement>(null);
  const companyInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const projectTypeRef = useRef<HTMLSelectElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // Helper function to validate email format
  const isValidEmail = (email: string): boolean => {
    if (!email.trim()) return false;
    // More robust email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email.trim());
  };

  // Helper function to validate phone format (US phone numbers)
  const isValidPhone = (phone: string): boolean => {
    if (!phone.trim()) return false;
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    // Check if it's a valid US phone number (10 digits, or 11 digits starting with 1)
    return (digitsOnly.length === 10) || (digitsOnly.length === 11 && digitsOnly[0] === '1');
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    
    // Clear field error when user starts typing
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: false }));
    }
    
    // Special handling for email/phone: if one is filled and valid, clear the other's "required" error
    if (name === 'email') {
      if (isValidEmail(value.trim())) {
        // If email is valid, clear phone error (it was showing "required" error)
        setFieldErrors((prev) => {
          // Only clear phone error if phone is empty (required error), not if it has format error
          if (prev.phone && !newFormData.phone.trim()) {
            return { ...prev, phone: false };
          }
          return prev;
        });
      }
    }
    
    if (name === 'phone') {
      if (isValidPhone(value.trim())) {
        // If phone is valid, clear email error (it was showing "required" error)
        setFieldErrors((prev) => {
          // Only clear email error if email is empty (required error), not if it has format error
          if (prev.email && !newFormData.email.trim()) {
            return { ...prev, email: false };
          }
          return prev;
        });
      }
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
    setFieldErrors({});

    // Validate that at least name or company is provided
    const nameOrCompanyError = !formData.name.trim() && !formData.company.trim();
    if (nameOrCompanyError) {
      setFieldErrors({
        name: true,
        company: true,
      });
    }

    // Validate that at least email or phone is provided
    const emailProvided = formData.email.trim();
    const phoneProvided = formData.phone.trim();
    const emailOrPhoneError = !emailProvided && !phoneProvided;
    
    // Validate email format if provided
    let emailFormatError = false;
    if (emailProvided) {
      emailFormatError = !isValidEmail(formData.email);
    }
    
    // Validate phone format if provided
    let phoneFormatError = false;
    if (phoneProvided) {
      phoneFormatError = !isValidPhone(formData.phone);
    }
    
    // Set errors appropriately
    if (emailOrPhoneError) {
      setFieldErrors((prev) => ({
        ...prev,
        email: true,
        phone: true,
      }));
    } else {
      // Only show errors if format is invalid, not if just missing (since one is provided)
      if (emailFormatError) {
        setFieldErrors((prev) => ({
          ...prev,
          email: true,
        }));
      }
      if (phoneFormatError) {
        setFieldErrors((prev) => ({
          ...prev,
          phone: true,
        }));
      }
    }

    // Normalize project type so submissions always include a value
    const resolvedProjectType = formData.projectType.trim() || "other";
    if (!formData.projectType.trim()) {
      setFormData((prev) => ({ ...prev, projectType: "other" }));
    }
    // Validate that projectType is provided
    const projectTypeError = !resolvedProjectType;
    if (projectTypeError) {
      setFieldErrors((prev) => ({
        ...prev,
        projectType: true,
      }));
    }

    // Validate that message is provided
    const messageError = !formData.message.trim();
    if (messageError) {
      setFieldErrors((prev) => ({
        ...prev,
        message: true,
      }));
    }

    if (nameOrCompanyError || emailOrPhoneError || emailFormatError || phoneFormatError || projectTypeError || messageError) {
      setIsSubmitting(false);
      // Focus first error field (top-left to bottom-right order)
      setTimeout(() => {
        if (nameOrCompanyError && nameInputRef.current) {
          nameInputRef.current.focus();
        } else if (emailOrPhoneError && emailInputRef.current) {
          emailInputRef.current.focus();
        } else if (projectTypeError && projectTypeRef.current) {
          projectTypeRef.current.focus();
        } else if (messageError && messageRef.current) {
          messageRef.current.focus();
        }
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
          serviceType: resolvedProjectType,
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

  const emailErrorMessage = fieldErrors.email
    ? formData.email.trim()
      ? "Please enter a valid email address."
      : isValidPhone(formData.phone)
        ? ""
        : "Email or phone is required."
    : "";

  const phoneErrorMessage = fieldErrors.phone
    ? formData.phone.trim()
      ? "Please enter a valid phone number (10 digits)."
      : isValidEmail(formData.email)
        ? ""
        : "Email or phone is required."
    : "";

  return (
    <section
      className="section-padding-sm bg-neutral-800"
      aria-labelledby="contact-heading"
    >
      <div className="container-custom">
        <div className="mx-auto max-w-3xl">
          <div className="text-center flex flex-col items-center">
            <h2 id="contact-heading" className="section-header-stripe font-bold tracking-wider text-white uppercase text-2xl sm:text-3xl lg:text-4xl">
              {title}
            </h2>
            <p className="mt-3 text-lg sm:text-xl text-neutral-200">{subtitle}</p>
          </div>
        </div>
        <div className="mx-auto mt-2 sm:mt-3 max-w-3xl">
          <div className="card-elevated p-4 sm:p-5 bg-neutral-900 border-neutral-700">
            <form
              onSubmit={handleSubmit}
              className="space-y-3 sm:space-y-4"
              noValidate
              aria-busy={isSubmitting ? "true" : "false"}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 -mt-3 sm:-mt-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-neutral-200 leading-relaxed mb-1.5"
                >
                  Name <span className="text-error" aria-hidden="true">*</span>
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className={`block w-full rounded-md shadow-sm focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 text-sm px-3 py-2.5 border bg-neutral-700 text-neutral-100 leading-relaxed min-w-0 ${
                    fieldErrors.name
                      ? "border-error focus-visible:border-error focus-visible:ring-error"
                      : "border-neutral-600 focus-visible:border-primary-400"
                  }`}
                  aria-required="true"
                  aria-invalid={fieldErrors.name ? "true" : "false"}
                  aria-describedby={fieldErrors.name ? "name-error" : undefined}
                />
                {fieldErrors.name && (
                  <div id="name-error" className="mt-1 text-xs text-error-light" role="alert" aria-live="polite">
                    Name or company is required.
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="company"
                  className="block text-sm font-medium text-neutral-200 leading-relaxed mb-1.5"
                >
                  Company
                </label>
                <input
                  ref={companyInputRef}
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className={`block w-full rounded-md shadow-sm focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 text-sm px-3 py-2.5 border bg-neutral-700 text-neutral-100 leading-relaxed min-w-0 ${
                    fieldErrors.company
                      ? "border-error focus-visible:border-error focus-visible:ring-error"
                      : "border-neutral-600 focus-visible:border-primary-400"
                  }`}
                  aria-invalid={fieldErrors.company ? "true" : "false"}
                  aria-describedby={fieldErrors.company ? "company-error" : undefined}
                />
                {fieldErrors.company && (
                  <div id="company-error" className="mt-1 text-xs text-error-light" role="alert" aria-live="polite">
                    Name or company is required.
                  </div>
                )}
              </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-neutral-200 leading-relaxed mb-1.5"
                >
                  Email
                </label>
                <input
                  ref={emailInputRef}
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  aria-required="true"
                  className={`block w-full rounded-md shadow-sm focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 text-sm px-3 py-2.5 border bg-neutral-700 text-neutral-100 leading-relaxed min-w-0 ${
                    fieldErrors.email
                      ? "border-error focus-visible:border-error focus-visible:ring-error"
                      : "border-neutral-600 focus-visible:border-primary-400"
                  }`}
                  aria-invalid={fieldErrors.email ? "true" : "false"}
                  aria-describedby={fieldErrors.email ? "email-hint email-error" : "email-hint"}
                />
                <p id="email-hint" className="sr-only">
                  Email or phone required
                </p>
                {emailErrorMessage && (
                  <div id="email-error" className="mt-1 text-xs text-error-light" role="alert" aria-live="polite">
                    {emailErrorMessage}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-neutral-200 leading-relaxed mb-1.5"
                >
                  Phone
                </label>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`block w-full rounded-md shadow-sm focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 text-sm px-3 py-2.5 border bg-neutral-700 text-neutral-100 leading-relaxed min-w-0 ${
                    fieldErrors.phone
                      ? "border-error focus-visible:border-error focus-visible:ring-error"
                      : "border-neutral-600 focus-visible:border-primary-400"
                  }`}
                  aria-invalid={fieldErrors.phone ? "true" : "false"}
                  aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                />
                {phoneErrorMessage && (
                  <div id="phone-error" className="mt-1 text-xs text-error-light" role="alert" aria-live="polite">
                    {phoneErrorMessage}
                  </div>
                )}
              </div>
              </div>

              <div>
                <label
                  htmlFor="projectType"
                className="block text-sm font-medium text-neutral-200 leading-relaxed mb-1.5"
              >
                Project Type <span className="text-error" aria-hidden="true">*</span>
              </label>
              <select
                ref={projectTypeRef}
                id="projectType"
                name="projectType"
                required
                value={formData.projectType}
                onChange={handleChange}
                className={`block w-full rounded-md shadow-sm focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 text-sm px-3 py-2.5 border bg-neutral-700 text-neutral-100 leading-relaxed min-w-0 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%239ca3af%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.25em_1.25em] bg-[right_0.5rem_center] bg-no-repeat pr-8 ${
                  fieldErrors.projectType
                    ? "border-error focus-visible:border-error focus-visible:ring-error"
                    : "border-neutral-600 focus-visible:border-primary-500"
                }`}
                aria-required="true"
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
                <div id="projectType-error" className="mt-1 text-xs text-error-light" role="alert" aria-live="polite">
                  Project type is required.
                </div>
              )}
              </div>

              <div>
                <label
                  htmlFor="message"
                className="block text-sm font-medium text-neutral-200 leading-relaxed mb-1.5"
              >
                Project Details <span className="text-error" aria-hidden="true">*</span>
              </label>
              <textarea
                ref={messageRef}
                id="message"
                name="message"
                rows={4}
                required
                value={formData.message}
                onChange={handleChange}
                onInput={(e) => {
                  const textarea = e.currentTarget;
                  textarea.style.height = "auto";
                  textarea.style.height = `${textarea.scrollHeight}px`;
                }}
                placeholder="Please describe your project, timeline, and any specific requirements..."
                className={`block w-full rounded-md shadow-sm focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 text-sm px-3 py-2.5 border bg-neutral-700 text-neutral-100 leading-relaxed min-w-0 resize-none min-h-[120px] ${
                  fieldErrors.message
                    ? "border-error focus-visible:border-error focus-visible:ring-error"
                    : "border-neutral-600 focus-visible:border-primary-500"
                }`}
                aria-required="true"
                aria-invalid={fieldErrors.message ? "true" : "false"}
                aria-describedby={fieldErrors.message ? "message-error" : undefined}
              />
              {fieldErrors.message && (
                <div id="message-error" className="mt-1 text-xs text-error-light" role="alert" aria-live="polite">
                  Project details are required.
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

              <div className="pt-1 flex justify-center">
                <button
                type="submit"
                disabled={isSubmitting}
                  className="btn-primary px-12 py-3.5 text-xl font-bold"
              >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
