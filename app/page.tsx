import TutorApp from "@/components/TutorApp";
import AuthGate from "@/components/AuthGate";

export default function Home() {
  return (
    <AuthGate>
      <TutorApp />
    </AuthGate>
  );
}