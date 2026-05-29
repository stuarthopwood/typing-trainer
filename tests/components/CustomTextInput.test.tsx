import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CustomTextInput from "@/components/CustomTextInput";

beforeEach(() => {
  vi.stubGlobal("localStorage", (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      get length() { return Object.keys(store).length; },
      key: (i: number) => Object.keys(store)[i] ?? null,
    };
  })());
});

describe("CustomTextInput", () => {
  it("should render textarea and Start button", () => {
    render(<CustomTextInput onStart={vi.fn()} />);
    expect(screen.getByPlaceholderText(/paste or type/i)).toBeInTheDocument();
    expect(screen.getByText("Start")).toBeInTheDocument();
  });

  it("should disable Start button when text is too short", () => {
    render(<CustomTextInput onStart={vi.fn()} />);
    const startBtn = screen.getByText("Start").closest("button")!;
    expect(startBtn).toBeDisabled();
  });

  it("should enable Start button when text meets minimum length", () => {
    const onStart = vi.fn();
    render(<CustomTextInput onStart={onStart} />);
    const textarea = screen.getByPlaceholderText(/paste or type/i);
    fireEvent.change(textarea, { target: { value: "This is a valid custom text that is long enough to pass validation" } });
    const startBtn = screen.getByText("Start").closest("button")!;
    expect(startBtn).not.toBeDisabled();
  });

  it("should call onStart with cleaned text when Start clicked", () => {
    const onStart = vi.fn();
    render(<CustomTextInput onStart={onStart} />);
    const textarea = screen.getByPlaceholderText(/paste or type/i);
    fireEvent.change(textarea, { target: { value: "This is enough text to start typing custom content" } });
    fireEvent.click(screen.getByText("Start"));
    expect(onStart).toHaveBeenCalledWith(expect.any(String));
  });

  it("should show suggested presets (JavaScript, Python, etc.)", () => {
    render(<CustomTextInput onStart={vi.fn()} />);
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
  });

  it("should load preset text into textarea when preset clicked", () => {
    render(<CustomTextInput onStart={vi.fn()} />);
    fireEvent.click(screen.getByText("JavaScript"));
    const textarea = screen.getByPlaceholderText(/paste or type/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain("const");
  });

  it("should show character count", () => {
    render(<CustomTextInput onStart={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(/paste or type/i);
    fireEvent.change(textarea, { target: { value: "hello world this is test text" } });
    expect(screen.getByText(/\d+ chars/)).toBeInTheDocument();
  });
});
