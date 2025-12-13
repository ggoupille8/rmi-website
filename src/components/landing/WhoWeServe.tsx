interface Industry {
  title: string;
  bullets: string[];
  icon: string;
}

interface WhoWeServeProps {
  title?: string;
  subtitle?: string;
  industries?: Industry[];
}

const defaultIndustries: Industry[] = [
  {
    title: "Manufacturing",
    bullets: [
      "Process piping insulation",
      "Equipment and vessel wrapping",
      "Steam and condensate systems",
      "Refrigeration and cold storage",
    ],
    icon: "",
  },
  {
    title: "Power Generation",
    bullets: [
      "Boiler and turbine insulation",
      "High-temperature applications",
      "Chimney and stack work",
      "Plant efficiency upgrades",
    ],
    icon: "",
  },
  {
    title: "Commercial HVAC",
    bullets: [
      "Ductwork insulation",
      "Chilled water systems",
      "Building envelope work",
      "Energy efficiency retrofits",
    ],
    icon: "",
  },
  {
    title: "Food & Beverage",
    bullets: [
      "USDA-compliant installations",
      "Temperature-controlled environments",
      "Sanitary system insulation",
      "Processing facility upgrades",
    ],
    icon: "",
  },
  {
    title: "Chemical Processing",
    bullets: [
      "Corrosion-resistant systems",
      "High-temperature pipe work",
      "Tank and vessel insulation",
      "Process line maintenance",
    ],
    icon: "",
  },
  {
    title: "Healthcare",
    bullets: [
      "Clean room installations",
      "Medical gas systems",
      "HVAC and mechanical insulation",
      "Facility maintenance contracts",
    ],
    icon: "",
  },
];

export default function WhoWeServe({
  title = "Who We Serve",
  subtitle = "Union Local 25 insulation contractors serving industrial and commercial clients across Southeast Michigan",
  industries = defaultIndustries,
}: WhoWeServeProps) {
  return (
    <section
      className="section-padding bg-neutral-100"
      aria-labelledby="who-we-serve-heading"
    >
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="who-we-serve-heading" className="heading-2 text-neutral-900">
            {title}
          </h2>
          <p className="mt-4 text-body text-neutral-800">{subtitle}</p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {industries.map((industry, index) => (
            <div key={index} className="card-hover flex flex-col">
              <div
                className="w-12 h-0.5 bg-primary-600 mb-6"
                aria-hidden="true"
              />
              <h3 className="heading-3 text-neutral-900">{industry.title}</h3>
              <ul className="mt-4 space-y-2 text-body text-neutral-700">
                {industry.bullets.map((bullet, bulletIndex) => (
                  <li key={bulletIndex} className="flex items-start">
                    <span
                      className="mr-3 mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary-600"
                      aria-hidden="true"
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
