import { ctaBannerHeading, ctaBannerSubtitle, ctaBannerButton } from "../../content/site";

export default function CTABanner() {
  return (
    <section className="py-8 sm:py-12 bg-accent-900" aria-labelledby="cta-heading">
      <div className="container-custom text-center">
        <h2 id="cta-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight uppercase">
          {ctaBannerHeading}
        </h2>
        <p className="mt-3 text-lg text-white max-w-2xl mx-auto">
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
