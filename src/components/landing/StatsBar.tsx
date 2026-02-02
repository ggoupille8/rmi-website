import { MapPin, Shield, Clock, Award } from "lucide-react";
import { serviceArea } from "../../content/site";

interface Stat {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}

const stats: Stat[] = [
  {
    icon: MapPin,
    value: serviceArea.replace(".", ""),
    label: "Service Area",
  },
  {
    icon: Shield,
    value: "OSHA Compliant",
    label: "Safety First",
  },
  {
    icon: Clock,
    value: "24/7 Available",
    label: "Emergency Response",
  },
  {
    icon: Award,
    value: "Licensed & Insured",
    label: "Fully Certified",
  },
];

export default function StatsBar() {
  return (
    <section className="bg-neutral-900 border-b border-neutral-800/50">
      <div className="container-custom py-5 sm:py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="flex items-center gap-3"
            >
              <stat.icon className="w-5 h-5 text-primary-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-white font-medium text-sm sm:text-base truncate">
                  {stat.value}
                </div>
                <div className="text-neutral-500 text-xs">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
