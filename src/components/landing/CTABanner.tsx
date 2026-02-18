import { ctaBannerHeading, ctaBannerSubtitle, ctaBannerButton } from "../../content/site";

export default function CTABanner() {
  // Split heading to wrap the accent word
  const parts = ctaBannerHeading.split("INSULATION");

  return (
    <section className="section-padding bg-neutral-100 dark:bg-neutral-800" aria-labelledby="cta-heading">
      <div className="container-custom text-center">
        <h2 id="cta-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900 dark:text-white tracking-tight">
          {parts[0]}
          <span className="text-accent-500">INSULATION</span>
          {parts[1]}
        </h2>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
          {ctaBannerSubtitle}
        </p>
        <div className="mt-8">
          <a
            href="#contact"
            className="btn-primary px-8 py-4"
          >
            {ctaBannerButton}
          </a>
        </div>
      </div>
    </section>
  );
}
