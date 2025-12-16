import {
  phoneTel,
  phoneDisplay,
  companyName,
  quoteToEmail,
} from "../../config/site";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="bg-neutral-900 text-neutral-300"
      aria-label="Site footer"
    >
      <div className="container-custom">
        <div className="py-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company Info */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-xl font-bold text-white mb-4">
              Resource Mechanical Insulation
            </h3>
            <p className="text-sm text-neutral-400 mb-4">
              Professional mechanical insulation services for commercial and
              industrial environments.
            </p>
            <div className="space-y-2 text-sm">
              <p className="text-neutral-300">
                <span className="font-semibold">Service Area:</span> Michigan
                and surrounding areas
              </p>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4">
              Services
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#services"
                  className="hover:text-white transition-colors"
                >
                  Plumbing & HVAC
                </a>
              </li>
              <li>
                <a
                  href="#services"
                  className="hover:text-white transition-colors"
                >
                  Process Piping
                </a>
              </li>
              <li>
                <a
                  href="#services"
                  className="hover:text-white transition-colors"
                >
                  Ductwork
                </a>
              </li>
              <li>
                <a
                  href="#services"
                  className="hover:text-white transition-colors"
                >
                  Tanks/Vessels/Specialty Equipment
                </a>
              </li>
              <li>
                <a
                  href="#services"
                  className="hover:text-white transition-colors"
                >
                  Maintenance Contracts
                </a>
              </li>
            </ul>
          </div>

          {/* Materials */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4">
              Materials & Supply
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#supply"
                  className="hover:text-white transition-colors"
                >
                  Insulation Materials
                </a>
              </li>
              <li>
                <a
                  href="#supply"
                  className="hover:text-white transition-colors"
                >
                  Pipe Supports
                </a>
              </li>
              <li>
                <a
                  href="#supply"
                  className="hover:text-white transition-colors"
                >
                  Adhesives & Accessories
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4">
              Get in Touch
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href={phoneTel}
                  className="flex items-center gap-2 hover:text-white transition-colors"
                  aria-label={`Call ${companyName} at ${phoneDisplay}`}
                >
                  <span
                    className="w-1 h-1 rounded-full bg-neutral-400"
                    aria-hidden="true"
                  />
                  <span>{phoneDisplay}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${quoteToEmail}`}
                  className="flex items-center gap-2 hover:text-white transition-colors"
                  aria-label={`Email ${companyName} at ${quoteToEmail}`}
                >
                  <span
                    className="w-1 h-1 rounded-full bg-neutral-400"
                    aria-hidden="true"
                  />
                  <span>{quoteToEmail}</span>
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <span
                    className="w-1 h-1 rounded-full bg-neutral-400"
                    aria-hidden="true"
                  />
                  <span>Request a Quote</span>
                </a>
              </li>
            </ul>
            <div className="mt-6">
              <a href="#contact" className="btn-primary">
                Request a Quote
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neutral-800 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-neutral-400">
            <p>
              © {currentYear} Resource Mechanical Insulation. All rights
              reserved.
            </p>
            <div className="flex gap-6">
              <a href="#contact" className="hover:text-white transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
