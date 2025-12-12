import Card from './Card';

interface Service {
  title: string;
  description: string;
  icon: string;
}

interface ServicesProps {
  title?: string;
  subtitle?: string;
  services?: Service[];
}

const defaultServices: Service[] = [
  {
    title: 'Piping Insulation',
    description: 'Professional insulation for all piping systems including hot, cold, and cryogenic applications.',
    icon: '🔧',
  },
  {
    title: 'Ductwork Insulation',
    description: 'Duct wrap, Fyre Wrap, and lagging services for HVAC and industrial duct systems.',
    icon: '💨',
  },
  {
    title: 'Tank & Equipment',
    description: 'Insulation solutions for tanks, vessels, and industrial equipment of all sizes.',
    icon: '🏭',
  },
  {
    title: 'Custom Fabrication',
    description: 'Custom-fabricated insulation blankets and removable covers for specialized applications.',
    icon: '✂️',
  },
  {
    title: 'Boiler & Turbine',
    description: 'Industrial boiler wall insulation and turbine rebuild support services.',
    icon: '⚙️',
  },
  {
    title: 'Maintenance Contracts',
    description: 'Ongoing maintenance and repair contracts to keep your systems operating efficiently.',
    icon: '🛠️',
  },
];

export default function Services({
  title = 'Our Services',
  subtitle = 'Comprehensive mechanical insulation solutions for industrial and commercial facilities',
  services = defaultServices,
}: ServicesProps) {
  return (
    <section className="section-padding bg-white" aria-labelledby="services-heading">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="services-heading" className="heading-2 text-neutral-900">
            {title}
          </h2>
          <p className="mt-4 text-body text-neutral-800">
            {subtitle}
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {services.map((service, index) => (
            <Card key={index} variant="hover" className="flex flex-col">
              <div className="text-4xl mb-4" aria-hidden="true">
                {service.icon}
              </div>
              <h3 className="heading-3 text-neutral-900">{service.title}</h3>
              <p className="mt-4 text-base text-neutral-700">{service.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

