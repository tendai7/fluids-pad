import { redirect } from "next/navigation";
import { ClearButton } from "@/components/ClearButton";

export default function TotalPressurePage() {
  redirect("/calculators/dynamic-pressure");
}
