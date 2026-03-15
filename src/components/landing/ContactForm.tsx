import { useState, useEffect, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { ErrorBoundary } from "../ErrorBoundary";
import { phoneTel, phoneDisplay, email as siteEmail } from "../../content/site";
import { collectIntelligence, detectMediaDevices } from "../../lib/intelligenceCollector";
import { FIELD_LIMITS } from "../../lib/validation";

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

  // Behavioral intelligence tracking refs
  const firstKeyTimeRef = useRef<number | null>(null);
  const firstFocusTimeRef = useRef<number | null>(null);
  const editCountRef = useRef(0);
  const pasteDetectedRef = useRef(false);
  const idlePeriodsRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Signal that React has hydrated (used by Playwright tests)
  // Track page views in session for lead intelligence
  useEffect(() => {
    formRef.current?.setAttribute("data-hydrated", "true");
    const views = parseInt(sessionStorage.getItem("rmi_views") || "0", 10) + 1;
    sessionStorage.setItem("rmi_views", views.toString());
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
    email?: string;
    phone?: string;
    projectType?: string;
    message?: string;
  }>({});
  const [contactError, setContactError] = useState(false); // email-or-phone group error
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [submittedName, setSubmittedName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const projectTypeRef = useRef<HTMLSelectElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // Auto-reset success message after 3 seconds
  useEffect(() => {
    if (submitStatus !== "success") return;
    const timer = setTimeout(() => {
      setSubmitStatus("idle");
      setSubmittedName("");
    }, 3000);
    return () => clearTimeout(timer);
  }, [submitStatus]);

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

  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case "name":
        if (!value.trim()) return "Please enter your name";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        return undefined;
      case "email":
        if (!value.trim()) return "Please enter your email address";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
          return "Please enter a valid email address";
        return undefined;
      case "phone":
        if (value.trim() && value.replace(/\D/g, "").length < 10)
          return "Please enter a valid phone number (10+ digits)";
        return undefined;
      case "projectType":
        if (!value.trim()) return "Please select a project type";
        return undefined;
      case "message":
        if (!value.trim()) return "Please describe your project";
        return undefined;
      default:
        return undefined;
    }
  };

  const handleBlur = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setTouchedFields((prev) => new Set(prev).add(name));
    const error = validateField(name, value);
    if (error) {
      setFieldErrors((prev) => ({ ...prev, [name]: error }));
    } else {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name as keyof typeof fieldErrors];
        return next;
      });
    }
  };

  // Behavioral tracking: first focus on any form field
  const handleFieldFocus = useCallback(() => {
    if (firstFocusTimeRef.current === null) {
      firstFocusTimeRef.current = Date.now();
    }
  }, []);

  // Behavioral tracking: first keydown + idle period detection
  const handleFieldKeyDown = useCallback(() => {
    if (firstKeyTimeRef.current === null) {
      firstKeyTimeRef.current = Date.now();
    }
    // Reset idle timer — if >10s pass without a keystroke, count an idle period
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      idlePeriodsRef.current++;
    }, 10_000);
  }, []);

  // Behavioral tracking: count field edits (changes after initial input)
  const handleFieldEdit = useCallback(() => {
    editCountRef.current++;
  }, []);

  // Behavioral tracking: paste detection on email/phone fields
  const handlePaste = useCallback(() => {
    pasteDetectedRef.current = true;
  }, []);

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

    // Validate required fields: Name, Email, Project Type, Project Details
    const errors: typeof fieldErrors = {};

    const nameErr = validateField("name", formData.name);
    if (nameErr) errors.name = nameErr;

    const emailErr = validateField("email", formData.email);
    if (emailErr) errors.email = emailErr;

    const phoneErr = validateField("phone", formData.phone);
    if (phoneErr) errors.phone = phoneErr;

    const projectTypeErr = validateField("projectType", formData.projectType);
    if (projectTypeErr) errors.projectType = projectTypeErr;

    const messageErr = validateField("message", formData.message);
    if (messageErr) errors.message = messageErr;

    const hasErrors = Object.keys(errors).length > 0;

    if (hasErrors) {
      setFieldErrors(errors);
      setContactError(false);
      setIsSubmitting(false);

      // Scroll to first error field smoothly (top-to-bottom order)
      setTimeout(() => {
        const firstErrorField = errors.name
          ? nameInputRef.current
          : errors.email
            ? emailInputRef.current
            : errors.phone
              ? phoneInputRef.current
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

    // Collect browser/device metadata for lead intelligence
    const searchParams = new URLSearchParams(window.location.search);
    const nav = navigator as unknown as Record<string, unknown>;
    const conn = nav.connection as Record<string, unknown> | undefined;
    const clientMetadata = {
      elapsedMs,
      fastSubmit,
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      isMobile: /Mobi|Android/i.test(navigator.userAgent),
      platform: navigator.platform,
      referrer: document.referrer || null,
      pageUrl: window.location.href,
      utmSource: searchParams.get("utm_source"),
      utmMedium: searchParams.get("utm_medium"),
      utmCampaign: searchParams.get("utm_campaign"),
      utmTerm: searchParams.get("utm_term"),
      utmContent: searchParams.get("utm_content"),
      timeOnPageMs: elapsedMs,
      pageViews: parseInt(sessionStorage.getItem("rmi_views") || "1", 10),
      connectionType: (conn?.effectiveType as string) || null,
    };

    // Collect behavioral intelligence — never block form submission
    let intelligenceJson: string | undefined;
    try {
      const pageLoadTime = window.__rmiPageLoadTime ?? performance.timing?.navigationStart ?? Date.now();
      const intelligence = collectIntelligence({
        timeToFirstKeyMs: firstKeyTimeRef.current ? firstKeyTimeRef.current - pageLoadTime : 0,
        timeOnFormMs: firstFocusTimeRef.current ? Date.now() - firstFocusTimeRef.current : 0,
        fieldEditCount: editCountRef.current,
        messageLength: formData.message.length,
        optionalFieldsFilled: [formData.company].filter(Boolean).length,
        pasteDetected: pasteDetectedRef.current,
        idlePeriods: idlePeriodsRef.current,
        submissionSpeedMs: Date.now() - pageLoadTime,
      });
      // Async media device detection — merge into payload
      try {
        const mediaDevices = await detectMediaDevices();
        intelligence.hasWebcam = mediaDevices.hasWebcam;
        intelligence.hasMicrophone = mediaDevices.hasMicrophone;
        intelligence.mediaDeviceCount = mediaDevices.mediaDeviceCount;
      } catch {
        // Silent — media detection is non-critical
      }
      intelligenceJson = JSON.stringify(intelligence);
    } catch {
      // Silent failure — intelligence is non-critical
    }

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
          metadata: clientMetadata,
          intelligence: intelligenceJson,
        }),
      });

      if (!response.ok) {
        throw new Error(`Contact submit failed: ${response.status}`);
      }

      setSubmittedName(formData.name.trim());
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
      setTouchedFields(new Set());
    } catch {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFieldValid = (name: string): boolean => {
    if (!touchedFields.has(name)) return false;
    const value = formData[name as keyof typeof formData];
    if (!value.trim()) return false;
    return !fieldErrors[name as keyof typeof fieldErrors];
  };

  const FieldCheck = ({ field }: { field: string }) =>
    isFieldValid(field) ? (
      <svg
        className="inline-block w-4 h-4 ml-1 text-green-400 align-text-top"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ) : null;

  const inputBase =
    "block w-full rounded-md shadow-sm text-base px-3 py-2 border bg-neutral-800/50 text-white placeholder:text-neutral-400 leading-relaxed min-w-0 min-h-[48px] outline-none transition-all duration-200 ease-out";
  const inputNormal = `${inputBase} border-neutral-700/30 hover:border-neutral-600/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:shadow-[0_0_16px_rgba(59,130,246,0.15)]`;
  const inputError = `${inputBase} border-red-500 ring-2 ring-red-500/20 focus:border-red-500 focus:ring-2 focus:ring-red-500/20`;

  return (
    <ErrorBoundary fallback={
      <section className="relative z-10 py-12">
        <div className="container-custom text-center">
          <p className="text-neutral-400">
            Unable to load form. Please call{" "}
            <a href={phoneTel} className="text-accent-400 hover:underline">{phoneDisplay}</a>
            {" "}or email{" "}
            <a href={`mailto:${siteEmail}`} className="text-accent-400 hover:underline">{siteEmail}</a>.
          </p>
        </div>
      </section>
    }>
    <section
      className="relative z-10 overflow-hidden"
      aria-labelledby="contact-heading"
    >
      <div className="container-custom py-6 sm:py-10 lg:py-12">
        <div className="max-w-2xl mx-auto">
          <h2
            id="contact-heading"
            className="text-xl sm:text-2xl lg:text-3xl font-bold text-white uppercase tracking-wider text-center"
          >
            Get a Quote
          </h2>
          <div className="w-12 h-0.5 bg-accent-500 mt-4 rounded-full mx-auto" />
          <p className="mt-2 sm:mt-3 text-neutral-300 text-sm sm:text-base text-center">
            Tell us what you need.
          </p>

          <form
            ref={formRef}
            method="post"
            onSubmit={handleSubmit}
            className="mt-6 space-y-3 sm:space-y-4 border border-neutral-700/30 rounded-xl backdrop-blur-md bg-neutral-900/50 p-4 sm:p-8 shadow-inner shadow-black/10"
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
                  Name<FieldCheck field="name" />
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  id="name"
                  name="name"
                  required
                  aria-required="true"
                  autoComplete="name"
                  value={formData.name}
                  onChange={(e) => { handleChange(e); handleFieldEdit(); }}
                  onBlur={handleBlur}
                  onFocus={handleFieldFocus}
                  onKeyDown={handleFieldKeyDown}
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
                  autoComplete="organization"
                  value={formData.company}
                  onChange={(e) => { handleChange(e); handleFieldEdit(); }}
                  onFocus={handleFieldFocus}
                  onKeyDown={handleFieldKeyDown}
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
                  Email<FieldCheck field="email" />
                </label>
                <input
                  ref={emailInputRef}
                  type="email"
                  id="email"
                  name="email"
                  required
                  aria-required="true"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => { handleChange(e); handleFieldEdit(); }}
                  onBlur={handleBlur}
                  onFocus={handleFieldFocus}
                  onKeyDown={handleFieldKeyDown}
                  onPaste={handlePaste}
                  className={fieldErrors.email || contactError ? inputError : inputNormal}
                  aria-invalid={fieldErrors.email || contactError ? "true" : "false"}
                  aria-describedby={fieldErrors.email ? "email-error" : contactError ? "contact-error" : undefined}
                />
                {fieldErrors.email && (
                  <div id="email-error" className="mt-1 text-xs text-red-400" role="alert" aria-live="polite">
                    {fieldErrors.email}
                  </div>
                )}
                {!fieldErrors.email && contactError && (
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
                  Phone<FieldCheck field="phone" />
                </label>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  id="phone"
                  name="phone"
                  autoComplete="tel"
                  placeholder="(313) 555-1234"
                  value={formData.phone}
                  onChange={(e) => { handleChange(e); handleFieldEdit(); }}
                  onBlur={handleBlur}
                  onFocus={handleFieldFocus}
                  onKeyDown={handleFieldKeyDown}
                  onPaste={handlePaste}
                  className={fieldErrors.phone || contactError ? inputError : inputNormal}
                  aria-invalid={fieldErrors.phone || contactError ? "true" : "false"}
                  aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                />
                {fieldErrors.phone && (
                  <div id="phone-error" className="mt-1 text-xs text-red-400" role="alert" aria-live="polite">
                    {fieldErrors.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Project Type */}
            <div>
              <label
                htmlFor="projectType"
                className="block text-sm font-semibold text-neutral-200 mb-1"
              >
                Project Type<FieldCheck field="projectType" />
              </label>
              <select
                ref={projectTypeRef}
                id="projectType"
                name="projectType"
                required
                aria-required="true"
                autoComplete="off"
                value={formData.projectType}
                onChange={(e) => { handleChange(e); handleFieldEdit(); }}
                onBlur={handleBlur}
                onFocus={handleFieldFocus}
                className={`${fieldErrors.projectType ? inputError : inputNormal} appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3E%3Cpath stroke=%27%239ca3af%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3E%3C/svg%3E')] bg-[length:1.25em_1.25em] bg-[right_0.5rem_center] bg-no-repeat pr-8`}
                aria-invalid={fieldErrors.projectType ? "true" : "false"}
                aria-describedby={fieldErrors.projectType ? "projectType-error" : undefined}
              >
                <option value="" className="bg-neutral-800 text-neutral-400">Select a project type...</option>
                <option value="installation" className="bg-neutral-800 text-white">Insulation Services</option>
                <option value="materials" className="bg-neutral-800 text-white">Materials</option>
                <option value="pipe-supports" className="bg-neutral-800 text-white">Pipe Supports Pricing</option>
                <option value="other" className="bg-neutral-800 text-white">Other</option>
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
                Project Details<FieldCheck field="message" />
              </label>
              <textarea
                ref={messageRef}
                id="message"
                name="message"
                required
                aria-required="true"
                autoComplete="off"
                rows={4}
                maxLength={FIELD_LIMITS.MAX_MESSAGE_LENGTH}
                value={formData.message}
                onChange={(e) => { handleChange(e); handleFieldEdit(); }}
                onBlur={handleBlur}
                onFocus={handleFieldFocus}
                onKeyDown={handleFieldKeyDown}
                onInput={(e) => {
                  const textarea = e.currentTarget;
                  textarea.style.height = "auto";
                  textarea.style.height = `${textarea.scrollHeight}px`;
                }}
                placeholder="Describe your project, timeline, and requirements..."
                className={`${fieldErrors.message ? inputError : inputNormal} resize-y min-h-[100px] max-h-[300px]`}
                aria-invalid={fieldErrors.message ? "true" : "false"}
                aria-describedby={"message-counter" + (fieldErrors.message ? " message-error" : "")}
              />
              <div className="mt-1 flex items-center justify-between gap-2">
                {fieldErrors.message ? (
                  <div id="message-error" className="text-xs text-red-400" role="alert" aria-live="polite">
                    {fieldErrors.message}
                  </div>
                ) : (
                  <span />
                )}
                <span
                  id="message-counter"
                  className={"text-xs tabular-nums " + (
                    formData.message.length > FIELD_LIMITS.MAX_MESSAGE_LENGTH
                      ? "text-red-400"
                      : formData.message.length > FIELD_LIMITS.MAX_MESSAGE_LENGTH * 0.9
                        ? "text-amber-400"
                        : "text-neutral-500"
                  )}
                  aria-live="polite"
                  aria-label={formData.message.length + " of " + FIELD_LIMITS.MAX_MESSAGE_LENGTH + " characters used"}
                >
                  {formData.message.length.toLocaleString()}/{FIELD_LIMITS.MAX_MESSAGE_LENGTH.toLocaleString()}
                </span>
              </div>
            </div>

            {submitStatus === "success" && (
              <div
                className="rounded-lg bg-success-dark/20 p-6 border border-success/30 text-center animate-[fadeIn_400ms_ease-out]"
                role="alert"
                aria-live="polite"
              >
                {/* Animated checkmark */}
                <div
                  className="mx-auto w-14 h-14 rounded-full bg-success/20 flex items-center justify-center mb-3 animate-[modalIn_500ms_ease-out]"
                >
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Thank you{submittedName ? `, ${submittedName}` : ""}!
                </h3>
                <p className="text-neutral-300 text-sm mb-4">
                  We'll review your request and get back to you within 48 hours.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitStatus("idle")}
                  className="text-sm font-medium text-accent-400 hover:text-accent-300 transition-colors underline underline-offset-2"
                >
                  Send Another Message
                </button>
              </div>
            )}

            {submitStatus === "error" && (
              <div
                className="rounded-md bg-red-900/50 p-3 text-red-200 border border-red-500/50 text-sm"
                role="alert"
                aria-live="polite"
              >
                <p>
                  Something went wrong. Please try again or call us directly at{" "}
                  <a href={phoneTel} className="font-medium text-red-300 hover:text-white underline underline-offset-2">
                    {phoneDisplay}
                  </a>.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitStatus("idle")}
                  className="mt-2 text-sm font-medium text-red-300 hover:text-white underline underline-offset-2"
                >
                  Try Again
                </button>
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
                aria-busy={isSubmitting ? "true" : undefined}
                className="btn-primary w-full sm:w-auto sm:min-w-[200px] py-3 px-8 text-base sm:text-lg font-bold shadow-lg shadow-accent-500/25 hover:shadow-[0_8px_24px_rgba(59,130,246,0.35)] hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-accent-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 transition-all duration-200"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </span>
                ) : submitStatus === "success" ? (
                  <span className="inline-flex items-center gap-2 text-green-300">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Sent!
                  </span>
                ) : "Send Message"}
              </button>
              <p className="mt-2 text-xs text-neutral-400 text-center leading-tight">
                By submitting, you agree that we may collect device and browsing
                information to improve our services.
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
    </ErrorBoundary>
  );
}
