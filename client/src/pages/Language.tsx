import { locales, translate } from "../../../common/content/locale";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { changeLanguage, useLocale } from "../localization";
import { PageHeader } from "../components/Layout";
import type { Locale } from "../../../common/content/locale";
import "./language.css";

export function LanguageLink({ button = false }: { button?: boolean }) {
  const navigate = useNavigate();
  if (button) {
    return (
      <button
        type="button"
        className="language-link language-action"
        onClick={() => navigate("/language")}
      >
        <span aria-hidden="true">🌐</span> {translate("Change Language")}
      </button>
    );
  }
  return (
    <Link className="language-link" to="/language">
      🌐 {translate("Change Language")}
    </Link>
  );
}

export function Language() {
  const locale = useLocale();
  const [error, setError] = useState(false);
  function select(code: Locale) {
    try {
      changeLanguage(code);
    } catch {
      setError(true);
    }
  }
  return (
    <main className="phone-shell language-page">
      <PageHeader title={translate("Change Language")} />
      <section className="language-selection" aria-labelledby="language-prompt">
        <h2 id="language-prompt">{translate("Choose your language")} :</h2>
        <div className="language-options">
          {locales.map(({ code, name }) => (
            <button
              key={code}
              lang={code}
              aria-pressed={locale === code}
              onClick={() => select(code)}
            >
              <span aria-hidden="true">🌐</span> {name}
              {locale === code && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert">
            {translate("Failed to save language. Please try again.")}
          </p>
        )}
        <Link className="language-done" to="/">
          {translate("Continue")}
        </Link>
      </section>
    </main>
  );
}
