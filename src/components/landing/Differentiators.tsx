interface Differentiator {
  title: string;
  description: string;
  icon: string;
}

interface DifferentiatorsProps {
  title?: string;
  subtitle?: string;
  items?: Differentiator[];
}

const defaultDifferentiators: Differentiator[] = [
  {
    title: "Safety-driven practices on active job sites",
    description:
      "Comprehensive safety protocols and training ensure secure operations in commercial and industrial environments.",
    icon: "",
  },
  {
    title: "Professional installs with detail-driven workmanship",
    description:
      "Precision installation techniques and quality craftsmanship that meet industry standards and exceed expectations.",
    icon: "",
  },
  {
    title: "Clear scope, assumptions, and next steps",
    description:
      "Transparent project planning with defined parameters, documented assumptions, and actionable next steps from start to finish.",
    icon: "",
  },
  {
    title: "Responsive communication and reliable scheduling",
    description:
      "Consistent updates, timely responses, and dependable scheduling to keep your project on track.",
    icon: "",
  },
  {
    title: "Commercial and industrial environments",
    description:
      "Expertise in both commercial and industrial settings, delivering tailored solutions for diverse project requirements.",
    icon: "",
  },
];

export default function Differentiators({
  title = "Why Choose RMI",
  subtitle = "Professional installs backed by safety-driven practices—with clear scope and consistent communication.",
  items = defaultDifferentiators,
}: DifferentiatorsProps) {
  return (
    <section
      className="section-padding bg-gradient-soft"
      aria-labelledby="differentiators-heading"
    >
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="differentiators-heading"
            className="heading-2 text-neutral-900"
          >
            {title}
          </h2>
          <p className="mt-4 text-body text-neutral-800">{subtitle}</p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {items.map((item, index) => (
            <div key={index} className="card-gradient flex flex-col">
              <div
                className="w-12 h-0.5 bg-primary-600 mb-6"
                aria-hidden="true"
              />
              <h3 className="heading-3 text-neutral-900">{item.title}</h3>
              <p className="mt-4 text-body text-neutral-700">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
