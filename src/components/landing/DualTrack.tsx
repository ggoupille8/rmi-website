import { phoneTel, phoneDisplay, companyName } from "../../config/site";

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
    title: "Professional Installs",
    description:
      "Expert installation services for piping, ductwork, and equipment insulation",
  },
  {
    title: "Remediation",
    description:
      "Repair and replacement of damaged or deteriorated insulation systems",
  },
  {
    title: "Jacketing",
    description:
      "Protective jacketing systems for insulation in commercial and industrial environments",
  },
  {
    title: "Removable Blankets",
    description:
      "Custom removable insulation blankets for equipment requiring regular access",
  },
  {
    title: "Maintenance Contracts",
    description:
      "Ongoing maintenance and repair services to keep systems operating efficiently",
  },
];

const defaultSupplyFeatures: TrackFeature[] = [
  {
    title: "Material Resale",
    description:
      "Source and supply insulation materials, adhesives, and related accessories",
  },
  {
    title: "Pipe Support Fabrication",
    description:
      "Custom pipe support fabrication to meet your project specifications",
  },
  {
    title: "Availability & Pricing",
    description:
      "Contact us for current availability and competitive pricing on materials and supports",
  },
];

export default function DualTrack({
  title = "Installation & Support",
  subtitle = "Two ways we support your insulation needs.",
  servicesTitle = "Installation Services",
  servicesSubtitle = "Professional installs, remediation, jacketing, removable blankets, and maintenance contracts",
  servicesFeatures = defaultServicesFeatures,
  supplyTitle = "Materials & Pipe Supports",
  supplySubtitle = "Material resale, pipe support fabrication, and availability/pricing",
  supplyFeatures = defaultSupplyFeatures,
}: DualTrackProps) {
  return (
    <section
      className="section-padding bg-white"
      aria-labelledby="dual-track-heading"
    >
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="dual-track-heading" className="heading-2 text-neutral-900">
            {title}
          </h2>
          <p className="mt-4 text-body text-neutral-800">{subtitle}</p>
        </div>

        <div className="mx-auto mt-16 grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Services Track */}
          <div className="card-elevated">
            <div className="mb-6">
              <div
                className="w-12 h-0.5 bg-primary-600 mb-6"
                aria-hidden="true"
              />
              <h3 className="heading-3 text-neutral-900">{servicesTitle}</h3>
              <p className="mt-2 text-body-sm text-neutral-700">
                {servicesSubtitle}
              </p>
            </div>
            <ul className="space-y-4">
              {servicesFeatures.map((feature, index) => (
                <li key={index} className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div
                      className="w-2 h-2 rounded-full bg-primary-600"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">
                      {feature.title}
                    </h4>
                    <p className="mt-1 text-body-sm text-neutral-700">
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex gap-4">
              <a href="#contact" className="btn-primary">
                Request a Quote
              </a>
              <a
                href={phoneTel}
                className="btn-secondary"
                aria-label={`Call ${companyName} at ${phoneDisplay}`}
              >
                {phoneDisplay}
              </a>
            </div>
          </div>

          {/* Supply Track */}
          <div className="card-elevated">
            <div className="mb-6">
              <div
                className="w-12 h-0.5 bg-accent-600 mb-6"
                aria-hidden="true"
              />
              <h3 className="heading-3 text-neutral-900">{supplyTitle}</h3>
              <p className="mt-2 text-body-sm text-neutral-700">
                {supplySubtitle}
              </p>
            </div>
            <ul className="space-y-4">
              {supplyFeatures.map((feature, index) => (
                <li key={index} className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div
                      className="w-2 h-2 rounded-full bg-accent-600"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">
                      {feature.title}
                    </h4>
                    <p className="mt-1 text-body-sm text-neutral-700">
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex gap-4">
              <a href="#contact" className="btn-accent">
                Request Materials
              </a>
              <a
                href={phoneTel}
                className="btn-secondary"
                aria-label={`Call ${companyName} at ${phoneDisplay}`}
              >
                {phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
