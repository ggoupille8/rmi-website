import { ctaBannerHeading, ctaBannerSubtitle, ctaBannerButton } from "../../content/site";

export default function CTABanner() {
  return (
    <section className="relative min-h-[350px] md:min-h-[400px] flex items-center justify-center overflow-hidden border-t border-neutral-600/30" aria-labelledby="cta-heading">
      {/* Background Image */}
      <img
        src="/images/cta/cta-project.jpeg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
        loading="lazy"
        aria-hidden="true"
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div className="relative z-10 container-custom py-20 px-6 text-center">
        <h2 id="cta-heading" className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-wider uppercase">
          {ctaBannerHeading}
        </h2>
        <p className="mt-3 text-base sm:text-lg text-neutral-200 max-w-2xl mx-auto leading-relaxed">
          {ctaBannerSubtitle}
        </p>
        <div className="mt-6">
          <a
            href="#contact"
            className="btn-primary w-full sm:w-auto sm:min-w-[280px] px-10 py-3.5 text-lg font-bold"
          >
            {ctaBannerButton}
          </a>
        </div>
      </div>
    </section>
  );
}
