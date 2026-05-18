// src/pages/Group/components/UIComponents.jsx
import React from "react";

export function Toast({ message }) {
  return (
    <output role="status" aria-live="polite" className={`toast${message ? " show" : ""}`}>
      {message}
    </output>
  );
}

export function Modal({ open, onClose, title, children, actions }) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <article className="modal">
        <header className="modal-header">
          <h3 id="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="modal-body">{children}</div>
        <footer className="modal-actions">{actions}</footer>
      </article>
    </div>
  );
}

export function Field({ label, htmlFor, children }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}