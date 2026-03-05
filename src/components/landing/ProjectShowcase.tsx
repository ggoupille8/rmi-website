import { useState, useEffect } from "react";
import { projectHighlights } from "../../content/site";
import { ErrorBoundary } from "../ErrorBoundary";
import { getImageOverrides } from "../../lib/media-loader";

// Map project image paths to slot names for override lookup
const projectSlotMap: Record<string, string> = {
  "/images/projects/henry-ford-hospital": "project-henry-ford",
  "/images/projects/michigan-central-station": "project-michigan-central",
  "/images/projects/ford-hub-dearborn": "project-ford-hub",
};

export default function ProjectShowcase() {
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    const slots = Object.values(projectSlotMap);
    getImageOverrides(slots).then((overrides) => {
      if (Object.keys(overrides).length > 0) {
        setImageOverrides(overrides);
      }
    });
  }, []);

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
        <p className="text-center text-neutral-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-4">
          Projects we've contributed to across Michigan
        </p>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-4 lg:gap-5">
          {projectHighlights.map((project) => {
            const slot = projectSlotMap[project.image];
            const overrideUrl = slot ? imageOverrides[slot] : undefined;
            return (
            <div
              key={project.title}
              className="group overflow-hidden rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 ease-out"
            >
              <div className="relative overflow-hidden rounded-t-xl border-b-2 border-blue-500/0 group-hover:border-blue-500 transition-all duration-300">
                {overrideUrl ? (
                  <img
                    src={overrideUrl}
                    alt={project.alt}
                    width="960"
                    height="720"
                    className="w-full aspect-[4/3] object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
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
                    height="720"
                    className="w-full aspect-[4/3] object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <div className="px-5 py-4">
                <h3 className="text-lg font-semibold text-white transition-colors duration-200 group-hover:text-blue-400">
                  {project.title}
                </h3>
                <p className="mt-1 text-sm text-neutral-300 line-clamp-4 sm:line-clamp-none">
                  {project.description}
                </p>
              </div>
            </div>
            );
          })}
        </div>

      </div>
    </section>
    </ErrorBoundary>
  );
}
