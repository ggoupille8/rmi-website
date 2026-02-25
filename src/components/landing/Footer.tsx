import { phoneTel, phoneDisplay, companyName, email, companyNameFull, address, footerDescription, siteDescription } from "../../content/site";
import { Phone, Mail, MapPin, ArrowUp } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="bg-neutral-900 text-white border-t border-neutral-800/50"
      aria-label="Site footer"
    >
      <div className="container-custom pt-12 sm:pt-16 pb-6 sm:pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          {/* Company Info */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-white mb-4 sm:mb-6">
              {companyNameFull}
            </h3>
            <p className="text-neutral-300 text-sm leading-relaxed">
              {footerDescription}
            </p>
            <p className="text-neutral-300 text-sm mt-2">
              Serving Michigan from {address.city}, {address.state}.
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-white mb-4 sm:mb-6">
              Quick Links
            </h3>
            <nav className="flex flex-col items-center md:items-start gap-0" aria-label="Footer navigation">
              <a
                href="#services"
                className="inline-flex items-center text-neutral-400 hover:text-accent-400 transition-colors duration-200 text-sm min-w-[44px] min-h-[44px]"
              >
                Services
              </a>
              <a
                href="#about"
                className="inline-flex items-center text-neutral-400 hover:text-accent-400 transition-colors duration-200 text-sm min-w-[44px] min-h-[44px]"
              >
                About
              </a>
              <a
                href="#contact"
                className="inline-flex items-center text-neutral-400 hover:text-accent-400 transition-colors duration-200 text-sm min-w-[44px] min-h-[44px]"
              >
                Request a Quote
              </a>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-white mb-4 sm:mb-6">
              Contact
            </h3>
            <div className="space-y-0 inline-flex flex-col items-center md:items-start">
              <a
                href={phoneTel}
                className="flex items-center gap-2 text-white hover:text-accent-400 transition-colors duration-200 text-sm min-h-[44px]"
                aria-label={`Call ${companyName} at ${phoneDisplay}`}
              >
                <Phone className="w-3.5 h-3.5 text-accent-500" aria-hidden="true" />
                <span>{phoneDisplay}</span>
              </a>

              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 text-white hover:text-accent-400 transition-colors duration-200 text-sm min-h-[44px]"
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
        <div className="mt-8 sm:mt-12 pt-6 border-t border-neutral-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            &copy; {currentYear} {companyNameFull}. All rights reserved.
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-accent-400 transition-colors duration-200 cursor-pointer py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 rounded"
            aria-label="Back to top"
          >
            Back to top
            <ArrowUp className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
