import { useState, useEffect } from "react";
import { Phone, Mail, X } from "lucide-react";
import { phoneTel, phoneDisplay, companyName, email } from "../../content/site";

export default function FloatingMobileCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFormFocused, setIsFormFocused] = useState(false);

  // Show/hide based on scroll position and form focus
  useEffect(() => {
    const handleScroll = () => {
      // Hide when scrolled to top (hero visible) or when form is focused
      if (isFormFocused) {
        setIsVisible(false);
        return;
      }

      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      // Show after scrolling past hero section (approximately 100vh)
      setIsVisible(scrollY > windowHeight * 0.5);
      
      // Auto-collapse when scrolling
      if (scrollY > 0) {
        setIsExpanded(false);
      }
    };

    // Check for form focus (keyboard open state)
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        setIsFormFocused(true);
        setIsVisible(false);
        setIsExpanded(false);
      }
    };

    const handleFocusOut = () => {
      // Delay to check if keyboard actually closed
      setTimeout(() => {
        setIsFormFocused(false);
      }, 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [isFormFocused]);

  return (
    <div
      className={`fixed bottom-20 right-0 z-40 md:hidden pointer-events-none transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0 invisible"}`}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
      aria-label="Quick contact actions"
      aria-hidden={!isVisible}
    >
      <div className="flex flex-col items-end gap-3 p-4 pb-6">
        {isExpanded && (
          <div className="flex flex-col gap-3 transition-all duration-200 ease-in-out">
            <a
              href={phoneTel}
              className="pointer-events-auto flex items-center justify-center w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-500 hover:scale-110 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white min-w-[56px] min-h-[56px]"
              aria-label={`Call ${companyName} at ${phoneDisplay}`}
            >
              <Phone className="w-6 h-6 transition-transform duration-300 ease-in-out hover:scale-110" aria-hidden="true" />
            </a>
            <a
              href={`mailto:${email}`}
              className="pointer-events-auto flex items-center justify-center w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-500 hover:scale-110 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white min-w-[56px] min-h-[56px]"
              aria-label={`Email ${companyName} at ${email}`}
            >
              <Mail className="w-6 h-6 transition-transform duration-300 ease-in-out hover:scale-110" aria-hidden="true" />
            </a>
          </div>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="pointer-events-auto flex items-center justify-center w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 hover:scale-110 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white min-w-[56px] min-h-[56px]"
          aria-label={isExpanded ? "Close contact menu" : "Open contact menu"}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <X className="w-6 h-6" aria-hidden="true" />
          ) : (
            <Phone className="w-6 h-6" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

