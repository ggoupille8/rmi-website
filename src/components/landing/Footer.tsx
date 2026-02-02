import { phoneTel, phoneDisplay, companyName, email } from "../../config/site";
import { companyNameFull, address } from "../../content/site";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="bg-neutral-950 text-white border-t border-neutral-800/50"
      aria-label="Site footer"
    >
      <div className="container-custom py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-base font-semibold text-white mb-3">
              {companyNameFull}
            </h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Professional mechanical insulation services for commercial and industrial environments.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-base font-semibold text-white mb-3">
              Quick Links
            </h3>
            <nav className="flex flex-col gap-2" aria-label="Footer navigation">
              <a
                href="#services"
                className="text-neutral-300 hover:text-white transition-colors text-sm w-fit"
              >
                Services
              </a>
              <a
                href="#contact"
                className="text-neutral-300 hover:text-white transition-colors text-sm w-fit"
              >
                Request a Quote
              </a>
            </nav>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-base font-semibold text-white mb-3">
              Contact
            </h3>
            <div className="space-y-2">
              <a
                href={phoneTel}
                className="flex items-center gap-2 text-neutral-300 hover:text-white transition-colors text-sm"
                aria-label={`Call ${companyName} at ${phoneDisplay}`}
              >
                <Phone className="w-3.5 h-3.5 text-primary-400" aria-hidden="true" />
                <span>{phoneDisplay}</span>
              </a>

              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 text-neutral-300 hover:text-white transition-colors text-sm"
                aria-label={`Email ${companyName} at ${email}`}
              >
                <Mail className="w-3.5 h-3.5 text-primary-400" aria-hidden="true" />
                <span>{email}</span>
              </a>

              <div className="flex items-start gap-2 text-neutral-400 text-sm">
                <MapPin className="w-3.5 h-3.5 text-primary-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{address.full}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-neutral-800/50">
          <p className="text-center text-xs text-neutral-500">
            © {currentYear} {companyNameFull}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
