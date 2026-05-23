import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResultCard } from "@/components/diagnosis/result-card";

const baseProps = {
  plantName: "Tomato",
  plantConfidence: 0.92,
  diseaseName: "Early blight",
  diseaseConfidence: 0.81,
  severity: "severe" as const,
  recommendation: "Remove infected leaves.",
};

describe("ResultCard", () => {
  it("renders skeleton when loading", () => {
    const { container } = render(<ResultCard {...baseProps} isLoading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows severity badge", () => {
    render(<ResultCard {...baseProps} />);
    expect(screen.getByTestId("severity-badge")).toBeVisible();
  });

  it("shows confidence percentages", () => {
    render(<ResultCard {...baseProps} />);
    expect(screen.getByText("92.0%")).toBeInTheDocument();
    expect(screen.getByText("81.0%")).toBeInTheDocument();
  });

  it("calls onFeedback from feedback buttons", () => {
    const onFeedback = vi.fn();
    render(<ResultCard {...baseProps} onFeedback={onFeedback} />);
    const buttons = screen.getAllByRole("button");

    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    expect(onFeedback).toHaveBeenNthCalledWith(1, true);
    expect(onFeedback).toHaveBeenNthCalledWith(2, false);
  });
});
