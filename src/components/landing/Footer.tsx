import { phoneTel, phoneDisplay, companyName, email } from "../../config/site";
import { companyNameFull, address } from "../../content/site";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-900 text-white" aria-label="Site footer">
      <div className="container-custom">
        {/* Main Footer Content */}
        <div style={{ paddingTop: 'clamp(1rem, 0.25vw + 0.75rem, 2rem)' }} className="pb-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 items-start" style={{ gap: 'clamp(3rem, 0.5vw + 2.5rem, 4rem)' }}>
            {/* Company Info - Left Column */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3 leading-tight whitespace-nowrap underline">
                {companyNameFull}
              </h3>
              <p className="text-base text-neutral-300 leading-relaxed">
                Professional mechanical insulation services for commercial and industrial environments.
              </p>
            </div>

            {/* Quick Links - Center Column */}
            <div className="flex flex-col items-start w-fit mx-auto">
              <h3 className="text-lg font-bold text-white mb-2 leading-tight underline text-left w-fit">
                Quick Links
              </h3>
              <nav className="flex flex-col items-start gap-0 w-fit" aria-label="Footer navigation">
                <a
                  href="#services"
                  className="text-base text-white hover:text-primary-400 hover:scale-110 hover:translate-x-2 hover:drop-shadow-lg transition-all duration-500 ease-in-out"
                >
                  Services
                </a>
                <a
                  href="#contact"
                  className="text-base text-white hover:text-primary-400 hover:scale-110 hover:translate-x-2 hover:drop-shadow-lg transition-all duration-500 ease-in-out"
                >
                  Request a Quote
                </a>
              </nav>
            </div>

            {/* Contact - Right Column */}
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-white mb-3 leading-tight underline pl-4 lg:pl-8">
                Get in Touch
              </h3>
              <div className="pl-4 lg:pl-8 flex flex-col">
                {/* Address - Positioned to align with first line of description */}
                <div className="flex items-start gap-3 text-base text-white whitespace-nowrap mb-0 w-full">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5 text-white" aria-hidden="true" />
                  <span className="text-white w-full text-left">{address.full}</span>
                </div>

                {/* Phone and Email - Aligned with Request a Quote and second line of description */}
                <div className="flex items-center justify-between gap-3 w-full">
                  {/* Phone */}
                  <a
                    href={phoneTel}
                    className="flex items-center gap-3 text-base text-white hover:text-primary-400 hover:scale-110 hover:translate-x-2 hover:drop-shadow-lg transition-all duration-500 ease-in-out whitespace-nowrap"
                    aria-label={`Call ${companyName} at ${phoneDisplay}`}
                  >
                    <Phone className="w-5 h-5 flex-shrink-0 text-white transition-transform duration-500 ease-in-out hover:scale-125" aria-hidden="true" />
                    <span className="text-white">{phoneDisplay}</span>
                  </a>

                  {/* Email */}
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-3 text-base text-white hover:text-primary-400 hover:scale-110 hover:translate-x-2 hover:drop-shadow-lg transition-all duration-500 ease-in-out whitespace-nowrap justify-end"
                    aria-label={`Email ${companyName} at ${email}`}
                  >
                    <Mail className="w-5 h-5 flex-shrink-0 text-white transition-transform duration-500 ease-in-out hover:scale-125" aria-hidden="true" />
                    <span className="text-white">{email}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neutral-800 pt-0 pb-0">
          <div className="flex flex-col items-center text-xs text-white pt-0 pb-0">
            <p className="text-white text-center m-0 py-0">
              © {currentYear} {companyNameFull}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
