import { phoneTel, phoneDisplay, companyName, email, companyNameFull, address, footerDescription } from "../../content/site";
import { Phone, Mail, MapPin, ArrowUp } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="bg-neutral-950 text-white border-t border-neutral-800/50"
      aria-label="Site footer"
    >
      <div className="container-custom py-8 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="text-center md:text-left">
            <h3 className="text-base font-semibold text-white mb-3">
              {companyNameFull}
            </h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              {footerDescription}
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center md:text-left">
            <h3 className="text-base font-semibold text-white mb-3">
              Quick Links
            </h3>
            <nav className="flex flex-col items-center md:items-start gap-0" aria-label="Footer navigation">
              <a
                href="#services"
                className="text-neutral-300 hover:text-white transition-colors text-sm min-w-[44px] py-3"
              >
                Services
              </a>
              <a
                href="#about"
                className="text-neutral-300 hover:text-white transition-colors text-sm min-w-[44px] py-3"
              >
                About
              </a>
              <a
                href="#contact"
                className="text-neutral-300 hover:text-white transition-colors text-sm min-w-[44px] py-3"
              >
                Request a Quote
              </a>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="text-center md:text-left">
            <h3 className="text-base font-semibold text-white mb-3">
              Contact
            </h3>
            <div className="space-y-0 inline-flex flex-col items-center md:items-start">
              <a
                href={phoneTel}
                className="flex items-center gap-2 text-white hover:text-accent-300 transition-colors text-sm py-3"
                aria-label={`Call ${companyName} at ${phoneDisplay}`}
              >
                <Phone className="w-3.5 h-3.5 text-accent-500" aria-hidden="true" />
                <span>{phoneDisplay}</span>
              </a>

              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 text-white hover:text-accent-300 transition-colors text-sm py-3"
                aria-label={`Email ${companyName} at ${email}`}
              >
                <Mail className="w-3.5 h-3.5 text-accent-500" aria-hidden="true" />
                <span>{email}</span>
              </a>

              <div className="flex items-start gap-2 text-white text-sm">
                <MapPin className="w-3.5 h-3.5 text-accent-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{address.full}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-neutral-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-neutral-400">
            &copy; {currentYear} {companyNameFull}. All rights reserved.
          </p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 rounded"
            aria-label="Back to top"
          >
            Back to top
            <ArrowUp className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
