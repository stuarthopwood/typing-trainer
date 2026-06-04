import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hall Effect Telemetry — NeuralKeys",
  description:
    "Stream real-time analog key-travel data from a Keychron Hall Effect keyboard into NeuralKeys via a local companion service.",
};

export default function HallEffectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
