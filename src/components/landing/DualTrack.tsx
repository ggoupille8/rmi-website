interface TrackFeature {
  title: string;
  description: string;
}

interface DualTrackProps {
  title?: string;
  subtitle?: string;
  servicesTitle?: string;
  servicesSubtitle?: string;
  servicesFeatures?: TrackFeature[];
  supplyTitle?: string;
  supplySubtitle?: string;
  supplyFeatures?: TrackFeature[];
}

const defaultServicesFeatures: TrackFeature[] = [
  {
    title: 'Installation Services',
    description: 'Professional installation by union-certified Local 25 craftspeople',
  },
  {
    title: 'Custom Fabrication',
    description: 'Removable blankets, custom covers, and specialized insulation solutions',
  },
  {
    title: 'Maintenance Contracts',
    description: 'Ongoing maintenance and repair services to keep systems operating efficiently',
  },
  {
    title: 'Project Management',
    description: 'Full-service project management from planning through completion',
  },
];

const defaultSupplyFeatures: TrackFeature[] = [
  {
    title: 'Materials & Supplies',
    description: 'Complete line of insulation materials, adhesives, and accessories',
  },
  {
    title: 'Pipe Supports',
    description: 'Comprehensive selection of pipe supports and hangers',
  },
  {
    title: 'National Shipping',
    description: 'We sell and ship materials and pipe supports nationwide',
  },
  {
    title: 'Expert Consultation',
    description: 'Technical support to help you select the right materials for your project',
  },
];

export default function DualTrack({
  title = 'Services & Supply',
  subtitle = 'Two ways we serve your insulation needs',
  servicesTitle = 'Installation Services',
  servicesSubtitle = 'Professional installation and maintenance by union-certified craftspeople',
  servicesFeatures = defaultServicesFeatures,
  supplyTitle = 'Materials & Supply',
  supplySubtitle = 'Quality insulation materials and pipe supports shipped nationwide',
  supplyFeatures = defaultSupplyFeatures,
}: DualTrackProps) {
  return (
    <section className="section-padding bg-white" aria-labelledby="dual-track-heading">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="dual-track-heading" className="heading-2 text-neutral-900">
            {title}
          </h2>
          <p className="mt-4 text-body text-neutral-800">
            {subtitle}
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Services Track */}
          <div className="card-elevated">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
                <span className="text-2xl" aria-hidden="true">🛠️</span>
              </div>
              <h3 className="heading-3 text-neutral-900">{servicesTitle}</h3>
              <p className="mt-2 text-body-sm text-neutral-700">{servicesSubtitle}</p>
            </div>
            <ul className="space-y-4">
              {servicesFeatures.map((feature, index) => (
                <li key={index} className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">{feature.title}</h4>
                    <p className="mt-1 text-sm text-neutral-700">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex gap-4">
              <a href="#contact" className="btn-primary">
                Request a Quote
              </a>
              <a href="tel:+1234567890" className="btn-secondary">
                Call Now
              </a>
            </div>
          </div>

          {/* Supply Track */}
          <div className="card-elevated">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-100 mb-4">
                <span className="text-2xl" aria-hidden="true">📦</span>
              </div>
              <h3 className="heading-3 text-neutral-900">{supplyTitle}</h3>
              <p className="mt-2 text-body-sm text-neutral-700">{supplySubtitle}</p>
            </div>
            <ul className="space-y-4">
              {supplyFeatures.map((feature, index) => (
                <li key={index} className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-accent-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">{feature.title}</h4>
                    <p className="mt-1 text-sm text-neutral-700">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex gap-4">
              <a href="#contact" className="btn-accent">
                Request Materials
              </a>
              <a href="tel:+1234567890" className="btn-secondary">
                Call Now
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

