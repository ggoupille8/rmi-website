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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    // Validate that at least email or phone is provided
    if (!formData.email.trim() && !formData.phone.trim()) {
      setSubmitStatus("error");
      setIsSubmitting(false);
      return;
    }

    // Validate that at least name or company is provided
    if (!formData.name.trim() && !formData.company.trim()) {
      setSubmitStatus("error");
      setIsSubmitting(false);
      return;
    }

    // Validate that projectType is provided
    if (!formData.projectType.trim()) {
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
      className="section-padding bg-white"
      aria-labelledby="contact-heading"
    >
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="contact-heading" className="heading-2 text-neutral-900">
            {title}
          </h2>
          <p className="mt-2 text-body text-neutral-800">{subtitle}</p>
        </div>
        <div className="mx-auto mt-5 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="name"
                className="block text-base font-medium text-neutral-800 leading-relaxed"
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
                className="mt-2 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base px-4 py-3 border bg-white text-neutral-900 leading-relaxed"
                aria-required="true"
                aria-invalid={submitStatus === "error" ? "true" : "false"}
              />
            </div>

            <div>
              <label
                htmlFor="company"
                className="block text-base font-medium text-neutral-800 leading-relaxed"
              >
                Company
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="mt-2 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base px-4 py-3 border bg-white text-neutral-900 leading-relaxed"
                aria-invalid={submitStatus === "error" ? "true" : "false"}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="email"
                  className="block text-base font-medium text-neutral-800 leading-relaxed"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base px-4 py-3 border bg-white text-neutral-900 leading-relaxed"
                  aria-invalid={submitStatus === "error" ? "true" : "false"}
                />
                <p className="mt-1 text-sm text-neutral-600">
                  Email or phone required
                </p>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-base font-medium text-neutral-800 leading-relaxed"
                >
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base px-4 py-3 border bg-white text-neutral-900 leading-relaxed"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="projectType"
                className="block text-base font-medium text-neutral-800 leading-relaxed"
              >
                Project Type <span className="text-error">*</span>
              </label>
              <select
                id="projectType"
                name="projectType"
                required
                value={formData.projectType}
                onChange={handleChange}
                className="mt-2 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base px-4 py-3 border bg-white text-neutral-900 leading-relaxed"
                aria-required="true"
              >
                <option value="">Select a project type...</option>
                <option value="installation">Installation Services</option>
                <option value="materials">Materials & Supply</option>
                <option value="materials-pricing">
                  Materials/Pipe Supports Pricing
                </option>
                <option value="maintenance">Maintenance Contract</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-base font-medium text-neutral-800 leading-relaxed"
              >
                Project Details <span className="text-error">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                required
                value={formData.message}
                onChange={handleChange}
                placeholder="Please describe your project, timeline, and any specific requirements..."
                className="mt-2 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base px-4 py-3 border bg-white text-neutral-900 leading-relaxed"
                aria-required="true"
                aria-invalid={submitStatus === "error" ? "true" : "false"}
              />
            </div>

            {submitStatus === "success" && (
              <div
                className="rounded-md bg-success-light p-4 text-success-dark border border-success/20"
                role="alert"
                aria-live="polite"
              >
                Thank you for your inquiry! Our team will review your request
                and get back to you within 24 hours.
              </div>
            )}

            {submitStatus === "error" && (
              <div
                className="rounded-md bg-error-light p-4 text-error-dark border border-error/20"
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

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full sm:w-auto"
                aria-busy={isSubmitting}
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
