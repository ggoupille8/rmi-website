interface Step {
  number: string;
  title: string;
  description: string;
}

interface ProcessProps {
  title?: string;
  subtitle?: string;
  steps?: Step[];
}

const defaultSteps: Step[] = [
  {
    number: "01",
    title: "Consultation",
    description:
      "We assess your insulation needs, review specifications, and discuss project requirements.",
  },
  {
    number: "02",
    title: "Estimate & Quote",
    description:
      "Detailed estimate with material specifications, labor costs, and project timeline.",
  },
  {
    number: "03",
    title: "Planning & Scheduling",
    description:
      "Coordinate with your team to minimize disruption and ensure efficient installation.",
  },
  {
    number: "04",
    title: "Material Procurement",
    description:
      "Source quality materials and ensure everything is on-site when needed.",
  },
  {
    number: "05",
    title: "Installation",
    description:
      "Professional installation by experienced craftspeople following industry standards.",
  },
  {
    number: "06",
    title: "Inspection & Follow-up",
    description:
      "Quality inspection and ongoing support to ensure optimal performance.",
  },
];

export default function Process({
  title = "Our Process",
  subtitle = "A proven approach to delivering quality insulation solutions",
  steps = defaultSteps,
}: ProcessProps) {
  return (
    <section
      className="section-padding bg-white"
      aria-labelledby="process-heading"
    >
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="process-heading" className="heading-2 text-neutral-900">
            {title}
          </h2>
          <p className="mt-4 text-body text-neutral-800">{subtitle}</p>
        </div>
        <div className="mx-auto mt-16 max-w-5xl">
          <ol className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, index) => (
              <li key={index} className="relative">
                <div className="flex flex-col items-start">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    <span className="text-lg font-bold">{step.number}</span>
                  </div>
                  <h3 className="heading-3 text-neutral-900">{step.title}</h3>
                  <p className="mt-2 text-body text-neutral-700">
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className="absolute left-6 top-12 hidden h-full w-0.5 bg-neutral-200 sm:block lg:hidden"
                    aria-hidden="true"
                  />
                )}
                {index < steps.length - 3 && (
                  <div
                    className="absolute left-6 top-12 hidden h-full w-0.5 bg-neutral-200 lg:block"
                    aria-hidden="true"
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
