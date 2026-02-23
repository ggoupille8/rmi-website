import { materials } from "../../content/site";

const pillClass = "inline-block px-5 sm:px-6 py-2.5 mx-1.5 sm:mx-2 text-neutral-300 text-base sm:text-lg whitespace-nowrap border border-neutral-700/60 rounded-full";

export default function MaterialsMarquee() {
  // Double the materials for seamless loop
  const duplicatedMaterials = [...materials, ...materials];

  // Split materials into two groups for the second row (offset start)
  const midpoint = Math.ceil(materials.length / 2);
  const row2Materials = [...materials.slice(midpoint), ...materials.slice(0, midpoint)];
  const duplicatedRow2 = [...row2Materials, ...row2Materials];

  return (
    <section className="relative pt-6 sm:pt-8 pb-8 sm:pb-12 overflow-hidden bg-neutral-900 border-t border-neutral-700/40">
      {/* Edge gradient fades */}
      <div
        className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 z-10 pointer-events-none bg-gradient-to-r from-neutral-900 to-transparent"
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 z-10 pointer-events-none bg-gradient-to-l from-neutral-900 to-transparent"
      />

      {/* Header */}
      <div className="container-custom mb-6">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl text-white uppercase tracking-wider font-bold text-center">
          Materials We Work With
        </h2>
        <p className="text-base sm:text-lg text-neutral-300 text-center mt-1.5 tracking-wide">
          Insulation, jacketing, accessories, and support systems
        </p>
      </div>

      {/* Scrolling marquee — Row 1 (left to right) */}
      <div className="relative" role="marquee" aria-label="Materials we work with" aria-hidden="true" aria-live="off">
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
      <div className="relative mt-3" aria-hidden="true">
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
