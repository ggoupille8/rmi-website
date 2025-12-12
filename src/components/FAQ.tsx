import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  title?: string;
  subtitle?: string;
  items?: FAQItem[];
}

const defaultItems: FAQItem[] = [
  {
    question: 'What technologies do you use?',
    answer:
      'We use modern web technologies including React, Astro, TypeScript, and Tailwind CSS to build fast, scalable, and maintainable applications.',
  },
  {
    question: 'How long does a typical project take?',
    answer:
      'Project timelines vary based on scope and complexity. A typical website can take 2-4 weeks, while more complex applications may take 2-6 months. We provide detailed timelines during the planning phase.',
  },
  {
    question: 'Do you provide ongoing support?',
    answer:
      'Yes, we offer various support packages to help maintain and improve your project after launch. This includes bug fixes, updates, and feature additions.',
  },
  {
    question: 'Can you work with our existing team?',
    answer:
      'Absolutely! We excel at collaborating with in-house teams and can integrate seamlessly into your workflow and development processes.',
  },
  {
    question: 'What is your pricing model?',
    answer:
      'We offer flexible pricing based on project scope. We provide detailed quotes after understanding your requirements. Contact us for a custom estimate.',
  },
];

export default function FAQ({
  title = 'Frequently Asked Questions',
  subtitle = 'Everything you need to know about working with us',
  items = defaultItems,
}: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="section-padding bg-gray-50" aria-labelledby="faq-heading">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="faq-heading" className="heading-2 text-gray-900">
            {title}
          </h2>
          <p className="mt-4 text-body">
            {subtitle}
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-3xl">
          <dl className="space-y-6">
            {items.map((item, index) => (
              <div
                key={index}
                className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <dt>
                  <button
                    type="button"
                    className="flex w-full items-start justify-between text-left"
                    onClick={() => toggleItem(index)}
                    aria-expanded={openIndex === index}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <span className="text-lg font-semibold text-gray-900">{item.question}</span>
                    <span className="ml-6 flex h-7 items-center">
                      <svg
                        className={`h-6 w-6 transform transition-transform ${
                          openIndex === index ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </span>
                  </button>
                </dt>
                <dd
                  id={`faq-answer-${index}`}
                  className={`mt-4 overflow-hidden transition-all ${
                    openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-base text-gray-600">{item.answer}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

