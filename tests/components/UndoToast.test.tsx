import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UndoToast from "@/components/UndoToast";

describe("UndoToast", () => {
  it("should display message with undo button", () => {
    render(<UndoToast message="Session deleted" onUndo={vi.fn()} sessionId="123" />);
    expect(screen.getByText(/session deleted/i)).toBeInTheDocument();
    expect(screen.getByText(/undo/i)).toBeInTheDocument();
  });

  it("should call onUndo with sessionId when Undo clicked", () => {
    const onUndo = vi.fn();
    render(<UndoToast message="Deleted" onUndo={onUndo} sessionId="abc" />);
    fireEvent.click(screen.getByText(/undo/i));
    expect(onUndo).toHaveBeenCalledWith("abc");
  });
});
