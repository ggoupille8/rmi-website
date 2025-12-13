import { useState } from "react";

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
    question: "What areas do you serve?",
    answer:
      "We are based in Romulus, MI and primarily serve Southeast Michigan. We also travel throughout the Midwest for the right projects. For materials and supplies, we ship nationwide.",
  },
  {
    question: "Are you a union contractor?",
    answer:
      "Yes, we are a union contractor with Local 25. Our craftspeople are union-certified and receive ongoing training to maintain the highest standards of quality and safety.",
  },
  {
    question: "What types of insulation do you install?",
    answer:
      "We install insulation for piping, ductwork, tanks, and equipment. We handle hot, cold, and cryogenic applications. Our services include duct wrap, Fyre Wrap, lagging, removable blankets, and custom fabrication.",
  },
  {
    question: "Do you sell materials and supplies?",
    answer:
      "Yes, we sell and ship insulation materials, adhesives, accessories, and pipe supports nationwide. We can provide expert consultation to help you select the right materials for your project.",
  },
  {
    question: "Do you offer maintenance contracts?",
    answer:
      "Yes, we offer maintenance contracts to help keep your insulation systems operating efficiently. This includes regular inspections, repairs, and preventive maintenance services.",
  },
  {
    question: "Can you handle industrial boiler and turbine projects?",
    answer:
      "Absolutely. We provide industrial boiler wall insulation and turbine rebuild support services. Our team has extensive experience with large-scale industrial insulation projects.",
  },
  {
    question: "How do I request a quote?",
    answer:
      "You can request a quote by filling out our contact form, calling us directly, or emailing us with your project details. We typically respond within 24 hours with a detailed estimate.",
  },
];

export default function FAQ({
  title = "Frequently Asked Questions",
  subtitle = "Everything you need to know about working with us",
  items = defaultItems,
}: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      className="section-padding bg-neutral-100"
      aria-labelledby="faq-heading"
    >
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="faq-heading" className="heading-2 text-neutral-900">
            {title}
          </h2>
          <p className="mt-4 text-body text-neutral-800">{subtitle}</p>
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
                    <span className="text-lg font-semibold text-neutral-900 leading-relaxed">
                      {item.question}
                    </span>
                    <span className="ml-6 flex h-7 items-center">
                      <svg
                        className={`h-6 w-6 transform transition-transform text-neutral-600 ${
                          openIndex === index ? "rotate-180" : ""
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
                    openIndex === index
                      ? "max-h-96 opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-body text-neutral-700">{item.answer}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
