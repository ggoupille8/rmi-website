import { phoneTel, phoneDisplay, companyName } from "../../config/site";
import { email } from "../../content/site";

interface HeroProps {
  headline?: string;
  subheadline?: string;
  trustLine?: string;
  ctaPrimary?: {
    text: string;
    href: string;
  };
  ctaSecondary?: {
    text: string;
    href: string;
  };
  ctaEmail?: {
    href: string;
  };
  images?: string[]; // Array of 1-3 image paths from /images/hero/
}

export default function Hero({
  headline = "Expert mechanical insulation. Union labor. Reliable execution.",
  subheadline = "Based in Romulus, MI. Union contractor Local 25 Heat & Frost Insulators serving Southeast Michigan, traveling the Midwest for the right projects. Mechanical insulation for piping, ductwork, tanks, and equipment. HVAC piping and duct, cryogenic systems, refrigeration, maintenance support, outage/turnaround capabilities.",
  trustLine,
  ctaPrimary = { text: "Request a Quote", href: "#contact" },
  ctaSecondary = { text: phoneDisplay, href: phoneTel },
  ctaEmail = { href: `mailto:${email}` },
  images = ["/images/hero/hero-1.jpg"], // Default to single image
}: HeroProps) {
  // Use first image for both mobile and desktop (one large image)
  const heroImage = images[0];

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-neutral-50 via-white to-primary-50/30 section-padding"
      aria-labelledby="hero-heading"
    >
      <div className="container-custom">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column: Content */}
          <div className="text-center lg:text-left">
            <h1 id="hero-heading" className="heading-1 text-neutral-900">
              {headline}
            </h1>
            <p className="mt-6 text-body-lg text-neutral-800 max-w-2xl lg:max-w-none mx-auto lg:mx-0">
              {subheadline}
            </p>

            {/* Trust Line */}
            {trustLine && (
              <p className="mt-8 text-body font-medium text-neutral-800 max-w-2xl lg:max-w-none mx-auto lg:mx-0">
                {trustLine}
              </p>
            )}

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
              {ctaPrimary && (
                <a
                  href={ctaPrimary.href}
                  className="btn-primary"
                  aria-label={ctaPrimary.text}
                >
                  {ctaPrimary.text}
                </a>
              )}
              {ctaSecondary && (
                <a
                  href={ctaSecondary.href}
                  className="btn-secondary"
                  aria-label={`Call ${companyName} at ${phoneDisplay}`}
                >
                  {ctaSecondary.text}
                </a>
              )}
              {ctaEmail && (
                <a
                  href={ctaEmail.href}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  aria-label={`Email ${companyName} at ${email}`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Right Column: Visual Area */}
          <div className="relative lg:order-last">
            {/* Stable aspect-ratio container to prevent CLS */}
            <div className="relative aspect-square max-w-lg mx-auto lg:max-w-full">
              {/* Responsive Image: Single large image on both mobile and desktop */}
              <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-neutral-200">
                <img
                  src={heroImage}
                  alt="Mechanical insulation work"
                  className="relative w-full h-full object-cover z-0"
                  width={1600}
                  height={1600}
                  loading="eager"
                  fetchPriority="high"
                  onError={(e) => {
                    console.error("Hero image failed to load:", heroImage);
                    // Fallback: hide image on error
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                {/* Gradient Overlay */}
                <div
                  className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-accent-900/20 lg:from-primary-900/15 lg:to-accent-900/15 z-10 pointer-events-none"
                  aria-hidden="true"
                />
                {/* Subtle Pattern Overlay */}
                <div
                  className="absolute inset-0 opacity-[0.03] lg:opacity-[0.02] z-10 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(45deg, transparent 40%, rgba(30, 58, 95, 0.1) 50%, transparent 60%)`,
                    backgroundSize: "40px 40px",
                  }}
                  aria-hidden="true"
                />
              </div>

              {/* Decorative Elements */}
              <div
                className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-accent-400/20 blur-2xl -z-10"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-primary-400/20 blur-2xl -z-10"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Background Decorative Elements */}
      <div
        className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl"
        aria-hidden="true"
      >
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary-200 to-primary-600 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>
      <div
        className="absolute inset-x-0 bottom-0 -z-10 transform-gpu overflow-hidden blur-3xl"
        aria-hidden="true"
      >
        <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[-30deg] bg-gradient-to-tr from-accent-200 to-accent-600 opacity-15 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" />
      </div>
    </section>
  );
}
