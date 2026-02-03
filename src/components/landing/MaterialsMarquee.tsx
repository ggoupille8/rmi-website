import { materials } from "../../content/site";

export default function MaterialsMarquee() {
  // Double the materials for seamless loop
  const duplicatedMaterials = [...materials, ...materials];

  return (
    <section className="relative bg-neutral-850 py-6 sm:py-8 overflow-hidden border-y border-neutral-800/50">
      {/* Gradient fades on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-neutral-850 to-transparent z-10 pointer-events-none" style={{ backgroundColor: 'rgb(32, 32, 32)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-neutral-850 to-transparent z-10 pointer-events-none" style={{ backgroundColor: 'transparent', background: 'linear-gradient(to left, rgb(32,32,32), transparent)' }} />
      <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, rgb(32,32,32), transparent)' }} />

      {/* Header */}
      <div className="container-custom mb-3 sm:mb-4">
        <p className="text-neutral-500 text-xs uppercase tracking-wider font-medium text-center">
          Materials We Work With
        </p>
      </div>

      {/* Scrolling marquee */}
      <div className="relative">
        <div className="service-ticker">
          <div className="service-ticker__track">
            {duplicatedMaterials.map((material, index) => (
              <span
                key={`${material}-${index}`}
                className="inline-block px-3 sm:px-4 py-1.5 mx-1.5 text-neutral-400 text-sm whitespace-nowrap"
              >
                {material}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Screen reader content */}
      <div className="sr-only">
        <h3>Materials We Work With</h3>
        <ul>
          {materials.map((material, index) => (
            <li key={index}>{material}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
