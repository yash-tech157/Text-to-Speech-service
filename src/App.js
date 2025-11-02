// src/App.jsx
import { useEffect, useState, useRef } from "react";

function detectScriptChunk(chunk) {
  // Devanagari detection using Unicode property escapes
  const devanagari = /\p{Script=Devanagari}/u;
  if (devanagari.test(chunk)) return "hi";
  return "en";
} 

function chunkTextByScript(text) {
  const rawTokens = text.split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return [];
  const chunks = [];
  let currentScript = detectScriptChunk(rawTokens[0]);
  let current = [rawTokens[0]];
  for (let i = 1; i < rawTokens.length; i++) {
    const token = rawTokens[i];
    const script = detectScriptChunk(token);
    if (script === currentScript) current.push(token);
    else {
      chunks.push({ text: current.join(" "), lang: currentScript });
      currentScript = script;
      current = [token];
    }
  }
  chunks.push({ text: current.join(" "), lang: currentScript });
  return chunks;
}

export default function App() {
  const [text, setText] = useState("Hello, मेरा नाम Yash है.");
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("auto");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [status, setStatus] = useState("ready");
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    const synth = synthRef.current;
    function populate() {
      const v = synth.getVoices();
      setVoices(v);
    }
    populate();
    if (typeof synth.onvoiceschanged !== "undefined") {
      synth.onvoiceschanged = populate;
    }
    return () => {
      if (synth.onvoiceschanged) synth.onvoiceschanged = null;
    };
  }, []);

  function chooseVoiceForLang(lang) {
    if (selectedVoice !== "auto") {
      const v = voices.find((x) => x.name === selectedVoice);
      if (v) return v;
    }
    const pref = lang === "hi" ? "hi" : "en";
    let cand = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(pref));
    if (cand) return cand;
    cand = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
    if (cand) return cand;
    return voices[0] || null;
  }

  function speakText(textToSpeak) {
    const synth = synthRef.current;
    if (!synth) {
      setStatus("SpeechSynthesis not supported");
      return;
    }
    synth.cancel();
    const chunks = chunkTextByScript(textToSpeak);
    if (chunks.length === 0) {
      setStatus("nothing to speak");
      return;
    }
    const utterances = chunks.map((c, idx) => {
      const ut = new SpeechSynthesisUtterance(c.text);
      ut.lang = c.lang === "hi" ? "hi-IN" : "en-US";
      ut.rate = rate;
      ut.pitch = pitch;
      const v = chooseVoiceForLang(c.lang);
      if (v) ut.voice = v;
      ut.onstart = () => setStatus(`speaking (${c.lang}): ${c.text.slice(0,40)}${c.text.length>40?"...":""}`);
      if (idx === chunks.length - 1) {
        ut.onend = () => setStatus("finished");
        ut.onerror = () => setStatus("error during speech");
      }
      return ut;
    });
    utterances.forEach((u) => synth.speak(u));
    setStatus("speaking...");
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 20px", fontFamily: "system-ui" }}>
      <h1>React Multilingual Text → Speech</h1>
      <p>Type mixed Hindi + English text and press Speak. Uses browser TTS (Web Speech API).</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        style={{ width: "100%", fontSize: 16, padding: 10 }}
      />

      <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label>Rate
          <input type="range" min="0.6" max="1.6" step="0.1" value={rate} onChange={(e)=>setRate(Number(e.target.value))} />
        </label>

        <label>Pitch
          <input type="range" min="0.5" max="2" step="0.1" value={pitch} onChange={(e)=>setPitch(Number(e.target.value))} />
        </label>

        <label>
          Voice
          <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}>
            <option value="auto">Auto per language</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>{v.name} — {v.lang}</option>
            ))}
          </select>
        </label>

        <button onClick={() => speakText(text)}>Speak</button>
        <button onClick={() => { synthRef.current.cancel(); setStatus("stopped"); }}>Stop</button>
      </div>

      <div style={{ marginTop: 12 }}>Status: {status}</div>

      <div style={{ marginTop: 18, fontSize: 14 }}>
        <strong>Notes:</strong> Browser must support Web Speech Synthesis. If no Hindi voice installed, Hindi text may be read by an English voice with poor pronunciation.
      </div>
    </div>
  );
}
