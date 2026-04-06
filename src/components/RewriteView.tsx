import { useAppStore } from "../stores/app-store";
import { Copy, Check, RotateCcw, ArrowUp, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function RewriteView() {
  const {
    inputText,
    outputText,
    isLoading,
    error,
    setInputText,
    setOutputText,
    setLoading,
    setError,
    config,
  } = useAppStore();

  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to output start when streaming begins
  useEffect(() => {
    if (outputRef.current && outputText && scrollRef.current) {
      outputRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [!!outputText, isLoading]);

  // Auto-resize input textarea to content
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      const scrollH = inputRef.current.scrollHeight;
      // Min 120px, max 280px when output exists, otherwise min 200px
      const hasOutput = outputText || isLoading;
      const minH = hasOutput ? 80 : 200;
      const maxH = hasOutput ? 200 : 9999;
      inputRef.current.style.height = `${Math.max(minH, Math.min(scrollH, maxH))}px`;
    }
  }, [inputText, outputText, isLoading]);

  const handleRewrite = async () => {
    if (!inputText.trim() || isLoading) return;
    setOutputText("");
    setError(null);
    setLoading(true);
    try {
      await window.morph.rewrite(inputText);
    } catch {}
  };

  const handleCopy = async () => {
    if (!outputText) return;
    await window.morph.writeClipboard(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRedo = () => {
    if (!inputText.trim() || isLoading) return;
    setOutputText("");
    setError(null);
    setLoading(true);
    window.morph.rewrite(inputText).catch(() => {});
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleRewrite();
    }
  };

  const hasOutput = outputText || isLoading;
  const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

  return (
    <div
      ref={scrollRef}
      style={{
        height: "100%",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Input textarea */}
      <div style={{ flexShrink: 0 }}>
        <textarea
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste or type text to rewrite..."
          style={{
            width: "100%",
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border-subtle)",
            borderRadius: 12,
            padding: "16px 20px",
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--color-fg)",
            outline: "none",
            fontFamily: "inherit",
            resize: "none",
            minHeight: hasOutput ? 80 : 200,
            overflow: "auto",
          }}
        />
      </div>

      {/* Action row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: "var(--color-fg-muted)", fontVariantNumeric: "tabular-nums" }}>
          {inputText.length > 0 ? `${wordCount(inputText)} words` : ""}
        </span>
        <button
          onClick={handleRewrite}
          disabled={!inputText.trim() || isLoading || !config?.groqApiKeySet}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 24px",
            backgroundColor: "var(--color-primary)", color: "var(--color-primary-fg)",
            border: "none", borderRadius: 99,
            fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
            opacity: !inputText.trim() || isLoading || !config?.groqApiKeySet ? 0.3 : 1,
            transition: "all 0.15s",
            boxShadow: "0 0 20px rgba(124, 92, 252, 0.2)",
          }}
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Rewriting...
            </>
          ) : (
            <>
              <ArrowUp size={14} strokeWidth={2.5} />
              Rewrite
              <kbd style={{ fontSize: 10, fontWeight: 400, opacity: 0.5 }}>⌘↵</kbd>
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: "12px 20px", flexShrink: 0,
          backgroundColor: "var(--color-danger-ghost)",
          border: "1px solid rgba(240, 68, 56, 0.1)",
          borderRadius: 12, fontSize: 13,
          color: "var(--color-danger)", lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {/* Output — auto-sized div, not textarea */}
      {hasOutput && (
        <div ref={outputRef} style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, paddingBottom: 8 }}>
          <div
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: 12,
              padding: "20px 24px",
              fontSize: 14,
              lineHeight: 1.8,
              color: "var(--color-fg)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              minHeight: 80,
              position: "relative",
            }}
          >
            {outputText || (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 6, height: 6, borderRadius: "50%",
                      backgroundColor: "var(--color-primary)",
                      animation: `pulse 1s ease-in-out infinite`,
                      animationDelay: `${i * 150}ms`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Output actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--color-fg-muted)", fontVariantNumeric: "tabular-nums" }}>
              {outputText.length > 0 && !isLoading ? `${wordCount(outputText)} words` : ""}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={handleRedo}
                disabled={isLoading || !inputText.trim()}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", fontSize: 12, fontWeight: 500,
                  borderRadius: 99, border: "1px solid var(--color-border)",
                  backgroundColor: "transparent", color: "var(--color-fg-secondary)",
                  cursor: "pointer", fontFamily: "inherit",
                  opacity: isLoading || !inputText.trim() ? 0.3 : 1,
                  transition: "all 0.15s",
                }}
              >
                <RotateCcw size={12} />
                Redo
              </button>
              <button
                onClick={handleCopy}
                disabled={!outputText || isLoading}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 20px", fontSize: 12, fontWeight: 600,
                  borderRadius: 99, border: copied ? "1px solid rgba(23, 178, 106, 0.15)" : "none",
                  backgroundColor: copied ? "var(--color-success-ghost)" : "var(--color-primary)",
                  color: copied ? "var(--color-success)" : "var(--color-primary-fg)",
                  cursor: "pointer", fontFamily: "inherit",
                  opacity: !outputText || isLoading ? 0.3 : 1,
                  transition: "all 0.15s",
                }}
              >
                {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

