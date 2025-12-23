import { phoneTel, phoneDisplay, companyName } from "../../config/site";
import { email } from "../../content/site";
import { Phone, Mail } from "lucide-react";
import GradientBlendOverlay from "./GradientBlendOverlay";

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
      className="relative overflow-hidden pt-0 pb-0 bg-neutral-50 dark:bg-neutral-900"
      aria-labelledby="hero-heading"
    >
      <div className="container-custom pr-0 lg:pr-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left column - Content */}
          <div className="text-left relative pt-6 sm:pt-10 lg:pt-12 xl:pt-14">
            {/* Accent line decoration */}
            <div
              className="hidden lg:block absolute -left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-400 via-primary-500 to-transparent rounded-full"
              aria-hidden="true"
            />

            <h1
              id="hero-heading"
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-tight sm:leading-[1.15]"
            >
              {headline}
            </h1>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl text-neutral-800 dark:text-neutral-100 leading-relaxed">
              {subheadline}
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 sm:mt-12 md:mt-16 flex flex-col sm:flex-row gap-4 justify-start items-center sm:items-start">
              {ctaPrimary && (
                <a
                  href={ctaPrimary.href}
                  className="btn-primary h-16 px-6 flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-110 hover:-translate-y-1 transition-all duration-500 ease-in-out"
                  aria-label={ctaPrimary.text}
                >
                  {ctaPrimary.text}
                </a>
              )}
              {ctaSecondary && (
                <a
                  href={ctaSecondary.href}
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-white/95 backdrop-blur-sm border-2 border-white hover:bg-white hover:border-primary-400 shadow-xl hover:shadow-2xl hover:scale-110 hover:-translate-y-1 hover:rotate-6 transition-all duration-500 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 dark:focus-visible:ring-offset-neutral-900"
                  aria-label={`Call ${companyName} at ${phoneDisplay}`}
                >
                  <Phone
                    className="w-7 h-7 text-neutral-900 transition-transform duration-500 ease-in-out hover:scale-125"
                    aria-hidden="true"
                  />
                </a>
              )}
              {ctaEmail && (
                <a
                  href={ctaEmail.href}
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-white/95 backdrop-blur-sm border-2 border-white hover:bg-white hover:border-primary-400 shadow-xl hover:shadow-2xl hover:scale-110 hover:-translate-y-1 hover:-rotate-6 transition-all duration-500 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 dark:focus-visible:ring-offset-neutral-900"
                  aria-label={`Email ${companyName} at ${email}`}
                >
                  <Mail
                    className="w-7 h-7 text-neutral-900 transition-transform duration-500 ease-in-out hover:scale-125"
                    aria-hidden="true"
                  />
                </a>
              )}
            </div>
          </div>

          {/* Right column - Image (extends to top and right edge, 50% width) */}
          <div className="relative order-2 lg:order-2 -mr-4 sm:-mr-6 lg:-mr-16 xl:-mr-24 2xl:-mr-32 max-w-[50vw]">
            <img
              src={heroImage}
              alt="Mechanical insulation work"
              className="w-full h-full rounded-br-lg lg:rounded-tl-none lg:rounded-bl-none shadow-2xl object-cover opacity-95"
              style={{ filter: 'grayscale(5%) contrast(1.02)' }}
              loading="eager"
              width="1920"
              height="1080"
            />
            {/* White overlay for two-tone effect */}
            <div className="absolute inset-0 bg-gradient-to-bl from-white/15 via-white/5 to-transparent dark:from-neutral-900/15 dark:via-neutral-900/5 rounded-br-lg lg:rounded-tl-none lg:rounded-bl-none pointer-events-none mix-blend-soft-light" aria-hidden="true"></div>
            {/* Gradient overlay to blend image with content */}
            <GradientBlendOverlay direction="left" />
          </div>
        </div>
      </div>
    </section>
  );
}
