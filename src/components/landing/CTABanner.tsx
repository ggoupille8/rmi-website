import { ctaBannerHeading, ctaBannerSubtitle, ctaBannerButton } from "../../content/site";

export default function CTABanner() {
  return (
    <section
      id="cta-banner"
      className="relative z-10 min-h-[350px] md:min-h-[400px] flex items-center justify-center bg-gradient-to-r from-neutral-900 via-blue-950 to-neutral-900 bg-[length:200%_200%] animate-[gradient-shift_8s_ease_infinite] border-t border-b border-accent-500/30"
      aria-labelledby="cta-heading"
    >
      {/* Dot pattern texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="container-custom relative py-20 px-6 text-center">
        <h2 id="cta-heading" className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-wider uppercase">
          {ctaBannerHeading}
        </h2>
        <p className="mt-3 text-base sm:text-lg text-neutral-200 max-w-2xl mx-auto leading-relaxed">
          {ctaBannerSubtitle}
        </p>
        <div className="mt-6">
          <a
            href="#contact"
            className="btn-primary relative w-full sm:w-auto sm:min-w-[280px] px-10 py-3.5 text-lg font-bold shadow-lg shadow-accent-500/20 hover:shadow-accent-500/30 ring-1 ring-accent-400/20"
          >
            {/* Subtle pulse ring */}
            <span
              className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-accent-400/20 animate-[cta-pulse_3s_ease-in-out_infinite]"
              aria-hidden="true"
            />
            {ctaBannerButton}
          </a>
        </div>
      </div>
    </section>
  );
}
