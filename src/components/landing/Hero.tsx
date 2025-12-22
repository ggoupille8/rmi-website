import { phoneTel, phoneDisplay, companyName } from "../../config/site";
import { email } from "../../content/site";
import { Phone, Mail } from "lucide-react";

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
  ctaEmail?: {
    href: string;
  };
  images?: string[]; // Array of 1-3 image paths from /images/hero/
}

export default function Hero({
  headline,
  subheadline,
  ctaPrimary,
  ctaSecondary = { text: phoneDisplay, href: phoneTel },
  ctaEmail = { href: `mailto:${email}` },
  images = ["/images/hero/hero-1.jpg"], // Default to single image
}: HeroProps) {
  // Use first image for both mobile and desktop (one large image)
  const heroImage = images[0];

  return (
    <section
      className="relative overflow-hidden py-6 sm:py-10 lg:py-12 xl:py-14 min-h-[500px] sm:min-h-[600px] lg:min-h-[800px] flex items-center bg-neutral-50 dark:bg-neutral-900"
      aria-labelledby="hero-heading"
    >
      {/* Left side background - matches Services section */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1/2 bg-neutral-50 dark:bg-neutral-900 z-10"
        aria-hidden="true"
      />

      {/* Background image */}
      <div
        className="hidden md:block absolute inset-0 z-20"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "contain",
          backgroundPosition: "right center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />

      <div className="relative z-30 w-full pl-4 pr-4 sm:pl-6 sm:pr-6 lg:pl-12 lg:pr-0">
        <div className="max-w-2xl lg:max-w-3xl">
          {/* Content */}
          <div className="text-left relative">
            {/* Accent line decoration */}
            <div
              className="hidden lg:block absolute -left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-400 via-primary-500 to-transparent rounded-full"
              aria-hidden="true"
            />

            <h1
              id="hero-heading"
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-neutral-900 dark:text-white drop-shadow-lg leading-tight sm:leading-[1.15]"
            >
              {headline}
            </h1>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl text-neutral-800 dark:text-neutral-100 max-w-2xl lg:max-w-none leading-relaxed drop-shadow-md">
              {subheadline}
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 sm:mt-12 md:mt-16 flex flex-col sm:flex-row gap-4 justify-start items-center sm:items-start">
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
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-white/95 backdrop-blur-sm border-2 border-white hover:bg-white hover:border-primary-300 shadow-xl hover:shadow-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 dark:focus-visible:ring-offset-neutral-900"
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
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-white/95 backdrop-blur-sm border-2 border-white hover:bg-white hover:border-primary-300 shadow-xl hover:shadow-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 dark:focus-visible:ring-offset-neutral-900"
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
        width="1920"
        height="1080"
      />
    </section>
  );
}
