// tests/RegistrationForm.simple.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import '@testing-library/jest-dom/vitest';
import RegistrationForm from "../src/components/RegistrationForm";

describe("RegistrationForm - Simple Tests", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <RegistrationForm onSubmit={() => {}} />
      </MemoryRouter>
    );
    expect(document.querySelector('form')).toBeInTheDocument();
  });

  it("has username input", () => {
    render(
      <MemoryRouter>
        <RegistrationForm onSubmit={() => {}} />
      </MemoryRouter>
    );
    const usernameInput = document.querySelector('input[placeholder*="username"]');
    expect(usernameInput).toBeInTheDocument();
  });

  it("has email input", () => {
    render(
      <MemoryRouter>
        <RegistrationForm onSubmit={() => {}} />
      </MemoryRouter>
    );
    const emailInput = document.querySelector('input[type="email"]');
    expect(emailInput).toBeInTheDocument();
  });

  it("has password input", () => {
    render(
      <MemoryRouter>
        <RegistrationForm onSubmit={() => {}} />
      </MemoryRouter>
    );
    const passwordInput = document.querySelector('input[type="password"]');
    expect(passwordInput).toBeInTheDocument();
  });

  it("has register button", () => {
    render(
      <MemoryRouter>
        <RegistrationForm onSubmit={() => {}} />
      </MemoryRouter>
    );
    const registerButton = document.querySelector('button[type="submit"]');
    expect(registerButton).toBeInTheDocument();
    expect(registerButton.textContent).toMatch(/register/i);
  });
});