import { phoneTel, phoneDisplay, companyName } from "../../config/site";
import { email } from "../../content/site";
import { Phone, Mail } from "lucide-react";

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
  headline,
  subheadline,
  trustLine,
  ctaPrimary,
  ctaSecondary = { text: phoneDisplay, href: phoneTel },
  ctaEmail = { href: `mailto:${email}` },
  images = ["/images/hero/hero-1.jpg"], // Default to single image
}: HeroProps) {
  // Use first image for both mobile and desktop (one large image)
  const heroImage = images[0];

  return (
    <section
      className="relative overflow-hidden section-padding min-h-[600px] lg:min-h-[700px] flex items-center"
      aria-labelledby="hero-heading"
    >
      {/* Background image layer */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center 50%",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />

      {/* Lightening overlay to brighten the image - increased */}
      <div className="absolute inset-0 bg-white/30 -z-10" aria-hidden="true" />

      {/* Dark overlay for text readability - further reduced opacity for brighter image */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-neutral-900/55 via-neutral-900/40 to-neutral-900/20 lg:from-neutral-900/60 lg:via-neutral-900/45 lg:to-transparent"
        aria-hidden="true"
      />

      {/* Additional left-side overlay for better text contrast - further reduced opacity */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-neutral-900/60 via-neutral-900/40 to-transparent lg:from-neutral-900/55 lg:via-neutral-900/35 lg:to-transparent"
        aria-hidden="true"
      />

      {/* Bottom gradient fade to next section - affects bottom 95% */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-neutral-900"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, transparent 5%, rgba(23, 23, 23, 0.3) 50%, rgba(23, 23, 23, 0.7) 85%, rgb(23, 23, 23) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgb(255 255 255) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container-custom relative z-10 w-full">
        <div className="max-w-2xl lg:max-w-3xl">
          {/* Content */}
          <div className="text-center lg:text-left relative">
            {/* Accent line decoration */}
            <div
              className="hidden lg:block absolute -left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-400 via-primary-500 to-transparent rounded-full"
              aria-hidden="true"
            />

            <h1
              id="hero-heading"
              className="heading-1 text-white drop-shadow-lg"
            >
              {headline}
            </h1>
            <p className="mt-4 text-body-lg text-neutral-100 max-w-2xl lg:max-w-none mx-auto lg:mx-0 leading-relaxed drop-shadow-md">
              {subheadline}
            </p>

            {/* Trust Line */}
            {trustLine && (
              <div className="mt-5 relative">
                <p className="text-body font-medium text-neutral-200 max-w-2xl lg:max-w-none mx-auto lg:mx-0 inline-block relative drop-shadow-sm">
                  <span
                    className="absolute -left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary-400 hidden lg:block"
                    aria-hidden="true"
                  />
                  {trustLine}
                </p>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
              {ctaPrimary && (
                <a
                  href={ctaPrimary.href}
                  className="btn-primary h-16 px-6 flex items-center justify-center shadow-xl hover:shadow-2xl transition-all"
                  aria-label={ctaPrimary.text}
                >
                  {ctaPrimary.text}
                </a>
              )}
              {ctaSecondary && (
                <a
                  href={ctaSecondary.href}
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-white/95 backdrop-blur-sm border-2 border-white hover:bg-white hover:border-primary-300 shadow-xl hover:shadow-2xl transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  aria-label={`Call ${companyName} at ${phoneDisplay}`}
                >
                  <Phone
                    className="w-7 h-7 text-neutral-900"
                    aria-hidden="true"
                  />
                </a>
              )}
              {ctaEmail && (
                <a
                  href={ctaEmail.href}
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-white/95 backdrop-blur-sm border-2 border-white hover:bg-white hover:border-primary-300 shadow-xl hover:shadow-2xl transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  aria-label={`Email ${companyName} at ${email}`}
                >
                  <Mail
                    className="w-7 h-7 text-neutral-900"
                    aria-hidden="true"
                  />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden image for SEO and fallback */}
      <img
        src={heroImage}
        alt="Mechanical insulation work"
        className="hidden"
        loading="eager"
        fetchPriority="high"
        onError={(e) => {
          console.error("Hero image failed to load:", heroImage);
        }}
      />
    </section>
  );
}
