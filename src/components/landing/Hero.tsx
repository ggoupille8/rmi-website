import { phoneTel, phoneDisplay, companyName } from "../../config/site";

interface CredibilityItem {
  label: string;
  icon: string;
}

interface HeroProps {
  headline?: string;
  subheadline?: string;
  ctaPrimary?: {
    text: string;
    href: string;
  };
  ctaSecondary?: {
    text: string;
    href: string;
  };
  credibilityItems?: CredibilityItem[];
  images?: string[]; // Array of 1-3 image paths from /images/hero/
}

const defaultCredibilityItems: CredibilityItem[] = [
  { label: "Safety-first", icon: "" },
  { label: "On-time delivery", icon: "" },
  { label: "Quality workmanship", icon: "" },
];

export default function Hero({
  headline = "Expert mechanical insulation. Union labor. Reliable execution.",
  subheadline = "Based in Romulus, MI. Union contractor Local 25 Heat & Frost Insulators serving Southeast Michigan, traveling the Midwest for the right projects. Mechanical insulation for piping, ductwork, tanks, and equipment. HVAC piping and duct, cryogenic systems, refrigeration, maintenance support, outage/turnaround capabilities.",
  ctaPrimary = { text: "Request a Quote", href: "#contact" },
  ctaSecondary = { text: phoneDisplay, href: phoneTel },
  credibilityItems = defaultCredibilityItems,
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

            {/* Credibility List */}
            <ul
              className="mt-8 flex flex-col sm:flex-row lg:flex-col gap-4 justify-center lg:justify-start"
              role="list"
            >
              {credibilityItems.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 text-body font-medium text-neutral-800"
                >
                  <span
                    className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary-600"
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
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
            </div>
          </div>

          {/* Right Column: Visual Area */}
          <div className="relative lg:order-last">
            <div className="relative aspect-square max-w-lg mx-auto lg:max-w-full">
              {/* Responsive Image: Single large image on both mobile and desktop */}
              <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-neutral-200">
                <img
                  src={heroImage}
                  alt="Mechanical insulation work"
                  className="relative w-full h-full object-cover z-0"
                  loading="eager"
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
