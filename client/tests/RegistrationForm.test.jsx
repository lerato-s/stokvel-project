// tests/RegistrationForm.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import '@testing-library/jest-dom/vitest';
import RegistrationForm from "../src/components/RegistrationForm";

describe("RegistrationForm", () => {
  it("renders all form fields", () => {
    render(
      <MemoryRouter>
        <RegistrationForm
          username=""
          setUsername={() => {}}
          email=""
          setEmail={() => {}}
          password=""
          setPassword={() => {}}
          error=""
          loading={false}
          handleRegister={() => {}}
          handleGoogleRegister={() => {}}
        />
      </MemoryRouter>
    );
    
    // Check using placeholders
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password (min 6 characters)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("shows error message when error prop is provided", () => {
    render(
      <MemoryRouter>
        <RegistrationForm
          username=""
          setUsername={() => {}}
          email=""
          setEmail={() => {}}
          password=""
          setPassword={() => {}}
          error="Email already exists"
          loading={false}
          handleRegister={() => {}}
          handleGoogleRegister={() => {}}
        />
      </MemoryRouter>
    );
    
    expect(screen.getByText("Email already exists")).toBeInTheDocument();
  });

  it("shows loading state on register button", () => {
    render(
      <MemoryRouter>
        <RegistrationForm
          username=""
          setUsername={() => {}}
          email=""
          setEmail={() => {}}
          password=""
          setPassword={() => {}}
          error=""
          loading={true}
          handleRegister={() => {}}
          handleGoogleRegister={() => {}}
        />
      </MemoryRouter>
    );
    
    expect(screen.getByRole("button", { name: /creating account/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /creating account/i })).toBeDisabled();
  });

  it("calls handleRegister when form is submitted", () => {
    const mockRegister = vi.fn();
    const mockSetUsername = vi.fn();
    const mockSetEmail = vi.fn();
    const mockSetPassword = vi.fn();
    
    render(
      <MemoryRouter>
        <RegistrationForm
          username="testuser"
          setUsername={mockSetUsername}
          email="test@example.com"
          setEmail={mockSetEmail}
          password="password123"
          setPassword={mockSetPassword}
          error=""
          loading={false}
          handleRegister={mockRegister}
          handleGoogleRegister={() => {}}
        />
      </MemoryRouter>
    );
    
    const form = screen.getByRole("form");
    fireEvent.submit(form);
    
    expect(mockRegister).toHaveBeenCalledTimes(1);
  });

  it("calls handleGoogleRegister when Google button is clicked", () => {
    const mockGoogleRegister = vi.fn();
    
    render(
      <MemoryRouter>
        <RegistrationForm
          username=""
          setUsername={() => {}}
          email=""
          setEmail={() => {}}
          password=""
          setPassword={() => {}}
          error=""
          loading={false}
          handleRegister={() => {}}
          handleGoogleRegister={mockGoogleRegister}
        />
      </MemoryRouter>
    );
    
    const googleButton = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(googleButton);
    
    expect(mockGoogleRegister).toHaveBeenCalledTimes(1);
  });

  it("updates username when typing", () => {
    const mockSetUsername = vi.fn();
    
    render(
      <MemoryRouter>
        <RegistrationForm
          username=""
          setUsername={mockSetUsername}
          email=""
          setEmail={() => {}}
          password=""
          setPassword={() => {}}
          error=""
          loading={false}
          handleRegister={() => {}}
          handleGoogleRegister={() => {}}
        />
      </MemoryRouter>
    );
    
    const usernameInput = screen.getByPlaceholderText("Username");
    fireEvent.change(usernameInput, { target: { value: "newuser" } });
    
    expect(mockSetUsername).toHaveBeenCalledWith("newuser");
  });

  it("updates email when typing", () => {
    const mockSetEmail = vi.fn();
    
    render(
      <MemoryRouter>
        <RegistrationForm
          username=""
          setUsername={() => {}}
          email=""
          setEmail={mockSetEmail}
          password=""
          setPassword={() => {}}
          error=""
          loading={false}
          handleRegister={() => {}}
          handleGoogleRegister={() => {}}
        />
      </MemoryRouter>
    );
    
    const emailInput = screen.getByPlaceholderText("Email");
    fireEvent.change(emailInput, { target: { value: "new@example.com" } });
    
    expect(mockSetEmail).toHaveBeenCalledWith("new@example.com");
  });

  it("updates password when typing", () => {
    const mockSetPassword = vi.fn();
    
    render(
      <MemoryRouter>
        <RegistrationForm
          username=""
          setUsername={() => {}}
          email=""
          setEmail={() => {}}
          password=""
          setPassword={mockSetPassword}
          error=""
          loading={false}
          handleRegister={() => {}}
          handleGoogleRegister={() => {}}
        />
      </MemoryRouter>
    );
    
    const passwordInput = screen.getByPlaceholderText("Password (min 6 characters)");
    fireEvent.change(passwordInput, { target: { value: "newpassword123" } });
    
    expect(mockSetPassword).toHaveBeenCalledWith("newpassword123");
  });

  it("has link to login page", () => {
    render(
      <MemoryRouter>
        <RegistrationForm
          username=""
          setUsername={() => {}}
          email=""
          setEmail={() => {}}
          password=""
          setPassword={() => {}}
          error=""
          loading={false}
          handleRegister={() => {}}
          handleGoogleRegister={() => {}}
        />
      </MemoryRouter>
    );
    
    const loginLink = screen.getByRole("link", { name: /login/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/login");
  });
});