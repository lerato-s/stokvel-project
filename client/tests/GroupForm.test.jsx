// tests/GroupForm.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import '@testing-library/jest-dom/vitest';
import GroupForm from "../src/components/GroupForm";

// Clear everything before each test
beforeEach(() => {
  vi.clearAllMocks();
  // Clean up the DOM
  
});

describe("GroupForm", () => {
  it("renders the form", () => {
    render(<GroupForm onSave={() => {}} />);
    
    // Use more specific queries to avoid duplicates
    expect(screen.getByRole('textbox', { name: /group name/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /amount/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();
  });

  it("shows validation alert when required fields are missing", () => {
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<GroupForm onSave={() => {}} />);
    
    const saveButton = screen.getByRole('button', { name: /save configuration/i });
    fireEvent.click(saveButton);
    
    expect(mockAlert).toHaveBeenCalledWith("Please fill in all fields before saving.");
    mockAlert.mockRestore();
  });

  it("calls onSave with complete form data", () => {
    const mockSave = vi.fn();
    render(<GroupForm onSave={mockSave} />);
    
    // Fill in required fields using getByRole when possible
    fireEvent.change(screen.getByRole('textbox', { name: /group name/i }), { 
      target: { value: "Test Stokvel" } 
    });
    
    fireEvent.change(screen.getByRole('spinbutton', { name: /amount/i }), { 
      target: { value: "500" } 
    });
    
    // For selects, use getByLabelText or getByRole
    fireEvent.change(screen.getByLabelText(/frequency/i), { 
      target: { value: "Monthly" } 
    });
    
    fireEvent.change(screen.getByLabelText(/cycle duration/i), { 
      target: { value: "12 Months" } 
    });
    
    fireEvent.change(screen.getByLabelText(/max members/i), { 
      target: { value: "10" } 
    });
    
    // For radio button - use getByRole with specific value
    const payoutRadio = screen.getByRole('radio', { name: /fixed order/i });
    fireEvent.click(payoutRadio);
    
    fireEvent.change(screen.getByLabelText(/group rules/i), { 
      target: { value: "No late payments" } 
    });
    
    const saveButton = screen.getByRole('button', { name: /save configuration/i });
    fireEvent.click(saveButton);
    
    expect(mockSave).toHaveBeenCalled();
  });

  it("resets form when Reset button is clicked", () => {
    render(<GroupForm onSave={() => {}} />);
    
    // Fill fields
    fireEvent.change(screen.getByRole('textbox', { name: /group name/i }), { 
      target: { value: "Test Group" } 
    });
    
    fireEvent.change(screen.getByRole('spinbutton', { name: /amount/i }), { 
      target: { value: "500" } 
    });
    
    // Click reset - use getAllByRole and take the first one
    const resetButtons = screen.getAllByRole('button', { name: /reset/i });
    fireEvent.click(resetButtons[0]);
    
    // Check if fields are cleared
    expect(screen.getByRole('textbox', { name: /group name/i })).toHaveValue("");
    expect(screen.getByRole('spinbutton', { name: /amount/i })).toHaveValue(null);
  });
});