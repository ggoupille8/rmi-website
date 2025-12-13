interface Feature {
  title: string;
  bullets: string[];
}

interface WhyUsProps {
  title?: string;
  subtitle?: string;
  features?: Feature[];
}

const defaultFeatures: Feature[] = [
  {
    title: "Union Local 25 Certified",
    bullets: [
      "Journeyman-level craftsmanship",
      "OSHA 30 certified crews",
      "Prevailing wage compliance",
      "Skilled trades expertise",
    ],
  },
  {
    title: "Safety First",
    bullets: [
      "Zero-incident track record",
      "Comprehensive safety programs",
      "Regular toolbox talks and training",
      "Full PPE compliance",
    ],
  },
  {
    title: "Schedule Reliability",
    bullets: [
      "On-time project completion",
      "Coordinated with GC schedules",
      "Minimal downtime installations",
      "24/7 emergency response capability",
    ],
  },
  {
    title: "Maintenance Responsiveness",
    bullets: [
      "Same-day service calls",
      "Preventive maintenance programs",
      "Emergency repair availability",
      "Long-term service agreements",
    ],
  },
];

export default function WhyUs({
  title = "Why Choose Us",
  subtitle = "Union-trained crews delivering reliable insulation work on schedule, safely, and with responsive maintenance support",
  features = defaultFeatures,
}: WhyUsProps) {
  return (
    <section
      className="section-padding bg-neutral-100"
      aria-labelledby="why-us-heading"
    >
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="why-us-heading" className="heading-2 text-neutral-900">
            {title}
          </h2>
          <p className="mt-4 text-body text-neutral-800">{subtitle}</p>
        </div>
        <div className="mx-auto mt-16 max-w-4xl">
          <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {features.map((feature, index) => (
              <div key={index} className="relative">
                <dt className="text-lg font-semibold text-neutral-900">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                    <span
                      className="text-xl font-bold text-white"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                  </div>
                  {feature.title}
                </dt>
                <dd className="mt-2">
                  <ul className="space-y-2 text-body text-neutral-700">
                    {feature.bullets.map((bullet, bulletIndex) => (
                      <li key={bulletIndex} className="flex items-start">
                        <span
                          className="mr-3 mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary-600"
                          aria-hidden="true"
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
