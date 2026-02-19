import { ctaBannerHeading, ctaBannerSubtitle, ctaBannerButton } from "../../content/site";

export default function CTABanner() {
  return (
    <section className="section-padding bg-accent-600" aria-labelledby="cta-heading">
      <div className="container-custom text-center">
        <h2 id="cta-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight uppercase">
          {ctaBannerHeading}
        </h2>
        <p className="mt-3 text-lg text-white/80 max-w-2xl mx-auto">
          {ctaBannerSubtitle}
        </p>
        <div className="mt-6">
          <a
            href="#contact"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-8 py-4 text-lg font-semibold text-accent-700 shadow-md transition-all duration-300 hover:bg-neutral-100 hover:shadow-lg hover:scale-105 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-accent-600 active:bg-neutral-200 active:shadow-md active:scale-105"
          >
            {ctaBannerButton}
          </a>
        </div>
      </div>
    </section>
  );
}
