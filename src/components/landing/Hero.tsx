import { phoneTel, phoneDisplay, companyName, email } from "../../config/site";
import { Phone, Mail, ChevronDown } from "lucide-react";

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
  images?: string[];
}

export default function Hero({
  headline,
  subheadline,
  ctaPrimary,
  ctaSecondary = { text: phoneDisplay, href: phoneTel },
  ctaEmail = { href: `mailto:${email}` },
  images = ["/images/hero/hero-1.jpg"],
}: HeroProps) {
  const heroImage = images[0];

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background Image with Dark Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center"
          loading="eager"
          width="1920"
          height="1080"
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(23,23,23,0.85) 0%, rgba(23,23,23,0.75) 50%, rgba(23,23,23,0.9) 100%)'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container-custom px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-32">
        <div className="max-w-3xl mx-auto text-center">
          {/* Headline */}
          <h1
            id="hero-heading"
            className="font-bold text-white leading-tight"
            style={{
              fontSize: 'clamp(2.25rem, 5vw + 1rem, 4.5rem)',
            }}
          >
            {headline}
          </h1>

          {/* Subheadline */}
          <p
            className="mt-5 sm:mt-6 text-neutral-300 leading-relaxed max-w-2xl mx-auto"
            style={{
              fontSize: 'clamp(1rem, 1.25vw + 0.5rem, 1.25rem)'
            }}
          >
            {subheadline}
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Primary CTA */}
            <a
              href={ctaPrimary?.href || '#contact'}
              className="w-full sm:w-auto btn-primary px-8 py-3.5 text-base font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02]"
              aria-label={ctaPrimary?.text || 'Request a Quote'}
            >
              {ctaPrimary?.text || 'Request a Quote'}
            </a>

            {/* Secondary contact options */}
            <div className="flex items-center gap-3">
              <a
                href={ctaSecondary?.href || phoneTel}
                className="flex items-center gap-2.5 px-5 py-3.5 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors duration-200"
                aria-label={`Call ${companyName} at ${ctaSecondary?.text || phoneDisplay}`}
              >
                <Phone className="w-4 h-4 text-white" aria-hidden="true" />
                <span className="text-sm font-medium text-white">{ctaSecondary?.text || phoneDisplay}</span>
              </a>

              <a
                href={ctaEmail?.href || `mailto:${email}`}
                className="flex items-center justify-center w-12 h-12 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors duration-200"
                aria-label={`Email ${companyName}`}
              >
                <Mail className="w-4 h-4 text-white" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <a
          href="#services"
          className="flex flex-col items-center gap-1 text-white/50 hover:text-white/80 transition-colors duration-200"
          aria-label="Scroll to services"
        >
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </a>
      </div>
    </section>
  );
}
