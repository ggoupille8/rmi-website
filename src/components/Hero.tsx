import { phoneTel, phoneDisplay, companyName } from "../config/site";

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
}

const defaultCredibilityItems: CredibilityItem[] = [
  { label: "Safety-first", icon: "🛡️" },
  { label: "On-time delivery", icon: "⏱️" },
  { label: "Quality workmanship", icon: "✨" },
];

export default function Hero({
  headline = "Expert Mechanical Insulation Solutions",
  subheadline = "Professional insulation services that protect your systems, reduce energy costs, and ensure optimal performance for industrial and commercial facilities.",
  ctaPrimary = { text: "Request a Quote", href: "#contact" },
  ctaSecondary = { text: phoneDisplay, href: phoneTel },
  credibilityItems = defaultCredibilityItems,
}: HeroProps) {
  // Industrial icon grid for visual area
  const visualIcons = [
    "🔧",
    "⚙️",
    "🏭",
    "🔩",
    "⚡",
    "🌡️",
    "🛠️",
    "📐",
    "🔨",
    "💼",
    "🏗️",
    "📊",
  ];

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
                  className="flex items-center gap-3 text-base font-medium text-neutral-800"
                >
                  <span className="text-2xl flex-shrink-0" aria-hidden="true">
                    {item.icon}
                  </span>
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
              {/* Abstract Gradient Background */}
              <div
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-accent-500 opacity-10"
                aria-hidden="true"
              />
              <div
                className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-accent-400/20 via-transparent to-primary-400/20"
                aria-hidden="true"
              />

              {/* Geometric Pattern Overlay */}
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, transparent 40%, rgba(30, 58, 95, 0.03) 50%, transparent 60%),
                    linear-gradient(-45deg, transparent 40%, rgba(249, 115, 22, 0.03) 50%, transparent 60%)
                  `,
                  backgroundSize: "40px 40px",
                }}
                aria-hidden="true"
              />

              {/* Icon Grid */}
              <div className="relative h-full p-8 flex items-center justify-center">
                <div className="grid grid-cols-4 gap-6 w-full">
                  {visualIcons.map((icon, index) => (
                    <div
                      key={index}
                      className="aspect-square rounded-xl bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-3xl transition-all duration-300 hover:scale-110 hover:shadow-xl hover:bg-white"
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      <span aria-hidden="true">{icon}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decorative Elements */}
              <div
                className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-accent-400/20 blur-2xl"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-primary-400/20 blur-2xl"
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
