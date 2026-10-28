import { useState } from 'react';
import './SearchBar.css';

export default function SearchBar({ value, onChange }) {
  const [voiceMessage, setVoiceMessage] = useState('');
  const [listening, setListening] = useState(false);

  function startVoiceSearch() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceMessage(
        'La recherche vocale n’est pas disponible dans ce navigateur.'
      );
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setListening(true);
      setVoiceMessage('Je vous écoute…');
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      onChange(transcript);
      setVoiceMessage(transcript ? `Recherche : « ${transcript} »` : '');
    };
    recognition.onerror = () =>
      setVoiceMessage('La recherche vocale a échoué. Réessayez.');
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  return (
    <div className="search-wrap">
      <form
        className="search-bar"
        onSubmit={(event) => event.preventDefault()}
        role="search"
      >
        <span className="search-icon" aria-hidden="true">
          ⌕
        </span>
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Rechercher un monument, un musée…"
          aria-label="Rechercher un site touristique"
        />
        {value && (
          <button
            className="search-clear"
            type="button"
            onClick={() => onChange('')}
            aria-label="Effacer la recherche"
          >
            ×
          </button>
        )}
        <button
          className={`voice-button${listening ? ' voice-button--active' : ''}`}
          type="button"
          onClick={startVoiceSearch}
          aria-label="Recherche vocale"
          title="Recherche vocale"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8" />
          </svg>
        </button>
        <button className="search-submit" type="submit">
          Rechercher <span>→</span>
        </button>
      </form>
      {voiceMessage && (
        <p className="voice-message" aria-live="polite">
          {voiceMessage}
        </p>
      )}
    </div>
  );
}
