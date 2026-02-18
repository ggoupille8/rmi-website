import {
  companyName,
  totalOshaManHours,
  oshaFirstYear,
  formatLargeNumber,
  formatLargeNumberProse,
} from "../../content/site";
import {
  ShieldCheck,
  Clock,
  Award,
  Users,
  type LucideIcon,
} from "lucide-react";

interface AboutFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: AboutFeature[] = [
  {
    icon: ShieldCheck,
    title: "Safety-First Culture",
    description: `Over ${formatLargeNumberProse(totalOshaManHours)} OSHA-tracked man-hours since ${oshaFirstYear} with zero lost-time incidents. Every job starts with thorough planning and preparation — no shortcuts, no exceptions.`,
  },
  {
    icon: Clock,
    title: "Outage & Emergency Response",
    description:
      "When a job calls for it, we scale — staffing dozens of insulators across dual 12-hour shifts, 7 days a week, with the capacity to run multiple outages simultaneously. Emergency repairs mobilized around the clock.",
  },
  {
    icon: Award,
    title: "Proven Track Record",
    description:
      "500+ commercial and industrial insulation projects completed annually across Michigan and surrounding states, serving power plants, manufacturing facilities, hospitals, and more.",
  },
  {
    icon: Users,
    title: "Union-Trained Workforce",
    description:
      "Proud to employ Local 25 insulators — OSHA 10/30-hour certified, CPR and first aid trained, and backed by years of hands-on field experience in commercial and industrial environments.",
  },
];

export default function About() {
  return (
    <section
      className="section-padding-sm bg-neutral-950 border-t border-accent-600/30"
      aria-labelledby="about-heading"
    >
      <div className="container-custom">
        {/* Section Header with Stripe — matches Services pattern */}
        <div className="flex justify-center mb-6">
          <h2
            id="about-heading"
            className="section-header-stripe font-bold tracking-wider text-white uppercase text-2xl sm:text-3xl lg:text-4xl"
            style={{ letterSpacing: "0.1em" }}
          >
            Why Choose <span className="hidden sm:inline">{companyName}</span><span className="sm:hidden">RMI</span>
          </h2>
        </div>

        {/* Subtitle */}
        <p className="text-center text-neutral-400 text-lg sm:text-xl max-w-3xl mx-auto mb-8">
          {formatLargeNumber(totalOshaManHours)} safe man-hours. Zero lost-time incidents. Local 25 union crews ready to handle everything from routine maintenance to full facility outages.
        </p>

        {/* Feature Cards Grid — 1 col mobile, 2 col tablet, 4 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;

            return (
              <div
                key={index}
                className="relative bg-neutral-800 p-6 border border-neutral-700 hover:border-accent-500/30 hover:shadow-lg transition-all duration-300"
              >
                {/* Icon */}
                <div className="mb-4">
                  <IconComponent
                    className="w-10 h-10 text-accent-500"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-3 uppercase tracking-wide">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-neutral-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
