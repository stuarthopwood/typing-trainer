import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PinEntry from "@/components/PinEntry";

function getPinInput(): HTMLInputElement {
  return document.querySelector(
    'input[aria-label="PIN code"]',
  ) as HTMLInputElement;
}

describe("PinEntry", () => {
  it("should render input field for PIN entry", () => {
    // Given the PIN entry screen
    // When it renders
    // Then a labelled PIN input is present (type=password, no role=textbox)
    render(<PinEntry onSubmit={vi.fn()} />);
    expect(getPinInput()).toBeInTheDocument();
  });

  it("should call onSubmit with PIN value when form submitted", () => {
    // Given the user has typed a 4-digit PIN
    const onSubmit = vi.fn();
    render(<PinEntry onSubmit={onSubmit} />);
    const input = getPinInput();

    // When they submit the form
    fireEvent.change(input, { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));

    // Then onSubmit is called with the typed PIN
    expect(onSubmit).toHaveBeenCalledWith("1234");
  });

  it("should not submit with fewer than 4 digits", () => {
    // Given a PIN under the minimum length
    const onSubmit = vi.fn();
    render(<PinEntry onSubmit={onSubmit} />);
    const input = getPinInput();

    // When the form is submitted (button is disabled, but try clicking anyway)
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));

    // Then onSubmit is NOT called (minimum length enforced)
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should have visible focus ring for keyboard navigation", () => {
    // Given the PIN entry renders
    // When we inspect the input
    // Then a focus-ring class is present (Constitution: keyboard operability + visible focus)
    render(<PinEntry onSubmit={vi.fn()} />);
    expect(getPinInput().className).toContain("focus:ring");
  });

  it("should display helper text explaining PIN purpose", () => {
    // Given the PIN entry renders
    // When the user looks at the page
    // Then the explanatory copy is present
    render(<PinEntry onSubmit={vi.fn()} />);
    expect(screen.getByText(/same pin = same progress/i)).toBeInTheDocument();
  });
});
