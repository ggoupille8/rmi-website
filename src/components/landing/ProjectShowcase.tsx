import { projectHighlights } from "../../content/site";

export default function ProjectShowcase() {
  return (
    <section
      className="pt-10 pb-16 sm:py-16 bg-neutral-900 border-t border-neutral-600/30"
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
              <picture>
                <source
                  srcSet={`${project.image}.webp`}
                  type="image/webp"
                />
                <img
                  src={`${project.image}.jpg`}
                  alt={project.alt}
                  width="960"
                  height="720"
                  className="w-full aspect-[4/3] object-cover rounded-t-xl"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <div className="px-5 py-4">
                <h3 className="text-lg font-semibold text-white">
                  {project.title}
                </h3>
                <p className="mt-1 text-sm text-gray-400 line-clamp-3">
                  {project.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
