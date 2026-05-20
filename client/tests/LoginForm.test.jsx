// tests/LoginForm.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import '@testing-library/jest-dom/vitest';
import LoginForm from "../src/components/LoginForm";

describe("LoginForm", () => {
  it("renders all form fields", () => {
    render(
      <MemoryRouter>
        <LoginForm
          email=""
          setEmail={() => {}}
          password=""
          setPassword={() => {}}
          error=""
          resetSent={false}
          loading={false}
          handleEmailLogin={() => {}}
          handleGoogleLogin={() => {}}
          handleForgotPassword={() => {}}
        />
      </MemoryRouter>
    );
    
    // Check using placeholders
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /forgot password/i })).toBeInTheDocument();
  });

  it("shows error message when error prop is provided", () => {
    render(
      <MemoryRouter>
        <LoginForm
          email=""
          setEmail={() => {}}
          password=""
          setPassword={() => {}}
          error="Invalid credentials"
          resetSent={false}
          loading={false}
          handleEmailLogin={() => {}}
          handleGoogleLogin={() => {}}
          handleForgotPassword={() => {}}
        />
      </MemoryRouter>
    );
    
    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("shows reset confirmation message when resetSent is true", () => {
    render(
      <MemoryRouter>
        <LoginForm
          email=""
          setEmail={() => {}}
          password=""
          setPassword={() => {}}
          error=""
          resetSent={true}
          loading={false}
          handleEmailLogin={() => {}}
          handleGoogleLogin={() => {}}
          handleForgotPassword={() => {}}
        />
      </MemoryRouter>
    );
    
    expect(screen.getByText(/reset email sent/i)).toBeInTheDocument();
  });

  it("shows loading state on login button", () => {
    render(
      <MemoryRouter>
        <LoginForm
          email=""
          setEmail={() => {}}
          password=""
          setPassword={() => {}}
          error=""
          resetSent={false}
          loading={true}
          handleEmailLogin={() => {}}
          handleGoogleLogin={() => {}}
          handleForgotPassword={() => {}}
        />
      </MemoryRouter>
    );
    
    expect(screen.getByRole("button", { name: /logging in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logging in/i })).toBeDisabled();
  });

  it("calls handleEmailLogin when form is submitted", () => {
    const mockEmailLogin = vi.fn();
    
    render(
      <MemoryRouter>
        <LoginForm
          email="test@example.com"
          setEmail={() => {}}
          password="password123"
          setPassword={() => {}}
          error=""
          resetSent={false}
          loading={false}
          handleEmailLogin={mockEmailLogin}
          handleGoogleLogin={() => {}}
          handleForgotPassword={() => {}}
        />
      </MemoryRouter>
    );
    
    const form = screen.getByRole("form");
    fireEvent.submit(form);
    
    expect(mockEmailLogin).toHaveBeenCalledTimes(1);
  });

  it("calls handleGoogleLogin when Google button is clicked", () => {
    const mockGoogleLogin = vi.fn();
    
    render(
      <MemoryRouter>
        <LoginForm
          email=""
          setEmail={() => {}}
          password=""
          setPassword={() => {}}
          error=""
          resetSent={false}
          loading={false}
          handleEmailLogin={() => {}}
          handleGoogleLogin={mockGoogleLogin}
          handleForgotPassword={() => {}}
        />
      </MemoryRouter>
    );
    
    const googleButton = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(googleButton);
    
    expect(mockGoogleLogin).toHaveBeenCalledTimes(1);
  });

  it("calls handleForgotPassword when Forgot Password button is clicked", () => {
    const mockForgotPassword = vi.fn();
    
    render(
      <MemoryRouter>
        <LoginForm
          email=""
          setEmail={() => {}}
          password=""
          setPassword={() => {}}
          error=""
          resetSent={false}
          loading={false}
          handleEmailLogin={() => {}}
          handleGoogleLogin={() => {}}
          handleForgotPassword={mockForgotPassword}
        />
      </MemoryRouter>
    );
    
    const forgotButton = screen.getByRole("button", { name: /forgot password/i });
    fireEvent.click(forgotButton);
    
    expect(mockForgotPassword).toHaveBeenCalledTimes(1);
  });

  it("updates email when typing", () => {
    const mockSetEmail = vi.fn();
    
    render(
      <MemoryRouter>
        <LoginForm
          email=""
          setEmail={mockSetEmail}
          password=""
          setPassword={() => {}}
          error=""
          resetSent={false}
          loading={false}
          handleEmailLogin={() => {}}
          handleGoogleLogin={() => {}}
          handleForgotPassword={() => {}}
        />
      </MemoryRouter>
    );
    
    const emailInput = screen.getByPlaceholderText("Email");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    
    expect(mockSetEmail).toHaveBeenCalledWith("test@example.com");
  });

  it("updates password when typing", () => {
    const mockSetPassword = vi.fn();
    
    render(
      <MemoryRouter>
        <LoginForm
          email=""
          setEmail={() => {}}
          password=""
          setPassword={mockSetPassword}
          error=""
          resetSent={false}
          loading={false}
          handleEmailLogin={() => {}}
          handleGoogleLogin={() => {}}
          handleForgotPassword={() => {}}
        />
      </MemoryRouter>
    );
    
    const passwordInput = screen.getByPlaceholderText("Password");
    fireEvent.change(passwordInput, { target: { value: "newpassword123" } });
    
    expect(mockSetPassword).toHaveBeenCalledWith("newpassword123");
  });

  it("disables buttons when loading", () => {
    render(
      <MemoryRouter>
        <LoginForm
          email=""
          setEmail={() => {}}
          password=""
          setPassword={() => {}}
          error=""
          resetSent={false}
          loading={true}
          handleEmailLogin={() => {}}
          handleGoogleLogin={() => {}}
          handleForgotPassword={() => {}}
        />
      </MemoryRouter>
    );
    
    const loginButton = screen.getByRole("button", { name: /logging in/i });
    const googleButton = screen.getByRole("button", { name: /continue with google/i });
    const forgotButton = screen.getByRole("button", { name: /forgot password/i });
    
    expect(loginButton).toBeDisabled();
    expect(googleButton).toBeDisabled();
    expect(forgotButton).not.toBeDisabled(); // Forgot button might not be disabled
  });

  it("has link to register page", () => {
    render(
      <MemoryRouter>
        <LoginForm
          email=""
          setEmail={() => {}}
          password=""
          setPassword={() => {}}
          error=""
          resetSent={false}
          loading={false}
          handleEmailLogin={() => {}}
          handleGoogleLogin={() => {}}
          handleForgotPassword={() => {}}
        />
      </MemoryRouter>
    );
    
    const registerLink = screen.getByRole("link", { name: /register/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute("href", "/register");
  });
});