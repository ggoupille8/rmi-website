import { valueProps } from "../../content/site";
import { Building2, Target, ShieldCheck, Wrench, type LucideIcon } from "lucide-react";

// Map icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  Building2,
  Target,
  ShieldCheck,
  Wrench,
};

export default function ValueProps() {
  return (
    <section className="section-padding bg-white dark:bg-neutral-900 border-y border-neutral-200 dark:border-neutral-800">
      <div className="container-custom">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {valueProps.map((prop, index) => {
            const IconComponent = iconMap[prop.icon] || Compass;
            return (
              <div
                key={index}
                className="flex flex-col items-start text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <IconComponent
                    className="w-6 h-6 text-neutral-600 dark:text-neutral-400"
                    aria-hidden="true"
                  />
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-wide">
                    {prop.title}
                  </h3>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 text-base leading-relaxed">
                  {prop.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
