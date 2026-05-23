"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitFeedback } from "@/lib/actions/feedback";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { vi } from "@/lib/vi";

type FeedbackStep = "initial" | "select_correct" | "submitted";

export interface FeedbackWidgetProps {
  diagnosisId: string;
  predictedPlant: string;
  predictedDisease: string;
  plantOptions: string[];
  diseaseOptions: string[];
  onSubmit?: () => void;
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function FeedbackWidget({
  diagnosisId,
  predictedPlant,
  predictedDisease,
  plantOptions,
  diseaseOptions,
  onSubmit,
}: FeedbackWidgetProps) {
  const [step, setStep] = useState<FeedbackStep>("initial");
  const [selectedPlant, setSelectedPlant] = useState(predictedPlant);
  const [selectedDisease, setSelectedDisease] = useState(predictedDisease);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const plants = useMemo(() => uniqueOptions([predictedPlant, ...plantOptions]), [plantOptions, predictedPlant]);
  const diseases = useMemo(() => {
    const base = uniqueOptions([predictedDisease, ...diseaseOptions]);
    const matching = base.filter((disease) => disease.toLowerCase().includes(selectedPlant.toLowerCase()));
    return matching.length > 0 ? matching : base;
  }, [diseaseOptions, predictedDisease, selectedPlant]);

  const handleCorrect = () => {
    setError(null);
    startTransition(async () => {
      const response = await submitFeedback(diagnosisId, true);

      if (!response.success) {
        const message = response.error || vi.feedback.saveError;
        setError(message);
        toast.error(message);
        return;
      }

      toast.success(vi.feedback.thanks);
      setStep("submitted");
      onSubmit?.();
    });
  };

  const handleCorrectionSubmit = () => {
    setError(null);
    startTransition(async () => {
      const response = await submitFeedback(diagnosisId, false, selectedPlant, selectedDisease);

      if (!response.success) {
        const message = response.error || vi.feedback.saveError;
        setError(message);
        toast.error(message);
        return;
      }

      toast.success(vi.feedback.thanks);
      setStep("submitted");
      onSubmit?.();
    });
  };

  if (step === "submitted") {
    return (
      <div className="animate-[fadeIn_180ms_ease-out] rounded-lg border border-success/30 bg-success/10 p-4 text-sm font-medium text-green-800">
        {vi.feedback.thanks}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      {step === "initial" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-neutral-700">{vi.feedback.question}</p>
          <div className="flex flex-wrap gap-2">
            <Button className="text-green-700" disabled={isPending} onClick={handleCorrect} size="sm" variant="ghost">
              {vi.feedback.correct}
            </Button>
            <Button
              className="text-red-700"
              disabled={isPending}
              onClick={() => setStep("select_correct")}
              size="sm"
              variant="ghost"
            >
              {vi.feedback.incorrect}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-neutral-700">{vi.feedback.selectCorrect}:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-700">{vi.feedback.plant}</span>
              <select
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2"
                onChange={(event) => {
                  setSelectedPlant(event.target.value);
                  setSelectedDisease(diseases[0] || predictedDisease);
                }}
                value={selectedPlant}
              >
                {plants.map((plant) => (
                  <option key={plant} value={plant}>
                    {plant}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-neutral-700">{vi.feedback.disease}</span>
              <select
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2"
                onChange={(event) => setSelectedDisease(event.target.value)}
                value={selectedDisease}
              >
                {diseases.map((disease) => (
                  <option key={disease} value={disease}>
                    {disease}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={isPending} loading={isPending} onClick={handleCorrectionSubmit} size="sm">
              {vi.feedback.send}
            </Button>
            <Button disabled={isPending} onClick={() => setStep("initial")} size="sm" variant="ghost">
              {vi.common.cancel}
            </Button>
          </div>
        </div>
      )}

      {error ? <p className={cn("mt-3 text-sm text-red-700")} role="alert">{error}</p> : null}
    </div>
  );
}
