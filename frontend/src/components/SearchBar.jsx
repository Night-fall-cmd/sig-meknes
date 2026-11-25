import { useEffect, useRef, useState } from "react";
import { Icon, IconButton, Button } from "./UI.jsx";
export function useVoice(onResult) {
  const [message, setMessage] = useState(""),
    [listening, setListening] = useState(false),
    ref = useRef(null);
  useEffect(
    () => () => {
      if (ref.current) {
        ref.current.onend = null;
        ref.current.onerror = null;
        ref.current.onresult = null;
        ref.current.abort();
      }
    },
    [],
  );
  const start = () => {
    if (listening) {
      ref.current?.stop();
      return;
    }
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) {
      setMessage(
        "Le micro est indisponible dans ce navigateur. Vous pouvez écrire votre recherche.",
      );
      return;
    }
    const r = new Speech();
    ref.current = r;
    r.lang = "fr-FR";
    r.onstart = () => {
      setListening(true);
      setMessage("Je vous écoute…");
    };
    r.onresult = (e) => {
      onResult(e.results?.[0]?.[0]?.transcript || "");
      setMessage("");
    };
    r.onerror = () =>
      setMessage(
        "Vérifiez l’autorisation du microphone, ou écrivez votre recherche.",
      );
    r.onend = () => setListening(false);
    try {
      r.start();
    } catch {
      setMessage("Le microphone est indisponible.");
    }
  };
  return { start, message, listening };
}
export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Un monument, une adresse, une envie…",
}) {
  const voice = useVoice(onChange);
  return (
    <div className="search-wrap">
      <form
        className="search-bar"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
      >
        <Icon name="search" />
        <input
          type="search"
          aria-label="Rechercher un lieu"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <IconButton
          name="mic"
          label={voice.listening ? "Arrêter le microphone" : "Recherche vocale"}
          active={voice.listening}
          onClick={voice.start}
        />
        <Button type="submit">Explorer</Button>
      </form>
      {voice.message && (
        <p className="voice-message" role="status">
          {voice.message}
        </p>
      )}
    </div>
  );
}
