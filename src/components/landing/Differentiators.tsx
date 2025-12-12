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
    title: 'Union Contractor Local 25',
    description: 'Certified union craftspeople with extensive training and experience in mechanical insulation.',
    icon: '🏆',
  },
  {
    title: 'Southeast Michigan Based',
    description: 'Based in Romulus, MI with deep knowledge of local projects and requirements.',
    icon: '📍',
  },
  {
    title: 'Midwest Travel',
    description: 'We travel throughout the Midwest for the right projects, bringing expertise where you need it.',
    icon: '🚛',
  },
  {
    title: 'Full Service Capability',
    description: 'From installation to materials supply, we handle every aspect of your insulation needs.',
    icon: '🔧',
  },
  {
    title: 'Hot, Cold & Cryogenic',
    description: 'Expertise in all temperature ranges from high-heat applications to cryogenic systems.',
    icon: '🌡️',
  },
  {
    title: 'Custom Solutions',
    description: 'Specialized fabrication for unique applications including removable blankets and custom covers.',
    icon: '✨',
  },
];

export default function Differentiators({
  title = 'Why Choose Resource Mechanical Insulation',
  subtitle = 'What sets us apart in the mechanical insulation industry',
  items = defaultDifferentiators,
}: DifferentiatorsProps) {
  return (
    <section className="section-padding bg-gradient-soft" aria-labelledby="differentiators-heading">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="differentiators-heading" className="heading-2 text-neutral-900">
            {title}
          </h2>
          <p className="mt-4 text-body text-neutral-800">
            {subtitle}
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="card-gradient flex flex-col"
            >
              <div className="text-4xl mb-4" aria-hidden="true">
                {item.icon}
              </div>
              <h3 className="heading-3 text-neutral-900">{item.title}</h3>
              <p className="mt-4 text-base text-neutral-700">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

