import { useRef, useState, useEffect } from "react";
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

interface CardAccent {
  bar: string;
  iconBg: string;
  iconText: string;
  hoverBorder: string;
  hoverShadow: string;
  hoverIconBg: string;
}

interface AboutFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: CardAccent;
}

const features: AboutFeature[] = [
  {
    icon: ShieldCheck,
    title: "Safety-First Culture",
    description: `Over ${formatLargeNumberProse(totalOshaManHours)} OSHA-tracked man-hours since ${oshaFirstYear} with zero lost-time incidents. Our EMR rating of 0.76 puts us 24% better than the industry average — a direct reflection of our commitment to planning, training, and accountability.`,
    accent: {
      bar: "from-blue-500/60 via-blue-400/40",
      iconBg: "bg-blue-500/10 border-blue-500/30",
      iconText: "text-blue-400",
      hoverBorder: "hover:border-blue-500/40",
      hoverShadow: "hover:shadow-blue-500/10",
      hoverIconBg: "group-hover:bg-blue-500/20 group-hover:border-blue-500/50",
    },
  },
  {
    icon: Clock,
    title: "Emergency Response",
    description:
      "When a job calls for it, we scale — staffing dozens of insulators across dual 12-hour shifts, 7 days a week, with the capacity to run multiple outages simultaneously. Emergency repairs mobilized around the clock.",
    accent: {
      bar: "from-red-500/60 via-red-400/40",
      iconBg: "bg-red-500/10 border-red-500/30",
      iconText: "text-red-400",
      hoverBorder: "hover:border-red-500/40",
      hoverShadow: "hover:shadow-red-500/10",
      hoverIconBg: "group-hover:bg-red-500/20 group-hover:border-red-500/50",
    },
  },
  {
    icon: Award,
    title: "Proven Track Record",
    description:
      "From a year-round presence at Henry Ford Hospital to Ford\u2019s new World Headquarters \u2014 our project list includes Michigan\u2019s most recognized names. Contractors and facility managers choose RMI because we deliver on schedule, by design, and on budget.",
    accent: {
      bar: "from-amber-500/60 via-amber-400/40",
      iconBg: "bg-amber-500/10 border-amber-500/30",
      iconText: "text-amber-400",
      hoverBorder: "hover:border-amber-500/40",
      hoverShadow: "hover:shadow-amber-500/10",
      hoverIconBg: "group-hover:bg-amber-500/20 group-hover:border-amber-500/50",
    },
  },
  {
    icon: Users,
    title: "Union-Trained Workforce",
    description:
      "Proud to employ Local 25 insulators — OSHA 10/30-hour certified, CPR and first aid trained, and backed by years of hands-on field experience in commercial and industrial environments. Every crew member brings the skill and professionalism that comes from rigorous union apprenticeship training.",
    accent: {
      bar: "from-emerald-500/60 via-emerald-400/40",
      iconBg: "bg-emerald-500/10 border-emerald-500/30",
      iconText: "text-emerald-400",
      hoverBorder: "hover:border-emerald-500/40",
      hoverShadow: "hover:shadow-emerald-500/10",
      hoverIconBg: "group-hover:bg-emerald-500/20 group-hover:border-emerald-500/50",
    },
  },
];

export default function About() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(
    typeof IntersectionObserver === "undefined"
  );
  const [entranceDone, setEntranceDone] = useState(
    typeof IntersectionObserver === "undefined"
  );

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const el = gridRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && !entranceDone) {
      const timer = setTimeout(() => setEntranceDone(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isVisible, entranceDone]);

  return (
    <section
      className="py-8 sm:py-10 lg:py-12 bg-neutral-900 border-t border-neutral-800"
      aria-labelledby="about-heading"
    >
      <div className="container-custom">
        {/* Section Header */}
        <div className="flex flex-col items-center mb-3">
          <h2
            id="about-heading"
            className="font-bold tracking-wider text-white uppercase text-xl sm:text-2xl lg:text-3xl"
          >
            Why Choose{' '}
            <span className="hidden sm:inline">{companyName}</span>
            <span className="sm:hidden">RMI</span>
          </h2>
          <div className="w-12 h-0.5 bg-accent-500 mt-4 rounded-full" />
        </div>

        {/* Subtitle */}
        <p className="text-center text-neutral-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-4">
          Here&rsquo;s what sets us apart from other insulation contractors.
        </p>


        {/* Feature Cards Grid — 1 col mobile, 2 col tablet, 4 col desktop */}
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            const { accent } = feature;

            return (
              <div
                key={feature.title}
                className={`group relative overflow-hidden rounded-lg bg-gradient-to-b from-neutral-800/50 to-neutral-800/30 hover:from-neutral-800/60 hover:to-neutral-800/40 backdrop-blur-sm p-3 sm:p-4 lg:px-5 lg:pt-5 lg:pb-6 border border-neutral-700/40 ${accent.hoverBorder} hover:shadow-lg ${accent.hoverShadow} hover:-translate-y-1 transition-all ${entranceDone ? "duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]" : "duration-500 ease-out"} h-full flex flex-col ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={{ transitionDelay: entranceDone ? undefined : `${index * 100}ms` }}
              >
                {/* Accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${accent.bar} to-transparent`} />

                {/* Icon + Title row */}
                <div className="flex items-center gap-3 mb-3 min-h-[48px]">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg border ${accent.iconBg} ${accent.hoverIconBg} transition-colors duration-300 flex-shrink-0`}>
                    <IconComponent
                      className={`w-5 h-5 ${accent.iconText}`}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                    {feature.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm lg:text-base text-neutral-300 leading-relaxed flex-grow">
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
