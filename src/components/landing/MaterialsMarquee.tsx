import { materials } from "../../content/site";

export default function MaterialsMarquee() {
  // Double the materials for seamless loop
  const duplicatedMaterials = [...materials, ...materials];

  return (
    <section className="relative section-padding-sm overflow-hidden bg-neutral-900 border-t border-accent-500/30">
      {/* Edge gradient fades */}
      <div
        className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 z-10 pointer-events-none bg-gradient-to-r from-neutral-900 to-transparent"
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 z-10 pointer-events-none bg-gradient-to-l from-neutral-900 to-transparent"
      />

      {/* Header */}
      <div className="container-custom mb-6">
        <h2 className="text-xl sm:text-2xl lg:text-3xl text-white uppercase tracking-wider font-bold text-center">
          Materials We Work With
        </h2>
        <p className="text-base sm:text-lg text-neutral-300 text-center mt-1.5 tracking-wide">
          Insulation, jacketing, accessories, and support systems
        </p>
      </div>

      {/* Scrolling marquee */}
      <div className="relative">
        <div className="service-ticker">
          <div className="service-ticker__track">
            {duplicatedMaterials.map((material, index) => (
              <span
                key={`${material}-${index}`}
                className="inline-block px-5 sm:px-6 py-2.5 mx-1.5 sm:mx-2 text-neutral-300 text-base sm:text-lg whitespace-nowrap border border-neutral-700/60 rounded-full"
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
