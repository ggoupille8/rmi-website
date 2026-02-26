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
              Serving Michigan and the Midwest.
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
                href="#projects"
                className="inline-flex items-center text-neutral-400 hover:text-accent-400 transition-colors duration-200 text-sm min-w-[44px] min-h-[44px]"
              >
                Projects
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

        {/* Social Links */}
        <div className="mt-8 sm:mt-10 flex justify-center gap-5">
          <a
            href="https://www.linkedin.com/company/resource-mechanical-insulation"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit our LinkedIn page"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-neutral-400 hover:text-accent-400 transition-colors duration-200"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
          <a
            href="https://www.facebook.com/ResourceMechanicalInsulation"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit our Facebook page"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-neutral-400 hover:text-accent-400 transition-colors duration-200"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 sm:mt-8 pt-6 border-t border-neutral-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            &copy; {currentYear} {companyNameFull}. All rights reserved.
          </p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-accent-400 transition-colors duration-200 cursor-pointer py-1.5 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 rounded"
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
