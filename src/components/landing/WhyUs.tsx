interface Feature {
  title: string;
  description: string;
}

interface WhyUsProps {
  title?: string;
  subtitle?: string;
  features?: Feature[];
}

const defaultFeatures: Feature[] = [
  {
    title: 'Expert Team',
    description:
      'Our team consists of experienced developers and designers who stay up-to-date with the latest technologies and best practices.',
  },
  {
    title: 'Proven Track Record',
    description:
      'We have successfully delivered hundreds of projects, from small startups to large enterprises.',
  },
  {
    title: 'Client-Focused Approach',
    description:
      'Your success is our priority. We work closely with you to understand your needs and deliver solutions that exceed expectations.',
  },
  {
    title: 'Modern Technology Stack',
    description:
      'We use cutting-edge tools and frameworks to build scalable, maintainable, and future-proof applications.',
  },
];

export default function WhyUs({
  title = 'Why Choose Us',
  subtitle = 'We combine expertise, innovation, and dedication to deliver exceptional results',
  features = defaultFeatures,
}: WhyUsProps) {
  return (
    <section className="section-padding bg-neutral-100" aria-labelledby="why-us-heading">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="why-us-heading" className="heading-2 text-neutral-900">
            {title}
          </h2>
          <p className="mt-4 text-body text-neutral-800">
            {subtitle}
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-4xl">
          <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {features.map((feature, index) => (
              <div key={index} className="relative">
                <dt className="text-lg font-semibold leading-7 text-neutral-900">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                    <span className="text-xl font-bold text-white" aria-hidden="true">
                      {index + 1}
                    </span>
                  </div>
                  {feature.title}
                </dt>
                <dd className="mt-2 text-base leading-7 text-neutral-700">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

