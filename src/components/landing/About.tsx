import {
  companyName,
  totalOshaManHours,
  oshaFirstYear,
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
    title: "Emergency Response",
    description:
      "When a job calls for it, we scale — staffing dozens of insulators across dual 12-hour shifts, 7 days a week, with the capacity to run multiple outages simultaneously. Emergency repairs mobilized around the clock.",
  },
  {
    icon: Award,
    title: "Proven Track Record",
    description:
      "From hospitals and manufacturing plants to landmark restorations and ground-up campus builds \u2014 our work speaks for itself. Year after year, general contractors and facility managers trust RMI to deliver on schedule and on spec.",
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
      className="py-16 sm:py-20 lg:py-24 bg-neutral-900 border-t border-neutral-600/30"
      aria-labelledby="about-heading"
    >
      <div className="container-custom">
        {/* Section Header */}
        <div className="flex flex-col items-center mb-3">
          <h2
            id="about-heading"
            className="font-bold tracking-wider text-white uppercase text-xl sm:text-2xl lg:text-3xl"
          >
            Why Choose{" "}<span className="hidden sm:inline">{companyName}</span><span className="sm:hidden">RMI</span>
          </h2>
          <div className="w-12 h-0.5 bg-accent-500 mt-4 rounded-full" />
        </div>

        {/* Subtitle */}
        <p className="text-center text-neutral-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-6">
          Built on safety, reliability, and deep expertise. Here&rsquo;s what sets us apart.
        </p>

        {/* Feature Cards Grid — 1 col mobile, 2 col tablet, 4 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;

            return (
              <div
                key={index}
                className="relative overflow-hidden bg-gradient-to-b from-neutral-800/50 to-neutral-800/30 backdrop-blur-sm px-5 pt-5 pb-6 border border-neutral-700/40 hover:border-accent-500/30 hover:bg-neutral-800/55 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 h-full flex flex-col"
              >
                {/* Accent bar */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-500/60 via-accent-400/40 to-transparent" />

                {/* Icon + Title row */}
                <div className="flex items-center gap-3 mb-3 min-h-[48px]">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-500/10 flex-shrink-0">
                    <IconComponent
                      className="w-5 h-5 text-accent-400"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wide">
                    {feature.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-sm lg:text-base text-neutral-300 leading-relaxed flex-grow">
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
