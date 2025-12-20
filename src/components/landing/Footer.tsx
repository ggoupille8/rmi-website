import { phoneTel, phoneDisplay, companyName } from "../../config/site";
import { companyNameFull, serviceArea, email } from "../../content/site";
import { Phone, Mail } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-900 text-white" aria-label="Site footer">
      <div className="container-custom">
        <div className="py-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company Info */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-xl font-bold text-white mb-3">
              {companyNameFull}
            </h3>
            <p className="text-base text-neutral-200 mb-3">
              Professional mechanical insulation services for commercial and
              industrial environments.
            </p>
            <div className="space-y-2 text-base">
              <p className="text-white">
                <span className="font-semibold text-white">Service Area:</span>{" "}
                <span className="text-white">
                  {serviceArea.replace(/\.$/, "")}
                </span>
              </p>
            </div>
          </div>

          {/* Services */}
          <div>
            <a
              href="#services"
              className="text-lg font-semibold text-white hover:text-primary-300 transition-colors block mb-3"
            >
              Services
            </a>
          </div>

          {/* Materials */}
          <div>
            <a
              href="#supply"
              className="text-lg font-semibold text-white hover:text-primary-300 transition-colors block mb-3"
            >
              Materials & Supply
            </a>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">
              Get in Touch
            </h4>
            <ul className="space-y-3 text-base">
              <li>
                <a
                  href={phoneTel}
                  className="flex items-center gap-2 text-white hover:text-primary-300 transition-colors"
                  aria-label={`Call ${companyName} at ${phoneDisplay}`}
                >
                  <span
                    className="w-1 h-1 rounded-full bg-white"
                    aria-hidden="true"
                  />
                  <span className="text-white">{phoneDisplay}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-2 text-white hover:text-primary-300 transition-colors"
                  aria-label={`Email ${companyName} at ${email}`}
                >
                  <span
                    className="w-1 h-1 rounded-full bg-white"
                    aria-hidden="true"
                  />
                  <span className="text-white">{email}</span>
                </a>
              </li>
            </ul>
            <div className="mt-4 flex flex-col gap-3">
              <a
                href={phoneTel}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-primary-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
                aria-label={`Call ${companyName} at ${phoneDisplay}`}
              >
                <Phone className="w-5 h-5" aria-hidden="true" />
                {phoneDisplay}
              </a>
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-primary-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
                aria-label={`Email ${companyName} at ${email}`}
              >
                <Mail className="w-5 h-5" aria-hidden="true" />
                {email}
              </a>
              <a
                href="#contact"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-primary-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
              >
                Request a Quote
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neutral-800 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-base text-white">
            <p>
              © {currentYear} {companyNameFull}. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a
                href="#contact"
                className="text-white hover:text-primary-300 transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
