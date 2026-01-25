import { phoneTel, phoneDisplay, companyName, email } from "../../config/site";
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
  // DOM PARITY: This component renders identical DOM structure at all breakpoints (375px, 430px, 768px, 1024px, 1440px)
  // - All elements (H1, subheadline, CTA buttons, image) always present
  // - No conditional rendering based on screen size
  // - Layout changes handled via CSS only (Grid + clamp())
  // - Verify DOM parity: Run scripts/verify-dom-parity.js in browser console
  
  // Use first image for both mobile and desktop (one large image)
  const heroImage = images[0];

  return (
    <section
      className="relative overflow-hidden pt-0 pb-0 bg-neutral-50 dark:bg-neutral-900 min-h-[50vh]"
      aria-labelledby="hero-heading"
    >
      <div className="relative z-10 container-custom pr-0 lg:pr-8">
        <div className="grid min-h-[50vh] lg:grid-cols-3 gap-8 lg:gap-12 items-stretch">
          {/* Left column - Content */}
          <div className="text-left relative flex flex-col items-start lg:col-span-1 h-full max-w-[26rem] lg:max-w-[24rem]" style={{ paddingTop: 'clamp(2rem, 0.35vw + 1.5rem, 4rem)' }}>
            <h1
              id="hero-heading"
              className="font-stencil font-extrabold tracking-tight text-neutral-900 dark:text-white leading-[1.1] drop-shadow-sm"
              style={{ fontSize: 'clamp(2.75rem, 1.2vw + 2rem, 6rem)' }}
            >
              {headline}
            </h1>
            <p 
              className="text-neutral-800 dark:text-neutral-100 leading-relaxed"
              style={{ 
                marginTop: 'clamp(0.75rem, 0.15vw + 0.6rem, 1rem)',
                fontSize: 'clamp(1rem, 0.25vw + 0.75rem, 1.25rem)'
              }}
            >
              {subheadline}
            </p>

            {/* CTA Buttons - All elements always present in DOM */}
            <div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              style={{ marginTop: 'clamp(2rem, 0.5vw + 1.5rem, 4rem)' }}
            >
              {/* Primary CTA Button */}
              <a
                href={ctaPrimary?.href || '#contact'}
                className="btn-primary h-14 px-5 flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-110 hover:-translate-y-1 transition-all duration-500 ease-in-out"
                aria-label={ctaPrimary?.text || 'Request a Quote'}
              >
                {ctaPrimary?.text || 'Request a Quote'}
              </a>
              {/* Phone Icon Button */}
              <a
                href={ctaSecondary?.href || phoneTel}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-white/95 backdrop-blur-sm border-2 border-white hover:bg-white hover:border-primary-400 shadow-xl hover:shadow-2xl hover:scale-110 hover:-translate-y-1 hover:rotate-6 transition-all duration-500 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 dark:focus-visible:ring-offset-neutral-900"
                aria-label={`Call ${companyName} at ${ctaSecondary?.text || phoneDisplay}`}
              >
                <Phone
                  className="w-6 h-6 text-neutral-900 transition-transform duration-500 ease-in-out hover:scale-125"
                  aria-hidden="true"
                />
              </a>
              {/* Email Icon Button */}
              <a
                href={ctaEmail?.href || `mailto:${email}`}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-white/95 backdrop-blur-sm border-2 border-white hover:bg-white hover:border-primary-400 shadow-xl hover:shadow-2xl hover:scale-110 hover:-translate-y-1 hover:-rotate-6 transition-all duration-500 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 dark:focus-visible:ring-offset-neutral-900"
                aria-label={`Email ${companyName} at ${email}`}
              >
                <Mail
                  className="w-6 h-6 text-neutral-900 transition-transform duration-500 ease-in-out hover:scale-125"
                  aria-hidden="true"
                />
              </a>
            </div>
          </div>

          {/* Right column - Image placeholder (spacer for grid) */}
          <div className="hidden lg:block lg:col-span-2"></div>
        </div>
      </div>
      
      <div className="absolute inset-y-0 left-0 w-full lg:w-1/2 bg-neutral-50 dark:bg-neutral-900 z-0" aria-hidden="true"></div>

      {/* Hero image across entire section with subtle fade */}
      <div className="absolute inset-y-0 right-0 w-2/3 z-[1]">
        <img
          src={heroImage}
          alt="Mechanical insulation work"
          className="w-full h-full rounded-none shadow-2xl object-cover object-[right_top] opacity-90"
          loading="eager"
          width="1920"
          height="1080"
        />
      </div>
    </section>
  );
}
