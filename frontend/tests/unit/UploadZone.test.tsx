import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UploadZone } from "@/components/diagnosis/UploadZone";

function getFileInput(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]');
  if (!input) {
    throw new Error("file input not found");
  }
  return input;
}

describe("UploadZone", () => {
  it("renders empty state", () => {
    render(<UploadZone onFileSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: /kéo thả/i })).toBeInTheDocument();
  });

  it("calls onFileSelect when a valid image is selected", () => {
    const onFileSelect = vi.fn();
    const { container } = render(<UploadZone onFileSelect={onFileSelect} />);
    const file = new File(["image"], "leaf.jpg", { type: "image/jpeg" });

    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file);
    expect(screen.getByAltText(/preview leaf.jpg/i)).toBeInTheDocument();
  });

  it("shows an error when the file is larger than 5MB", () => {
    const { container } = render(<UploadZone onFileSelect={vi.fn()} />);
    const file = new File([new Uint8Array(6 * 1024 * 1024)], "large.jpg", { type: "image/jpeg" });

    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    expect(screen.getByRole("alert")).toHaveTextContent(/5MB/i);
  });

  it("shows an error when the file is not an accepted image", () => {
    const { container } = render(<UploadZone onFileSelect={vi.fn()} />);
    const file = new File(["plain"], "notes.txt", { type: "text/plain" });

    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    expect(screen.getByRole("alert")).toHaveTextContent(/JPG.*PNG/i);
  });
});
