
import { useEffect, useState } from 'react';
import {
  Accessibility,
  Type,
  Contrast,
  Moon,
  Volume2,
  VolumeX,
  X,
  Minus,
  Plus,
  RotateCcw
} from 'lucide-react';

const STORAGE_KEY = 'us_accessibility_preferences';

const defaults = {
  fontSize: 0,
  highContrast: false,
  darkMode: false
};

function getPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

    return {
      fontSize: [0, 1, 2].includes(saved.fontSize) ? saved.fontSize : 0,
      highContrast: Boolean(saved.highContrast),
      darkMode: Boolean(saved.darkMode)
    };
  } catch {
    return defaults;
  }
}

export function AccessibilityWidget() {
  const [preferences, setPreferences] = useState(getPreferences);
  const [isOpen, setIsOpen] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [message, setMessage] = useState('');

  const { fontSize, highContrast, darkMode } = preferences;

  useEffect(() => {
    const root = document.documentElement;

    root.dataset.a11yText = String(fontSize);

    document.body.classList.toggle(
      'a11y-high-contrast',
      highContrast
    );

    document.body.classList.toggle(
      'a11y-dark',
      darkMode
    );

    const mainContent =
      document.querySelector('main') ||
      document.querySelector('.auth-right');

    if (mainContent) {
      mainContent.id = 'main-content';
      mainContent.tabIndex = -1;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(preferences)
    );
  }, [preferences]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function updatePreference(key, value) {
    setPreferences(previous => ({
      ...previous,
      [key]: value
    }));
  }

  function readPage() {
    if (!('speechSynthesis' in window)) {
      setMessage('Text-to-speech is not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();

    const content =
      document.querySelector('main') ||
      document.querySelector('.auth-right') ||
      document.querySelector('.content');

    const text = content?.innerText?.trim();

    if (!text) {
      setMessage('There is no page content to read.');
      return;
    }

    const speech = new SpeechSynthesisUtterance(text);

    speech.lang = document.documentElement.lang || 'en-IN';
    speech.rate = 0.9;
    speech.pitch = 1;

    speech.onstart = () => {
      setIsReading(true);
      setMessage('Reading page content...');
    };

    speech.onend = () => {
      setIsReading(false);
      setMessage('Reading completed.');
    };

    speech.onerror = () => {
      setIsReading(false);
      setMessage('Unable to read the page.');
    };

    window.speechSynthesis.speak(speech);
  }

  function stopReading() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsReading(false);
    setMessage('Reading stopped.');
  }

  function resetPreferences() {
    stopReading();

    setPreferences(defaults);
    setMessage('Accessibility settings restored.');
  }

  return (
    <>
      <a className="skip-to-content" href="#main-content">
        Skip to main content
      </a>

      <div className="accessibility-widget">
        {isOpen && (
          <section
            className="accessibility-panel"
            role="region"
            aria-label="Accessibility settings"
          >
            <div className="accessibility-heading">
              <div>
                <span className="accessibility-kicker">
                  PERSONALISE YOUR EXPERIENCE
                </span>
                <h2>Accessibility centre</h2>
              </div>

              <button
                type="button"
                className="accessibility-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close accessibility settings"
              >
                <X size={19} />
              </button>
            </div>

            <div className="accessibility-setting">
              <div className="accessibility-setting-title">
                <Type size={18} />
                <span>Text size</span>
              </div>

              <div className="accessibility-controls">
                <button
                  type="button"
                  onClick={() =>
                    updatePreference('fontSize', Math.max(0, fontSize - 1))
                  }
                  disabled={fontSize === 0}
                  aria-label="Decrease text size"
                >
                  <Minus size={17} />
                </button>

                <span aria-live="polite">
                  {fontSize === 0 ? 'Normal' : fontSize === 1 ? 'Large' : 'Largest'}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    updatePreference('fontSize', Math.min(2, fontSize + 1))
                  }
                  disabled={fontSize === 2}
                  aria-label="Increase text size"
                >
                  <Plus size={17} />
                </button>
              </div>
            </div>

            <div className="accessibility-setting">
              <div className="accessibility-setting-title">
                <Contrast size={18} />
                <span>High contrast</span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={highContrast}
                className={`accessibility-switch ${highContrast ? 'enabled' : ''}`}
                onClick={() =>
                  updatePreference('highContrast', !highContrast)
                }
              >
                {highContrast ? 'On' : 'Off'}
              </button>
            </div>

            <div className="accessibility-setting">
              <div className="accessibility-setting-title">
                <Moon size={18} />
                <span>Dark mode</span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={darkMode}
                className={`accessibility-switch ${darkMode ? 'enabled' : ''}`}
                onClick={() =>
                  updatePreference('darkMode', !darkMode)
                }
              >
                {darkMode ? 'On' : 'Off'}
              </button>
            </div>

            <div className="accessibility-divider" />

            <div className="accessibility-setting">
              <div className="accessibility-setting-title">
                <Volume2 size={18} />
                <span>Read page aloud</span>
              </div>

              {isReading ? (
                <button
                  type="button"
                  className="accessibility-action"
                  onClick={stopReading}
                >
                  <VolumeX size={16} />
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  className="accessibility-action"
                  onClick={readPage}
                >
                  <Volume2 size={16} />
                  Read
                </button>
              )}
            </div>

            {message && (
              <p className="accessibility-message" role="status">
                {message}
              </p>
            )}

            <button
              type="button"
              className="accessibility-reset"
              onClick={resetPreferences}
            >
              <RotateCcw size={15} />
              Reset preferences
            </button>

            <p className="accessibility-note">
              Your accessibility preferences are saved on this device.
            </p>
          </section>
        )}

        <button
          type="button"
          className="accessibility-launcher"
          onClick={() => setIsOpen(previous => !previous)}
          aria-label={
            isOpen ? 'Close accessibility centre' : 'Open accessibility centre'
          }
          aria-expanded={isOpen}
          aria-controls="accessibility-settings"
        >
          {isOpen ? <X size={23} /> : <Accessibility size={25} />}
          <span>Accessibility</span>
        </button>
      </div>
    </>
  );
}

export default AccessibilityWidget;
