"use client";

import { useMemo, useState } from "react";
import {
  AGENT_RATING_LABELS,
  AGENT_RATING_TAGS,
} from "@/lib/supportConstants";

type Props = {
  agentName?: string | null;
  submitting?: boolean;
  onSubmit: (payload: { rating: number; comment: string; tags: string[] }) => void | Promise<void>;
  onSkip?: () => void;
};

export function AgentRatingPanel({ agentName, submitting, onSubmit, onSkip }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const display = hovered || rating;
  const label = display ? AGENT_RATING_LABELS[display] : "Tap a star to rate";

  const availableTags = useMemo(() => {
    if (rating >= 4) {
      return AGENT_RATING_TAGS.filter((t) => t !== "Needs improvement");
    }
    if (rating > 0 && rating <= 2) {
      return [...AGENT_RATING_TAGS];
    }
    return [...AGENT_RATING_TAGS];
  }, [rating]);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 4)));
  };

  const handleSubmit = async () => {
    if (rating < 1 || submitting) return;
    try {
      await onSubmit({ rating, comment: comment.trim(), tags });
      setSubmitted(true);
    } catch {
      /* parent shows toast; keep form open */
    }
  };

  if (submitted) {
    return (
      <div className="sx-agent-rating sx-agent-rating--done" role="status">
        <div className="sx-agent-rating__emoji" aria-hidden>
          ★
        </div>
        <h4>Thanks for rating!</h4>
        <p>Your feedback helps us improve support — just like ordering apps you already know.</p>
        {onSkip ? (
          <button type="button" className="sx-agent-rating__skip" onClick={onSkip}>
            Back to AI chat
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="sx-agent-rating" role="form" aria-label="Rate your support agent">
      <p className="sx-agent-rating__eyebrow">How was your experience?</p>
      <h4>
        Rate {agentName?.trim() ? <span>{agentName.trim()}</span> : "your support agent"}
      </h4>
      <p className="sx-agent-rating__hint">Your rating helps other users and our team improve.</p>

      <div className="sx-agent-rating__stars" role="radiogroup" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= display;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""} — ${AGENT_RATING_LABELS[n]}`}
              className={`sx-agent-rating__star${active ? " is-active" : ""}`}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onFocus={() => setHovered(n)}
              onBlur={() => setHovered(0)}
              onClick={() => setRating(n)}
            >
              ★
            </button>
          );
        })}
      </div>
      <p className="sx-agent-rating__label">{label}</p>

      {rating > 0 ? (
        <>
          <div className="sx-agent-rating__tags" aria-label="What went well">
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`sx-agent-rating__tag${tags.includes(tag) ? " is-selected" : ""}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          <textarea
            className="sx-agent-rating__comment"
            rows={2}
            maxLength={500}
            placeholder="Add a short note (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="sx-agent-rating__actions">
            <button
              type="button"
              className="sx-agent-rating__submit"
              disabled={submitting || rating < 1}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "Saving…" : "Submit rating"}
            </button>
            {onSkip ? (
              <button type="button" className="sx-agent-rating__skip" onClick={onSkip} disabled={submitting}>
                Skip
              </button>
            ) : null}
          </div>
        </>
      ) : onSkip ? (
        <button type="button" className="sx-agent-rating__skip" onClick={onSkip}>
          Skip for now
        </button>
      ) : null}
    </div>
  );
}
