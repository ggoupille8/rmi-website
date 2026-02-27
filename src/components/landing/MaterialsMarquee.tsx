import { materials } from "../../content/site";

const pillClass = "inline-block px-3 py-1.5 sm:px-5 sm:py-2.5 mx-1.5 sm:mx-2 text-neutral-300 text-xs sm:text-sm whitespace-nowrap border border-neutral-600/50 rounded-full";

export default function MaterialsMarquee() {
  // Double the materials for seamless loop
  const duplicatedMaterials = [...materials, ...materials];

  // Split materials into two groups for the second row (offset start)
  const midpoint = Math.ceil(materials.length / 2);
  const row2Materials = [...materials.slice(midpoint), ...materials.slice(0, midpoint)];
  const duplicatedRow2 = [...row2Materials, ...row2Materials];

  return (
    <section
      className="relative pt-10 pb-16 sm:py-20 lg:py-24 overflow-hidden bg-neutral-800 border-t border-neutral-600/30"
    >

      {/* Header */}
      <div className="container-custom mb-6">
        <h2 className="text-xl sm:text-2xl lg:text-3xl text-white uppercase tracking-wider font-bold text-center">
          Materials We Work With
        </h2>
        <div className="w-12 h-0.5 bg-accent-500 mx-auto mt-4 rounded-full" />
        <p className="text-base sm:text-lg text-neutral-300 text-center mt-3 tracking-wide">
          Insulation, jacketing, accessories, and support systems
        </p>
      </div>

      {/* Scrolling marquee — Row 1 (left to right) */}
      <div
        className="relative overflow-hidden"
        role="marquee"
        aria-label="Materials we work with"
        aria-hidden="true"
        aria-live="off"
        style={{
          maskImage: "linear-gradient(to right, transparent, black clamp(100px, 20vw, 250px), black calc(100% - clamp(100px, 20vw, 250px)), transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black clamp(100px, 20vw, 250px), black calc(100% - clamp(100px, 20vw, 250px)), transparent)",
        }}
      >
        <div className="service-ticker">
          <div className="service-ticker__track">
            {duplicatedMaterials.map((material, index) => (
              <span
                key={`r1-${material}-${index}`}
                className={pillClass}
              >
                {material}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Scrolling marquee — Row 2 (right to left) */}
      <div
        className="relative mt-3 sm:mt-4 overflow-hidden"
        aria-hidden="true"
        style={{
          maskImage: "linear-gradient(to right, transparent, black clamp(100px, 20vw, 250px), black calc(100% - clamp(100px, 20vw, 250px)), transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black clamp(100px, 20vw, 250px), black calc(100% - clamp(100px, 20vw, 250px)), transparent)",
        }}
      >
        <div className="service-ticker">
          <div className="service-ticker__track" style={{ animationDirection: "reverse" }}>
            {duplicatedRow2.map((material, index) => (
              <span
                key={`r2-${material}-${index}`}
                className={pillClass}
              >
                {material}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Screen reader content */}
      <div className="sr-only">
        <ul>
          {materials.map((material, index) => (
            <li key={index}>{material}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
