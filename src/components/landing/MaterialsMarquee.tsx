import { materials } from "../../content/site";

export default function MaterialsMarquee() {
  // Double the materials for seamless loop
  const duplicatedMaterials = [...materials, ...materials];

  return (
    <section className="relative py-10 sm:py-12 overflow-hidden" style={{ backgroundColor: 'rgb(23, 23, 23)' }}>
      {/* Edge gradient fades */}
      <div
        className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgb(23,23,23), transparent)' }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, rgb(23,23,23), transparent)' }}
      />

      {/* Header */}
      <div className="container-custom mb-6">
        <p className="text-sm sm:text-base text-neutral-400 uppercase tracking-[0.15em] font-medium text-center">
          Materials We Work With
        </p>
        <p className="text-xs sm:text-sm text-neutral-600 text-center mt-1.5 tracking-wide">
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
                className="inline-block px-4 sm:px-5 py-2 mx-1.5 sm:mx-2 text-neutral-300 text-sm sm:text-base whitespace-nowrap border border-neutral-700/60 rounded-full"
              >
                {material}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Screen reader content */}
      <div className="sr-only">
        <h2>Materials We Work With</h2>
        <ul>
          {materials.map((material, index) => (
            <li key={index}>{material}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
