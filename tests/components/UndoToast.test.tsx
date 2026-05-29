import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UndoToast from "@/components/UndoToast";

describe("UndoToast", () => {
  it("should display message with undo button", () => {
    render(<UndoToast message="Session deleted" onUndo={vi.fn()} onExpire={vi.fn()} />);
    expect(screen.getByText(/session deleted/i)).toBeInTheDocument();
    expect(screen.getByText(/undo/i)).toBeInTheDocument();
  });

  it("should call onUndo when Undo clicked", () => {
    const onUndo = vi.fn();
    render(<UndoToast message="Deleted" onUndo={onUndo} onExpire={vi.fn()} />);
    fireEvent.click(screen.getByText(/undo/i));
    expect(onUndo).toHaveBeenCalled();
  });
});
