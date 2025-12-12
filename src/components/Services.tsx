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
    title: 'Web Development',
    description: 'Custom web applications built with modern frameworks and best practices.',
    icon: '🌐',
  },
  {
    title: 'UI/UX Design',
    description: 'Beautiful, intuitive interfaces that provide exceptional user experiences.',
    icon: '🎨',
  },
  {
    title: 'Performance Optimization',
    description: 'Lightning-fast applications optimized for speed and efficiency.',
    icon: '⚡',
  },
  {
    title: 'SEO & Analytics',
    description: 'Data-driven strategies to improve visibility and track performance.',
    icon: '📊',
  },
  {
    title: 'Mobile Responsive',
    description: 'Fully responsive designs that work seamlessly across all devices.',
    icon: '📱',
  },
  {
    title: '24/7 Support',
    description: 'Round-the-clock assistance to keep your projects running smoothly.',
    icon: '🛟',
  },
];

export default function Services({
  title = 'Our Services',
  subtitle = 'Everything you need to build and grow your digital presence',
  services = defaultServices,
}: ServicesProps) {
  return (
    <section className="section-padding bg-white" aria-labelledby="services-heading">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="services-heading" className="heading-2 text-gray-900">
            {title}
          </h2>
          <p className="mt-4 text-body">
            {subtitle}
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {services.map((service, index) => (
            <article
              key={index}
              className="flex flex-col rounded-2xl bg-gray-50 p-8 shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-primary-500"
            >
              <div className="text-4xl mb-4" aria-hidden="true">
                {service.icon}
              </div>
              <h3 className="heading-3 text-gray-900">{service.title}</h3>
              <p className="mt-4 text-base text-gray-600">{service.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

