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
    number: '01',
    title: 'Discovery',
    description: 'We start by understanding your goals, target audience, and project requirements.',
  },
  {
    number: '02',
    title: 'Planning',
    description: 'We create a detailed roadmap and strategy tailored to your specific needs.',
  },
  {
    number: '03',
    title: 'Design',
    description: 'Our team designs beautiful, user-friendly interfaces that align with your brand.',
  },
  {
    number: '04',
    title: 'Development',
    description: 'We build your solution using best practices and modern technologies.',
  },
  {
    number: '05',
    title: 'Testing',
    description: 'Rigorous testing ensures everything works perfectly across all devices and browsers.',
  },
  {
    number: '06',
    title: 'Launch',
    description: 'We deploy your project and provide ongoing support to ensure continued success.',
  },
];

export default function Process({
  title = 'Our Process',
  subtitle = 'A streamlined approach to delivering exceptional results',
  steps = defaultSteps,
}: ProcessProps) {
  return (
    <section className="section-padding bg-white" aria-labelledby="process-heading">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="process-heading" className="heading-2 text-gray-900">
            {title}
          </h2>
          <p className="mt-4 text-body">
            {subtitle}
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-5xl">
          <ol className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, index) => (
              <li key={index} className="relative">
                <div className="flex flex-col items-start">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    <span className="text-lg font-bold">{step.number}</span>
                  </div>
                  <h3 className="heading-3 text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-base text-gray-600">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className="absolute left-6 top-12 hidden h-full w-0.5 bg-gray-200 sm:block lg:hidden"
                    aria-hidden="true"
                  />
                )}
                {index < steps.length - 3 && (
                  <div
                    className="absolute left-6 top-12 hidden h-full w-0.5 bg-gray-200 lg:block"
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

