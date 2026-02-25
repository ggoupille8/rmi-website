import { projectHighlights } from "../../content/site";

export default function ProjectShowcase() {
  return (
    <section
      className="py-16 bg-neutral-900 border-t border-neutral-600/30"
      aria-labelledby="projects-heading"
    >
      <div className="container-custom">
        {/* Section Header */}
        <div className="flex flex-col items-center mb-3">
          <h2
            id="projects-heading"
            className="font-bold tracking-wider text-white uppercase text-xl sm:text-2xl lg:text-3xl"
          >
            See Our Work
          </h2>
          <div className="w-12 h-0.5 bg-accent-500 mt-4 rounded-full" />
        </div>

        {/* Subtitle */}
        <p className="text-center text-neutral-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-4">
          Recent projects from the field
        </p>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {projectHighlights.map((project) => (
            <div
              key={project.title}
              className="overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-accent-500/30 hover:brightness-110 hover:-translate-y-1 transition-all duration-200"
            >
              <img
                src={project.image}
                alt={project.title}
                width="960"
                height="720"
                className="w-full aspect-[4/3] object-cover rounded-t-xl"
                loading="lazy"
                decoding="async"
              />
              <div className="px-5 py-4">
                <h3 className="text-lg font-semibold text-white">
                  {project.title}
                </h3>
                <p className="mt-1 text-sm text-gray-400 line-clamp-3">
                  {project.description}
                </p>
                <span className="mt-3 inline-block rounded-full border border-blue-500/40 px-3 py-0.5 text-xs text-blue-400">
                  {project.tag}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Social links */}
        <div className="mt-6 flex justify-center gap-4">
          <a
            href="https://www.linkedin.com/company/resource-mechanical-insulation"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on LinkedIn"
            className="inline-flex text-gray-400 hover:text-white transition-colors duration-200"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
          <a
            href="https://www.facebook.com/ResourceMechanicalInsulation"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on Facebook"
            className="inline-flex text-gray-400 hover:text-white transition-colors duration-200"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
