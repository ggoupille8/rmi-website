import { email } from "../../content/site";

export default function CTABanner() {
  return (
    <section className="py-16 bg-neutral-100 dark:bg-neutral-800">
      <div className="container-custom text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight">
          READY TO START YOUR{" "}
          <span className="text-neutral-500 dark:text-neutral-400">INSULATION</span>{" "}
          PROJECT?
        </h2>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
          Submit your specs and receive a detailed quote within 48 hours—or call for immediate assessment on urgent jobs.
        </p>
        <div className="mt-8">
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors duration-300 shadow-lg"
          >
            Contact Us
          </a>
        </div>
      </div>
    </section>
  );
}
