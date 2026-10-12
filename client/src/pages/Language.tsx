import { locales, translate } from "../../../common/content/locale";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { changeLanguage, useLocale } from "../localization";
import "./language.css";

export function LanguagePopup({ onClose }: { onClose: () => void }) {
  const locale = useLocale();
  const [selected, setSelected] = useState(locale);
  const [error, setError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function save() {
    try {
      changeLanguage(selected);
      onClose();
    } catch {
      setError(true);
    }
  }

  return createPortal(
    <dialog
      ref={dialog}
      className="language-popup"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="language-popup-content">
        <header className="language-popup-header">
          <span className="language-popup-globe" aria-hidden="true">
            🌐
          </span>
          <button
            type="button"
            className="language-popup-close"
            aria-label={translate("Close")}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <h2 id={titleId}>{translate("Change Language")}</h2>
        <p>{translate("Choose your language")}</p>
        <div className="language-options">
          {locales.map(({ code, name }) => (
            <button
              type="button"
              key={code}
              lang={code}
              aria-pressed={selected === code}
              onClick={() => {
                setSelected(code);
                setError(false);
              }}
            >
              <span>{name}</span>
              <span className="language-option-check" aria-hidden="true">
                {selected === code ? "✓" : ""}
              </span>
            </button>
          ))}
        </div>
        {error && (
          <p role="alert">
            {translate("Failed to save language. Please try again.")}
          </p>
        )}
        <button
          type="button"
          className="primary-btn language-popup-save"
          onClick={save}
        >
          {translate("Continue")}
        </button>
      </div>
    </dialog>,
    document.body,
  );
}

export function LanguageLink({ button = false }: { button?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`language-link ${button ? "language-action" : ""}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">🌐</span> {translate("Change Language")}
      </button>
      {open && <LanguagePopup onClose={() => setOpen(false)} />}
    </>
  );
}

// Preserve existing deep links while using the same popup as in-page controls.
export function Language() {
  const navigate = useNavigate();
  return (
    <LanguagePopup
      onClose={() => {
        if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
        else navigate("/", { replace: true });
      }}
    />
  );
}
