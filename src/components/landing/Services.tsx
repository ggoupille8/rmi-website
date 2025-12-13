import Card from "./Card";

interface Service {
  title: string;
  description: string;
  icon: string;
}

interface ServicesProps {
  title?: string;
  subtitle?: string;
  services?: Service[];
}

const defaultServices: Service[] = [
  {
    title: "Piping Insulation",
    description:
      "Hot, cold, and cryogenic pipe insulation. HVAC piping, refrigeration lines, and process piping.",
    icon: "",
  },
  {
    title: "Ductwork Insulation",
    description:
      "Duct wrap, Fyre Wrap, and lagging for HVAC and industrial duct systems.",
    icon: "",
  },
  {
    title: "Tank & Equipment",
    description:
      "Insulation for tanks, vessels, and equipment. Removable covers for valves and flanges.",
    icon: "",
  },
  {
    title: "Outage & Turnaround",
    description:
      "Scheduled shutdown support. Insulation removal, replacement, and repair during plant outages.",
    icon: "",
  },
  {
    title: "Boiler & Turbine",
    description:
      "Boiler wall insulation and turbine rebuild support. High-temperature applications.",
    icon: "",
  },
  {
    title: "Maintenance Support",
    description:
      "Repair and replacement of damaged insulation. Inspection and preventive maintenance.",
    icon: "",
  },
];

export default function Services({
  title = "Our Services",
  subtitle = "Mechanical insulation installation and maintenance",
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
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {services.map((service, index) => (
            <Card key={index} variant="hover" className="flex flex-col">
              <div
                className="w-12 h-0.5 bg-primary-600 mb-6"
                aria-hidden="true"
              />
              <h3 className="heading-3 text-neutral-900">{service.title}</h3>
              <p className="mt-4 text-body text-neutral-700">
                {service.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
