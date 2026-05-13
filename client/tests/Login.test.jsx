import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";

// ─── Mock react-router-dom navigate ───────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── Mock Firebase auth functions ─────────────────────────────────────────────
vi.mock("firebase/auth", () => ({
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

// ─── Mock your firebase.js config file ────────────────────────────────────────
vi.mock("../firebase", () => ({
  auth: {},
  googleProvider: {},
}));

// ─── Mock axios ────────────────────────────────────────────────────────────────
vi.mock("axios", () => ({
  default: { post: vi.fn() },
}));

// ─── Mock LoginForm so we test Login logic, not LoginForm's UI ────────────────
vi.mock("../components/LoginForm", () => ({
  default: ({
    email, setEmail, password, setPassword,
    error, resetSent, loading,
    handleEmailLogin, handleGoogleLogin, handleForgotPassword,
  }) => (
    <div>
      <input
        data-testid="email-input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        data-testid="password-input"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button data-testid="email-login-btn" onClick={handleEmailLogin}>
        Login
      </button>
      <button data-testid="google-login-btn" onClick={handleGoogleLogin}>
        Google
      </button>
      <button data-testid="forgot-btn" onClick={handleForgotPassword}>
        Forgot Password
      </button>
      {error && <p data-testid="error-msg">{error}</p>}
      {resetSent && <p data-testid="reset-sent-msg">Reset email sent</p>}
      {loading && <p data-testid="loading-indicator">Loading...</p>}
    </div>
  ),
}));

// ─── Imports after mocks are declared ─────────────────────────────────────────
import { signInWithPopup, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import axios from "axios";

// ─── Helper ───────────────────────────────────────────────────────────────────
function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

// ─── Shared mock user returned by Firebase ────────────────────────────────────
const mockFirebaseUser = {
  getIdToken: vi.fn().mockResolvedValue("fake-id-token"),
};

const mockBackendResponse = {
  data: { token: "jwt-token", role: "member", email: "user@test.com", username: "user" },
};

// ══════════════════════════════════════════════════════════════════════════════
describe("Login — initial render", () => {
  it("renders all form elements", () => {
    renderLogin();
    expect(screen.getByTestId("email-input")).toBeInTheDocument();
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
    expect(screen.getByTestId("email-login-btn")).toBeInTheDocument();
    expect(screen.getByTestId("google-login-btn")).toBeInTheDocument();
    expect(screen.getByTestId("forgot-btn")).toBeInTheDocument();
  });

  it("shows no error or loading on mount", () => {
    renderLogin();
    expect(screen.queryByTestId("error-msg")).not.toBeInTheDocument();
    expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reset-sent-msg")).not.toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe("Login — Google sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithPopup.mockResolvedValue({ user: mockFirebaseUser });
    axios.post.mockResolvedValue(mockBackendResponse);
  });

  it("calls signInWithPopup when Google button is clicked", async () => {
    renderLogin();
    fireEvent.click(screen.getByTestId("google-login-btn"));
    await waitFor(() => expect(signInWithPopup).toHaveBeenCalledTimes(1));
  });

  it("sends idToken to the backend after Google sign-in", async () => {
    renderLogin();
    fireEvent.click(screen.getByTestId("google-login-btn"));
    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/google"),
        { idToken: "fake-id-token" }
      )
    );
  });

  it("saves user to localStorage and navigates to /group on success", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    renderLogin();
    fireEvent.click(screen.getByTestId("google-login-btn"));
    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith(
        "user",
        JSON.stringify(mockBackendResponse.data)
      );
      expect(mockNavigate).toHaveBeenCalledWith("/group");
    });
  });

  it("shows error message when Google sign-in fails", async () => {
    signInWithPopup.mockRejectedValue(new Error("popup closed"));
    renderLogin();
    fireEvent.click(screen.getByTestId("google-login-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("error-msg")).toHaveTextContent(
        "Google sign-in failed. Please try again."
      )
    );
  });

  it("clears loading state after Google sign-in completes", async () => {
    renderLogin();
    fireEvent.click(screen.getByTestId("google-login-btn"));
    await waitFor(() =>
      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument()
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe("Login — email/password sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithEmailAndPassword.mockResolvedValue({ user: mockFirebaseUser });
    axios.post.mockResolvedValue(mockBackendResponse);
  });

  it("calls signInWithEmailAndPassword with the typed credentials", async () => {
    renderLogin();
    fireEvent.change(screen.getByTestId("email-input"), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByTestId("password-input"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByTestId("email-login-btn"));

    await waitFor(() =>
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        "user@test.com",
        "password123"
      )
    );
  });

  it("sends idToken to the backend after email sign-in", async () => {
    renderLogin();
    fireEvent.change(screen.getByTestId("email-input"), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByTestId("password-input"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByTestId("email-login-btn"));

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/google"),
        { idToken: "fake-id-token" }
      )
    );
  });

  it("navigates to /group after successful email login", async () => {
    renderLogin();
    fireEvent.click(screen.getByTestId("email-login-btn"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/group"));
  });

  it("shows error message on wrong credentials", async () => {
    signInWithEmailAndPassword.mockRejectedValue({
      code: "auth/wrong-password",
      message: "Wrong password",
    });
    renderLogin();
    fireEvent.click(screen.getByTestId("email-login-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("error-msg")).toHaveTextContent(
        "Invalid email or password."
      )
    );
  });

  it("clears a previous error when attempting login again", async () => {
    // First attempt fails
    signInWithEmailAndPassword.mockRejectedValueOnce(new Error("wrong"));
    renderLogin();
    fireEvent.click(screen.getByTestId("email-login-btn"));
    await waitFor(() => expect(screen.getByTestId("error-msg")).toBeInTheDocument());

    // Second attempt succeeds
    signInWithEmailAndPassword.mockResolvedValueOnce({ user: mockFirebaseUser });
    fireEvent.click(screen.getByTestId("email-login-btn"));
    await waitFor(() =>
      expect(screen.queryByTestId("error-msg")).not.toBeInTheDocument()
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe("Login — forgot password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows error if Forgot Password is clicked with no email", async () => {
    renderLogin();
    fireEvent.click(screen.getByTestId("forgot-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("error-msg")).toHaveTextContent(
        "Enter your email above first"
      )
    );
  });

  it("calls sendPasswordResetEmail with the typed email", async () => {
    sendPasswordResetEmail.mockResolvedValue();
    renderLogin();
    fireEvent.change(screen.getByTestId("email-input"), {
      target: { value: "user@test.com" },
    });
    fireEvent.click(screen.getByTestId("forgot-btn"));
    await waitFor(() =>
      expect(sendPasswordResetEmail).toHaveBeenCalledWith({}, "user@test.com")
    );
  });

  it("shows confirmation message after reset email is sent", async () => {
    sendPasswordResetEmail.mockResolvedValue();
    renderLogin();
    fireEvent.change(screen.getByTestId("email-input"), {
      target: { value: "user@test.com" },
    });
    fireEvent.click(screen.getByTestId("forgot-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("reset-sent-msg")).toBeInTheDocument()
    );
  });

  it("shows error if sendPasswordResetEmail throws", async () => {
    sendPasswordResetEmail.mockRejectedValue(new Error("bad email"));
    renderLogin();
    fireEvent.change(screen.getByTestId("email-input"), {
      target: { value: "bad@test.com" },
    });
    fireEvent.click(screen.getByTestId("forgot-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("error-msg")).toHaveTextContent(
        "Could not send reset email"
      )
    );
  });

  it("clears any existing error when reset email succeeds", async () => {
    // Trigger an error first
    sendPasswordResetEmail.mockRejectedValueOnce(new Error("bad"));
    renderLogin();
    fireEvent.change(screen.getByTestId("email-input"), {
      target: { value: "user@test.com" },
    });
    fireEvent.click(screen.getByTestId("forgot-btn"));
    await waitFor(() => expect(screen.getByTestId("error-msg")).toBeInTheDocument());

    // Now succeed
    sendPasswordResetEmail.mockResolvedValueOnce();
    fireEvent.click(screen.getByTestId("forgot-btn"));
    await waitFor(() =>
      expect(screen.queryByTestId("error-msg")).not.toBeInTheDocument()
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe("Login — backend failure", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows Google error if backend POST fails after Google sign-in", async () => {
    signInWithPopup.mockResolvedValue({ user: mockFirebaseUser });
    axios.post.mockRejectedValue(new Error("Network Error"));
    renderLogin();
    fireEvent.click(screen.getByTestId("google-login-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("error-msg")).toHaveTextContent(
        "Google sign-in failed. Please try again."
      )
    );
  });

  it("shows email error if backend POST fails after email sign-in", async () => {
    signInWithEmailAndPassword.mockResolvedValue({ user: mockFirebaseUser });
    axios.post.mockRejectedValue(new Error("Network Error"));
    renderLogin();
    fireEvent.click(screen.getByTestId("email-login-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("error-msg")).toHaveTextContent(
        "Invalid email or password."
      )
    );
  });
});
