import { AppStep } from "@/types/presentation";

export function getStepGuide(step: AppStep): { title: string; desc: string } {
  const safeStep = step || "upload";
  switch (safeStep) {
    case "upload":
      return {
        title: "\ud83d\udcc2 \ud30c\uc77c \uc5c5\ub85c\ub4dc",
        desc: "\ubc1c\ud45c \uc790\ub8cc \ud30c\uc77c(PDF, Word, \ud14d\uc2a4\ud2b8 \ub4f1)\uc744 \uc5c5\ub85c\ub4dc\ud558\uac70\ub098 \uc8fc\uc81c\ub97c \uc9c1\uc811 \uc785\ub825\ud558\uc138\uc694.",
      };
    case "info":
      return {
        title: "\u2699\ufe0f \ubc1c\ud45c \uc124\uc815",
        desc: "\ubc1c\ud45c \ubaa9\uc801, \uccad\uc911, \uc2dc\uac04 \ub4f1 \uc138\ubd80 \uc124\uc815\uc744 \uc785\ub825\ud558\uba74 AI\uac00 \ucd5c\uc801\uc758 \uad6c\uc131\uc744 \uc81c\uc548\ud569\ub2c8\ub2e4.",
      };
    case "outline":
      return {
        title: "\ud83d\udccb \ubaa9\ucc28 \ud655\uc778",
        desc: "AI\uac00 \uc0dd\uc131\ud55c \ubaa9\ucc28\ub97c \uac80\ud1a0\ud558\uace0 \uc218\uc815\ud55c \ub4a4 \uc2b9\uc778\ud558\uba74 \uc2ac\ub77c\uc774\ub4dc\ub97c \ub9cc\ub4e4\uae30 \uc2dc\uc791\ud569\ub2c8\ub2e4.",
      };
    case "generating":
      return {
        title: "\u2728 \uc0dd\uc131 \uc911\u2026",
        desc: "AI\uac00 \uc2ac\ub77c\uc774\ub4dc\ub97c \ub9cc\ub4e4\uace0 \uc788\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc\ub9cc \uae30\ub2e4\ub824\uc8fc\uc138\uc694.",
      };
    case "preview":
      return {
        title: "\ud83c\udf89 \ud3b8\uc9d1 & \ud655\uc778",
        desc: "\uc2ac\ub77c\uc774\ub4dc\ub97c \ud074\ub9ad\ud574 \ub0b4\uc6a9\uc744 \uc218\uc815\ud558\uace0, \uc800\uc7a5\ud558\uac70\ub098 \ubc1c\ud45c \ubaa8\ub4dc\ub85c \ud655\uc778\ud558\uc138\uc694.",
      };
    default:
      return { title: "\uc548\ub0b4", desc: "" };
  }
}
