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
      className="relative overflow-hidden section-padding min-h-[700px] lg:min-h-[800px] flex items-center bg-neutral-50 dark:bg-neutral-900"
      aria-labelledby="hero-heading"
    >
      {/* Left side background - matches Services section */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1/2 bg-neutral-50 dark:bg-neutral-900 z-10"
        aria-hidden="true"
      />

      {/* Background image layer with gradient overlay */}
      <div
        className="absolute inset-0 z-20"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "contain",
          backgroundPosition: "right center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      >
        {/* Gradient overlay matching image size using CSS mask */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-transparent to-neutral-900"
          style={{
            maskImage: `url(${heroImage})`,
            maskSize: "contain",
            maskPosition: "right center",
            maskRepeat: "no-repeat",
            WebkitMaskImage: `url(${heroImage})`,
            WebkitMaskSize: "contain",
            WebkitMaskPosition: "right center",
            WebkitMaskRepeat: "no-repeat",
          }}
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 w-full pl-8 sm:pl-10 lg:pl-12">
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
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-neutral-900 dark:text-white drop-shadow-lg"
              style={{ lineHeight: 1.15 }}
            >
              {headline}
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-neutral-800 dark:text-neutral-100 max-w-2xl lg:max-w-none leading-relaxed drop-shadow-md">
              {subheadline}
            </p>

            {/* CTA Buttons */}
            <div className="mt-16 flex flex-col sm:flex-row gap-4 justify-start items-start">
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
