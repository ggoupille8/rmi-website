import { phoneTel, phoneDisplay, companyName } from "../../config/site";
import { companyNameFull, email, address } from "../../content/site";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-900 text-white" aria-label="Site footer">
      <div className="container-custom">
        {/* Modern Divider Above Footer */}
        <div className="pt-8 sm:pt-12 lg:pt-16">
          <div className="relative h-px overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-50"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-600 to-transparent"></div>
          </div>
        </div>
        {/* Main Footer Content */}
        <div className="pt-4 sm:pt-6 lg:pt-8 pb-0">
          <div className="grid grid-cols-1 gap-12 lg:gap-16 lg:grid-cols-3 items-start">
            {/* Company Info - Left Column */}
            <div>
              <h3 className="text-xl font-bold text-white mb-3 leading-tight whitespace-nowrap underline">
                {companyNameFull}
              </h3>
              <p className="text-lg text-neutral-300 leading-relaxed">
                Professional mechanical insulation services for commercial and industrial environments.
              </p>
            </div>

            {/* Quick Links - Center Column */}
            <div className="flex flex-col items-center">
              <h3 className="text-xl font-bold text-white mb-2 leading-tight underline text-center w-full">
                Quick Links
              </h3>
              <nav className="flex flex-col items-center gap-0 w-full" aria-label="Footer navigation">
                <a
                  href="#services"
                  className="text-lg text-white hover:text-primary-400 hover:scale-110 hover:translate-x-2 hover:drop-shadow-lg transition-all duration-500 ease-in-out"
                >
                  Services
                </a>
                <a
                  href="#contact"
                  className="text-lg text-white hover:text-primary-400 hover:scale-110 hover:translate-x-2 hover:drop-shadow-lg transition-all duration-500 ease-in-out"
                >
                  Request a Quote
                </a>
              </nav>
            </div>

            {/* Contact - Right Column */}
            <div className="flex flex-col">
              <h3 className="text-xl font-bold text-white mb-3 leading-tight underline pl-4 lg:pl-8">
                Get in Touch
              </h3>
              <div className="pl-4 lg:pl-8 flex flex-col">
                {/* Address - Positioned to align with first line of description */}
                <div className="flex items-start gap-3 text-lg text-white whitespace-nowrap mb-0">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5 text-white" aria-hidden="true" />
                  <span className="text-white">{address.full}</span>
                </div>
                {/* Spacer to align phone/email with "Request a Quote" and second line of description */}
                <div className="h-[0.25rem] mb-0"></div>

                {/* Phone and Email - Aligned with Request a Quote and second line of description */}
                <div className="flex items-center gap-6 flex-wrap -mt-1">
                  {/* Phone */}
                  <a
                    href={phoneTel}
                    className="flex items-center gap-3 text-lg text-white hover:text-primary-400 hover:scale-110 hover:translate-x-2 hover:drop-shadow-lg transition-all duration-500 ease-in-out whitespace-nowrap"
                    aria-label={`Call ${companyName} at ${phoneDisplay}`}
                  >
                    <Phone className="w-5 h-5 flex-shrink-0 text-white transition-transform duration-500 ease-in-out hover:scale-125" aria-hidden="true" />
                    <span className="text-white">{phoneDisplay}</span>
                  </a>

                  {/* Email */}
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-3 text-lg text-white hover:text-primary-400 hover:scale-110 hover:translate-x-2 hover:drop-shadow-lg transition-all duration-500 ease-in-out whitespace-nowrap"
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
          <div className="flex flex-col items-center text-sm text-white pt-0 pb-0">
            <p className="text-white text-center m-0 py-0">
              © {currentYear} {companyNameFull}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
