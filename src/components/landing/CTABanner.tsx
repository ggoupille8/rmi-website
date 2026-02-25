import { ctaBannerHeading, ctaBannerSubtitle, ctaBannerButton } from "../../content/site";

export default function CTABanner() {
  return (
    <section className="py-6 sm:py-8 bg-accent-900" aria-labelledby="cta-heading">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
          {/* Image */}
          <div className="flex items-center justify-center">
            <img
              src="/images/cta/cta-project.jpeg"
              alt="Insulation project work by Resource Mechanical Insulation"
              className="w-auto max-h-[350px] sm:max-h-[450px] mx-auto object-contain rounded-xl shadow-lg"
              loading="lazy"
            />
          </div>

          {/* Text Content */}
          <div className="text-center md:text-left">
            <h2 id="cta-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight uppercase">
              {ctaBannerHeading}
            </h2>
            <p className="mt-3 text-lg text-white max-w-2xl">
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
        </div>
      </div>
    </section>
  );
}
