import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PinEntry from "@/components/PinEntry";

describe("PinEntry", () => {
  it("should render input field for PIN entry", () => {
    render(<PinEntry onSubmit={vi.fn()} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("should call onSubmit with PIN value when form submitted", () => {
    const onSubmit = vi.fn();
    render(<PinEntry onSubmit={onSubmit} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "1234" } });
    fireEvent.submit(input.closest("form")!);

    expect(onSubmit).toHaveBeenCalledWith("1234");
  });

  it("should not submit with fewer than 4 digits", () => {
    const onSubmit = vi.fn();
    render(<PinEntry onSubmit={onSubmit} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.submit(input.closest("form")!);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should have visible focus ring for keyboard navigation", () => {
    render(<PinEntry onSubmit={vi.fn()} />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("focus:ring");
  });

  it("should display helper text explaining PIN purpose", () => {
    render(<PinEntry onSubmit={vi.fn()} />);
    expect(screen.getByText(/same pin/i)).toBeInTheDocument();
  });
});
