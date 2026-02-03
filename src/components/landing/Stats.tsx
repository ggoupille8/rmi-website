import { stats } from "../../content/site";

export default function Stats() {
  return (
    <section className="py-16 bg-neutral-900 dark:bg-neutral-950">
      <div className="container-custom">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-4 text-center">
          {stats.map((stat, index) => (
            <div key={index} className="flex flex-col items-center">
              <span className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight">
                {stat.value}
              </span>
              <span className="mt-2 text-sm sm:text-base uppercase tracking-widest text-neutral-400">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
