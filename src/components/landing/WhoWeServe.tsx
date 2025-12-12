interface Industry {
  title: string;
  description: string;
  icon: string;
}

interface WhoWeServeProps {
  title?: string;
  subtitle?: string;
  industries?: Industry[];
}

const defaultIndustries: Industry[] = [
  {
    title: 'Manufacturing',
    description: 'Industrial facilities requiring process piping, equipment, and system insulation.',
    icon: '🏭',
  },
  {
    title: 'Power Generation',
    description: 'Boiler, turbine, and power plant insulation for optimal efficiency and safety.',
    icon: '⚡',
  },
  {
    title: 'Commercial HVAC',
    description: 'Ductwork and HVAC system insulation for office buildings and facilities.',
    icon: '🏢',
  },
  {
    title: 'Food & Beverage',
    description: 'Temperature control insulation for processing, storage, and distribution.',
    icon: '🥤',
  },
  {
    title: 'Chemical Processing',
    description: 'Specialized insulation for chemical plants and processing facilities.',
    icon: '⚗️',
  },
  {
    title: 'Healthcare',
    description: 'Medical facility insulation meeting strict hygiene and performance standards.',
    icon: '🏥',
  },
];

export default function WhoWeServe({
  title = 'Who We Serve',
  subtitle = 'Trusted by leading industries across Southeast Michigan and the Midwest',
  industries = defaultIndustries,
}: WhoWeServeProps) {
  return (
    <section className="section-padding bg-neutral-100" aria-labelledby="who-we-serve-heading">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="who-we-serve-heading" className="heading-2 text-neutral-900">
            {title}
          </h2>
          <p className="mt-4 text-body text-neutral-800">
            {subtitle}
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {industries.map((industry, index) => (
            <div
              key={index}
              className="card-hover flex flex-col"
            >
              <div className="text-4xl mb-4" aria-hidden="true">
                {industry.icon}
              </div>
              <h3 className="heading-3 text-neutral-900">{industry.title}</h3>
              <p className="mt-4 text-base text-neutral-700">{industry.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

