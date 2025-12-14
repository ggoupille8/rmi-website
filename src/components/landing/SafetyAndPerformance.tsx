import { RMI_STATS, type Stat } from "../../content/rmi";
import { serviceArea } from "../../content/site";

interface SafetyAndPerformanceProps {
  title?: string;
  description?: string;
  stats?: Stat[];
}

// Filter to only hours worked stats
function getHoursWorkedStats(stats: Stat[]): Stat[] {
  return stats.filter((stat) => stat.label.includes("Hours worked"));
}

export default function SafetyAndPerformance({
  title = "Safety & Performance",
  description = "Safe, professional execution with proven track record.",
  stats = RMI_STATS,
}: SafetyAndPerformanceProps) {
  const hoursStats = getHoursWorkedStats(stats);

  return (
    <section
      className="py-20 md:py-24 lg:py-28 bg-neutral-900 dark:bg-neutral-950"
      aria-labelledby="safety-heading"
    >
      <div className="container-custom">
        <div className="mx-auto max-w-4xl text-center">
          <h2
            id="safety-heading"
            className="heading-2 text-white dark:text-white"
          >
            {title}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-body-lg leading-relaxed text-neutral-200 dark:text-neutral-100 font-medium">
            {description}
          </p>

          {/* Clean Grid Layout for Hours */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {hoursStats.map((stat) => {
              // Extract year from label like "Hours worked (2021)"
              const yearMatch = stat.label.match(/\((\d{4})\)/);
              const year = yearMatch ? yearMatch[1] : "";
              return (
                <div key={stat.label} className="text-center">
                  <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-white dark:text-white tabular-nums">
                    {stat.value}
                  </div>
                  <div className="mt-3 text-base md:text-lg font-semibold text-neutral-200 dark:text-neutral-200">
                    {year}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-12 text-sm text-neutral-300 dark:text-neutral-300">
            Data from OSHA 300A annual summaries.
          </p>
        </div>
      </div>
    </section>
  );
}
