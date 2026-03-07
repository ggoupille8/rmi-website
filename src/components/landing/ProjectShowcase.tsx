import { projectHighlights } from "../../content/site";
import { ErrorBoundary } from "../ErrorBoundary";

export default function ProjectShowcase() {

  return (
    <ErrorBoundary>
    <section
      className="py-8 sm:py-10 lg:py-12 bg-neutral-900 border-t border-neutral-600/30"
      aria-labelledby="projects-heading"
    >
      <div className="container-custom">
        {/* Section Header */}
        <div className="flex flex-col items-center mb-3">
          <h2
            id="projects-heading"
            className="font-bold tracking-wider text-white uppercase text-xl sm:text-2xl lg:text-3xl"
          >
            Featured Projects
          </h2>
          <div className="w-12 h-0.5 bg-accent-500 mt-4 rounded-full" />
        </div>

        {/* Subtitle */}
        <p className="text-center text-neutral-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-4">
          Projects we've contributed to across Michigan
        </p>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
          {projectHighlights.map((project) => (
            <div
              key={project.title}
              className="group overflow-hidden rounded-xl bg-white/5 border border-white/5 hover:border-accent-500/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-accent-500/10 transition-all duration-300 ease-out"
            >
              <div className="relative w-full aspect-[16/9] overflow-hidden rounded-t-xl border-b-2 border-accent-500/0 group-hover:border-accent-500 transition-all duration-300">
                <picture>
                  <source
                    srcSet={`${project.image}-480w.webp 480w, ${project.image}-960w.webp 960w`}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    type="image/webp"
                  />
                  <img
                    src={`${project.image}-960w.webp`}
                    alt={project.alt}
                    width="960"
                    height="540"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <div className="px-5 py-4">
                <h3 className="text-lg font-semibold text-white transition-colors duration-200 group-hover:text-accent-400">
                  {project.title}
                </h3>
                <p className="mt-1 text-sm text-neutral-300">
                  {project.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
    </ErrorBoundary>
  );
}
