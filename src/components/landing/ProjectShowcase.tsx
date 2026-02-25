import { projectHighlights } from "../../content/site";

export default function ProjectShowcase() {
  return (
    <section
      className="py-16 sm:py-20 lg:py-24 bg-neutral-900 border-t border-neutral-600/30"
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
        <p className="text-center text-neutral-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-6">
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
                width="600"
                height="450"
                className="w-full aspect-[4/3] object-cover rounded-t-xl"
                loading="lazy"
                decoding="async"
              />
              <div className="px-5 py-4">
                <h3 className="text-lg font-semibold text-white">
                  {project.title}
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  {project.description}
                </p>
                <span className="mt-3 inline-block rounded-full border border-blue-500/40 px-3 py-0.5 text-xs text-blue-400">
                  {project.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
