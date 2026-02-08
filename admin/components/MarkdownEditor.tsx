'use client';

import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';
import { useEffect, useMemo, useRef, useState } from 'react';

export function MarkdownEditor({
  value,
  onChange,
  draftKey,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  draftKey: string;
  placeholder?: string;
}) {
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(draftKey);
    if (saved && !value) {
      onChange(saved);
    }
  }, [draftKey, onChange, value]);

  useEffect(() => {
    window.localStorage.setItem(draftKey, value);
  }, [draftKey, value]);

  const html = useMemo(() => DOMPurify.sanitize(marked.parse(value || '', { async: false }) as string), [value]);

  const wrapSelection = (prefix: string, suffix = prefix) => {
    const input = textareaRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = input.value.slice(start, end);
    const next = `${input.value.slice(0, start)}${prefix}${selected}${suffix}${input.value.slice(end)}`;
    onChange(next);
  };

  return (
    <div className="md-editor">
      <div className="md-toolbar">
        <button type="button" className="btn btn-secondary" onClick={() => wrapSelection('# ', '')}>
          H
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => wrapSelection('**')}>
          B
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => wrapSelection('*')}>
          I
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => wrapSelection('> ', '')}>
          Quote
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => wrapSelection('[', '](https://)')}>
          Link
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setPreview((state) => !state)}>
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>
      {preview ? (
        <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <textarea
          ref={textareaRef}
          className="input md-textarea"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
