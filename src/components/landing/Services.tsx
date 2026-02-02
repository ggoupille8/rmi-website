import {
  Droplets,
  Snowflake,
  Fan,
  Flame,
  Cylinder,
  Shield,
  Volume2,
  Gauge,
  ClipboardCheck,
  Store,
  AirVent,
  Settings,
  Calculator,
  Box,
  Cog,
  MapPin,
  Layers,
  DollarSign,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

interface Service {
  title: string;
  description?: string;
  icon: string;
}

// Map service titles to appropriate icons
const getServiceIcon = (title: string): ComponentType<LucideProps> => {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes("plumbing") || lowerTitle.includes("hvac")) return Droplets;
  if (lowerTitle.includes("steam") || lowerTitle.includes("condensate")) return Flame;
  if (lowerTitle.includes("thermal") || lowerTitle.includes("cryogenic") || lowerTitle.includes("refrigerant")) return Snowflake;
  if (lowerTitle.includes("outdoor") || lowerTitle.includes("underground")) return MapPin;
  if (lowerTitle.includes("grease") || lowerTitle.includes("fume") || lowerTitle.includes("exhaust")) return Fan;
  if (lowerTitle.includes("boiler")) return Flame;
  if (lowerTitle.includes("tank") || lowerTitle.includes("vessel")) return Cylinder;
  if (lowerTitle.includes("personnel") || lowerTitle.includes("protection")) return Shield;
  if (lowerTitle.includes("lagging") || lowerTitle.includes("jacketing")) return Layers;
  if (lowerTitle.includes("removable") || lowerTitle.includes("blanket")) return Box;
  if (lowerTitle.includes("acoustical") || lowerTitle.includes("sound")) return Volume2;
  if (lowerTitle.includes("pipe support") || lowerTitle.includes("fabrication")) return Cog;
  if (lowerTitle.includes("value engineering")) return DollarSign;
  if (lowerTitle.includes("energy") || lowerTitle.includes("evaluation")) return Calculator;
  if (lowerTitle.includes("maintenance") || lowerTitle.includes("contract")) return ClipboardCheck;
  if (lowerTitle.includes("material") || lowerTitle.includes("resale")) return Store;
  if (lowerTitle.includes("ductwork") || lowerTitle.includes("duct")) return AirVent;
  if (lowerTitle.includes("process piping") || lowerTitle.includes("piping")) return Gauge;
  return Settings;
};

const defaultServices: Service[] = [
  { title: "Plumbing & HVAC", description: "", icon: "" },
  { title: "Process Piping", description: "", icon: "" },
  { title: "Steam & Condensate", description: "", icon: "" },
  { title: "Ductwork", description: "", icon: "" },
  { title: "Thermal & Cryogenic", description: "", icon: "" },
  { title: "Outdoor & Underground", description: "", icon: "" },
  { title: "Exhaust Systems", description: "", icon: "" },
  { title: "Boiler Breeching", description: "", icon: "" },
  { title: "Tanks & Vessels", description: "", icon: "" },
  { title: "Personnel Protection", description: "", icon: "" },
  { title: "Lagging & Jacketing", description: "", icon: "" },
  { title: "Removable Blankets", description: "", icon: "" },
  { title: "Acoustical Insulation", description: "", icon: "" },
  { title: "Pipe Supports", description: "", icon: "" },
  { title: "Energy Evaluation", description: "", icon: "" },
  { title: "Value Engineering", description: "", icon: "" },
  { title: "Maintenance Contracts", description: "", icon: "" },
  { title: "Material Resale", description: "", icon: "" },
];

interface ServicesProps {
  title?: string;
  subtitle?: string;
  services?: Service[];
}

export default function Services({
  title = "Services We Offer",
  subtitle = "Professional insulation for piping, ductwork, equipment, and specialty applications.",
  services = defaultServices,
}: ServicesProps) {
  return (
    <section
      className="relative bg-neutral-900 py-16 sm:py-20 lg:py-24 overflow-hidden"
      aria-labelledby="services-heading"
    >
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />

      <div className="relative container-custom">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-12">
          <h2
            id="services-heading"
            className="font-bold text-white"
            style={{
              fontSize: 'clamp(1.75rem, 3vw + 0.5rem, 2.75rem)',
              lineHeight: '1.2'
            }}
          >
            {title}
          </h2>
          <p
            className="mt-3 text-neutral-400 max-w-xl mx-auto"
            style={{ fontSize: 'clamp(0.95rem, 1vw + 0.5rem, 1.125rem)' }}
          >
            {subtitle}
          </p>
        </div>

        {/* Clean Grid Layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {services.map((service) => {
            const IconComponent = getServiceIcon(service.title);

            return (
              <div
                key={service.title}
                className="group flex flex-col items-center text-center p-4 sm:p-5 rounded-xl bg-neutral-800/40 border border-neutral-700/40 hover:bg-neutral-800/60 hover:border-neutral-600/60 transition-all duration-200"
              >
                {/* Icon */}
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-3 group-hover:bg-primary-500/15 transition-colors">
                  <IconComponent
                    className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-primary-400"
                    aria-hidden="true"
                    strokeWidth={1.75}
                  />
                </div>

                {/* Title */}
                <span className="text-neutral-200 text-xs sm:text-sm font-medium leading-tight">
                  {service.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Screen reader accessible list */}
        <ul className="sr-only">
          {services.map((service, index) => (
            <li key={`service-${index}`}>{service.title}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
