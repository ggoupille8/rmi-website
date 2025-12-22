import { useState, useEffect } from "react";

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
    honeypot: "", // Spam protection field
  });

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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prevent double-submit: if already submitting, ignore
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
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
    const emailOrPhoneError = !formData.email.trim() && !formData.phone.trim();
    if (emailOrPhoneError) {
      setFieldErrors((prev) => ({
        ...prev,
        email: true,
        phone: true,
      }));
    }

    // Validate email format if provided
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setFieldErrors((prev) => ({
          ...prev,
          email: true,
        }));
      }
    }

    // Validate that projectType is provided
    const projectTypeError = !formData.projectType.trim();
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

    if (nameOrCompanyError || emailOrPhoneError || projectTypeError || messageError) {
      setSubmitStatus("error");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/quote", {
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
          honeypot: formData.honeypot, // Should be empty
          timestamp: Date.now(), // Client timestamp at submission time
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.ok) {
        setSubmitStatus("success");
        setFieldErrors({});
        setFormData({
          name: "",
          company: "",
          email: "",
          phone: "",
          projectType: "",
          message: "",
          honeypot: "",
        });
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="pt-2 sm:pt-3 pb-2 sm:pb-3 bg-white dark:bg-neutral-900"
      aria-labelledby="contact-heading"
    >
      <div className="container-custom">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="contact-heading" className="heading-2 text-neutral-900 dark:text-neutral-50">
            {title}
          </h2>
          <p className="mt-2 text-body text-neutral-900 dark:text-neutral-200">{subtitle}</p>
        </div>
        <div className="mx-auto mt-6 sm:mt-8 max-w-3xl">
          <div className="card-elevated dark:bg-neutral-800 dark:border-neutral-700">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed mb-1.5"
                >
                  Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-800 text-sm px-3 py-2.5 border bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 leading-relaxed min-w-0"
                  aria-required="true"
                  aria-invalid={fieldErrors.name ? "true" : "false"}
                  aria-describedby={fieldErrors.name ? "name-error" : undefined}
                />
                <div className="min-h-[1.25rem] mt-1">
                  {fieldErrors.name && (
                    <div id="name-error" className="text-xs text-error-dark dark:text-error-light" role="alert">
                      Name or company is required.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="company"
                  className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed mb-1.5"
                >
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="block w-full rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-800 text-sm px-3 py-2.5 border bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 leading-relaxed min-w-0"
                  aria-invalid={fieldErrors.company ? "true" : "false"}
                  aria-describedby={fieldErrors.company ? "company-error" : undefined}
                />
                <div className="min-h-[1.25rem] mt-1">
                  {fieldErrors.company && (
                    <div id="company-error" className="text-xs text-error-dark dark:text-error-light" role="alert">
                      Name or company is required.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed mb-1.5"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-800 text-sm px-3 py-2.5 border bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 leading-relaxed min-w-0"
                  aria-invalid={fieldErrors.email ? "true" : "false"}
                  aria-describedby={fieldErrors.email ? "email-hint email-error" : "email-hint"}
                />
                <div className="min-h-[2rem] mt-1">
                  <p id="email-hint" className="text-xs text-neutral-600 dark:text-neutral-400">
                    Email or phone required
                  </p>
                  {fieldErrors.email && (
                    <div id="email-error" className="mt-1 text-xs text-error-dark dark:text-error-light" role="alert">
                      Email or phone is required.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed mb-1.5"
                >
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="block w-full rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-800 text-sm px-3 py-2.5 border bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 leading-relaxed min-w-0"
                  aria-invalid={fieldErrors.phone ? "true" : "false"}
                  aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                />
                <div className="min-h-[1.25rem] mt-1">
                  {fieldErrors.phone && (
                    <div id="phone-error" className="text-xs text-error-dark dark:text-error-light" role="alert">
                      Email or phone is required.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="projectType"
                className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed mb-1.5"
              >
                Project Type <span className="text-error">*</span>
              </label>
              <select
                id="projectType"
                name="projectType"
                required
                value={formData.projectType}
                onChange={handleChange}
                className="block w-full rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-800 text-sm px-3 py-2.5 border bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 leading-relaxed min-w-0 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3E%3C/svg%3E')] dark:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%239ca3af%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.25em_1.25em] bg-[right_0.5rem_center] bg-no-repeat pr-8"
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
              <div className="min-h-[1.25rem] mt-1">
                {fieldErrors.projectType && (
                  <div id="projectType-error" className="text-xs text-error-dark dark:text-error-light" role="alert">
                    Project type is required.
                  </div>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed mb-1.5"
              >
                Project Details <span className="text-error">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                value={formData.message}
                onChange={handleChange}
                placeholder="Please describe your project, timeline, and any specific requirements..."
                className="block w-full rounded-md border-neutral-300 dark:border-neutral-600 shadow-sm focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-800 text-sm px-3 py-2.5 border bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 leading-relaxed min-w-0 resize-y min-h-[6rem]"
                aria-required="true"
                aria-invalid={fieldErrors.message ? "true" : "false"}
                aria-describedby={fieldErrors.message ? "message-error" : undefined}
              />
              <div className="min-h-[1.25rem] mt-1">
                {fieldErrors.message && (
                  <div id="message-error" className="text-xs text-error-dark dark:text-error-light" role="alert">
                    Project details are required.
                  </div>
                )}
              </div>
            </div>

            {submitStatus === "success" && (
              <div
                className="rounded-md bg-success-light dark:bg-success-dark/20 p-3 text-success-dark dark:text-success-light border border-success/20 text-sm"
                role="alert"
                aria-live="polite"
              >
                Thank you for your inquiry! Our team will review your request
                and get back to you within 24 hours.
              </div>
            )}

            {submitStatus === "error" && (
              <div
                className="rounded-md bg-error-light dark:bg-error-dark/20 p-3 text-error-dark dark:text-error-light border border-error/20 text-sm"
                role="alert"
                aria-live="assertive"
              >
                Something went wrong. Please try again later.
              </div>
            )}

            {/* Honeypot field - hidden from users */}
            <div style={{ display: "none" }} aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                type="text"
                id="website"
                name="honeypot"
                tabIndex={-1}
                autoComplete="off"
                value={formData.honeypot}
                onChange={handleChange}
              />
            </div>

            <div className="pt-1 flex justify-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary px-8 py-4 text-xl font-bold"
                aria-busy={isSubmitting}
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
