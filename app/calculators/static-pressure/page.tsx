import { redirect } from "next/navigation";
import { ClearButton } from "@/components/ClearButton";

export default function StaticPressurePage() {
  redirect("/calculators/dynamic-pressure");
}
