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
      "Equipment insulation and jacketing",
      "Removable blankets for maintenance",
      "Ongoing maintenance services",
    ],
    icon: "",
  },
  {
    title: "Power Generation",
    bullets: [
      "High-temperature piping insulation",
      "Equipment insulation and jacketing",
      "Removable blankets for access",
      "Maintenance and repair services",
    ],
    icon: "",
  },
  {
    title: "Commercial HVAC",
    bullets: [
      "Ductwork insulation",
      "Piping insulation",
      "Equipment insulation",
      "Maintenance contracts",
    ],
    icon: "",
  },
  {
    title: "Food & Beverage",
    bullets: [
      "Piping insulation",
      "Equipment insulation and jacketing",
      "Removable blankets",
      "Maintenance services",
    ],
    icon: "",
  },
  {
    title: "Chemical Processing",
    bullets: [
      "Process piping insulation",
      "Equipment and vessel insulation",
      "Jacketing systems",
      "Maintenance and repair",
    ],
    icon: "",
  },
  {
    title: "Healthcare",
    bullets: [
      "HVAC ductwork insulation",
      "Mechanical piping insulation",
      "Equipment insulation",
      "Maintenance contracts",
    ],
    icon: "",
  },
];

export default function WhoWeServe({
  title = "Who We Serve",
  subtitle = "We support commercial and industrial environments with professional installs and safety-driven practices.",
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
