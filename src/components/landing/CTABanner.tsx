export default function CTABanner() {
  return (
    <section className="py-16 bg-neutral-100 dark:bg-neutral-800">
      <div className="container-custom text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight">
          READY TO START YOUR{" "}
          <span className="text-accent-500">INSULATION</span>{" "}
          PROJECT?
        </h2>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
          Share your project details and receive a detailed quote within 48 hours—or call for immediate assessment on urgent jobs.
        </p>
        <div className="mt-8">
          <a
            href="#contact"
            className="inline-flex items-center justify-center rounded-md px-8 py-4 text-lg font-semibold text-white bg-accent-600 hover:bg-accent-500 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Contact Us
          </a>
        </div>
      </div>
    </section>
  );
}
