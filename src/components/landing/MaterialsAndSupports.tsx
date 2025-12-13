interface MaterialsAndSupportsProps {
  title?: string;
  subtitle?: string;
  onCtaClick?: () => void;
}

export default function MaterialsAndSupports({
  title = "Materials & Pipe Supports",
  subtitle = "Quality insulation materials and pipe supports with nationwide shipping",
  onCtaClick,
}: MaterialsAndSupportsProps) {
  const handleCtaClick = () => {
    if (onCtaClick) {
      onCtaClick();
    } else {
      // Default behavior: scroll to contact form with preselected project type
      const contactSection = document.getElementById("contact");
      if (contactSection) {
        // Add URL parameter for preselected project type
        const url = new URL(window.location.href);
        url.searchParams.set("projectType", "materials-pricing");
        window.history.pushState({}, "", url.toString());

        contactSection.scrollIntoView({ behavior: "smooth" });

        // Trigger a custom event to notify ContactForm
        window.dispatchEvent(
          new CustomEvent("preselectProjectType", {
            detail: { projectType: "materials-pricing" },
          })
        );
      }
    }
  };

  return (
    <section
      className="section-padding bg-neutral-100"
      aria-labelledby="materials-heading"
    >
      <div className="container-custom">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="materials-heading" className="heading-2 text-neutral-900">
            {title}
          </h2>
          <p className="mt-4 text-body text-neutral-800">{subtitle}</p>
          <div className="mt-8 text-body text-neutral-700 space-y-4">
            <p>
              We supply high-quality insulation materials and pipe supports for
              your projects. From fiberglass and mineral wool to foam insulation
              and custom pipe hangers, we stock the materials you need.
            </p>
            <p>
              Available for nationwide shipping, we can get your materials to
              any job site quickly and efficiently. Contact us for pricing and
              availability.
            </p>
          </div>
          <div className="mt-10">
            <button
              onClick={handleCtaClick}
              className="btn-primary"
              aria-label="Get pricing for materials and pipe supports"
            >
              Get Pricing
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
