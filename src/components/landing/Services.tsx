import Card from "./Card";

interface Service {
  title: string;
  description?: string;
  icon: string;
}

interface ServicesProps {
  title?: string;
  subtitle?: string;
  services?: Service[];
}

const defaultServices: Service[] = [
  {
    title: "Plumbing & HVAC",
    description: "",
    icon: "",
  },
  {
    title: "Process Piping",
    description: "",
    icon: "",
  },
  {
    title: "Steam/Condensate (Hot & Cold Condensate)",
    description: "",
    icon: "",
  },
  {
    title: "Thermal/Cryogenic/Refrigerant Systems",
    description: "",
    icon: "",
  },
  {
    title: "Outdoor/Underground Piping",
    description: "",
    icon: "",
  },
  {
    title: "Ductwork",
    description: "",
    icon: "",
  },
  {
    title: "Grease Duct/Fume Hood/Generator Exhaust",
    description: "",
    icon: "",
  },
  {
    title: "Boiler Breeching",
    description: "",
    icon: "",
  },
  {
    title: "Tanks/Vessels/Specialty Equipment",
    description: "",
    icon: "",
  },
  {
    title: "Personnel Protection",
    description: "",
    icon: "",
  },
  {
    title: "Lagging/Jacketing Systems for Outdoor Duct and Piping Systems",
    description: "",
    icon: "",
  },
  {
    title:
      "Removable Blankets/Cans (Pumps, Valves, Strainers, Expansion Joints)",
    description: "",
    icon: "",
  },
  {
    title: "Acoustical/Sound Prevention",
    description: "",
    icon: "",
  },
  {
    title: "Pipe Support Fabrication",
    description: "",
    icon: "",
  },
  {
    title: "Energy Evaluation/Budgeting/Value Engineering",
    description: "",
    icon: "",
  },
  {
    title: "Industrial Maintenance Contracts",
    description: "",
    icon: "",
  },
  {
    title: "Material Resale",
    description: "",
    icon: "",
  },
];

export default function Services({
  title = "Services We Offer",
  subtitle = "From new installs to renovations: piping, ductwork, equipment, and specialty applications for commercial and industrial environments.",
  services = defaultServices,
}: ServicesProps) {
  return (
    <section
      className="section-padding bg-white"
      aria-labelledby="services-heading"
    >
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="services-heading" className="heading-2 text-neutral-900">
            {title}
          </h2>
          <p className="mt-4 text-body text-neutral-800">{subtitle}</p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 md:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {services.map((service, index) => {
            // Runtime assertion to prevent undefined crashes
            if (!service || !service.title) {
              console.error(
                `Service at index ${index} is missing required title`
              );
              return null;
            }
            return (
              <Card
                key={index}
                variant="hover"
                className="flex flex-col h-full"
              >
                <div
                  className="w-12 h-0.5 bg-primary-600 mb-6"
                  aria-hidden="true"
                />
                <h3 className="heading-3 text-neutral-900 break-words">
                  {service.title}
                </h3>
                {service.description && (
                  <p className="mt-4 text-body text-neutral-700">
                    {service.description}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
